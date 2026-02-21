'use client'

import { useMemo } from 'react'
import { Shield, Check, X, Equals, Sparkle } from '@phosphor-icons/react'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'
import type { RuleComplianceStat } from '@/types/trading'
import { formatPnl as _formatPnl } from '@/lib/formatters'

// Human-readable labels for rule keys
const RULE_LABELS: Record<string, string> = {
  require_stop_loss: 'Stop loss set',
  require_take_profit: 'Take profit set',
  require_thesis: 'Thesis documented',
  min_risk_reward: 'Min R:R met',
  max_position_size_usd: 'Position size (USD)',
  max_position_size_pct: 'Position size (%)',
  max_risk_per_trade: 'Risk per trade limit',
  max_open_positions: 'Max open positions',
  max_trades_per_day: 'Max trades/day',
  max_daily_loss: 'Daily loss limit',
  max_consecutive_losses: 'Consecutive loss limit',
  no_same_ticker_after_loss: 'No re-entry after loss',
  allowed_asset_types: 'Allowed asset types',
  blocked_tickers: 'Blocked tickers',
}

function getRuleLabel(key: string): string {
  if (RULE_LABELS[key]) return RULE_LABELS[key]
  if (key.startsWith('checklist_')) {
    return key.replace('checklist_', '').replace(/_/g, ' ')
  }
  return key.replace(/_/g, ' ')
}

interface CategorizedRules {
  moneyMakers: RuleComplianceStat[]
  dontMatter: RuleComplianceStat[]
  keepBreaking: RuleComplianceStat[]
}

function categorizeRules(stats: RuleComplianceStat[]): CategorizedRules {
  const minSamples = 3
  const moneyMakers: RuleComplianceStat[] = []
  const dontMatter: RuleComplianceStat[] = []
  const keepBreaking: RuleComplianceStat[] = []

  for (const r of stats) {
    const totalSamples = r.times_followed + r.times_violated
    if (totalSamples < 2) {
      dontMatter.push(r)
      continue
    }
    const hasEdge = r.edge > 15 && r.times_followed >= minSamples
    const breaking = r.follow_rate < 60 && r.edge > 10
    if (hasEdge) moneyMakers.push(r)
    else if (breaking) keepBreaking.push(r)
    else dontMatter.push(r)
  }

  moneyMakers.sort((a, b) => b.edge - a.edge)
  keepBreaking.sort((a, b) => a.follow_rate - b.follow_rate)
  return { moneyMakers, dontMatter, keepBreaking }
}

const formatPnl = (amount: number) => _formatPnl(amount, 0)

