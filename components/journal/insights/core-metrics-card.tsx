'use client'

import { PelicanCard } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnalyticsUpIcon as TrendUp } from "@hugeicons/core-free-icons"
import type { TradeStats } from "@/hooks/use-trade-stats"

interface CoreMetricsCardProps {
  stats: TradeStats
  onAskPelican: (prompt: string) => void
}

export function CoreMetricsCard({ stats, onAskPelican }: CoreMetricsCardProps) {
  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={TrendUp} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Core Metrics</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Profit Factor */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-1">Profit Factor</p>
          <p className={cn(
            "text-lg font-mono tabular-nums font-semibold",
            stats.profit_factor > 1.5 ? "text-[var(--data-positive)]" :
            stats.profit_factor >= 1.0 ? "text-[var(--data-warning)]" :
            "text-[var(--data-negative)]"
          )}>
            {stats.profit_factor.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            ${stats.profit_factor.toFixed(2)} won per $1 lost
          </p>
        </div>

        {/* Expectancy */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-1">Expectancy</p>
          <p className={cn(
            "text-lg font-mono tabular-nums font-semibold",
            stats.expectancy > 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
          )}>
            {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            per trade avg ({stats.closed_trades} trades)
          </p>
        </div>

        {/* Sharpe Ratio */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-1">Sharpe Ratio</p>
          <p className={cn(
            "text-lg font-mono tabular-nums font-semibold",
            stats.sharpe_ratio > 0.5 ? "text-[var(--data-positive)]" :
            stats.sharpe_ratio >= 0 ? "text-[var(--data-warning)]" :
            "text-[var(--data-negative)]"
          )}>
            {stats.sharpe_ratio.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">risk-adjusted return</p>
        </div>

        {/* Win/Loss Size */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-1">Win/Loss Size</p>
          <p className="text-lg font-mono tabular-nums font-semibold">
            <span className="text-[var(--data-positive)]">${stats.avg_win.toFixed(0)}</span>
            <span className="text-[var(--text-muted)] mx-1">/</span>
            <span className="text-[var(--data-negative)]">${Math.abs(stats.avg_loss).toFixed(0)}</span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {(stats.avg_win / Math.max(Math.abs(stats.avg_loss), 1)).toFixed(1)}:1 reward to risk
          </p>
        </div>

        {/* Gross P&L */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-1">Gross P&L</p>
          <p className="text-lg font-mono tabular-nums font-semibold">
            <span className="text-[var(--data-positive)]">${stats.gross_profit.toFixed(0)}</span>
            <span className="text-[var(--text-muted)] mx-1">/</span>
            <span className="text-[var(--data-negative)]">${stats.gross_loss.toFixed(0)}</span>
          </p>
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-[var(--bg-elevated)]">
            <div className="bg-[var(--data-positive)]" style={{ width: `${(stats.gross_profit / Math.max(stats.gross_profit + stats.gross_loss, 1)) * 100}%` }} />
            <div className="bg-[var(--data-negative)]" style={{ width: `${(stats.gross_loss / Math.max(stats.gross_profit + stats.gross_loss, 1)) * 100}%` }} />
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mb-1">Win Rate</p>
          <p className={cn(
            "text-lg font-mono tabular-nums font-semibold",
            stats.win_rate > 50 ? "text-[var(--data-positive)]" :
            stats.win_rate < 40 ? "text-[var(--data-negative)]" :
            "text-[var(--text-primary)]"
          )}>
            {stats.win_rate.toFixed(1)}%
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {stats.profit_factor > 1.5 && stats.win_rate < 50
              ? "Low win rate, big winners"
              : stats.win_rate > 60 && stats.profit_factor < 1.2
                ? "High win rate, thin margin"
                : `${stats.closed_trades} trades analyzed`}
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => onAskPelican(`Analyze my core trading metrics: profit factor ${stats.profit_factor.toFixed(2)}, expectancy ${stats.expectancy.toFixed(2)}, Sharpe ratio ${stats.sharpe_ratio.toFixed(2)}, win rate ${stats.win_rate.toFixed(1)}%, avg win $${stats.avg_win.toFixed(0)} vs avg loss $${Math.abs(stats.avg_loss).toFixed(0)}. What's my biggest weakness and what should I focus on?`)}
          className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors whitespace-nowrap"
        >
          Ask Pelican &rarr;
        </button>
      </div>
    </PelicanCard>
  )
}
