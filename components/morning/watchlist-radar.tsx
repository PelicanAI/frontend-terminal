'use client'

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Target01Icon as Crosshair, Alert01Icon as Warning } from '@hugeicons/core-free-icons'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'

interface WatchlistItem {
  id: string
  ticker: string
  notes: string | null
  alert_price_above: number | null
  alert_price_below: number | null
  created_at: string
}

interface WatchlistRadarProps {
  watchlistItems: WatchlistItem[]
  quotes: Record<string, { price: number; change?: number; changePercent?: number }>
  onAnalyze: (ticker: string, prompt: string) => void
}

export function WatchlistRadar({ watchlistItems, quotes, onAnalyze }: WatchlistRadarProps) {
  // Process items with proximity data
  const radarItems = useMemo(() => {
    return watchlistItems.map(item => {
      const quote = quotes[item.ticker]
      const price = quote?.price ?? null
      const changePercent = quote?.changePercent ?? null

      let proximityLabel: string | null = null
      let isNearTarget = false
      let isNearStop = false
      let progressPercent: number | null = null

      if (price != null) {
        // Check proximity to alert_price_above (target)
        if (item.alert_price_above != null) {
          const distToTarget = ((item.alert_price_above - price) / price) * 100
          if (distToTarget > 0 && distToTarget <= 5) {
            isNearTarget = true
            proximityLabel = `${distToTarget.toFixed(1)}% to target`
          } else if (distToTarget > 0) {
            proximityLabel = `${distToTarget.toFixed(1)}% to target ($${item.alert_price_above})`
          } else {
            // Price has exceeded target
            isNearTarget = true
            proximityLabel = `Above target ($${item.alert_price_above})`
          }
        }

        // Check proximity to alert_price_below (stop)
        if (item.alert_price_below != null) {
          const distToStop = ((price - item.alert_price_below) / price) * 100
          if (distToStop >= 0 && distToStop <= 5) {
            isNearStop = true
            proximityLabel = `${distToStop.toFixed(1)}% from stop ($${item.alert_price_below})`
          }
        }

        // Calculate progress bar if both levels are set
        if (item.alert_price_above != null && item.alert_price_below != null) {
          const range = item.alert_price_above - item.alert_price_below
          if (range > 0) {
            progressPercent = Math.max(0, Math.min(100, ((price - item.alert_price_below) / range) * 100))
          }
        } else if (item.alert_price_above != null) {
          // Only target set -- show progress from 90% of target to target
          const floor = item.alert_price_above * 0.9
          const range = item.alert_price_above - floor
          if (range > 0) {
            progressPercent = Math.max(0, Math.min(100, ((price - floor) / range) * 100))
          }
        }
      }

      return {
        ...item,
        price,
        changePercent,
        proximityLabel,
        isNearTarget,
        isNearStop,
        progressPercent,
      }
    })
  }, [watchlistItems, quotes])

  // Sort: near alerts first, then alphabetical
  const sortedItems = useMemo(() => {
    return [...radarItems].sort((a, b) => {
      if (a.isNearStop && !b.isNearStop) return -1
      if (!a.isNearStop && b.isNearStop) return 1
      if (a.isNearTarget && !b.isNearTarget) return -1
      if (!a.isNearTarget && b.isNearTarget) return 1
      return a.ticker.localeCompare(b.ticker)
    })
  }, [radarItems])

  return (
    <PelicanCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Crosshair} className="h-4 w-4 text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Watchlist Radar</h2>
        </div>
        <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
          {watchlistItems.length} tracking
        </span>
      </div>

      {watchlistItems.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <HugeiconsIcon icon={Crosshair} className="h-8 w-8 text-[var(--text-muted)] mb-2" strokeWidth={1} color="currentColor" />
          <p className="text-sm text-[var(--text-muted)]">No watchlist tickers</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Add tickers from chat or the sidebar to track them here</p>
        </div>
      ) : (
        <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
          {sortedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                const prompt = item.alert_price_above
                  ? `Deep dive on ${item.ticker}. Current price: $${item.price?.toFixed(2) ?? '---'}. My target is $${item.alert_price_above}${item.alert_price_below ? `, stop at $${item.alert_price_below}` : ''}. How does the setup look? Key levels and catalysts?`
                  : `Analyze ${item.ticker} at $${item.price?.toFixed(2) ?? '---'}. What are the key support/resistance levels and where should I set price alerts?`
                onAnalyze(item.ticker, prompt)
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150 hover:bg-[var(--bg-elevated)] active:scale-[0.98]"
            >
              {/* Row 1: Ticker + Price + Change */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{item.ticker}</span>
                  {item.isNearStop && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--data-negative)]/10 text-[var(--data-negative)]">
                      <HugeiconsIcon icon={Warning} className="h-3 w-3" strokeWidth={2} color="currentColor" />
                      NEAR STOP
                    </span>
                  )}
                  {item.isNearTarget && !item.isNearStop && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--data-positive)]/10 text-[var(--data-positive)]">
                      NEAR TARGET
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-sm text-[var(--text-primary)]">
                    {item.price != null ? `$${item.price.toFixed(2)}` : '---'}
                  </span>
                  {item.changePercent != null && (
                    <span className={cn(
                      "font-mono tabular-nums text-xs",
                      item.changePercent >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
                    )}>
                      {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Progress bar + proximity label OR "No alerts set" */}
              {item.alert_price_above != null || item.alert_price_below != null ? (
                <div>
                  {item.progressPercent != null && (
                    <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-1">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          item.isNearStop ? 'bg-[var(--data-negative)]' :
                          item.isNearTarget ? 'bg-[var(--data-positive)]' :
                          'bg-[var(--accent-primary)]'
                        )}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  )}
                  {item.proximityLabel && (
                    <p className="text-xs text-[var(--text-muted)]">{item.proximityLabel}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-disabled)]">No price alerts set</p>
              )}
            </button>
          ))}
        </div>
      )}
    </PelicanCard>
  )
}
