'use client'

import { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'
import type { Trade } from '@/hooks/use-trades'
import type { PlanCompliance, RuleScore } from '@/lib/plan-compliance'
import { PelicanButton } from '@/components/ui/pelican'

// ── Score Ring SVG ──

function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80
      ? 'var(--data-positive)'
      : score >= 50
        ? 'var(--data-warning)'
        : 'var(--data-negative)'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-xl font-bold font-mono tabular-nums"
          style={{ color }}
        >
          {score}%
        </span>
      </div>
    </div>
  )
}

// ── Rule Bar ──

function RuleBar({ rule }: { rule: RuleScore }) {
  const color =
    rule.score >= 80
      ? 'var(--data-positive)'
      : rule.score >= 50
        ? 'var(--data-warning)'
        : 'var(--data-negative)'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-secondary)] w-24 shrink-0">
        {rule.label}:
      </span>
      <div className="flex-1 flex items-center gap-2">
        <span
          className="text-xs font-mono tabular-nums w-8 text-right"
          style={{ color }}
        >
          {rule.score}%
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${rule.score}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
        <span className="text-[10px] text-[var(--text-muted)] w-20 text-right font-mono tabular-nums">
          {rule.detail}
        </span>
      </div>
    </div>
  )
}

function DisabledRuleBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 opacity-40">
      <span className="text-xs text-[var(--text-muted)] w-24 shrink-0">
        {label}:
      </span>
      <span className="text-[10px] text-[var(--text-muted)] italic">
        not required
      </span>
    </div>
  )
}

// ── Insight Generator ──

function generateInsight(
  ruleScores: RuleScore[],
  trades: Trade[],
  overallScore: number,
): string {
  const closed = trades.filter((t) => t.status === 'closed' && t.pnl_amount != null)
  if (closed.length === 0) {
    return 'Log your first trades to see how well you follow your plan. Pelican tracks your discipline automatically.'
  }

  // All rules strong
  if (overallScore >= 80 && ruleScores.every((r) => r.score >= 80)) {
    return `Strong compliance at ${overallScore}%. Your consistency is your edge — keep maintaining these standards.`
  }

  // Find weakest enabled rule
  const enabled = ruleScores.filter((r) => r.enabled)
  if (enabled.length === 0) {
    return 'Enable some plan rules to start tracking your discipline.'
  }

  const weakest = enabled.reduce((min, r) => (r.score < min.score ? r : min), enabled[0]!)

  // Cross-reference with trade outcomes
  if (weakest.rule === 'require_stop_loss') {
    const withSL = closed.filter((t) => t.stop_loss != null)
    const noSL = closed.filter((t) => t.stop_loss == null)
    const wrWith = withSL.length >= 3
      ? Math.round((withSL.filter((t) => (t.pnl_amount ?? 0) > 0).length / withSL.length) * 100)
      : null
    const wrNo = noSL.length >= 3
      ? Math.round((noSL.filter((t) => (t.pnl_amount ?? 0) > 0).length / noSL.length) * 100)
      : null

    if (wrWith != null && wrNo != null && wrWith > wrNo) {
      return `Stop loss discipline is at ${weakest.score}%. Your win rate WITH stops is ${wrWith}% vs ${wrNo}% without. The data is clear.`
    }
    const avgLossNoSL = noSL.length >= 3
      ? Math.round(noSL.filter((t) => (t.pnl_amount ?? 0) < 0).reduce((s, t) => s + Math.abs(t.pnl_amount ?? 0), 0) / Math.max(1, noSL.filter((t) => (t.pnl_amount ?? 0) < 0).length))
      : null
    if (avgLossNoSL) {
      return `Stop loss compliance is ${weakest.score}%. Trades without stops average ${avgLossNoSL > 999 ? `$${(avgLossNoSL / 1000).toFixed(1)}K` : `$${avgLossNoSL}`} losses. Set stops before entry.`
    }
    return `Your stop loss discipline is at ${weakest.score}%. Every trade without a stop is an uncapped risk. Make it automatic.`
  }

  if (weakest.rule === 'require_thesis') {
    const withThesis = closed.filter((t) => t.thesis && t.thesis.trim().length > 0)
    const noThesis = closed.filter((t) => !t.thesis || t.thesis.trim().length === 0)
    const wrWith = withThesis.length >= 3
      ? Math.round((withThesis.filter((t) => (t.pnl_amount ?? 0) > 0).length / withThesis.length) * 100)
      : null
    const wrNo = noThesis.length >= 3
      ? Math.round((noThesis.filter((t) => (t.pnl_amount ?? 0) > 0).length / noThesis.length) * 100)
      : null

    if (wrWith != null && wrNo != null && wrWith > wrNo) {
      return `Thesis compliance is ${weakest.score}%. Win rate WITH thesis: ${wrWith}% vs ${wrNo}% without. Writing it down makes you more selective.`
    }
    return `Only ${weakest.score}% of trades have a thesis. Writing your reasoning forces conviction — trades without it are often impulsive.`
  }

  if (weakest.rule === 'require_take_profit') {
    const withTP = closed.filter((t) => t.take_profit != null)
    const noTP = closed.filter((t) => t.take_profit == null)
    const avgPnlWith = withTP.length >= 3
      ? Math.round(withTP.reduce((s, t) => s + (t.pnl_amount ?? 0), 0) / withTP.length)
      : null
    const avgPnlNo = noTP.length >= 3
      ? Math.round(noTP.reduce((s, t) => s + (t.pnl_amount ?? 0), 0) / noTP.length)
      : null

    if (avgPnlWith != null && avgPnlNo != null && avgPnlWith > avgPnlNo) {
      return `Take profit compliance is ${weakest.score}%. Trades with targets average +$${avgPnlWith} vs $${avgPnlNo} without. Define your exit before entry.`
    }
    return `Take profit is your weakest rule at ${weakest.score}%. Without targets, winners turn into break-evens. Set exits before entry.`
  }

  return `Your weakest area is ${weakest.label} at ${weakest.score}%. Focus on improving this one rule — small discipline gains compound.`
}

