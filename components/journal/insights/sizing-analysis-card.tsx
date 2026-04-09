'use client'

import { PelicanCard } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { BalanceScaleIcon as Scales } from "@hugeicons/core-free-icons"
import type { TradeStats } from "@/hooks/use-trade-stats"
import type { SizingInsight } from "@/hooks/use-behavioral-insights"

interface SizingAnalysisCardProps {
  stats: TradeStats
  sizing: SizingInsight
  onAskPelican: (prompt: string) => void
}

export function SizingAnalysisCard({ stats, sizing, onAskPelican }: SizingAnalysisCardProps) {
  if (stats.avg_winner_size === 0 && stats.avg_loser_size === 0) {
    return (
      <PelicanCard className="p-5" noPadding>
        <div className="flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Scales} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Position Sizing</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)] text-center py-6">Not enough position size data</p>
      </PelicanCard>
    )
  }

  const maxSize = Math.max(stats.avg_winner_size, stats.avg_loser_size, 1)

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={Scales} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Position Sizing</h3>
      </div>

      <div className="space-y-4">
        {/* Visual bar comparison */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-muted)]">Avg winner size</span>
              <span className="font-mono tabular-nums text-[var(--data-positive)]">
                ${stats.avg_winner_size.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--data-positive)]/60"
                style={{ width: `${(stats.avg_winner_size / maxSize) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-muted)]">Avg loser size</span>
              <span className="font-mono tabular-nums text-[var(--data-negative)]">
                ${stats.avg_loser_size.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--data-negative)]/60"
                style={{ width: `${(stats.avg_loser_size / maxSize) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sizing edge badge */}
        <div className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md",
          stats.sizing_edge < 0.9 && "bg-[var(--data-positive)]/10 text-[var(--data-positive)]",
          stats.sizing_edge >= 0.9 && stats.sizing_edge <= 1.1 && "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
          stats.sizing_edge > 1.1 && "bg-[var(--data-negative)]/10 text-[var(--data-negative)]",
        )}>
          {stats.sizing_edge < 0.9 && "✓ Sizing down on losers"}
          {stats.sizing_edge >= 0.9 && stats.sizing_edge <= 1.1 && "→ Neutral sizing"}
          {stats.sizing_edge > 1.1 && `⚠ Sizing up on losers — ${((stats.sizing_edge - 1) * 100).toFixed(0)}% larger`}
        </div>

        {/* Oversized trades */}
        {sizing.has_data && sizing.oversized_trades && sizing.oversized_trades.total > 0 && (
          <div className="text-xs space-y-1 pt-2 border-t border-[var(--border-subtle)]/30">
            <p className="text-[var(--text-muted)]">
              Oversized: <span className="font-mono">{sizing.oversized_trades.total}</span> trades,{' '}
              <span className="font-mono">{sizing.oversized_trades.win_rate.toFixed(0)}%</span> WR,{' '}
              avg <span className={cn("font-mono", sizing.oversized_trades.avg_pnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]")}>
                ${sizing.oversized_trades.avg_pnl.toFixed(0)}
              </span>
            </p>
            {sizing.normal_trades && (
              <p className="text-[var(--text-muted)]">
                Normal: <span className="font-mono">{sizing.normal_trades.total}</span> trades,{' '}
                <span className="font-mono">{sizing.normal_trades.win_rate.toFixed(0)}%</span> WR,{' '}
                avg <span className={cn("font-mono", sizing.normal_trades.avg_pnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]")}>
                  ${sizing.normal_trades.avg_pnl.toFixed(0)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => onAskPelican(`My avg winning position is $${stats.avg_winner_size.toFixed(0)} and avg losing position is $${stats.avg_loser_size.toFixed(0)}. Sizing edge is ${stats.sizing_edge.toFixed(2)}. Am I sizing correctly? What position sizing rules should I follow?`)}
          className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors whitespace-nowrap"
        >
          Ask Pelican &rarr;
        </button>
      </div>
    </PelicanCard>
  )
}
