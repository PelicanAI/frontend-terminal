export type ActionType =
  | 'view_position'
  | 'pelican_scan'
  | 'close_trade'
  | 'review_trade'
  | 'log_trade'
  | 'add_watchlist'
  | 'remove_watchlist'
  | 'open_chart'
  | 'deep_dive'
  | 'compare'
  | 'save_insight'

export interface MessageAction {
  id: string
  type: ActionType
  label: string
  ticker?: string
  tradeId?: string
  tradeStatus?: 'open' | 'closed'
  compareTickers?: [string, string]
  priority: number
}

export interface ActionTrade {
  id: string
  ticker: string
  direction: string
  status: string
  entry_price: number
  stop_loss: number | null
  take_profit: number | null
  thesis: string | null
  pnl_amount: number | null
  pnl_percent: number | null
}

export interface ActionWatchlistItem {
  id: string
  ticker: string
}
