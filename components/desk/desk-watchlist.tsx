"use client"

import { useMemo } from "react"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { cn } from "@/lib/utils"

interface DeskWatchlistProps {
  onAnalyze: (ticker: string, prompt: string) => void
}

type AlertTone = "negative" | "positive" | "warning" | null

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatSignedPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function getAlertState(
  price: number | null,
  above: number | null,
  below: number | null
): { label: string; tone: AlertTone; rank: number } {
  if (price == null) return { label: "", tone: null, rank: 3 }

  if (below != null) {
    const distanceToStop = ((price - below) / price) * 100
    if (distanceToStop >= 0 && distanceToStop <= 2.5) {
      return { label: "Near stop", tone: "negative", rank: 0 }
    }
  }

  if (above != null) {
    if (price >= above) {
      return { label: "Breakout", tone: "warning", rank: 1 }
    }

    const distanceToTarget = ((above - price) / price) * 100
    if (distanceToTarget >= 0 && distanceToTarget <= 2.5) {
      return { label: "Near target", tone: "positive", rank: 1 }
    }
  }

  return { label: "", tone: null, rank: 3 }
}

export default function DeskWatchlist({ onAnalyze }: DeskWatchlistProps) {
  const { items, loading } = useWatchlist()
  const tickers = useMemo(() => items.map((item) => item.ticker), [items])
  const { quotes } = useLiveQuotes(tickers)

  const rows = useMemo(() => {
    return items
      .map((item) => {
        const quote = quotes[item.ticker]
        const alert = getAlertState(
          quote?.price ?? null,
          item.alert_price_above,
          item.alert_price_below
        )

        const prompt = [
          `Analyze ${item.ticker}.`,
          quote?.price != null ? `Current price: $${quote.price.toFixed(2)}.` : "",
          item.alert_price_above != null ? `Alert above: $${item.alert_price_above}.` : "",
          item.alert_price_below != null ? `Alert below: $${item.alert_price_below}.` : "",
          item.custom_prompt ? `Watchlist note: "${item.custom_prompt}".` : item.notes ? `Notes: "${item.notes}".` : "",
          "Give me the setup, key levels, and whether this is near an actionable trigger or likely noise.",
        ].filter(Boolean).join(" ")

        return {
          item,
          price: quote?.price ?? null,
          changePercent: quote?.changePercent ?? null,
          alert,
          prompt,
        }
      })
      .sort((a, b) => {
        if (a.alert.rank !== b.alert.rank) return a.alert.rank - b.alert.rank
        return a.item.ticker.localeCompare(b.item.ticker)
      })
  }, [items, quotes])

  if (loading) {
    return <div className="h-full bg-[var(--bg-surface)]/40 animate-pulse" />
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
        No watchlist names yet — add tickers in chat or from the market views.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[1fr_repeat(3,minmax(88px,1fr))] px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            <span>Symbol</span>
            <span className="text-right">Price</span>
            <span className="text-right">%Chg</span>
            <span className="text-right">Alert</span>
          </div>

          <div className="space-y-0.5 px-1 pb-1">
            {rows.map((row) => (
              <button
                key={row.item.id}
                type="button"
                onClick={() => onAnalyze(row.item.ticker, row.prompt)}
                className="grid w-full grid-cols-[1fr_repeat(3,minmax(88px,1fr))] items-center rounded px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
              >
                <span className="font-[var(--font-geist-mono)] text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                  {row.item.ticker}
                </span>
                <span className="text-right font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-primary)]">
                  {formatCurrency(row.price)}
                </span>
                <span className={cn(
                  "text-right font-[var(--font-geist-mono)] text-xs tabular-nums",
                  (row.changePercent ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}>
                  {formatSignedPercent(row.changePercent)}
                </span>
                <span className="text-right">
                  {row.alert.label ? (
                    <span className={cn(
                      "inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      row.alert.tone === "negative" && "bg-[var(--data-negative)]/12 text-[var(--data-negative)]",
                      row.alert.tone === "positive" && "bg-[var(--data-positive)]/12 text-[var(--data-positive)]",
                      row.alert.tone === "warning" && "bg-[var(--data-warning)]/12 text-[var(--data-warning)]"
                    )}>
                      {row.alert.label}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
