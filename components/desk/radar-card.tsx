"use client"

import { useCallback, useMemo } from "react"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { cn } from "@/lib/utils"

interface RadarCardProps {
  onTickerClick: (ticker: string) => void
  onAnalyze: (ticker: string | null, prompt: string) => void
}

function getAlertBadge(
  price: number | null,
  above: number | null,
  below: number | null,
  customPrompt: string | null
): { label: string | null; tone: "positive" | "negative" | "warning" | null; rank: number } {
  if (price != null && below != null) {
    const distanceToStop = ((price - below) / price) * 100
    if (distanceToStop >= 0 && distanceToStop <= 2.5) {
      return { label: "STOP", tone: "negative", rank: 0 }
    }
  }

  if (price != null && above != null) {
    if (price >= above) {
      return { label: "TARGET", tone: "positive", rank: 1 }
    }

    const distanceToTrigger = ((above - price) / price) * 100
    if (distanceToTrigger >= 0 && distanceToTrigger <= 2.5) {
      return { label: "SETUP", tone: "warning", rank: 1 }
    }
  }

  if (customPrompt) {
    return { label: "NOTE", tone: "warning", rank: 2 }
  }

  return { label: null, tone: null, rank: 3 }
}

export default function RadarCard({ onTickerClick, onAnalyze }: RadarCardProps) {
  const { items, loading } = useWatchlist()
  const tickers = useMemo(() => items.map((item) => item.ticker), [items])
  const { quotes } = useLiveQuotes(tickers)

  const handleAnalyze = useCallback((ticker: string, prompt: string) => {
    onTickerClick(ticker)
    onAnalyze(ticker, prompt)
  }, [onAnalyze, onTickerClick])

  const rows = useMemo(() => {
    return items
      .map((item) => {
        const quote = quotes[item.ticker]
        const badge = getAlertBadge(
          quote?.price ?? null,
          item.alert_price_above,
          item.alert_price_below,
          item.custom_prompt
        )

        const prompt = item.alert_price_above
          ? `Deep dive on ${item.ticker}. Current price: $${quote?.price?.toFixed(2) ?? "---"}. My alert above is $${item.alert_price_above}${item.alert_price_below ? ` and my alert below is $${item.alert_price_below}` : ""}. Is this nearing an actionable trigger or still noise?`
          : `Analyze ${item.ticker}. Current price: $${quote?.price?.toFixed(2) ?? "---"}. What levels matter right now, and what would make this watchlist name actionable today?`

        return {
          ticker: item.ticker,
          price: quote?.price ?? null,
          changePercent: quote?.changePercent ?? null,
          badge,
          prompt,
        }
      })
      .sort((a, b) => {
        if (a.badge.rank !== b.badge.rank) return a.badge.rank - b.badge.rank
        return a.ticker.localeCompare(b.ticker)
      })
  }, [items, quotes])

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Watchlist radar</span>
        <span className="flex-shrink-0 font-[var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">{items.length} tracking</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-7 rounded bg-[var(--bg-elevated)] animate-pulse" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          rows.map((item) => (
            <button
              key={item.ticker}
              type="button"
              onClick={() => handleAnalyze(item.ticker, item.prompt)}
              className="flex min-w-0 w-full items-center gap-2 rounded px-3 py-1 text-left transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <span className="w-12 flex-shrink-0 text-xs font-semibold text-[var(--text-primary)]">{item.ticker}</span>
              {item.badge.label && (
                <span
                  className={cn(
                    "flex-shrink-0 rounded px-1 py-px text-[8px] font-medium",
                    item.badge.tone === "positive" && "bg-[var(--data-positive)]/10 text-[var(--data-positive)]",
                    item.badge.tone === "negative" && "bg-[var(--data-negative)]/10 text-[var(--data-negative)]",
                    item.badge.tone === "warning" && "bg-[var(--data-warning)]/10 text-[var(--data-warning)]"
                  )}
                >
                  {item.badge.label}
                </span>
              )}
              <span className="ml-auto whitespace-nowrap font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-secondary)]">
                {item.price != null ? `$${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
              </span>
              <span
                className={cn(
                  "w-14 flex-shrink-0 text-right font-[var(--font-geist-mono)] text-[10px] tabular-nums",
                  (item.changePercent ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}
              >
                {item.changePercent != null ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%` : "—"}
              </span>
            </button>
          ))
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center">
            <p className="text-xs text-[var(--text-muted)]">Add a few tickers to your watchlist to populate radar.</p>
          </div>
        )}
      </div>
    </section>
  )
}
