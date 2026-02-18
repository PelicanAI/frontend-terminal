import type {
  MessageAction,
  ActionTrade,
  ActionWatchlistItem,
} from '@/types/action-buttons'
import { extractTradingMetadata, TRADING_ACRONYMS } from '@/lib/trading-metadata'

/**
 * Extract tickers from a message.
 * Primary: use backend-extracted tickers from extractTradingMetadata.
 * Fallback: parse $TICKER patterns from content.
 */
export function extractTickers(content: string): string[] {
  // First try $TICKER patterns (most reliable — explicit intent)
  const dollarMatches = content.match(/\$([A-Z]{1,5})\b/g)
  if (dollarMatches && dollarMatches.length > 0) {
    const tickers = dollarMatches
      .map(m => m.slice(1))
      .filter(t => !TRADING_ACRONYMS.has(t))
    const unique = [...new Set(tickers)]
    if (unique.length > 0) return unique.slice(0, 5)
  }

  // Fall back to extractTradingMetadata (uppercase word matching with blocklist)
  const meta = extractTradingMetadata(content)
  if (meta.tickers && meta.tickers.length > 0) {
    return meta.tickers.slice(0, 5)
  }

  return []
}

/**
 * Given detected tickers and user data, resolve which action buttons to show.
 */
export function resolveActions(
  tickers: string[],
  trades: ActionTrade[],
  watchlist: ActionWatchlistItem[],
  messageRole: string,
  isStreaming: boolean,
  hasContent: boolean
): MessageAction[] {
  if (messageRole !== 'assistant') return []
  if (isStreaming) return []
  if (!hasContent) return []

  const actions: MessageAction[] = []

  const tradeMap = new Map<string, ActionTrade>()
  for (const t of trades) {
    tradeMap.set(t.ticker.toUpperCase(), t)
  }
  const watchlistSet = new Set(watchlist.map(w => w.ticker.toUpperCase()))

  for (const ticker of tickers) {
    const upper = ticker.toUpperCase()
    const trade = tradeMap.get(upper)

    if (trade && trade.status === 'open') {
      actions.push({
        id: `view-${upper}`,
        type: 'view_position',
        label: `${upper} Position`,
        ticker: upper,
        tradeId: trade.id,
        tradeStatus: 'open',
        priority: 1,
      })
      actions.push({
        id: `scan-${upper}`,
        type: 'pelican_scan',
        label: `Scan ${upper}`,
        ticker: upper,
        tradeId: trade.id,
        tradeStatus: 'open',
        priority: 2,
      })
      actions.push({
        id: `close-${upper}`,
        type: 'close_trade',
        label: `Close ${upper}`,
        ticker: upper,
        tradeId: trade.id,
        tradeStatus: 'open',
        priority: 8,
      })
    } else if (trade && trade.status === 'closed') {
      actions.push({
        id: `review-${upper}`,
        type: 'review_trade',
        label: `Review ${upper} Trade`,
        ticker: upper,
        tradeId: trade.id,
        tradeStatus: 'closed',
        priority: 4,
      })
    } else {
      actions.push({
        id: `log-${upper}`,
        type: 'log_trade',
        label: `Log ${upper}`,
        ticker: upper,
        priority: 3,
      })
    }

    // Watchlist: only if NOT an open position
    if (!trade || trade.status !== 'open') {
      if (watchlistSet.has(upper)) {
        actions.push({
          id: `unwatch-${upper}`,
          type: 'remove_watchlist',
          label: `Unwatch ${upper}`,
          ticker: upper,
          priority: 7,
        })
      } else {
        actions.push({
          id: `watch-${upper}`,
          type: 'add_watchlist',
          label: `Watch ${upper}`,
          ticker: upper,
          priority: 3,
        })
      }
    }

    actions.push({
      id: `dive-${upper}`,
      type: 'deep_dive',
      label: `Deep Dive ${upper}`,
      ticker: upper,
      priority: 6,
    })
  }

  // Multi-ticker comparison
  if (tickers.length >= 2) {
    const t0 = tickers[0]!
    const t1 = tickers[1]!
    actions.push({
      id: `compare-${t0}-${t1}`,
      type: 'compare',
      label: `Compare ${t0} vs ${t1}`,
      compareTickers: [t0, t1],
      priority: 3,
    })
  }

  // Cross-feature navigation
  if (tickers.length > 0) {
    actions.push({
      id: 'show-heatmap',
      type: 'show_heatmap',
      label: 'Heatmap',
      priority: 10,
    })
  }

  if (tickers.length >= 2) {
    const c0 = tickers[0]!
    const c1 = tickers[1]!
    actions.push({
      id: `correlations-${c0}-${c1}`,
      type: 'show_correlations',
      label: `Correlations`,
      compareTickers: [c0, c1],
      priority: 10,
    })
  }

  // Always available
  actions.push({
    id: 'save-insight',
    type: 'save_insight',
    label: 'Save Insight',
    priority: 20,
  })

  // Deduplicate + sort by priority
  const seen = new Set<string>()
  return actions
    .sort((a, b) => a.priority - b.priority)
    .filter(action => {
      const key = `${action.type}-${action.ticker || 'global'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
