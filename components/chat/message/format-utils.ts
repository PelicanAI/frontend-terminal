import { safeTrim } from "@/lib/utils"
import { escapeHtml } from "@/lib/sanitize"
import DOMPurify from "isomorphic-dompurify"

export type ContentSegment =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language?: string }

const LINK_REGEX = /(https?:\/\/[^\s]+)/g

export function parseContentSegments(content: string): ContentSegment[] {
  const lines = content.split("\n")
  const segments: ContentSegment[] = []

  let isInCodeBlock = false
  let currentLanguage: string | undefined
  let codeBuffer: string[] = []
  let textBuffer: string[] = []

  const flushText = () => {
    if (textBuffer.length > 0) {
      const text = textBuffer.join("\n").trimEnd()
      if (text.length > 0) {
        segments.push({ type: "text", content: text })
      }
      textBuffer = []
    }
  }

  const flushCode = () => {
    const code = codeBuffer.join("\n")
    segments.push({ type: "code", content: code, language: currentLanguage })
    codeBuffer = []
    currentLanguage = undefined
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^```(.*)?$/)

    if (fenceMatch) {
      if (isInCodeBlock) {
        flushCode()
        isInCodeBlock = false
      } else {
        flushText()
        isInCodeBlock = true
        const language = fenceMatch[1] ? safeTrim(fenceMatch[1]) : undefined
        currentLanguage = language ? language : undefined
      }
      continue
    }

    if (isInCodeBlock) {
      codeBuffer.push(line)
    } else {
      textBuffer.push(line)
    }
  }

  if (isInCodeBlock) {
    flushCode()
  }

  if (textBuffer.length > 0) {
    const text = textBuffer.join("\n").trimEnd()
    if (text.length > 0) {
      segments.push({ type: "text", content: text })
    }
  }

  return segments
}

export function formatLine(line: string): string {
  // Step 1: Check for markdown headers BEFORE escaping (need raw # characters)
  const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
  if (headerMatch) {
    const level = headerMatch[1]!.length
    const headerContent = escapeHtml(headerMatch[2]!)
    // Apply inline formatting to header content (bold, italic)
    const formatted = headerContent
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-[600]">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
    const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    const sizeClass = level <= 2 ? 'text-lg font-semibold' : level === 3 ? 'text-base font-semibold' : 'text-sm font-semibold'
    return DOMPurify.sanitize(
      `<${tag} class="${sizeClass} mt-3 mb-1">${formatted}</${tag}>`,
      {
        ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "span"],
        ALLOWED_ATTR: ["class"],
      }
    )
  }

  // Step 2: Escape HTML first
  let escaped = escapeHtml(line)

  // Step 3: Apply markdown formatting on escaped content
  // Handle bold text
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, (_, content) => {
    if (content.endsWith(':')) {
      return `<strong class="font-semibold">${content}</strong>`
    }
    return `<strong class="font-[600]">${content}</strong>`
  })

  // Also handle non-bold section headers (word followed by colon at start of line)
  if (/^[A-Z][a-zA-Z\s]+:/.test(escaped) && !escaped.includes('<strong')) {
    escaped = escaped.replace(/^([A-Z][a-zA-Z\s]+:)/, '<strong class="font-semibold">$1</strong>')
  }

  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Step 4: Safe link handling with URL validation
  escaped = escaped.replace(LINK_REGEX, (match) => {
    try {
      const url = new URL(match)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return match
      }
      const sanitizedUrl = DOMPurify.sanitize(match, {ALLOWED_TAGS: []})
      return `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer" class="text-teal-600 font-[500] break-all">${match}</a>`
    } catch {
      return match
    }
  })

  // Step 5: Final sanitization with strict URI regexp
  return DOMPurify.sanitize(escaped, {
    ALLOWED_TAGS: ["strong", "em", "a", "span", "br"],
    ALLOWED_ATTR: ["class", "href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i
  })
}

/**
 * Wrap ticker symbols in clickable spans within already-formatted HTML.
 * Skips matches inside HTML tags to avoid corrupting markup.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function applyTickerLinks(
  html: string,
  tickers: string[],
  economicTerms?: string[],
): string {
  if ((!tickers || tickers.length === 0) && (!economicTerms || economicTerms.length === 0)) return html

  let result = html

  // Process longer tickers first so "EUR/USD" matches before "EUR" or "USD"
  const sorted = [...(tickers ?? [])].sort((a, b) => b.length - a.length)

  for (const ticker of sorted) {
    // Match the ticker as a standalone word, but only outside of HTML tags.
    // Split on HTML tags, process only text parts.
    const parts = result.split(/(<[^>]*>)/g)
    const escaped = escapeRegExp(ticker)
    result = parts
      .map((part) => {
        // If this part is an HTML tag, leave it alone
        if (part.startsWith("<")) return part
        // Replace standalone ticker matches in text content
        const re = new RegExp(`\\b(${escaped})\\b`, "g")
        return part.replace(
          re,
          `<span class="ticker-link text-purple-400 hover:text-purple-300 underline decoration-purple-400/40 hover:decoration-purple-300 cursor-pointer font-medium" data-ticker="${ticker}">$1</span>`
        )
      })
      .join("")
  }

  // Apply economic term highlighting (different style + data attribute)
  if (economicTerms && economicTerms.length > 0) {
    const sortedEcon = [...economicTerms].sort((a, b) => b.length - a.length)
    for (const term of sortedEcon) {
      const parts = result.split(/(<[^>]*>)/g)
      const escaped = escapeRegExp(term)
      result = parts
        .map((part) => {
          if (part.startsWith("<")) return part
          const re = new RegExp(`\\b(${escaped})\\b`, "g")
          return part.replace(
            re,
            `<span class="ticker-link text-amber-400 hover:text-amber-300 underline decoration-amber-400/40 hover:decoration-amber-300 cursor-pointer font-medium" data-economic-term="${term}">$1</span>`
          )
        })
        .join("")
    }
  }

  // Re-sanitize with data-ticker, data-economic-term, and learning-mode attrs allowed
  return DOMPurify.sanitize(result, {
    ALLOWED_TAGS: ["strong", "em", "a", "span", "br", "h1", "h2", "h3", "h4", "h5", "h6"],
    ALLOWED_ATTR: ["class", "href", "target", "rel"],
    ADD_ATTR: ["data-ticker", "data-economic-term", "data-learning-term", "data-term-full", "data-term-def"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  })
}
