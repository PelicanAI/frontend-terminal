/**
 * Comprehensive blocklist of trading/finance abbreviations that are NOT stock tickers.
 * Used by ticker-normalizer.ts to filter false positives from chat messages.
 */

export const TICKER_BLOCKLIST = new Set([
  // Risk management
  'SL', 'TP', 'BE', 'RR',
  // P&L and accounting
  'PNL', 'ROI', 'ROE', 'ROA', 'ROIC', 'NAV', 'AUM', 'EPS', 'PE',
  'DCF', 'GAAP', 'EBITDA',
  // Order types
  'GTC', 'IOC', 'FOK', 'MOC', 'LOC', 'MOO', 'LOO',
  // Options terminology
  'OTM', 'ITM', 'ATM', 'DTE', 'IV', 'HV', 'OI', 'BPS', 'DIA',
  // Technical indicators
  'EMA', 'SMA', 'RSI', 'MACD', 'VWAP', 'MFI', 'ADR', 'ATR',
  'ADX', 'CCI', 'DMI', 'OBV', 'SAR', 'BB', 'BOLL',
  // Trading jargon
  'DCA', 'ATH', 'ATL', 'EOD', 'HOD', 'LOD', 'PDT',
  'IPO', 'SPO', 'ICO', 'IDO', 'IEO', 'OTC',
  'DD', 'TA', 'FA', 'PA',
  'FD', 'FOMO', 'FUD', 'IMO', 'HODL', 'BTFD',
  // Timeframes
  'YTD', 'MTD', 'WTD', 'QTD', 'HTF', 'LTF', 'TF',
  'QOQ', 'MOM', 'YOY',
  // Market structure
  'BOS', 'FVG', 'OB', 'POI', 'MSS',
  // Common false positives — general abbreviations
  'AI', 'US', 'UK', 'EU', 'PM', 'AM', 'CEO', 'CFO', 'CTO', 'COO', 'CIO',
  'ETF', 'ETN', 'IRA', 'LLC', 'INC', 'LTD', 'SEC', 'FED',
  'GDP', 'CPI', 'PPI', 'PMI', 'ISM',
  'NFP', 'FOMC', 'ECB', 'BOJ', 'BOE', 'RBA', 'SNB', 'IMF', 'JOLTS',
  'FAQ', 'USA', 'APR', 'APY',
  // Tech abbreviations
  'ML', 'API', 'URL', 'DNS', 'CSS', 'HTML',
  // Exchanges and organizations
  'NYSE', 'CBOE', 'CFTC', 'FDIC', 'FINRA', 'SIPC', 'DTCC', 'ISDA',
  // Currencies (standalone)
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF',
  'CNY', 'HKD', 'SGD', 'KRW',
  // Crypto jargon
  'NFT', 'DAO', 'DEX', 'CEX', 'TVL',
  'DEFI', 'CEFI', 'MEV', 'GAS', 'WEI', 'GWEI',
  // Timezone abbreviations
  'EST', 'PST', 'CST', 'MST', 'EDT', 'PDT', 'CDT', 'MDT', 'UTC', 'GMT',
  // Trading session terms
  'RTH', 'ETH', 'AHT',
  // Common trading nouns/verbs that collide with tickers
  'MAX', 'MIN', 'AVG', 'QTY', 'VOL', 'BID', 'ASK', 'MID',
  'HIGH', 'LOW', 'OPEN', 'LAST',
  'STOP', 'TAKE', 'RISK', 'SIZE', 'FLAT',
  'CALL', 'PUTS', 'LONG', 'SHORT',
  'BULL', 'BEAR', 'HOLD', 'TRIM', 'EXIT', 'ENTRY',
  'GAIN', 'LOSS', 'WINS', 'SELL',
  'PLAN', 'RULE', 'NOTE', 'SAVE', 'EDIT', 'VIEW',
  'SCAN', 'DEEP', 'DIVE',
  // Common English words that appear uppercase
  'I', 'A', 'THE', 'AND', 'OR', 'BUT', 'FOR', 'TO', 'IN', 'ON', 'AT', 'BY', 'UP',
  'IS', 'IT', 'OF', 'AS', 'BE', 'ARE', 'WAS', 'SO', 'IF', 'MY', 'ME', 'DO', 'GO',
  'NO', 'AN', 'OK',
])

/** Known forex pairs (canonical form, no separator) */
export const KNOWN_FOREX_PAIRS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
  'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD',
  'EURCHF', 'GBPCHF', 'GBPAUD', 'AUDNZD', 'NZDJPY', 'CADJPY',
  'AUDCAD', 'AUDCHF', 'CHFJPY', 'EURNZD', 'EURCAD', 'GBPCAD',
  'GBPNZD', 'NZDCAD', 'NZDCHF', 'USDSGD', 'USDHKD', 'USDMXN',
  'USDTRY', 'USDZAR', 'USDNOK', 'USDSEK', 'USDPLN', 'USDDKK',
])

/** Known crypto pairs (canonical form, no separator) */
export const KNOWN_CRYPTO_PAIRS = new Set([
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'XRPUSD',
  'DOTUSD', 'AVAXUSD', 'MATICUSD', 'LINKUSD', 'UNIUSD', 'AAVEUSD',
  'ATOMUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'ARBUSD', 'OPUSD',
  'APTUSD', 'SUIUSD', 'FILUSD', 'INJUSD', 'TIAUSD', 'SEIUSD',
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSD', 'SHIBUSD', 'PEPEUSD',
  'MKRUSD', 'XLMUSD', 'ALGOUSD',
])

/** Valid single-letter stock tickers */
export const VALID_SINGLE_LETTER_TICKERS = new Set([
  'F', 'X', 'V', 'T', 'C', 'K',
])

/** 2-letter strings that are ambiguous and should NOT be treated as tickers */
export const AMBIGUOUS_TWO_LETTER = new Set([
  'AI', 'GO', 'ON', 'IT', 'IS', 'AT', 'BY', 'UP', 'IN', 'TO',
  'OF', 'AS', 'BE', 'IF', 'MY', 'ME', 'DO', 'NO', 'SO', 'AN',
  'OR', 'AM', 'PM', 'OK', 'US', 'UK', 'EU',
  'DD', 'TA', 'FA', 'PA', 'SL', 'TP', 'BE', 'RR', 'IV', 'HV',
  'OI', 'BB', 'OB', 'FD',
  // Timezone abbreviations
  'ET', 'PT', 'CT', 'MT',
  // Common English/trading abbreviations
  'RE', 'VS', 'AD', 'PS', 'TV', 'DJ', 'FX', 'EX', 'PC', 'PR',
  'HR', 'WK', 'MO', 'YR',
])
