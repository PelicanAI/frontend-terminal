import glossaryData from './trading-terms.json'
import DOMPurify from 'isomorphic-dompurify'

interface GlossaryEntry {
  term: string
  fullName: string
  category: string
  shortDef: string
  aliases?: string[]
}

export interface TermMatch {
  term: string
  fullName: string
  shortDef: string
  category: string
  startIndex: number
  endIndex: number
}

const terms = glossaryData as GlossaryEntry[]

interface MatchCandidate {
  pattern: string
  entry: GlossaryEntry
}

// Build sorted match candidates (longest first) at module load
const matchCandidates: MatchCandidate[] = buildMatchCandidates()

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildMatchCandidates(): MatchCandidate[] {
  const candidates: MatchCandidate[] = []

  for (const entry of terms) {
    candidates.push({ pattern: entry.term, entry })
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        candidates.push({ pattern: alias, entry })
      }
    }
  }

  // Sort longest first so longer matches take priority
  candidates.sort((a, b) => b.pattern.length - a.pattern.length)
  return candidates
}

/**
 * Find all glossary term matches in plain text.
 * Returns non-overlapping matches sorted by position, longest match wins.
 */
export function findTermsInText(text: string): TermMatch[] {
  const allMatches: TermMatch[] = []

  for (const candidate of matchCandidates) {
    const escaped = escapeRegExp(candidate.pattern)
    // Use word boundaries for alphanumeric terms;
    // for terms with special chars (like P/E), use lookahead/lookbehind for non-word chars or string edges
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(candidate.pattern)
    const boundaryPattern = hasSpecialChars
      ? `(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`
      : `\\b${escaped}\\b`

    const regex = new RegExp(boundaryPattern, 'gi')
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        term: candidate.entry.term,
        fullName: candidate.entry.fullName,
        shortDef: candidate.entry.shortDef,
        category: candidate.entry.category,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }
  }

  // Remove overlapping matches: sort by start position, then by length (longest first)
  allMatches.sort((a, b) => a.startIndex - b.startIndex || (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex))

  const resolved: TermMatch[] = []
  let lastEnd = -1

  for (const m of allMatches) {
    if (m.startIndex >= lastEnd) {
      resolved.push(m)
      lastEnd = m.endIndex
    }
  }

  return resolved
}

/**
 * Apply learning-mode term highlights to already-formatted HTML.
 * Splits on HTML tags and only matches in text content portions,
 * following the same pattern as applyTickerLinks in format-utils.ts.
 */
export function applyLearningHighlights(html: string): string {
  if (!html) return html

  let result = html

  // Process candidates longest-first (already sorted)
  for (const candidate of matchCandidates) {
    const escaped = escapeRegExp(candidate.pattern)
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(candidate.pattern)
    const boundaryPattern = hasSpecialChars
      ? `(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`
      : `\\b${escaped}\\b`
    const regex = new RegExp(boundaryPattern, 'gi')

    // Split on HTML tags, process only text parts (same approach as applyTickerLinks)
    const parts = result.split(/(<[^>]*>)/g)
    result = parts
      .map((part) => {
        // If this part is an HTML tag, leave it alone
        if (part.startsWith('<')) return part
        // Skip if this text segment is empty
        if (!part.trim()) return part
        // Don't match inside already-wrapped learning-term spans
        // (text parts won't contain tags, but check for data attributes from prior replacements)
        return part.replace(regex, (matched) => {
          const safeDef = candidate.entry.shortDef
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const safeFull = candidate.entry.fullName
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          return `<span class="learning-term" data-learning-term="${candidate.entry.term}" data-term-full="${safeFull}" data-term-def="${safeDef}">${matched}</span>`
        })
      })
      .join('')
  }

  // Re-sanitize with learning-term data attributes allowed
  return DOMPurify.sanitize(result, {
    ALLOWED_TAGS: ['strong', 'em', 'a', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
    ADD_ATTR: ['data-ticker', 'data-economic-term', 'data-learning-term', 'data-term-full', 'data-term-def'],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  })
}
