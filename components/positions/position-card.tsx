'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon as Warning,
  ArrowDown01Icon as CaretDown,
  InformationCircleIcon as Info,
  SecurityWarningIcon as ShieldWarning,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import type { Quote } from '@/hooks/use-live-quotes'
import type { TickerHistory } from '@/hooks/use-ticker-history'
import type { PositionAlert, PositionHealth } from '@/lib/position-health'
import type { PortfolioPosition } from '@/types/portfolio'

const DESKTOP_POSITION_GRID =
  'grid-cols-[minmax(180px,1.45fr)_repeat(4,minmax(96px,0.8fr))_minmax(96px,0.8fr)_minmax(152px,1fr)_minmax(110px,0.95fr)]'

interface PositionCardProps {
  position: PortfolioPosition
  healthScore: PositionHealth
  smartAlerts: PositionAlert[]
  tickerHistory: TickerHistory | null
  quote: Quote | null
  isWatching?: boolean
  onScanWithPelican: (position: PortfolioPosition) => void
  onEdit: (position: PortfolioPosition) => void
  onClose: (position: PortfolioPosition) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function formatCompactPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 100) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(2)
  return price.toFixed(4)
}

function formatExposure(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function formatPnlCurrency(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return `$${(abs / 1_000).toFixed(1)}K`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(2)}K`
  return `$${abs.toFixed(2)}`
}

function computeUnrealizedPnl(
  position: PortfolioPosition,
  quote: Quote | null,
): { pnlAmount: number; pnlPercent: number; hasQuote: boolean } {
  if (!quote || !position.entry_price || !position.quantity) {
    return { pnlAmount: 0, pnlPercent: 0, hasQuote: false }
  }

  const direction = position.direction === 'long' ? 1 : -1
  const pnlAmount = (quote.price - position.entry_price) * position.quantity * direction
  const pnlPercent = ((quote.price - position.entry_price) / position.entry_price) * 100 * direction
  return { pnlAmount, pnlPercent, hasQuote: true }
}

const healthDotColor: Record<PositionHealth['color'], string> = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
}

const alertIcons: Record<PositionAlert['severity'], typeof Warning> = {
  critical: ShieldWarning,
  warning: Warning,
  info: Info,
}

function RiskRewardBar({ position }: { position: PortfolioPosition }) {
  if (!position.has_stop_loss || !position.has_take_profit) return null

  const stop = position.stop_loss!
  const entry = position.entry_price
  const target = position.take_profit!
  const min = Math.min(stop, entry, target)
  const max = Math.max(stop, entry, target)
  const range = max - min
  if (range === 0) return null

  const stopPct = ((stop - min) / range) * 100
  const entryPct = ((entry - min) / range) * 100
  const targetPct = ((target - min) / range) * 100

  return (
    <div className="pt-1">
      <div className="relative h-1.5 overflow-hidden bg-[var(--bg-elevated)]">
        <div
          className="absolute top-0 h-full bg-red-400/12"
          style={{ left: `${Math.min(stopPct, entryPct)}%`, width: `${Math.abs(entryPct - stopPct)}%` }}
        />
        <div
          className="absolute top-0 h-full bg-emerald-400/10"
          style={{ left: `${Math.min(entryPct, targetPct)}%`, width: `${Math.abs(targetPct - entryPct)}%` }}
        />
        <div className="absolute top-0 h-full w-px bg-red-500" style={{ left: `${stopPct}%` }} />
        <div className="absolute top-0 h-full w-px bg-[var(--border-default)]" style={{ left: `${entryPct}%` }} />
        <div className="absolute top-0 h-full w-px bg-emerald-500" style={{ left: `${targetPct}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 font-mono tabular-nums text-xs">
        <span className="text-red-500">STOP ${formatCompactPrice(stop)}</span>
        <span className="text-[var(--text-secondary)]">ENTRY ${formatCompactPrice(entry)}</span>
        <span className="text-emerald-500">TARGET ${formatCompactPrice(target)}</span>
      </div>
    </div>
  )
}

function MetaCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <div className={cn('mt-1 font-mono tabular-nums text-sm text-[var(--text-primary)]', valueClassName)}>
        {value}
      </div>
    </div>
  )
}

function DesktopValueCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className={cn('font-mono tabular-nums text-sm text-[var(--text-primary)]', valueClassName)}>
        {value}
      </span>
    </div>
  )
}

