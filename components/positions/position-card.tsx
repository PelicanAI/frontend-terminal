'use client'

import Link from 'next/link'
import {
  CaretDown,
  Lightning,
  PencilSimple,
  XCircle,
  Warning,
  ShieldWarning,
  Info,
  Plus,
} from '@phosphor-icons/react'
import type { PortfolioPosition } from '@/types/portfolio'
import type { PositionHealth, PositionAlert } from '@/lib/position-health'
import type { TickerHistory } from '@/hooks/use-ticker-history'
import type { Quote } from '@/hooks/use-live-quotes'

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

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
  amber: 'bg-amber-500',
  red: 'bg-red-400',
}

const alertStyles: Record<PositionAlert['severity'], string> = {
  critical: 'bg-red-400/8 text-red-400/80 border-red-400/15',
  warning: 'bg-amber-500/8 text-amber-500/60 border-amber-500/10',
  info: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]/30',
}

const alertIcons: Record<PositionAlert['severity'], typeof Warning> = {
  critical: ShieldWarning,
  warning: Warning,
  info: Info,
}

// ============================================================================
// Risk/Reward Bar (desaturated)
// ============================================================================

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
    <div className="relative h-7 bg-[var(--bg-base)] rounded overflow-hidden mt-3 mb-7">
      <div
        className="absolute top-0 h-full bg-red-400/10"
        style={{ left: `${Math.min(stopPct, entryPct)}%`, width: `${Math.abs(entryPct - stopPct)}%` }}
      />
      <div
        className="absolute top-0 h-full bg-emerald-400/8"
        style={{ left: `${Math.min(entryPct, targetPct)}%`, width: `${Math.abs(targetPct - entryPct)}%` }}
      />
      <div className="absolute top-0 h-full w-px bg-red-400/60" style={{ left: `${stopPct}%` }} />
      <div className="absolute top-0 h-full w-px bg-[var(--text-secondary)]" style={{ left: `${entryPct}%` }} />
      <div className="absolute top-0 h-full w-px bg-emerald-400/60" style={{ left: `${targetPct}%` }} />
      <div className="absolute -bottom-5 text-[10px] font-[var(--font-geist-mono)] tabular-nums text-red-400/60" style={{ left: `${stopPct}%`, transform: 'translateX(-50%)' }}>
        ${formatCompactPrice(stop)}
      </div>
      <div className="absolute -bottom-5 text-[10px] font-[var(--font-geist-mono)] tabular-nums text-[var(--text-secondary)]" style={{ left: `${entryPct}%`, transform: 'translateX(-50%)' }}>
        ${formatCompactPrice(entry)}
      </div>
      <div className="absolute -bottom-5 text-[10px] font-[var(--font-geist-mono)] tabular-nums text-emerald-400/60" style={{ left: `${targetPct}%`, transform: 'translateX(-50%)' }}>
        ${formatCompactPrice(target)}
      </div>
    </div>
  )
}

// ============================================================================
// Micro-label component
// ============================================================================

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
    </span>
  )
}

