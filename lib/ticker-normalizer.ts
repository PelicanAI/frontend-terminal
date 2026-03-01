/**
 * Ticker Normalizer
 * =================
 * Normalizes ticker inputs from chat messages, handling:
 * - Forex/crypto pair formats: BTC/USD, BTC-USD, BTCUSD → canonical + display
 * - Blocklist filtering for trading abbreviations
 * - Single-letter and ambiguous 2-letter ticker validation
 * - Asset type detection (stock/forex/crypto)
 */

import {
  TICKER_BLOCKLIST,
  KNOWN_FOREX_PAIRS,
  KNOWN_CRYPTO_PAIRS,
  VALID_SINGLE_LETTER_TICKERS,
  AMBIGUOUS_TWO_LETTER,
} from './ticker-blocklist'

export type AssetType = 'stock' | 'forex' | 'crypto'

export interface NormalizedTicker {
  /** Canonical form: no separators, uppercase. E.g. "BTCUSD", "AAPL" */
  canonical: string
  /** Display form: human-readable. E.g. "BTC/USD", "EUR/USD", "AAPL" */
  display: string
  /** Detected asset type */
  assetType: AssetType
}

/**
 * Normalize a single raw ticker string into canonical + display forms.
 * Returns null if the input is blocklisted or invalid.
 */
export function normalizeTicker(raw: string): NormalizedTicker | null {
  const trimmed = raw.trim().toUpperCase()
  if (!trimmed) return null

  // Strip $ prefix if present
  const cleaned = trimmed.startsWith('$') ? trimmed.slice(1) : trimmed

  // Remove separators to get canonical form
  const canonical = cleaned.replace(/[\/\-.\s]/g, '')

  // Check blocklist on the canonical form
  if (TICKER_BLOCKLIST.has(canonical)) return null

  // Check if it's a known forex pair
  if (KNOWN_FOREX_PAIRS.has(canonical)) {
    const base = canonical.slice(0, 3)
    const quote = canonical.slice(3)
    return { canonical, display: `${base}/${quote}`, assetType: 'forex' }
  }

  // Check if it's a known crypto pair
  if (KNOWN_CRYPTO_PAIRS.has(canonical)) {
    // Handle USDT pairs (4-char quote)
    const isUSDT = canonical.endsWith('USDT')
    const quote = isUSDT ? 'USDT' : 'USD'
    const base = canonical.slice(0, canonical.length - quote.length)
    return { canonical, display: `${base}/${quote}`, assetType: 'crypto' }
  }

  // Try to detect pair format even if not in known lists
  // Matches: XXX/YYY or XXX-YYY (original had separator)
  const hasSeparator = /[\/\-]/.test(cleaned)
  if (hasSeparator) {
    const parts = cleaned.split(/[\/\-]/)
    if (parts.length === 2 && parts[0] && parts[1]) {
      const base = parts[0]
      const quote = parts[1]
      if (base.length >= 2 && base.length <= 5 && quote.length >= 2 && quote.length <= 5) {
        // Currency pair — determine forex vs crypto
        const forexCurrencies = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'SGD', 'HKD', 'MXN', 'TRY', 'ZAR', 'NOK', 'SEK', 'PLN', 'DKK'])
        const isBothForex = forexCurrencies.has(base) && forexCurrencies.has(quote)
        const assetType: AssetType = isBothForex ? 'forex' : 'crypto'
        return { canonical, display: `${base}/${quote}`, assetType }
      }
    }
  }

  // Single-letter ticker validation
  if (canonical.length === 1) {
    if (VALID_SINGLE_LETTER_TICKERS.has(canonical)) {
      return { canonical, display: canonical, assetType: 'stock' }
    }
    return null
  }

  // 2-letter ticker validation — filter ambiguous ones
  if (canonical.length === 2) {
    if (AMBIGUOUS_TWO_LETTER.has(canonical)) return null
    if (TICKER_BLOCKLIST.has(canonical)) return null
    return { canonical, display: canonical, assetType: 'stock' }
  }

  // Standard ticker: 3-5 uppercase letters, already checked blocklist above
  if (/^[A-Z]{3,5}$/.test(canonical)) {
    return { canonical, display: canonical, assetType: 'stock' }
  }

  // Concatenated pair without separator (e.g. "BTCUSD" typed without / or -)
  // Only recognize if 6+ chars and looks like a known pair structure
  if (canonical.length >= 6 && canonical.length <= 10 && /^[A-Z]+$/.test(canonical)) {
    // Try splitting as crypto pair (base + USD/USDT)
    if (canonical.endsWith('USDT')) {
      const base = canonical.slice(0, -4)
      if (base.length >= 2) {
        return { canonical, display: `${base}/USDT`, assetType: 'crypto' }
      }
    }
    if (canonical.endsWith('USD')) {
      const base = canonical.slice(0, -3)
      if (base.length >= 2) {
        return { canonical, display: `${base}/USD`, assetType: 'crypto' }
      }
    }
  }

  return null
}

/**
 * Extract all tickers from a message string.
 * Returns deduplicated NormalizedTicker array.
 *
 * Priority:
 * 1. $TICKER patterns (explicit intent)
 * 2. Forex/crypto pairs with separators (BTC/USD, EUR-JPY)
 * 3. Standalone uppercase words (2-5 letters, filtered by blocklist)
 */
export function extractTickers(content: string): NormalizedTicker[] {
  const seen = new Map<string, NormalizedTicker>() // canonical → NormalizedTicker

  function addIfValid(raw: string) {
    const result = normalizeTicker(raw)
    if (result && !seen.has(result.canonical)) {
      seen.set(result.canonical, result)
    }
  }

  // 1. $TICKER patterns (most reliable — explicit intent)
  const dollarMatches = content.match(/\$([A-Z]{1,5})\b/g)
  if (dollarMatches) {
    for (const m of dollarMatches) {
      addIfValid(m.slice(1))
    }
  }

  // 2. Pairs with separators: BTC/USD, EUR-JPY, ETH/USDT
  const pairMatches = content.match(/\b[A-Z]{2,5}[\/\-][A-Z]{2,5}\b/g)
  if (pairMatches) {
    for (const m of pairMatches) {
      addIfValid(m)
    }
  }

  // 3. Standalone uppercase words (2-5 letters)
  const wordMatches = content.match(/\b[A-Z]{2,5}\b/g)
  if (wordMatches) {
    for (const m of wordMatches) {
      addIfValid(m)
    }
  }

  // Post-processing: contextual false-positive removal
  // Remove matches that appear adjacent to time patterns (e.g. "4:00 PM ET")
  const timeAdjacentPattern = /\d{1,2}:\d{2}\s*(?:AM|PM)?\s*([A-Z]{2,3})\b/g
  let timeMatch: RegExpExecArray | null
  while ((timeMatch = timeAdjacentPattern.exec(content)) !== null) {
    if (timeMatch[1]) seen.delete(timeMatch[1])
  }

  const results = Array.from(seen.values())
  return results.slice(0, 5)
}

/**
 * Convenience: extract just display-form ticker strings from content.
 * Drop-in replacement for the old extractTickers that returned string[].
 */
export function extractTickerStrings(content: string): string[] {
  return extractTickers(content).map(t => t.display)
}
