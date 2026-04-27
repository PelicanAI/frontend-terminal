"use client"

import { useMemo, useState } from "react"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { cn } from "@/lib/utils"

interface DeskMoversProps {
  onAnalyze: (ticker: string, prompt: string) => void
  onTickerClick?: (ticker: string) => void
}

type MoversView = "gainers" | "losers"

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function DeskMovers({ onAnalyze, onTickerClick }: DeskMoversProps) {
  const [view, setView] = useState<MoversView>("gainers")
  const { movers, isLoading } = useMorningBrief()

  const rows = useMemo(() => {
    const source = view === "gainers" ? movers.gainers : movers.losers
    return source.slice(0, 14)
  }, [movers.gainers, movers.losers, view])

  if (isLoading) {
    return <div className="h-full bg-[var(--bg-surface)]/40 animate-pulse" />
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          {(["gainers", "losers"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-150",
                view === tab
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--text-muted)]">{rows.length} names</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
          Movers feed is empty right now.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-[1fr_minmax(84px,1fr)_minmax(84px,1fr)] px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              <span>Symbol</span>
              <span className="text-right">Price</span>
              <span className="text-right">%Chg</span>
            </div>

            <div className="space-y-0.5 px-1 pb-1">
              {rows.map((mover) => (
                <button
                  key={mover.ticker}
                  type="button"
                  onClick={() => {
                    onTickerClick?.(mover.ticker)
                    onAnalyze(
                      mover.ticker,
                      `${mover.ticker} is ${mover.changePercent >= 0 ? "up" : "down"} ${Math.abs(mover.changePercent).toFixed(1)}% today. What's driving the move, what levels matter now, and is this momentum or a trap?`
                    )
                  }}
                  className="grid w-full grid-cols-[1fr_minmax(84px,1fr)_minmax(84px,1fr)] items-center rounded px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
                >
                  <span className="font-[var(--font-geist-mono)] text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                    {mover.ticker}
                  </span>
                  <span className="text-right font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(mover.price)}
                  </span>
                  <span className={cn(
                    "text-right font-[var(--font-geist-mono)] text-xs tabular-nums",
                    mover.changePercent >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                  )}>
                    {mover.changePercent >= 0 ? "+" : ""}{mover.changePercent.toFixed(2)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
