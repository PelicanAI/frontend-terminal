import type {
  MessageAction,
  ActionTrade,
  ActionWatchlistItem,
} from '@/types/action-buttons'
import {
  extractTickers as extractNormalizedTickers,
  type NormalizedTicker,
} from '@/lib/ticker-normalizer'
import { normalizeTicker as normalizeTickerString } from '@/lib/utils'

/**
 * Extract tickers from a message.
 * Uses the new ticker-normalizer which handles blocklist, pair normalization,
 * and deduplication in one pass.
 *
 * Returns display-form strings for backward compatibility.
 */
export function extractTickers(content: string): string[] {
  return extractNormalizedTickers(content).map(t => t.display)
}

/**
 * Extract full NormalizedTicker objects (canonical + display + assetType).
 */
export function extractNormalizedTickerObjects(content: string): NormalizedTicker[] {
  return extractNormalizedTickers(content)
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
    tradeMap.set(normalizeTickerString(t.ticker), t)
  }
  const watchlistSet = new Set(watchlist.map(w => normalizeTickerString(w.ticker)))

  for (const ticker of tickers) {
    // Use canonical form for lookups (strip separators)
    const canonical = normalizeTickerString(ticker)
    const display = ticker // Already in display form from extractTickers
    const trade = tradeMap.get(canonical)

    if (trade && trade.status === 'open') {
      actions.push({
        id: `view-${canonical}`,
        type: 'view_position',
        label: `${display} Position`,
        ticker: canonical,
        tradeId: trade.id,
        tradeStatus: 'open',
        priority: 1,
      })
      actions.push({
        id: `scan-${canonical}`,
        type: 'pelican_scan',
        label: `Scan ${display}`,
        ticker: canonical,
        tradeId: trade.id,
        tradeStatus: 'open',
        priority: 2,
      })
      actions.push({
        id: `close-${canonical}`,
        type: 'close_trade',
        label: `Close ${display}`,
        ticker: canonical,
        tradeId: trade.id,
        tradeStatus: 'open',
        priority: 8,
      })
    } else if (trade && trade.status === 'closed') {
      actions.push({
        id: `review-${canonical}`,
        type: 'review_trade',
        label: `Review ${display} Trade`,
        ticker: canonical,
        tradeId: trade.id,
        tradeStatus: 'closed',
        priority: 4,
      })
    } else {
      actions.push({
        id: `log-${canonical}`,
        type: 'log_trade',
        label: `Log ${display}`,
        ticker: canonical,
        priority: 3,
      })
    }

    // Watchlist: only if NOT an open position
    if (!trade || trade.status !== 'open') {
      if (watchlistSet.has(canonical)) {
        actions.push({
          id: `unwatch-${canonical}`,
          type: 'remove_watchlist',
          label: `Unwatch ${display}`,
          ticker: canonical,
          priority: 7,
        })
      } else {
        actions.push({
          id: `watch-${canonical}`,
          type: 'add_watchlist',
          label: `Watch ${display}`,
          ticker: canonical,
          priority: 3,
        })
      }
    }

    actions.push({
      id: `dive-${canonical}`,
      type: 'deep_dive',
      label: `Deep Dive ${display}`,
      ticker: canonical,
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

  // Plan & profile actions (always available)
  actions.push({
    id: 'analyze-behavior',
    type: 'analyze_behavior',
    label: 'Analyze My Trading',
    priority: 15,
  })

  actions.push({
    id: 'check-plan',
    type: 'check_plan',
    label: 'Check My Plan',
    priority: 16,
  })

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
