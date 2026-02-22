export interface ForexPair {
  symbol: string       // "C:EURUSD" (Polygon format)
  displayName: string  // "EUR/USD"
  base: string
  quote: string
  category: 'major' | 'minor' | 'exotic'
}

export const FOREX_PAIRS: ForexPair[] = [
  // 7 Majors
  { symbol: 'C:EURUSD', displayName: 'EUR/USD', base: 'EUR', quote: 'USD', category: 'major' },
  { symbol: 'C:GBPUSD', displayName: 'GBP/USD', base: 'GBP', quote: 'USD', category: 'major' },
  { symbol: 'C:USDJPY', displayName: 'USD/JPY', base: 'USD', quote: 'JPY', category: 'major' },
  { symbol: 'C:USDCHF', displayName: 'USD/CHF', base: 'USD', quote: 'CHF', category: 'major' },
  { symbol: 'C:AUDUSD', displayName: 'AUD/USD', base: 'AUD', quote: 'USD', category: 'major' },
  { symbol: 'C:USDCAD', displayName: 'USD/CAD', base: 'USD', quote: 'CAD', category: 'major' },
  { symbol: 'C:NZDUSD', displayName: 'NZD/USD', base: 'NZD', quote: 'USD', category: 'major' },
  // 12 Minors (cross pairs)
  { symbol: 'C:EURGBP', displayName: 'EUR/GBP', base: 'EUR', quote: 'GBP', category: 'minor' },
  { symbol: 'C:EURJPY', displayName: 'EUR/JPY', base: 'EUR', quote: 'JPY', category: 'minor' },
  { symbol: 'C:GBPJPY', displayName: 'GBP/JPY', base: 'GBP', quote: 'JPY', category: 'minor' },
  { symbol: 'C:GBPAUD', displayName: 'GBP/AUD', base: 'GBP', quote: 'AUD', category: 'minor' },
  { symbol: 'C:EURAUD', displayName: 'EUR/AUD', base: 'EUR', quote: 'AUD', category: 'minor' },
  { symbol: 'C:EURCHF', displayName: 'EUR/CHF', base: 'EUR', quote: 'CHF', category: 'minor' },
  { symbol: 'C:CADJPY', displayName: 'CAD/JPY', base: 'CAD', quote: 'JPY', category: 'minor' },
  { symbol: 'C:AUDJPY', displayName: 'AUD/JPY', base: 'AUD', quote: 'JPY', category: 'minor' },
  { symbol: 'C:NZDJPY', displayName: 'NZD/JPY', base: 'NZD', quote: 'JPY', category: 'minor' },
  { symbol: 'C:AUDCAD', displayName: 'AUD/CAD', base: 'AUD', quote: 'CAD', category: 'minor' },
  { symbol: 'C:AUDNZD', displayName: 'AUD/NZD', base: 'AUD', quote: 'NZD', category: 'minor' },
  { symbol: 'C:GBPCAD', displayName: 'GBP/CAD', base: 'GBP', quote: 'CAD', category: 'minor' },
]

export const FOREX_CATEGORIES = ['major', 'minor'] as const
export type ForexCategory = typeof FOREX_CATEGORIES[number]

export function getForexCategories(): string[] {
  return [...FOREX_CATEGORIES]
}
