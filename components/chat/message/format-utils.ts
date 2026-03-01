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

/** Apply inline markdown formatting (bold, italic, links) to already-escaped HTML. */
function applyInlineFormatting(escaped: string): string {
  // Handle bold text
  let result = escaped.replace(/\*\*(.*?)\*\*/g, (_, content) => {
    if (content.endsWith(':')) {
      return `<strong class="font-semibold">${content}</strong>`
    }
    return `<strong class="font-[600]">${content}</strong>`
  })

  // Also handle non-bold section headers (word followed by colon at start of line)
  if (/^[A-Z][a-zA-Z\s]+:/.test(result) && !result.includes('<strong')) {
    result = result.replace(/^([A-Z][a-zA-Z\s]+:)/, '<strong class="font-semibold">$1</strong>')
  }

  // Handle italic (after bold, so **bold** isn't caught by single *)
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Safe link handling with URL validation
  result = result.replace(LINK_REGEX, (match) => {
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

  return result
}

/** Shared DOMPurify config for formatLine output. */
const LINE_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["strong", "em", "a", "span", "br", "div", "hr"],
  ALLOWED_ATTR: ["class", "href", "target", "rel"],
  ALLOWED_URI_REGEXP: /^https?:\/\//i,
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
      `<${tag} class="${sizeClass} mt-2 mb-0.5">${formatted}</${tag}>`,
      {
        ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "span"],
        ALLOWED_ATTR: ["class"],
      }
    )
  }

  // Step 2: Horizontal rules (---, ***, ___)
  if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
    return '<hr class="my-2 border-[var(--border-subtle)]" />'
  }

  // Step 3: Unordered list items (- item or * item, with optional indentation)
  const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
  if (ulMatch) {
    const indent = ulMatch[1]!.length
    const itemContent = escapeHtml(ulMatch[2]!)
    const formatted = applyInlineFormatting(itemContent)
    const paddingClass = indent >= 4 ? 'pl-8' : indent >= 2 ? 'pl-4' : 'pl-4'
    return DOMPurify.sanitize(
      `<div class="my-0.5 ${paddingClass} relative before:content-['•'] before:absolute before:left-0 before:text-[var(--text-muted)]">${formatted}</div>`,
      LINE_SANITIZE_CONFIG,
    )
  }

  // Step 4: Ordered list items (1. item, 2. item, etc.)
  const olMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/)
  if (olMatch) {
    const indent = olMatch[1]!.length
    const num = olMatch[2]!
    const itemContent = escapeHtml(olMatch[3]!)
    const formatted = applyInlineFormatting(itemContent)
    const paddingClass = indent >= 4 ? 'pl-8' : indent >= 2 ? 'pl-4' : 'pl-4'
    return DOMPurify.sanitize(
      `<div class="my-0.5 ${paddingClass} relative"><span class="absolute left-0 text-[var(--text-muted)] font-mono text-sm">${num}.</span>${formatted}</div>`,
      LINE_SANITIZE_CONFIG,
    )
  }

  // Step 5: Escape HTML first for regular lines
  const escaped = escapeHtml(line)

  // Step 6: Apply inline formatting (bold, italic, links)
  const formatted = applyInlineFormatting(escaped)

  // Step 7: Final sanitization with strict URI regexp
  return DOMPurify.sanitize(formatted, LINE_SANITIZE_CONFIG)
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

  // Single-pass ticker highlighting: prevents nested spans (BTC inside BTC-USD)
  // and limits to first occurrence per base symbol.
  if (tickers && tickers.length > 0) {
    const sorted = [...tickers].sort((a, b) => b.length - a.length)
    const pattern = sorted.map((t) => escapeRegExp(t)).join("|")
    const re = new RegExp(`\\b(${pattern})\\b`, "g")
    const highlighted = new Set<string>()

    const parts = result.split(/(<[^>]*>)/g)
    result = parts
      .map((part) => {
        if (part.startsWith("<")) return part
        return part.replace(re, (match) => {
          // Dedup by base symbol: BTC-USD and BTC share base "BTC"
          const base = match.split(/[-/]/)[0] || match
          if (highlighted.has(base)) return match
          highlighted.add(base)
          return `<span class="ticker-link text-blue-400 hover:text-blue-300 underline decoration-blue-400/40 hover:decoration-blue-300 cursor-pointer font-medium" data-ticker="${match}">${match}</span>`
        })
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
    ALLOWED_TAGS: ["strong", "em", "a", "span", "br", "div", "hr", "h1", "h2", "h3", "h4", "h5", "h6"],
    ALLOWED_ATTR: ["class", "href", "target", "rel"],
    ADD_ATTR: ["data-ticker", "data-economic-term", "data-learning-term", "data-term-full", "data-term-def"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  })
}
