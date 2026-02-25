"use client"

import { cn } from "@/lib/utils"
import { List } from "@phosphor-icons/react"
import type { PlaybookStats } from "@/hooks/use-playbooks"

interface PlaybookTradesTabProps {
  stats: PlaybookStats | null
  isLoading: boolean
}

export function PlaybookTradesTab({ stats, isLoading }: PlaybookTradesTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-[var(--bg-surface)] rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  const trades = stats?.allTrades ?? stats?.recentTrades ?? []

  if (!stats || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <List
          size={32}
          weight="thin"
          className="text-[var(--text-muted)] mb-3"
        />
        <p className="text-sm text-[var(--text-muted)]">
          No trades tagged with this playbook yet.
        </p>
        <p className="text-xs text-[var(--text-disabled)] mt-1">
          Tag trades with this setup type in your journal.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden",
        "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
      )}
    >
      {/* Header */}
      <div className="grid grid-cols-5 gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
        <span>Date</span>
        <span>Ticker</span>
        <span>Direction</span>
        <span className="text-right">P&L</span>
        <span className="text-right">R-Multiple</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {trades.map((trade) => {
          const pnl = trade.pnl_amount ?? 0
          const isPositive = pnl >= 0
          const dateStr = trade.exit_date
            ? new Date(trade.exit_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "--"

          return (
            <div
              key={trade.id}
              className="grid grid-cols-5 gap-2 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors duration-150"
            >
              <span className="text-sm font-mono tabular-nums text-[var(--text-secondary)]">
                {dateStr}
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {trade.ticker}
              </span>
              <span
                className={cn(
                  "text-sm capitalize",
                  trade.direction === "long"
                    ? "text-[var(--data-positive)]"
                    : "text-[var(--data-negative)]"
                )}
              >
                {trade.direction}
              </span>
              <span
                className={cn(
                  "text-sm font-mono tabular-nums text-right",
                  isPositive
                    ? "text-[var(--data-positive)]"
                    : "text-[var(--data-negative)]"
                )}
              >
                {isPositive ? "+" : ""}{pnl.toFixed(2)}
              </span>
              <span
                className={cn(
                  "text-sm font-mono tabular-nums text-right",
                  trade.r_multiple != null
                    ? (trade.r_multiple ?? 0) >= 0
                      ? "text-[var(--data-positive)]"
                      : "text-[var(--data-negative)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                {trade.r_multiple != null
                  ? `${trade.r_multiple >= 0 ? "+" : ""}${trade.r_multiple.toFixed(2)}R`
                  : "--"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
