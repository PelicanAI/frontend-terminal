'use client'

import { useMemo } from 'react'
import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  UserCircleIcon as UserCircle,
  Brain01Icon as Brain,
  ChampionIcon as Trophy,
  AnalyticsUpIcon as TrendUp,
  Alert01Icon as Warning,
  ChartLineData01Icon as ChartLineUp,
  FlashIcon as Lightning,
  ArrowRight01Icon as ArrowRight,
  Tick01Icon as Check,
} from '@hugeicons/core-free-icons'
import type { Trade } from '@/hooks/use-trades'
import type { TradeStats } from '@/hooks/use-trade-stats'
import { useTraderProfile } from '@/hooks/use-trader-profile'
import { analyzeBehavior } from '@/lib/trading/behavioral-analysis'
import { calculateMilestones } from '@/lib/trading/milestones'
import { buildTraderContext, buildBehaviorAnalysisPrompt } from '@/lib/trading/pelican-read'
import type { BehavioralInsight, MilestoneProgress } from '@/types/trading'
import Link from 'next/link'

interface TraderProfileTabProps {
  trades: Trade[]
  stats: TradeStats | null
  isLoading: boolean
  onAskPelican: (prompt: string) => void
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const severityBorder: Record<string, string> = {
  positive: 'var(--data-positive)',
  warning: 'var(--data-warning)',
  critical: 'var(--data-negative)',
  neutral: 'var(--text-muted)',
}

function formatMilestoneValue(value: number, unit: string): string {
  if (unit === 'dollars') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 ${className}`}
    >
      <div className="h-4 w-1/3 rounded bg-[var(--bg-elevated)] mb-3" />
      <div className="h-3 w-2/3 rounded bg-[var(--bg-elevated)] mb-2" />
      <div className="h-3 w-1/2 rounded bg-[var(--bg-elevated)]" />
    </div>
  )
}

export default function TraderProfileTab({ trades, stats, isLoading, onAskPelican }: TraderProfileTabProps) {
  const { profile, survey, isLoading: profileLoading } = useTraderProfile()

  const insights = useMemo(() => analyzeBehavior(trades), [trades])
  const milestones = useMemo(() => calculateMilestones(trades, stats), [trades, stats])
  const completedCount = milestones.filter(m => m.completed).length

  const traderContext = useMemo(
    () => buildTraderContext({ survey, profile, stats, recentTrades: trades }),
    [survey, profile, stats, trades],
  )

  const handleAnalyze = () => onAskPelican(buildBehaviorAnalysisPrompt(traderContext))
  const handlePlanReview = () =>
    onAskPelican(`Review my trading plan compliance and discipline based on my recent trades. ${traderContext}`)

  if (isLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <m.div className="space-y-8" variants={container} initial="hidden" animate="show">
      {/* Section A: Profile Overview */}
      <m.section variants={item}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <HugeiconsIcon icon={UserCircle} size={24} className="text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Trader Profile</h3>
          </div>
          {!profile && !survey ? (
            <div className="text-center py-6">
              <p className="text-[var(--text-secondary)] mb-4">
                Complete your profile so Pelican can personalize insights.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.98]"
              >
                Complete your profile <HugeiconsIcon icon={ArrowRight} size={16} strokeWidth={2} color="currentColor" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Style', value: survey?.primary_style ?? profile?.seed_style ?? '—' },
                { label: 'Experience', value: survey?.experience_level ?? '—' },
                { label: 'Risk Comfort', value: survey?.risk_tolerance ?? profile?.seed_risk_comfort ?? '—' },
                { label: 'Markets', value: survey?.markets_traded?.join(', ') ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-[var(--bg-elevated)] p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </m.section>

      {/* Section B: Behavioral Insights */}
      <m.section variants={item}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Brain} size={20} className="text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Behavioral Insights</h3>
          </div>
          {insights.length > 0 && (
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-all duration-150 hover:bg-[var(--accent-muted)] hover:border-[var(--border-hover)] active:scale-[0.98]"
            >
              <HugeiconsIcon icon={Lightning} size={14} strokeWidth={2} color="currentColor" /> Ask Pelican to analyze
            </button>
          )}
        </div>
        {insights.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
            <p className="text-[var(--text-secondary)]">
              Log at least 3 closed trades to unlock behavioral insights.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                style={{ borderLeftWidth: 3, borderLeftColor: severityBorder[insight.severity] }}
              >
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{insight.title}</p>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{insight.description}</p>
                {insight.actionable && (
                  <p className="text-xs text-[var(--text-muted)] italic">{insight.actionable}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </m.section>

      {/* Section C: Milestones */}
      <m.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Trophy} size={20} className="text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Milestones</h3>
          <span className="ml-auto text-xs font-mono tabular-nums text-[var(--text-muted)]">
            {completedCount}/{milestones.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {milestones.map(({ milestone, current, completed, progress_percent }) => (
            <div
              key={milestone.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition-all duration-150 hover:border-[var(--border-hover)] hover:shadow-sm"
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  completed
                    ? 'bg-[var(--data-positive)]/15 text-[var(--data-positive)]'
                    : 'bg-[var(--accent-muted)] text-[var(--text-muted)]'
                }`}
              >
                {completed ? <HugeiconsIcon icon={Check} size={18} strokeWidth={2} color="currentColor" /> : <HugeiconsIcon icon={ChartLineUp} size={18} strokeWidth={1.5} color="currentColor" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{milestone.name}</p>
                <p className="text-xs text-[var(--text-muted)] mb-2">{milestone.description}</p>
                {!completed && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                        style={{ width: `${progress_percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                      {formatMilestoneValue(current, milestone.unit)}/{formatMilestoneValue(milestone.threshold, milestone.unit)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </m.section>

      {/* Section D: Quick Actions */}
      <m.section variants={item}>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAnalyze}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-medium text-white shadow transition-all duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.98]"
          >
            <HugeiconsIcon icon={TrendUp} size={18} strokeWidth={2} color="currentColor" /> Analyze my trading
          </button>
          <button
            onClick={handlePlanReview}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] active:scale-[0.98]"
          >
            <HugeiconsIcon icon={Warning} size={18} strokeWidth={1.5} color="currentColor" /> Review my plan
          </button>
        </div>
      </m.section>
    </m.div>
  )
}
