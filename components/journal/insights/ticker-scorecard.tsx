"use client"

import { PelicanCard } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Table01Icon as Table } from "@hugeicons/core-free-icons"
import type { TickerInsight } from "@/hooks/use-behavioral-insights"

interface TickerScorecardProps {
  data: TickerInsight[]
  onAskPelican: (prompt: string) => void
}

export function TickerScorecard({ data, onAskPelican }: TickerScorecardProps) {
  const sorted = [...data].sort((a, b) => b.total_trades - a.total_trades)

  const handleRowClick = (t: TickerInsight) => {
    onAskPelican(
      `Analyze my trading history with ${t.ticker}. Stats: ${t.wins}-${t.losses}, ${t.win_rate.toFixed(1)}% WR, $${t.total_pnl.toFixed(2)} P&L. What patterns do you see?`
    )
  }

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={Table} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Ticker Scorecard</h3>
        <span className="text-xs text-[var(--text-muted)] ml-auto">Click a row to ask Pelican</span>
      </div>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full md:min-w-[560px]">
          <thead>
            <tr className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
              <th className="text-left px-5 pb-3">Ticker</th>
              <th className="text-right px-3 pb-3">Trades</th>
              <th className="text-right px-3 pb-3">W-L</th>
              <th className="text-right px-3 pb-3">Win Rate</th>
              <th className="text-right px-3 pb-3">Total P&L</th>
              <th className="text-right px-5 pb-3">Avg R</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const profitable = t.total_pnl >= 0
              return (
                <tr
                  key={t.ticker}
                  onClick={() => handleRowClick(t)}
                  className={cn(
                    "cursor-pointer transition-colors duration-150",
                    profitable
                      ? "hover:bg-[var(--data-positive)]/[0.05]"
                      : "hover:bg-[var(--data-negative)]/[0.05]",
                  )}
                >
                  <td className="px-5 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                    {t.ticker}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-[var(--text-secondary)]">
                    {t.total_trades}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-[var(--text-secondary)]">
                    {t.wins}-{t.losses}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-mono tabular-nums text-sm",
                      t.win_rate > 50
                        ? "text-[var(--data-positive)]"
                        : t.win_rate >= 40
                          ? "text-[var(--text-secondary)]"
                          : "text-[var(--data-negative)]",
                    )}
                  >
                    {t.win_rate.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-mono tabular-nums text-sm",
                      profitable ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]",
                    )}
                  >
                    {profitable ? "+" : ""}${t.total_pnl.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-2.5 text-right font-mono tabular-nums text-sm",
                      t.avg_r >= 1
                        ? "text-[var(--data-positive)]"
                        : t.avg_r >= 0
                          ? "text-[var(--text-secondary)]"
                          : "text-[var(--data-negative)]",
                    )}
                  >
                    {t.avg_r >= 0 ? "+" : ""}{t.avg_r.toFixed(2)}R
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <p className="text-center text-sm text-[var(--text-muted)] py-6">No ticker data yet</p>
      )}
    </PelicanCard>
  )
}