function RuleRow({ stat, variant }: { stat: RuleComplianceStat; variant: 'money' | 'breaking' | 'neutral' }) {
  const label = getRuleLabel(stat.rule_key)
  const totalSamples = stat.times_followed + stat.times_violated

  return (
    <div className={cn(
      'px-3 py-2.5 rounded-lg border transition-colors',
      variant === 'money' && 'bg-[var(--data-positive)]/[0.04] border-[var(--data-positive)]/10',
      variant === 'breaking' && 'bg-[var(--data-warning)]/[0.04] border-[var(--data-warning)]/10',
      variant === 'neutral' && 'bg-[var(--bg-surface)] border-[var(--border-subtle)]',
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-[var(--text-muted)]">
            Follow: <span className="text-[var(--text-secondary)]">{stat.follow_rate.toFixed(0)}%</span>
          </span>
          <span className="text-[var(--text-muted)]">
            Edge: <span className={cn(
              stat.edge > 0 ? 'text-[var(--data-positive)]' : stat.edge < 0 ? 'text-[var(--data-negative)]' : 'text-[var(--text-secondary)]'
            )}>{stat.edge > 0 ? '+' : ''}{stat.edge.toFixed(0)}%</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span>
          Followed {stat.times_followed}x: {stat.wr_when_followed.toFixed(0)}% WR, {formatPnl(stat.pnl_when_followed)}
        </span>
        {stat.times_violated > 0 && (
          <span>
            Violated {stat.times_violated}x: {stat.wr_when_violated.toFixed(0)}% WR, {formatPnl(stat.pnl_when_violated)}
          </span>
        )}
        {totalSamples < 5 && (
          <span className="italic">Low sample size</span>
        )}
      </div>
    </div>
  )
}

interface PlanComplianceCardProps {
  stats: RuleComplianceStat[]
  onAskPelican: (prompt: string) => void
  isLoading?: boolean
}

export function PlanComplianceCard({ stats, onAskPelican, isLoading }: PlanComplianceCardProps) {
  const categorized = useMemo(() => categorizeRules(stats), [stats])

  const overallFollowRate = useMemo(() => {
    if (stats.length === 0) return 0
    const totalFollowed = stats.reduce((sum, r) => sum + r.times_followed, 0)
    const totalViolated = stats.reduce((sum, r) => sum + r.times_violated, 0)
    const total = totalFollowed + totalViolated
    return total > 0 ? (totalFollowed / total) * 100 : 0
  }, [stats])

  if (isLoading) {
    return (
      <PelicanCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-[var(--bg-elevated)] rounded" />
          <div className="h-3 w-full bg-[var(--bg-elevated)] rounded" />
          <div className="h-20 w-full bg-[var(--bg-elevated)] rounded" />
        </div>
      </PelicanCard>
    )
  }

  if (stats.length === 0) {
    return (
      <PelicanCard>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} weight="bold" className="text-[var(--accent-primary)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Plan Compliance</h3>
        </div>
        <div className="text-center py-6">
          <Shield size={32} weight="thin" className="text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">No compliance data yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
            Log trades with your trading plan active to see which rules are making you money.
          </p>
        </div>
      </PelicanCard>
    )
  }

  return (
    <PelicanCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={18} weight="bold" className="text-[var(--accent-primary)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Plan Compliance</h3>
        </div>
        <button
          onClick={() => onAskPelican('__plan_review__')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Sparkle size={14} weight="bold" />
          Ask Pelican
        </button>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[var(--text-muted)]">Overall Compliance</span>
          <span className="text-sm font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {overallFollowRate.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              overallFollowRate >= 80 ? 'bg-[var(--data-positive)]' :
              overallFollowRate >= 60 ? 'bg-[var(--data-warning)]' :
              'bg-[var(--data-negative)]'
            )}
            style={{ width: `${Math.min(overallFollowRate, 100)}%` }}
          />
        </div>
      </div>

      {categorized.moneyMakers.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Check size={14} weight="bold" className="text-[var(--data-positive)]" />
            <span className="text-xs font-medium text-[var(--data-positive)] uppercase tracking-wider">
              Rules that make you money
            </span>
          </div>
          <div className="space-y-1.5">
            {categorized.moneyMakers.map(stat => (
              <RuleRow key={stat.rule_key} stat={stat} variant="money" />
            ))}
          </div>
        </div>
      )}

      {categorized.keepBreaking.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <X size={14} weight="bold" className="text-[var(--data-warning)]" />
            <span className="text-xs font-medium text-[var(--data-warning)] uppercase tracking-wider">
              Rules you keep breaking
            </span>
          </div>
          <div className="space-y-1.5">
            {categorized.keepBreaking.map(stat => (
              <RuleRow key={stat.rule_key} stat={stat} variant="breaking" />
            ))}
          </div>
        </div>
      )}

      {categorized.dontMatter.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Equals size={14} weight="bold" className="text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Inconclusive
            </span>
          </div>
          <div className="space-y-1.5">
            {categorized.dontMatter.map(stat => (
              <RuleRow key={stat.rule_key} stat={stat} variant="neutral" />
            ))}
          </div>
        </div>
      )}
    </PelicanCard>
  )
}
