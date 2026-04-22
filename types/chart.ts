/* Chart overlay & indicator type definitions */

/** Drawing tool identifiers (klinecharts built-in overlay names) */
export type OverlayTool =
  | 'horizontalStraightLine'
  | 'straightLine'
  | 'fibonacciLine'
  | 'rect'
  | 'parallelStraightLine'
  | 'priceChannelLine'

/** Built-in klinecharts indicator names */
export type ChartIndicator =
  | 'MA'
  | 'EMA'
  | 'BOLL'
  | 'SAR'
  | 'VOL'
  | 'MACD'
  | 'RSI'
  | 'KDJ'
  | 'ATR'

/** Timeframe key (matches TIMEFRAMES array in desk-chart.tsx) */
export type TimeframeKey = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W'

/** Maps a timeframe to Polygon API request params */
export interface TimeframeApiParams {
  multiplier: string
  timespan: 'minute' | 'hour' | 'day' | 'week'
  daysBack: number
}

/* ── Pelican intelligence overlay types (future use) ── */

export interface PelicanPriceLevel {
  price: number
  type: 'support' | 'resistance' | 'target' | 'stop' | 'entry' | 'moving_average' | 'fibonacci' | 'pivot' | 'vwap'
  style?: 'solid' | 'dashed'
  label?: string
  confidence?: 'high' | 'medium' | 'low'
  color?: string
}

export interface TradeMarker {
  timestamp: number
  price: number
  type: 'entry' | 'exit' | 'stop_hit'
  direction: 'long' | 'short'
  pnl?: number
  pnlPercent?: number
  rMultiple?: number
  setupTag?: string
  tradeId?: string
  label?: string
}

export interface PriceZone {
  priceHigh: number
  priceLow: number
  winRate: number
  totalTrades: number
  wins: number
  color?: string
}

export interface ChartAnnotation {
  timestamp: number
  price?: number
  text: string
  type: 'pelican_insight' | 'thesis' | 'catalyst' | 'volume_alert' | 'pattern'
  severity?: 'info' | 'warning' | 'positive'
}

export interface PatternOverlay {
  type: 'head_and_shoulders' | 'double_top' | 'double_bottom' | 'flag' | 'channel' | 'triangle' | 'wedge'
  points: Array<{ timestamp: number; price: number }>
  label?: string
  confidence?: 'high' | 'medium' | 'low'
}
