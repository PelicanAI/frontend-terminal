// Maps user's stock tickers to their closest proxy in the correlation matrix.
// The core assets in correlation_assets are:
// SPX, NDX, DJI, RUT, SMH, MAGS, VIX, TNX, GOLD, COPPER, HYG, LQD, XLE, DXY, USDJPY, BTC, XAUUSD, XLF

export const TICKER_TO_PROXY: Record<string, string> = {
  // Tech -> NDX
  'AAPL': 'NDX', 'MSFT': 'NDX', 'GOOGL': 'NDX', 'GOOG': 'NDX',
  'AMZN': 'NDX', 'META': 'NDX', 'TSLA': 'NDX', 'NFLX': 'NDX',

  // Semiconductors -> SMH
  'NVDA': 'SMH', 'AMD': 'SMH', 'AVGO': 'SMH', 'TSM': 'SMH',
  'INTC': 'SMH', 'QCOM': 'SMH', 'MU': 'SMH', 'MRVL': 'SMH',
  'ASML': 'SMH', 'LRCX': 'SMH', 'AMAT': 'SMH', 'KLAC': 'SMH',

  // Mega-cap growth -> MAGS
  'PLTR': 'MAGS', 'CRM': 'MAGS', 'SNOW': 'MAGS', 'NOW': 'MAGS',

  // Energy -> XLE
  'XOM': 'XLE', 'CVX': 'XLE', 'COP': 'XLE', 'SLB': 'XLE',
  'EOG': 'XLE', 'MPC': 'XLE', 'PSX': 'XLE', 'VLO': 'XLE',
  'OXY': 'XLE', 'HAL': 'XLE', 'DVN': 'XLE',

  // Financials -> SPX (XLF not always in correlation matrix)
  'JPM': 'SPX', 'BAC': 'SPX', 'GS': 'SPX', 'MS': 'SPX',
  'WFC': 'SPX', 'C': 'SPX', 'BLK': 'SPX', 'SCHW': 'SPX',

  // Small caps -> RUT
  'IWM': 'RUT', 'ARKK': 'RUT',

  // Crypto -> BTC
  'COIN': 'BTC', 'MARA': 'BTC', 'MSTR': 'BTC', 'RIOT': 'BTC',
  'GBTC': 'BTC', 'IBIT': 'BTC',
  'ETHUSD': 'BTC', 'ETH': 'BTC', 'SOLUSD': 'BTC',

  // Gold -> GOLD or XAUUSD
  'GLD': 'GOLD', 'GDX': 'GOLD', 'NEM': 'GOLD', 'GOLD': 'GOLD',
  'AEM': 'GOLD',

  // Bonds -> TNX or LQD
  'TLT': 'TNX', 'IEF': 'TNX', 'SHY': 'TNX', 'AGG': 'LQD',
  'BND': 'LQD',

  // Indices (already in matrix)
  'SPY': 'SPX', 'QQQ': 'NDX', 'DIA': 'DJI',

  // Broad market -> SPX (default)
  'VOO': 'SPX', 'VTI': 'SPX', 'COST': 'SPX', 'WMT': 'SPX',
  'JNJ': 'SPX', 'PG': 'SPX', 'KO': 'SPX', 'PEP': 'SPX',
  'UNH': 'SPX', 'V': 'SPX', 'MA': 'SPX', 'HD': 'SPX',
  'DIS': 'SPX', 'MCD': 'SPX', 'NKE': 'SPX', 'SBUX': 'SPX',
}

/** Get the correlation matrix proxy for a user's ticker */
export function getCorrelationProxy(ticker: string): string {
  const upper = ticker.toUpperCase()
  return TICKER_TO_PROXY[upper] || 'SPX'
}

/** Get the sector label for a proxy */
export function getProxyLabel(proxy: string): string {
  const labels: Record<string, string> = {
    'NDX': 'Tech',
    'SMH': 'Semiconductors',
    'MAGS': 'Mega Growth',
    'SPX': 'Broad Market',
    'DJI': 'Blue Chip',
    'RUT': 'Small Cap',
    'XLE': 'Energy',
    'BTC': 'Crypto',
    'GOLD': 'Gold',
    'XAUUSD': 'Gold',
    'TNX': 'Bonds',
    'LQD': 'Bonds',
    'HYG': 'High Yield',
    'VIX': 'Volatility',
    'DXY': 'Dollar',
    'USDJPY': 'Yen',
    'COPPER': 'Copper',
    'XLF': 'Financials',
  }
  return labels[proxy] || proxy
}

/** Group tickers by their proxy to detect concentration */
export function groupByProxy(tickers: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const ticker of tickers) {
    const proxy = getCorrelationProxy(ticker)
    if (!groups[proxy]) groups[proxy] = []
    groups[proxy].push(ticker)
  }
  return groups
}
