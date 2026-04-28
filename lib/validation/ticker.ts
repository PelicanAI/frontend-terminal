export const TICKER_REGEX = /^[A-Z0-9.:/-]{1,32}$/

export function isValidTicker(ticker: string): boolean {
  return TICKER_REGEX.test(ticker)
}

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase()
}
