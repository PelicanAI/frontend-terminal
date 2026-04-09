'use client'

import { PelicanCard } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnalyticsDownIcon as TrendDown } from "@hugeicons/core-free-icons"
import type { StreakInsight } from "@/hooks/use-behavioral-insights"

interface StreakCardProps {
  streaks: StreakInsight
  winRate: number
  onAskPelican: (prompt: string) => void
}

export function StreakCard({ streaks, winRate, onAskPelican }: StreakCardProps) {
  const wr2 = streaks.after_2_consecutive_losses.win_rate
  const wr3 = streaks.after_3_consecutive_losses.win_rate
  const drop2 = winRate - wr2
  const drop3 = winRate - wr3

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={TrendDown} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Streaks &amp; Drawdowns</h3>
      </div>

      <div className="space-y-4">
        {/* Current streak */}
        <div className="text-sm text-[var(--text-secondary)]">
          {streaks.current_streak_type === 'winning' && (
            <p>
              <span className="text-[var(--data-positive)] font-mono font-semibold">{streaks.current_streak_count}</span>-trade winning streak
            </p>
          )}
          {streaks.current_streak_type === 'losing' && (
            <p>
              <span className="text-[var(--data-negative)] font-mono font-semibold">{streaks.current_streak_count}</span>-trade losing streak
            </p>
          )}
          {streaks.current_streak_type === 'none' && (
            <p className="text-[var(--text-muted)]">No active streak</p>
          )}
        </div>

        {/* Records */}
        <div className="flex gap-4">
          <div className="flex-1 p-2.5 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Best Streak</p>
            <p className="text-base font-mono tabular-nums font-semibold text-[var(--data-positive)]">
              {streaks.max_win_streak} wins
            </p>
          </div>
          <div className="flex-1 p-2.5 rounded-lg bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Worst Streak</p>
            <p className="text-base font-mono tabular-nums font-semibold text-[var(--data-negative)]">
              {streaks.max_loss_streak} losses
            </p>
          </div>
        </div>

        {/* After-loss behavior */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">After Consecutive Losses</p>

          {/* After 2 losses */}
          <div className="text-xs text-[var(--text-secondary)]">
            {streaks.after_2_consecutive_losses.total_trades >= 2 ? (
              <p>
                After 2 losses:{' '}
                <span className={cn(
                  "font-mono font-medium",
                  wr2 >= winRate ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}>
                  {wr2.toFixed(1)}% WR
                </span>
                {' '}&middot;{' '}
                <span className={cn(
                  "font-mono",
                  streaks.after_2_consecutive_losses.avg_pnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}>
                  ${streaks.after_2_consecutive_losses.avg_pnl.toFixed(0)} avg
                </span>
                {' '}&middot;{' '}
                <span className="font-mono text-[var(--text-muted)]">
                  {streaks.after_2_consecutive_losses.total_trades} trades
                </span>
              </p>
            ) : (
              <p className="text-[var(--text-muted)]">After 2 losses: Not enough data</p>
            )}
          </div>

          {/* After 3 losses */}
          <div className="text-xs text-[var(--text-secondary)]">
            {streaks.after_3_consecutive_losses.total_trades >= 2 ? (
              <p>
                After 3 losses:{' '}
                <span className={cn(
                  "font-mono font-medium",
                  wr3 >= winRate ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}>
                  {wr3.toFixed(1)}% WR
                </span>
                {' '}&middot;{' '}
                <span className={cn(
                  "font-mono",
                  streaks.after_3_consecutive_losses.avg_pnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}>
                  ${streaks.after_3_consecutive_losses.avg_pnl.toFixed(0)} avg
                </span>
                {' '}&middot;{' '}
                <span className="font-mono text-[var(--text-muted)]">
                  {streaks.after_3_consecutive_losses.total_trades} trades
                </span>
              </p>
            ) : (
              <p className="text-[var(--text-muted)]">After 3 losses: Not enough data</p>
            )}
          </div>

          {/* Revenge trading warning */}
          {streaks.after_2_consecutive_losses.total_trades >= 2 && drop2 > 15 && (
            <p className="text-xs text-[var(--data-negative)] mt-2">
              Performance drops {drop2.toFixed(0)}% after consecutive losses — consider stepping away
            </p>
          )}
          {streaks.after_3_consecutive_losses.total_trades >= 2 && drop3 > 15 && drop2 <= 15 && (
            <p className="text-xs text-[var(--data-negative)] mt-2">
              Performance drops {drop3.toFixed(0)}% after 3+ losses — consider stepping away
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => onAskPelican(`Analyze my streak patterns: best streak ${streaks.max_win_streak} wins, worst ${streaks.max_loss_streak} losses. After 2 losses my win rate is ${wr2.toFixed(1)}%. Am I revenge trading after losses? What rules should I set?`)}
          className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors whitespace-nowrap"
        >
          Ask Pelican &rarr;
        </button>
      </div>
    </PelicanCard>
  )
}