export function PositionCard({
  position,
  healthScore,
  smartAlerts,
  tickerHistory,
  quote,
  isWatching,
  onScanWithPelican,
  onEdit,
  onClose,
  isExpanded,
  onToggleExpand,
}: PositionCardProps) {
  const { pnlAmount, pnlPercent, hasQuote } = computeUnrealizedPnl(position, quote)
  const pnlPositive = pnlAmount >= 0
  const pnlColorClass = pnlPositive ? 'text-emerald-400' : 'text-red-400'
  const convictionDisplay =
    position.conviction !== null ? `${position.conviction}/10` : `${healthScore.score}`
  const rAndScore = `${position.risk_reward_ratio !== null ? `${position.risk_reward_ratio.toFixed(1)}R` : '--'} · ${convictionDisplay}`

  const symbolMeta = [
    healthScore.label.toUpperCase(),
    isWatching ? 'WATCH' : '',
    `${position.days_held}D`,
  ].filter(Boolean).join(' · ')

  const borderAccent = hasQuote
    ? pnlPositive ? 'border-l-emerald-500/30' : 'border-l-red-500/30'
    : 'border-l-[var(--border-subtle)]'

  return (
    <div className={`border-b border-[var(--border-subtle)] border-l-2 ${borderAccent} transition-colors duration-300`}>
      <button
        type="button"
        onClick={onToggleExpand}
        className="group w-full cursor-pointer px-3 py-3 text-left transition-all duration-150 hover:bg-[var(--surface-hover)] hover:-translate-y-px hover:shadow-[0_1px_3px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none"
      >
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 flex-none rounded-full ${healthDotColor[healthScore.color]}`}
                  title={healthScore.tooltip}
                />
                <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">{position.ticker}</span>
                <span
                  className={cn(
                    'font-mono text-xs font-medium uppercase tracking-wider',
                    position.direction === 'long' ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {position.direction}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{position.asset_type.toUpperCase()}</span>
              </div>
              <p className="mt-1 font-mono tabular-nums text-xs text-[var(--text-secondary)]">{symbolMeta}</p>
            </div>

            <HugeiconsIcon
              icon={CaretDown}
              size={16}
              className={cn('mt-0.5 flex-none text-[var(--text-secondary)] transition-transform duration-150 group-hover:text-[var(--text-primary)] motion-reduce:transition-none', isExpanded && 'rotate-180')}
              strokeWidth={1.5}
              color="currentColor"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <DesktopValueCell label="Entry" value={`$${formatCompactPrice(position.entry_price)}`} />
            <DesktopValueCell
              label="Now"
              value={hasQuote ? `$${formatCompactPrice(quote!.price)}` : '—'}
              valueClassName={hasQuote ? pnlColorClass : 'text-[var(--text-secondary)]'}
            />
            <DesktopValueCell
              label="Stop"
              value={position.has_stop_loss ? `$${formatCompactPrice(position.stop_loss!)}` : '—'}
              valueClassName={position.has_stop_loss ? 'text-red-500' : 'text-[var(--text-secondary)]'}
            />
            <DesktopValueCell
              label="Target"
              value={position.has_take_profit ? `$${formatCompactPrice(position.take_profit!)}` : '—'}
              valueClassName={position.has_take_profit ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}
            />
            <DesktopValueCell label="Value" value={formatExposure(position.position_size_usd)} valueClassName="text-[var(--text-secondary)]" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">P&amp;L</span>
              {hasQuote ? (
                <span className={cn('font-mono tabular-nums text-sm font-bold', pnlColorClass)}>
                  {pnlPositive ? '+' : '-'}{formatPnlCurrency(pnlAmount)}
                  <span className="ml-1 text-sm font-normal text-[var(--text-secondary)]">
                    ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                  </span>
                </span>
              ) : (
                <span className="font-mono tabular-nums text-sm text-[var(--text-secondary)]">—</span>
              )}
            </div>
          </div>

          <p className="font-mono tabular-nums text-xs text-[var(--text-secondary)]">{rAndScore}</p>
        </div>

        <div className={`hidden lg:grid ${DESKTOP_POSITION_GRID} items-center gap-3`}>
          <div className="flex min-w-0 items-start gap-2">
            <span
              className={`mt-1.5 h-2 w-2 flex-none rounded-full ${healthDotColor[healthScore.color]}`}
              title={healthScore.tooltip}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold tracking-tight text-[var(--text-primary)]">{position.ticker}</span>
                <span
                  className={cn(
                    'font-mono text-xs font-medium uppercase tracking-wider',
                    position.direction === 'long' ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {position.direction}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{position.asset_type.toUpperCase()}</span>
              </div>
              <p className="mt-1 font-mono tabular-nums text-xs text-[var(--text-secondary)]">{symbolMeta}</p>
            </div>
          </div>

          <DesktopValueCell label="Entry" value={`$${formatCompactPrice(position.entry_price)}`} />
          <DesktopValueCell
            label="Now"
            value={hasQuote ? `$${formatCompactPrice(quote!.price)}` : '—'}
            valueClassName={hasQuote ? pnlColorClass : 'text-[var(--text-secondary)]'}
          />
          <DesktopValueCell
            label="Stop"
            value={position.has_stop_loss ? `$${formatCompactPrice(position.stop_loss!)}` : '—'}
            valueClassName={position.has_stop_loss ? 'text-red-500' : 'text-[var(--text-secondary)]'}
          />
          <DesktopValueCell
            label="Target"
            value={position.has_take_profit ? `$${formatCompactPrice(position.take_profit!)}` : '—'}
            valueClassName={position.has_take_profit ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}
          />
          <DesktopValueCell label="Value" value={formatExposure(position.position_size_usd)} valueClassName="text-[var(--text-secondary)]" />

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">P&amp;L</span>
            {hasQuote ? (
              <span className={cn('font-mono tabular-nums text-sm font-bold', pnlColorClass)}>
                {pnlPositive ? '+' : '-'}{formatPnlCurrency(pnlAmount)}
                <span className="ml-1 text-sm font-normal text-[var(--text-secondary)]">
                  ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                </span>
              </span>
            ) : (
              <span className="font-mono tabular-nums text-sm text-[var(--text-secondary)]">—</span>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">R / Score</span>
              <p className="font-mono tabular-nums text-xs text-[var(--text-secondary)]">{rAndScore}</p>
            </div>
            <HugeiconsIcon
              icon={CaretDown}
              size={16}
              className={cn('flex-none text-[var(--text-secondary)] transition-transform duration-150 group-hover:text-[var(--text-primary)] motion-reduce:transition-none', isExpanded && 'rotate-180')}
              strokeWidth={1.5}
              color="currentColor"
            />
          </div>
        </div>
      </button>

      <div
        className="grid transition-all duration-200 motion-reduce:transition-none"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[var(--border-subtle)] px-3 pb-3">
            <div className="pt-3">
              <RiskRewardBar position={position} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[var(--border-subtle)] py-2 lg:grid-cols-5">
              <MetaCell label="Size" value={`${position.quantity} shares`} />
              <MetaCell
                label="Conviction"
                value={position.conviction !== null ? `${position.conviction}/10` : '--'}
                valueClassName={
                  position.conviction === null
                    ? 'text-[var(--text-secondary)]'
                    : position.conviction >= 7
                      ? 'text-emerald-500'
                      : position.conviction >= 4
                        ? 'text-amber-500'
                        : 'text-red-500'
                }
              />
              <MetaCell label="Days Held" value={`${position.days_held}`} />
              <MetaCell
                label="Tags"
                value={
                  position.setup_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {position.setup_tags.map((tag) => (
                        <span key={tag} className="bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '--'
                  )
                }
              />
              <MetaCell label="Paper" value={position.is_paper ? 'YES' : 'NO'} />
            </div>

            <div className="border-b border-[var(--border-subtle)] py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">History</p>
                  {tickerHistory && tickerHistory.times_traded > 0 ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums text-sm text-[var(--text-secondary)]">
                      <span>{tickerHistory.wins}W-{tickerHistory.losses}L</span>
                      <span>{tickerHistory.win_rate.toFixed(0)}% WR</span>
                      <span>{tickerHistory.total_pnl >= 0 ? '+' : ''}{formatExposure(tickerHistory.total_pnl)}</span>
                      <span>{tickerHistory.avg_hold_days}D AVG HOLD</span>
                    </div>
                  ) : (
                    <p className="mt-1 font-mono tabular-nums text-sm text-[var(--text-secondary)]">
                      No closed trade history for {position.ticker} yet
                    </p>
                  )}
                </div>

                <Link
                  href={`/portfolio?tab=history&highlight=${position.id}`}
                  className="inline-flex min-h-11 items-center text-xs font-medium text-[var(--accent-primary)] transition-colors duration-150 hover:text-[var(--accent-hover)] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  History
                </Link>
              </div>
            </div>

            {position.has_thesis && (
              <blockquote className="border-b border-[var(--border-subtle)] border-l-2 border-[var(--border-default)] py-4 pl-3 text-sm italic text-[var(--text-secondary)]">
                {position.thesis}
              </blockquote>
            )}

            {smartAlerts.length > 0 && (
              <div className="border-b border-[var(--border-subtle)] py-3">
                <div className="space-y-2">
                  {smartAlerts.map((alert, index) => {
                    const AlertIcon = alertIcons[alert.severity]
                    return (
                      <div key={`${alert.type}-${index}`} className="flex items-start gap-2">
                        <HugeiconsIcon
                          icon={AlertIcon}
                          size={14}
                          className="mt-0.5 flex-none text-[var(--text-muted)]"
                          strokeWidth={1.5}
                          color="currentColor"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">{alert.message}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onScanWithPelican(position)
                }}
                className="inline-flex min-h-11 items-center bg-transparent p-0 text-xs font-medium uppercase tracking-wider text-[var(--accent-primary)] transition-colors duration-150 cursor-pointer hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
              >
                Monitor
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(position)
                }}
                className="inline-flex min-h-11 items-center bg-transparent p-0 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 cursor-pointer hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onClose(position)
                }}
                className="inline-flex min-h-11 items-center bg-transparent p-0 text-xs font-medium uppercase tracking-wider text-red-500 transition-colors duration-150 cursor-pointer hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