// ── Hero Component ──

interface PlanComplianceHeroProps {
  compliance: PlanCompliance
  trades: Trade[]
  plan: { require_stop_loss: boolean; require_take_profit: boolean; require_thesis: boolean }
  onScrollToForm?: () => void
}

export function PlanComplianceHero({
  compliance,
  trades,
  plan,
  onScrollToForm,
}: PlanComplianceHeroProps) {
  const { overallScore, ruleScores } = compliance
  const closedCount = trades.filter((t) => t.status === 'closed').length

  const insight = useMemo(
    () => generateInsight(ruleScores, trades, overallScore),
    [ruleScores, trades, overallScore],
  )

  // All possible rules — show enabled ones with bars, disabled ones as muted
  const allRules: { key: string; label: string; enabled: boolean }[] = [
    { key: 'require_stop_loss', label: 'Stop Loss', enabled: plan.require_stop_loss },
    { key: 'require_take_profit', label: 'Take Profit', enabled: plan.require_take_profit },
    { key: 'require_thesis', label: 'Thesis', enabled: plan.require_thesis },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
    >
      {/* Top row: ring + text + button */}
      <div className="flex items-start gap-5 mb-4">
        <ScoreRing score={closedCount === 0 ? 0 : overallScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Plan Compliance:{' '}
              <span className="font-mono tabular-nums">
                {closedCount === 0 ? '—' : `${overallScore}%`}
              </span>
            </h3>
            {onScrollToForm && (
              <button
                onClick={onScrollToForm}
                className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors"
              >
                Review Plan \u2192
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {closedCount === 0
              ? 'No closed trades yet'
              : `Based on ${closedCount} trade${closedCount !== 1 ? 's' : ''} over the last 30 days`}
          </p>
        </div>
      </div>

      {/* Rule breakdown bars */}
      <div className="space-y-2 mb-4">
        {allRules.map((r) => {
          if (!r.enabled) return <DisabledRuleBar key={r.key} label={r.label} />
          const score = ruleScores.find((s) => s.rule === r.key)
          if (!score) return <DisabledRuleBar key={r.key} label={r.label} />
          return <RuleBar key={r.key} rule={score} />
        })}
      </div>

      {/* AI Insight */}
      <div className="bg-[var(--bg-base)] border-l-2 border-[var(--accent-primary)] p-3 rounded-r-lg">
        <div className="flex items-start gap-2">
          <Sparkle
            size={14}
            weight="bold"
            className="text-[var(--accent-primary)] shrink-0 mt-0.5"
          />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
