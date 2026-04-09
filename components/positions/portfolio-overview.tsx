'use client'

import Link from 'next/link'
import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon as Warning,
  Chat01Icon as ChatCircle,
  CheckmarkCircle01Icon as CheckCircle,
  PieChart01Icon as ChartPie,
  SecurityCheckIcon as ShieldCheck,
} from '@hugeicons/core-free-icons'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { staggerContainer, staggerItem } from '@/components/ui/pelican'
import { formatCompactDollar } from '@/lib/positions/dashboard-utils'
import type {
  AssetBreakdown,
  PlanCompliance,
  PortfolioPosition,
  PortfolioStats,
  RiskSummary,
} from '@/types/portfolio'

interface PortfolioOverviewProps {
  portfolio: PortfolioStats
  risk: RiskSummary
  planCompliance: PlanCompliance
  positions: PortfolioPosition[]
  isLoading: boolean
  onSendMessage?: (message: string) => void
}

const ASSET_COLORS: Record<string, string> = {
  stock: 'var(--accent-primary)',
  crypto: 'var(--data-warning)',
  forex: 'var(--data-positive)',
  option: '#3b82f6',
  etf: '#14b8a6',
  future: '#8b5cf6',
  other: '#6b7280',
}

function getAssetColor(type: string): string {
  return ASSET_COLORS[type.toLowerCase()] ?? '#6b7280'
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: AssetBreakdown & { fill: string } }>
}) {
  if (!active || !payload?.length) return null
  const datum = payload[0]?.payload
  if (!datum) return null

  return (
    <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2">
      <p className="text-sm font-medium capitalize text-[var(--text-primary)]">{datum.asset_type}</p>
      <p className="mt-1 font-mono tabular-nums text-sm text-[var(--text-secondary)]">
        {formatCompactDollar(datum.total_exposure)} ({datum.pct_of_portfolio.toFixed(1)}%)
      </p>
      <p className="font-mono tabular-nums text-xs text-[var(--text-muted)]">
        {datum.count} position{datum.count !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function LoadingBlock({ title }: { title: string }) {
  return (
    <div className="border-b border-[var(--border-default)] pb-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      <div className="mt-4 h-px w-full bg-[var(--border-subtle)]" />
      <div className="mt-8 h-px w-full bg-[var(--border-subtle)]" />
    </div>
  )
}

export function PortfolioOverview({
  portfolio,
  risk,
  planCompliance,
  positions,
  isLoading,
  onSendMessage,
}: PortfolioOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingBlock title="Exposure Breakdown" />
        <LoadingBlock title="Risk Budget" />
      </div>
    )
  }

  const rrDisplay =
    risk.portfolio_rr_ratio !== null
      ? `${risk.portfolio_rr_ratio.toFixed(2)}:1`
      : '—'

  const donutData = portfolio.asset_breakdown.map((breakdown) => ({
    ...breakdown,
    fill: getAssetColor(breakdown.asset_type),
  }))

  const totalPositions = risk.positions_with_defined_risk + risk.positions_without_risk
  const riskDefinedPct =
    totalPositions > 0
      ? Math.round((risk.positions_with_defined_risk / totalPositions) * 100)
      : 0
  const riskBarColor =
    riskDefinedPct > 80
      ? 'rgb(52, 211, 153)'
      : riskDefinedPct >= 50
        ? 'rgb(245, 158, 11)'
        : 'rgb(248, 113, 113)'

  const violations: string[] = []
  if (planCompliance.has_active_plan) {
    if (planCompliance.over_position_limit) {
      violations.push(
        `Over position limit: ${planCompliance.current_open_positions}/${planCompliance.max_open_positions}`,
      )
    }
    if (planCompliance.require_stop_loss && planCompliance.positions_missing_stop > 0) {
      violations.push(
        `${planCompliance.positions_missing_stop} position${planCompliance.positions_missing_stop !== 1 ? 's' : ''} missing stop loss`,
      )
    }
    if (planCompliance.require_thesis && planCompliance.positions_missing_thesis > 0) {
      violations.push(
        `${planCompliance.positions_missing_thesis} position${planCompliance.positions_missing_thesis !== 1 ? 's' : ''} missing thesis`,
      )
    }
  }

  return (
    <m.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Risk</p>
      </div>

      <m.div variants={staggerItem} className="border-b border-[var(--border-default)] pb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ChartPie} size={16} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Exposure Breakdown</h3>
        </div>

        {donutData.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--text-secondary)]">No positions to display.</p>
        ) : (
          <>
            <div className="relative mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="total_exposure"
                    stroke="none"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.asset_type} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono tabular-nums text-xl text-[var(--text-primary)]">{portfolio.total_positions}</span>
                <span className="font-mono tabular-nums text-sm text-[var(--text-secondary)]">positions</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {donutData.map((entry) => {
                const tickersInClass = positions
                  .filter((position) => position.asset_type.toLowerCase() === entry.asset_type.toLowerCase())
                  .map((position) => position.ticker)
                  .join(', ')

                return (
                  <button
                    key={entry.asset_type}
                    type="button"
                    disabled={!onSendMessage}
                    onClick={() => onSendMessage?.(
                      `I have ${entry.pct_of_portfolio.toFixed(1)}% of my portfolio in ${entry.asset_type}s (${formatCompactDollar(entry.total_exposure)}, ${entry.count} positions: ${tickersInClass}). Is this too concentrated? What's the ideal allocation for this asset class?`,
                    )}
                    className="flex min-h-11 w-full items-center justify-between gap-3 bg-transparent p-0 text-left transition-colors duration-150 cursor-pointer hover:text-[var(--text-primary)] disabled:cursor-default disabled:hover:text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 flex-none"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="text-sm capitalize text-[var(--text-secondary)]">{entry.asset_type}</span>
                    </div>
                    <span className="font-mono tabular-nums text-sm text-[var(--text-secondary)]">
                      {entry.pct_of_portfolio.toFixed(0)}%
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </m.div>

      <m.div variants={staggerItem} className="border-b border-[var(--border-default)] pb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ShieldCheck} size={16} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Risk Budget</h3>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Total at Risk</p>
            <p className="mt-1 font-mono tabular-nums text-base text-red-500">{formatCompactDollar(risk.total_risk_usd)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Potential Reward</p>
            <p className="mt-1 font-mono tabular-nums text-base text-emerald-500">{formatCompactDollar(risk.total_reward_usd)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Portfolio R:R</p>
            <p className="mt-1 font-mono tabular-nums text-base text-[var(--text-primary)]">{rrDisplay}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Risk Defined</p>
            <p className="mt-1 font-mono tabular-nums text-base" style={{ color: riskBarColor }}>
              {riskDefinedPct}%
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1.5 bg-[var(--bg-elevated)]">
            <m.div
              className="h-full"
              style={{ backgroundColor: riskBarColor }}
              initial={{ width: 0 }}
              animate={{ width: `${riskDefinedPct}%` }}
              transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
            />
          </div>
          <p className="mt-2 font-mono tabular-nums text-sm text-[var(--text-secondary)]">
            {risk.positions_with_defined_risk}/{totalPositions || 0} positions have defined risk
          </p>
        </div>

        {onSendMessage && totalPositions > 0 && (
          <button
            type="button"
            onClick={() => {
              const rr = risk.portfolio_rr_ratio
              if (rr === null || rr < 1) {
                onSendMessage(
                  `My portfolio risk management needs help. R:R: ${rr !== null ? `${rr.toFixed(2)}:1` : 'undefined'}. ${risk.positions_without_risk} of ${totalPositions} positions have no stop loss. Total at risk: ${formatCompactDollar(risk.total_risk_usd)}. Help me fix this — suggest stop losses for my unprotected positions and improve my R:R.`,
                )
              } else {
                onSendMessage(
                  `Validate my risk budget: R:R ${rr.toFixed(2)}:1, ${risk.positions_with_defined_risk}/${totalPositions} have stops, total risk ${formatCompactDollar(risk.total_risk_usd)} vs reward ${formatCompactDollar(risk.total_reward_usd)}. Is this well-structured? Any improvements?`,
                )
              }
            }}
            className="mt-4 inline-flex min-h-11 items-center gap-1 bg-transparent p-0 text-xs font-medium uppercase tracking-wider text-[var(--accent-primary)] transition-colors duration-150 cursor-pointer hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
          >
            <HugeiconsIcon icon={ChatCircle} size={13} strokeWidth={1.5} color="currentColor" />
            Validate with Pelican
          </button>
        )}
      </m.div>

      <m.div variants={staggerItem} className="border-b border-[var(--border-default)] pb-3">
        {!planCompliance.has_active_plan ? (
          <Link
            href="/portfolio?tab=plan"
            className="flex min-h-11 items-start gap-2 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
          >
            <HugeiconsIcon icon={ShieldCheck} size={15} className="mt-0.5 flex-none text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
            <span>Set up a trading plan to track position compliance.</span>
          </Link>
        ) : violations.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Warning} size={15} className="text-amber-500" strokeWidth={1.5} color="currentColor" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Plan Violations</p>
            </div>
            {violations.map((violation) => (
              <p key={violation} className="text-sm text-[var(--text-secondary)]">
                {violation}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <HugeiconsIcon icon={CheckCircle} size={15} className="text-emerald-500" strokeWidth={1.5} color="currentColor" />
            <span>All positions comply with your trading plan.</span>
          </div>
        )}
      </m.div>
    </m.div>
  )
}
