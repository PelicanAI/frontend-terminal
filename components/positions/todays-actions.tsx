'use client'

import { useMemo } from 'react'
import {
  ShieldWarning,
  Warning,
  ShieldSlash,
  Target,
  Flame,
  Crosshair,
  Scales,
  CheckCircle,
  TrendUp,
  TrendDown,
  CalendarBlank,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import type { PortfolioPosition, PortfolioStats, RiskSummary } from '@/types/portfolio'
import type { BehavioralInsights } from '@/hooks/use-behavioral-insights'
import type { TodayWarning } from '@/hooks/use-todays-warnings'
import type { PositionEarningsWarning } from '@/hooks/use-position-earnings'
import { trackEvent } from '@/lib/tracking'

// ============================================================================
// Types
// ============================================================================

interface TodaysActionsProps {
  positions: PortfolioPosition[]
  insights: BehavioralInsights | null
  warnings: TodayWarning[]
  earningsWarnings?: PositionEarningsWarning[]
  portfolioStats?: PortfolioStats
  riskSummary?: RiskSummary
  onAction: (chatPrompt: string) => void
  onEditPosition: (position: PortfolioPosition) => void
}

interface Action {
  priority: number
  icon: React.ComponentType<IconProps>
  iconColor: string
  label: string
  detail: string
  actionLabel: string
  actionType: 'chat' | 'edit'
  chatPrompt?: string
  position?: PortfolioPosition
  onTrack?: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatNum(n: number | null | undefined): string {
  if (n == null) return '?'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function buildScanPrompt(p: PortfolioPosition): string {
  return [
    `Scan my ${p.ticker} ${p.direction.toUpperCase()} position.`,
    `Entry: $${p.entry_price}. Size: ${formatNum(p.position_size_usd)}.`,
    p.stop_loss ? `Stop: $${p.stop_loss} (${p.distance_to_stop_pct}% away).` : 'No stop loss set.',
    p.take_profit ? `Target: $${p.take_profit} (${p.distance_to_target_pct}% away).` : 'No target set.',
    p.thesis ? `Thesis: "${p.thesis}".` : '',
    `Conviction: ${p.conviction || '?'}/10. Held for ${p.days_held} days.`,
    'Give me: current technicals, whether my thesis holds, key levels, and your recommendation — hold, add, trim, or exit.',
  ].filter(Boolean).join(' ')
}

// ============================================================================
// Component
// ============================================================================

export function TodaysActions({ positions, insights, warnings, earningsWarnings, portfolioStats, riskSummary, onAction, onEditPosition }: TodaysActionsProps) {
  const avgSize = useMemo(() => {
    if (positions.length === 0) return 0
    return positions.reduce((s, p) => s + p.position_size_usd, 0) / positions.length
  }, [positions])

  const actions = useMemo(() => {
    const list: Action[] = []

    // Priority 0 — Critical behavioral warnings
    for (const w of warnings) {
      if (w.severity === 'critical') {
        list.push({
          priority: 0, icon: ShieldWarning, iconColor: 'text-red-400/80',
          label: w.title, detail: w.message,
          actionLabel: w.action + ' \u2192', actionType: 'chat',
          chatPrompt: `I have a heads-up worth checking: "${w.title}" — ${w.message}. What should I do?`,
        })
      }
    }

    // Portfolio-level checks
    if (riskSummary) {
      const rr = riskSummary.portfolio_rr_ratio
      if (rr !== null && rr < 0.5) {
        list.push({
          priority: 0, icon: ShieldWarning, iconColor: 'text-red-400/80',
          label: `Portfolio R:R is ${rr.toFixed(2)}:1 — risking more than you stand to gain`,
          detail: `Risk: ${formatNum(riskSummary.total_risk_usd)} vs Reward: ${formatNum(riskSummary.total_reward_usd)}`,
          actionLabel: 'Fix R:R \u2192', actionType: 'chat',
          chatPrompt: `My portfolio R:R ratio is ${rr.toFixed(2)}:1 — I'm risking ${formatNum(riskSummary.total_risk_usd)} to potentially make ${formatNum(riskSummary.total_reward_usd)}. Help me fix this. Which positions should I adjust targets or tighten stops on?`,
        })
      } else if (rr !== null && rr < 1) {
        list.push({
          priority: 1, icon: Warning, iconColor: 'text-amber-500/60',
          label: `Portfolio R:R is ${rr.toFixed(2)}:1 — below breakeven`,
          detail: `Risk: ${formatNum(riskSummary.total_risk_usd)} vs Reward: ${formatNum(riskSummary.total_reward_usd)}`,
          actionLabel: 'Improve \u2192', actionType: 'chat',
          chatPrompt: `My portfolio R:R ratio is ${rr.toFixed(2)}:1. Help me improve it to at least 1.5:1. Which positions need wider targets or tighter stops?`,
        })
      }
    }

    if (portfolioStats) {
      // Concentration check
      const maxConc = portfolioStats.asset_breakdown.reduce(
        (max, b) => b.pct_of_portfolio > max.pct ? { type: b.asset_type, pct: b.pct_of_portfolio } : max,
        { type: '', pct: 0 },
      )
      if (maxConc.pct > 50 && portfolioStats.asset_breakdown.length > 1) {
        list.push({
          priority: 2, icon: Scales, iconColor: 'text-amber-500/60',
          label: `${maxConc.pct.toFixed(0)}% concentrated in ${maxConc.type}s`,
          detail: 'Heavy concentration increases risk. Consider diversifying.',
          actionLabel: 'Review \u2192', actionType: 'chat',
          chatPrompt: `My portfolio is ${maxConc.pct.toFixed(0)}% concentrated in ${maxConc.type}s. Is this too risky? Suggest ways to diversify without losing my edge.`,
        })
      }

      // Directional bias check
      const totalDir = portfolioStats.direction_breakdown.long.exposure + portfolioStats.direction_breakdown.short.exposure
      if (totalDir > 0) {
        const longPct = (portfolioStats.direction_breakdown.long.exposure / totalDir) * 100
        if (longPct > 85) {
          list.push({
            priority: 2, icon: TrendUp, iconColor: 'text-amber-500/60',
            label: `${longPct.toFixed(0)}% long — heavy directional bias`,
            detail: 'Consider hedging with a short position or reducing long exposure.',
            actionLabel: 'Hedge \u2192', actionType: 'chat',
            chatPrompt: `My portfolio is ${longPct.toFixed(0)}% long. Should I hedge? Suggest short candidates or protective strategies for my current positions.`,
          })
        } else if (longPct < 15) {
          list.push({
            priority: 2, icon: TrendDown, iconColor: 'text-amber-500/60',
            label: `${(100 - longPct).toFixed(0)}% short — heavy directional bias`,
            detail: 'Extremely bearish positioning. Vulnerable to market rallies.',
            actionLabel: 'Review \u2192', actionType: 'chat',
            chatPrompt: `My portfolio is ${(100 - longPct).toFixed(0)}% short. Is this too bearish? What's the risk of a short squeeze or rally? Should I add long exposure?`,
          })
        }
      }
    }

    for (const p of positions) {
      // Priority 1 — Tight stop
      if (p.has_stop_loss && p.distance_to_stop_pct != null && Math.abs(p.distance_to_stop_pct) < 2) {
        list.push({
          priority: 1, icon: Warning, iconColor: 'text-amber-500/60',
          label: `${p.ticker} stop is ${Math.abs(p.distance_to_stop_pct).toFixed(1)}% away`,
          detail: `Tight stop at $${p.stop_loss}. Decide: widen, hold, or exit.`,
          actionLabel: 'Plan \u2192', actionType: 'chat', chatPrompt: buildScanPrompt(p),
        })
      }

      // Priority 1 — Absurd stop (>30% from entry, likely a typo)
      if (p.has_stop_loss && p.distance_to_stop_pct != null && Math.abs(p.distance_to_stop_pct) > 30) {
        list.push({
          priority: 1, icon: Warning, iconColor: 'text-red-400/80',
          label: `${p.ticker} stop is ${Math.abs(p.distance_to_stop_pct).toFixed(0)}% away — not a real stop`,
          detail: `Stop at $${p.stop_loss} is too far from entry $${p.entry_price}. Possible typo?`,
          actionLabel: 'Fix stop \u2192', actionType: 'edit', position: p,
        })
      }

      // Priority 1 — No stop loss
      if (!p.has_stop_loss) {
        list.push({
          priority: 1, icon: ShieldSlash, iconColor: 'text-red-400/80',
          label: `${p.ticker} has no stop loss`,
          detail: `${formatNum(p.position_size_usd)} at risk with no defined exit.`,
          actionLabel: 'Set stop \u2192', actionType: 'edit', position: p,
        })
      }

      // Priority 2 — Approaching target
      if (p.has_take_profit && p.distance_to_target_pct != null && p.distance_to_target_pct < 5) {
        list.push({
          priority: 2, icon: Target, iconColor: 'text-emerald-400/80',
          label: `${p.ticker} approaching target ($${p.take_profit})`,
          detail: `${p.distance_to_target_pct.toFixed(1)}% away. Plan your exit strategy.`,
          actionLabel: 'Plan exit \u2192', actionType: 'chat', chatPrompt: buildScanPrompt(p),
        })
      }

      // Priority 3 — Never scanned, held 7+ days
      if (p.days_held >= 7 && p.pelican_scan_count === 0) {
        list.push({
          priority: 3, icon: Crosshair, iconColor: 'text-[var(--accent-primary)]/70',
          label: `Review ${p.ticker} \u2014 held ${p.days_held} days, never scanned`,
          detail: "Get Pelican's assessment to validate thesis.",
          actionLabel: 'Scan \u2192', actionType: 'chat', chatPrompt: buildScanPrompt(p),
        })
      }

      // Priority 4 — Oversized
      if (avgSize > 0 && p.position_size_usd > avgSize * 2.5) {
        list.push({
          priority: 4, icon: Scales, iconColor: 'text-amber-500/60',
          label: `${p.ticker} is ${(p.position_size_usd / avgSize).toFixed(1)}x avg size`,
          detail: `${formatNum(p.position_size_usd)} vs avg ${formatNum(avgSize)}. Consider trimming.`,
          actionLabel: 'Review \u2192', actionType: 'chat', chatPrompt: buildScanPrompt(p),
        })
      }
    }

    // Priority 2 — Earnings warnings from positions
    if (earningsWarnings && earningsWarnings.length > 0) {
      const sorted = [...earningsWarnings].sort((a, b) => a.days_until_earnings - b.days_until_earnings)
      for (const ew of sorted) {
        const isCritical = ew.days_until_earnings <= 2
        const daysLabel = ew.days_until_earnings === 0
          ? 'reports earnings TODAY'
          : ew.days_until_earnings === 1
            ? 'reports earnings tomorrow'
            : `earnings in ${ew.days_until_earnings} days`
        const hourLabel = ew.earnings_hour === 'bmo' ? 'before open' : ew.earnings_hour === 'amc' ? 'after close' : ''
        const estimatesLine = [
          ew.eps_estimate ? `EPS est: $${ew.eps_estimate}` : '',
          ew.revenue_estimate ? `Rev est: $${(ew.revenue_estimate / 1e9).toFixed(1)}B` : '',
        ].filter(Boolean).join(' \u00b7 ')

        const earningsPrompt = `My ${ew.ticker} ${ew.direction} position has earnings in ${ew.days_until_earnings} days (${ew.earnings_date} ${ew.earnings_hour}).
Entry: $${ew.entry_price} \u00b7 Size: $${ew.position_size_usd?.toLocaleString()}
${ew.eps_estimate ? `EPS estimate: $${ew.eps_estimate}` : ''}${ew.revenue_estimate ? ` \u00b7 Revenue estimate: $${(ew.revenue_estimate / 1e9).toFixed(1)}B` : ''}

Help me plan: should I hold through earnings, trim my position, add a hedge, or close before the event? What's the historical expected move?`

        list.push({
          priority: isCritical ? 2 : 2,
          icon: CalendarBlank,
          iconColor: isCritical ? 'text-red-400/80' : 'text-amber-500/60',
          label: `${ew.ticker} ${daysLabel}${hourLabel ? ` (${hourLabel})` : ''}`,
          detail: `${ew.direction.toUpperCase()} from $${ew.entry_price}${ew.position_size_usd ? ` \u00b7 ${formatNum(ew.position_size_usd)}` : ''}${estimatesLine ? ` \u00b7 ${estimatesLine}` : ''}`,
          actionLabel: 'Plan with Pelican \u2192',
          actionType: 'chat' as const,
          chatPrompt: earningsPrompt,
          onTrack: () => trackEvent({ eventType: 'earnings_event_clicked', feature: 'positions', ticker: ew.ticker, data: { daysUntil: ew.days_until_earnings } }),
        })
      }
    }

    // Priority 3 — Losing streak
    if (insights?.streaks?.current_streak_type === 'losing' && insights.streaks.current_streak_count >= 2) {
      list.push({
        priority: 3, icon: Flame, iconColor: 'text-red-400/80',
        label: `${insights.streaks.current_streak_count}-trade losing streak active`,
        detail: 'Consider reducing sizes until streak breaks.',
        actionLabel: 'Review \u2192', actionType: 'chat',
        chatPrompt: `I'm on a ${insights.streaks.current_streak_count}-trade losing streak. Analyze my recent trades and suggest adjustments.`,
      })
    }

    list.sort((a, b) => a.priority - b.priority)
    return list.slice(0, 5)
  }, [positions, insights, warnings, earningsWarnings, avgSize, portfolioStats, riskSummary])

  // ── Empty / all-clear state ──────────────────────────────────────────────
  if (actions.length === 0) {
    const stopsSet = positions.every((p) => p.has_stop_loss)
    return (
      <div className="rounded-lg border bg-emerald-500/5 border-emerald-400/10 overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-[var(--text-muted)]">
            Today&apos;s Actions
          </span>
        </div>
        <div className="px-4 pb-3 flex items-center gap-2">
          <CheckCircle size={18} weight="fill" className="text-emerald-400/80 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              All clear &mdash; no actions needed right now.
            </p>
            <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
              {positions.length} position{positions.length !== 1 ? 's' : ''} healthy
              {stopsSet ? ' \u00b7 All stops set' : ''}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Actions list ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-[var(--border-subtle)]/40 bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-[var(--text-muted)]">
          Today&apos;s Actions
        </span>
      </div>
      {actions.map((a, i) => {
        const Icon = a.icon
        return (
          <div
            key={i}
            className={`px-4 py-2.5 flex items-start gap-3${i > 0 ? ' border-t border-[var(--border-subtle)]/40' : ''}`}
          >
            <Icon size={18} weight="bold" className={`${a.iconColor} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)]">{a.label}</p>
              <p className="text-xs text-[var(--text-muted)] font-[var(--font-geist-mono)] tabular-nums">{a.detail}</p>
            </div>
            <button
              onClick={() => {
                a.onTrack?.()
                if (a.actionType === 'chat' && a.chatPrompt) onAction(a.chatPrompt)
                else if (a.position) onEditPosition(a.position)
              }}
              className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--accent-primary)]/80 hover:text-[var(--accent-primary)] whitespace-nowrap transition-colors mt-0.5"
            >
              {a.actionLabel}
            </button>
          </div>
        )
      })}
    </div>
  )
}