// ============================================================================
// PositionCard
// ============================================================================

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
  const pnlColorClass = pnlPositive ? 'text-emerald-400/80' : 'text-red-400/80'
  const pnlBgClass = pnlPositive ? 'bg-emerald-400/[0.08]' : 'bg-red-400/[0.08]'

  return (
    <div
      className={`
        bg-[var(--bg-surface)] border border-[var(--border-subtle)]/40 rounded-lg
        hover:bg-[var(--bg-elevated)] hover:border-[var(--border-subtle)]/60
        transition-all duration-150 cursor-pointer
      `}
    >
      {/* Collapsed — single dense row */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left flex items-center px-4 py-3 gap-3"
      >
        {/* Left cluster: identity */}
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${healthDotColor[healthScore.color]}`}
          title={healthScore.tooltip}
        />
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          {position.ticker}
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded ${
          position.direction === 'long'
            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]/80'
            : 'bg-red-400/10 text-red-400/80'
        }`}>
          {position.direction}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">{position.asset_type}</span>

        {/* Center: price levels (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-4 text-[11px] flex-1 justify-center">
          <span className="text-[var(--text-secondary)]">
            Entry{' '}
            <span className="font-[var(--font-geist-mono)] text-[var(--text-primary)]">
              ${formatCompactPrice(position.entry_price)}
            </span>
          </span>
          {hasQuote && (
            <span className="text-[var(--text-secondary)]">
              Now{' '}
              <span className={`font-[var(--font-geist-mono)] ${pnlColorClass}`}>
                ${formatCompactPrice(quote!.price)}
              </span>
            </span>
          )}
          {position.has_stop_loss ? (
            <span className="text-red-400/60">
              Stop{' '}
              <span className="font-[var(--font-geist-mono)]">
                ${formatCompactPrice(position.stop_loss!)}
              </span>
            </span>
          ) : (
            <span className="text-amber-500/60">No stop</span>
          )}
          {position.has_take_profit ? (
            <span className="text-emerald-400/60">
              Target{' '}
              <span className="font-[var(--font-geist-mono)]">
                ${formatCompactPrice(position.take_profit!)}
              </span>
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">No target</span>
          )}
        </div>

        {/* Right: P&L cluster */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto sm:ml-0">
          <span className="text-xs font-[var(--font-geist-mono)] text-[var(--text-muted)]">
            {formatExposure(position.position_size_usd)}
          </span>
          {hasQuote ? (
            <span className={`px-2 py-0.5 rounded ${pnlBgClass}`}>
              <span className={`text-xs font-[var(--font-geist-mono)] font-medium ${pnlColorClass}`}>
                {pnlPositive ? '+' : '-'}{formatPnlCurrency(pnlAmount)}
                <span className="ml-1 font-normal">
                  ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                </span>
              </span>
            </span>
          ) : (
            <span className="text-xs font-[var(--font-geist-mono)] text-[var(--text-muted)]">P&L --</span>
          )}
          {position.risk_reward_ratio !== null && (
            <span className="text-[11px] font-[var(--font-geist-mono)] text-[var(--text-muted)]">
              {position.risk_reward_ratio > 10 ? '>10R' : `${position.risk_reward_ratio.toFixed(1)}R`}
            </span>
          )}
          {position.conviction !== null && (
            <span className="text-[11px] font-[var(--font-geist-mono)] text-[var(--accent-primary)]/70">
              {position.conviction}/10
            </span>
          )}
          <CaretDown
            size={14}
            weight="bold"
            className={`text-sm text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded content — CSS grid transition */}
      <div
        className="grid transition-all duration-200"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[var(--border-subtle)]/30 px-4 pb-4">
            {/* Risk/Reward Bar */}
            <RiskRewardBar position={position} />

            {/* Metrics grid */}
            <div className="grid grid-cols-5 gap-4 py-3 border-b border-[var(--border-subtle)]/20">
              <div>
                <MicroLabel>Size</MicroLabel>
                <div className="font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-primary)] mt-0.5">
                  {position.quantity} shares
                </div>
              </div>
              <div>
                <MicroLabel>Conviction</MicroLabel>
                <div className={`font-[var(--font-geist-mono)] text-xs tabular-nums mt-0.5 ${
                  position.conviction !== null
                    ? position.conviction >= 7 ? 'text-emerald-400/80' : position.conviction >= 4 ? 'text-amber-500/60' : 'text-red-400/80'
                    : 'text-[var(--text-muted)]'
                }`}>
                  {position.conviction !== null ? `${position.conviction}/10` : '--'}
                </div>
              </div>
              <div>
                <MicroLabel>Days Held</MicroLabel>
                <div className="font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-primary)] mt-0.5">
                  {position.days_held}
                </div>
              </div>
              <div>
                <MicroLabel>Tags</MicroLabel>
                {position.setup_tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {position.setup_tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">--</div>
                )}
              </div>
              <div>
                <MicroLabel>Paper</MicroLabel>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {position.is_paper ? (
                    <span className="text-[var(--accent-primary)]/70">Yes</span>
                  ) : (
                    <span>No</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ticker history — terminal style */}
            <div className="mt-3 px-3 py-2.5 bg-[var(--bg-base)] rounded border border-[var(--border-subtle)]/20">
              {tickerHistory && tickerHistory.times_traded > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <MicroLabel>History &middot; {position.ticker}</MicroLabel>
                    <Link
                      href={`/journal?highlight=${position.id}`}
                      className="text-[10px] font-[var(--font-geist-mono)] text-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      journal &rarr;
                    </Link>
                  </div>
                  <div className="flex items-baseline gap-3 mt-1.5">
                    <span className="font-[var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--text-primary)]">
                      {tickerHistory.wins}W-{tickerHistory.losses}L
                    </span>
                    <span className="font-[var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--text-muted)]">
                      {tickerHistory.win_rate.toFixed(0)}% WR
                    </span>
                    <span className={`font-[var(--font-geist-mono)] text-[11px] tabular-nums ${
                      tickerHistory.total_pnl >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'
                    }`}>
                      {tickerHistory.total_pnl >= 0 ? '+' : ''}{formatExposure(tickerHistory.total_pnl)}
                    </span>
                    <span className="font-[var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--text-muted)]">
                      avg hold: {tickerHistory.avg_hold_days}d
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-muted)] italic">
                    First time trading {position.ticker}
                  </span>
                  <Link
                    href={`/journal?highlight=${position.id}`}
                    className="text-[10px] font-[var(--font-geist-mono)] text-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    journal &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Thesis / warning */}
            {position.has_thesis ? (
              <blockquote className="mt-3 border-l-2 border-[var(--accent-primary)]/20 pl-3 text-[11px] text-[var(--text-secondary)] italic">
                {position.thesis}
              </blockquote>
            ) : (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded bg-amber-500/[0.05] border border-amber-500/10">
                <Warning size={12} weight="regular" className="text-amber-500/60 text-xs shrink-0" />
                <span className="text-[11px] text-amber-500/60">No thesis recorded</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(position) }}
                  className="text-[10px] font-medium text-amber-500/70 uppercase tracking-[0.06em] hover:text-amber-500 transition-colors"
                >
                  + Add
                </button>
              </div>
            )}

            {/* Smart Alerts */}
            {smartAlerts.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {smartAlerts.map((alert, i) => {
                  const AlertIcon = alertIcons[alert.severity]
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 px-3 py-2 rounded border text-[11px] ${alertStyles[alert.severity]}`}
                    >
                      <AlertIcon size={12} weight="bold" className="shrink-0 mt-0.5" />
                      <span>{alert.message}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]/20">
              <button
                onClick={(e) => { e.stopPropagation(); onScanWithPelican(position) }}
                className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]/80 border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/20 transition-colors"
              >
                <Lightning size={12} weight="bold" />
                Monitor
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(position) }}
                className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]/40 hover:border-[var(--border-subtle)]/60 transition-colors"
              >
                <PencilSimple size={12} weight="regular" />
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(position) }}
                className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded bg-red-400/[0.08] text-red-400/70 border border-red-400/10 hover:bg-red-400/[0.12] transition-colors"
              >
                <XCircle size={12} weight="regular" />
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
