'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretDown,
  CaretUp,
  Lightning,
  PencilSimple,
  XCircle,
  Warning,
  ShieldWarning,
  Info,
  Plus,
  Timer,
  Heartbeat,
} from '@phosphor-icons/react'
import { PelicanButton } from '@/components/ui/pelican'
import type { PortfolioPosition } from '@/types/portfolio'
import type { PositionHealth, PositionAlert } from '@/lib/position-health'
import type { TickerHistory } from '@/hooks/use-ticker-history'

// ============================================================================
// Types
// ============================================================================

interface PositionCardProps {
  position: PortfolioPosition
  healthScore: PositionHealth
  smartAlerts: PositionAlert[]
  tickerHistory: TickerHistory | null
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

const healthDotColor: Record<PositionHealth['color'], string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

const healthBorderColor: Record<PositionHealth['color'], string> = {
  emerald: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
}

const alertStyles: Record<PositionAlert['severity'], string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
}

const alertIcons: Record<PositionAlert['severity'], typeof Warning> = {
  critical: ShieldWarning,
  warning: Warning,
  info: Info,
}

// ============================================================================
// Risk/Reward Bar
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
    <div className="relative h-8 bg-[var(--bg-elevated)] rounded-lg overflow-hidden mt-4 mb-8">
      <div
        className="absolute top-0 h-full bg-red-500/15"
        style={{ left: `${Math.min(stopPct, entryPct)}%`, width: `${Math.abs(entryPct - stopPct)}%` }}
      />
      <div
        className="absolute top-0 h-full bg-emerald-500/15"
        style={{ left: `${Math.min(entryPct, targetPct)}%`, width: `${Math.abs(targetPct - entryPct)}%` }}
      />
      <div className="absolute top-0 h-full w-0.5 bg-red-400" style={{ left: `${stopPct}%` }} />
      <div className="absolute top-0 h-full w-0.5 bg-[var(--text-primary)]" style={{ left: `${entryPct}%` }} />
      <div className="absolute top-0 h-full w-0.5 bg-emerald-400" style={{ left: `${targetPct}%` }} />
      <div className="absolute -bottom-5 text-[10px] font-mono tabular-nums text-red-400" style={{ left: `${stopPct}%`, transform: 'translateX(-50%)' }}>
        ${formatCompactPrice(stop)}
      </div>
      <div className="absolute -bottom-5 text-[10px] font-mono tabular-nums text-[var(--text-primary)]" style={{ left: `${entryPct}%`, transform: 'translateX(-50%)' }}>
        ${formatCompactPrice(entry)}
      </div>
      <div className="absolute -bottom-5 text-[10px] font-mono tabular-nums text-emerald-400" style={{ left: `${targetPct}%`, transform: 'translateX(-50%)' }}>
        ${formatCompactPrice(target)}
      </div>
    </div>
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
  onScanWithPelican,
  onEdit,
  onClose,
  isExpanded,
  onToggleExpand,
}: PositionCardProps) {
  const ChevronIcon = isExpanded ? CaretUp : CaretDown
  const convictionColor =
    position.conviction !== null
      ? position.conviction >= 7 ? 'text-emerald-400' : position.conviction >= 4 ? 'text-amber-400' : 'text-red-400'
      : 'text-[var(--text-muted)]'

  return (
    <motion.div
      layout
      className={`
        bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl
        hover:border-[var(--accent-primary)]/20 transition-colors duration-150
        ${isExpanded ? `border-l-2 ${healthBorderColor[healthScore.color]}` : ''}
      `}
    >
      {/* Collapsed — Row 1: Main info */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left px-4 pt-3 pb-1 flex items-center gap-3"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${healthDotColor[healthScore.color]}`} title={healthScore.tooltip} />
        <span className="text-base font-semibold text-[var(--text-primary)]">{position.ticker}</span>
        <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full ${
          position.direction === 'long'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-red-500/15 text-red-400'
        }`}>
          {position.direction}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{position.asset_type}</span>
        <span className="ml-auto font-mono tabular-nums text-sm text-[var(--text-primary)]">
          {formatExposure(position.position_size_usd)}
        </span>
        {position.risk_reward_ratio !== null && (
          <span className="font-mono tabular-nums text-xs text-[var(--text-secondary)]">
            {position.risk_reward_ratio > 10 ? '>10R' : `${position.risk_reward_ratio.toFixed(1)}R`}
          </span>
        )}
        {position.conviction !== null && (
          <span className={`font-mono tabular-nums text-xs ${convictionColor}`}>
            {position.conviction}/10
          </span>
        )}
        <ChevronIcon size={16} weight="bold" className="text-[var(--text-muted)] shrink-0" />
      </button>

      {/* Collapsed — Row 2: Prices */}
      <div className="px-4 pb-1 flex items-center gap-4 text-xs">
        <span className="text-[var(--text-secondary)]">
          Entry <span className="font-mono tabular-nums text-[var(--text-primary)]">${formatCompactPrice(position.entry_price)}</span>
        </span>
        {position.has_stop_loss ? (
          <span className="text-red-400">
            Stop <span className="font-mono tabular-nums">${formatCompactPrice(position.stop_loss!)}</span>
            {position.distance_to_stop_pct !== null && (
              <span className="text-[var(--text-muted)] ml-0.5 font-mono tabular-nums">(-{Math.abs(position.distance_to_stop_pct).toFixed(1)}%)</span>
            )}
          </span>
        ) : (
          <span className="text-amber-400">No stop</span>
        )}
        {position.has_take_profit ? (
          <span className="text-emerald-400">
            Target <span className="font-mono tabular-nums">${formatCompactPrice(position.take_profit!)}</span>
            {position.distance_to_target_pct !== null && (
              <span className="text-[var(--text-muted)] ml-0.5 font-mono tabular-nums">(+{Math.abs(position.distance_to_target_pct).toFixed(1)}%)</span>
            )}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">No target</span>
        )}
      </div>

      {/* Collapsed — Row 3: Health + alerts */}
      <div className="px-4 pb-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <Timer size={12} weight="regular" />
          <span className="font-mono tabular-nums">{position.days_held}d</span>
        </span>
        <span className="flex items-center gap-1">
          <Heartbeat size={12} weight="regular" />
          {healthScore.label}
        </span>
        {smartAlerts.length > 0 && (
          <span className="truncate max-w-[200px] text-[var(--text-muted)]">
            {smartAlerts[0]?.message}
          </span>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)]">
              {/* Risk/Reward Bar */}
              <RiskRewardBar position={position} />

              {/* Position Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block">Size</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">{position.quantity} shares</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Conviction</span>
                  <span className={`font-mono tabular-nums ${convictionColor}`}>
                    {position.conviction !== null ? `${position.conviction}/10` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Days held</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">{position.days_held}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Tags</span>
                  {position.setup_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {position.setup_tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">--</span>
                  )}
                </div>
              </div>

              {position.is_paper && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-muted)] text-[var(--accent-primary)]">
                  Paper Trade
                </span>
              )}

              {/* Ticker Trade History */}
              <div className="mt-4">
                {tickerHistory && tickerHistory.times_traded > 0 ? (
                  <div className={`rounded-lg p-3 border ${
                    tickerHistory.total_pnl >= 0
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[var(--text-muted)]">Your history with </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{position.ticker}</span>
                      </div>
                      <Link
                        href={`/journal?highlight=${position.id}`}
                        className="text-[10px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View in Journal
                      </Link>
                    </div>
                    <div className="flex items-baseline gap-3 mt-1.5">
                      <span className="text-sm font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        {tickerHistory.wins}W-{tickerHistory.losses}L
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                        {tickerHistory.win_rate.toFixed(0)}% WR
                      </span>
                      <span className={`text-sm font-mono tabular-nums font-semibold ${
                        tickerHistory.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tickerHistory.total_pnl >= 0 ? '+' : ''}{formatExposure(tickerHistory.total_pnl)}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                        avg hold: {tickerHistory.avg_hold_days}d
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)] italic">
                      First time trading {position.ticker}
                    </span>
                    <Link
                      href={`/journal?highlight=${position.id}`}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View full trade details
                    </Link>
                  </div>
                )}
              </div>

              {/* Thesis */}
              <div className="mt-4">
                {position.has_thesis ? (
                  <blockquote className="border-l-2 border-[var(--accent-primary)]/30 pl-3 text-sm text-[var(--text-secondary)] italic">
                    {position.thesis}
                  </blockquote>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Warning size={14} weight="regular" />
                    <span>No thesis recorded</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(position) }}
                      className="flex items-center gap-1 text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
                    >
                      <Plus size={12} weight="bold" /> Add
                    </button>
                  </div>
                )}
              </div>

              {/* Smart Alerts */}
              {smartAlerts.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {smartAlerts.map((alert, i) => {
                    const AlertIcon = alertIcons[alert.severity]
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${alertStyles[alert.severity]}`}
                      >
                        <AlertIcon size={14} weight="bold" className="shrink-0 mt-0.5" />
                        <span>{alert.message}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <PelicanButton
                  variant="primary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onScanWithPelican(position) }}
                >
                  <Lightning size={14} weight="bold" />
                  Monitor
                </PelicanButton>
                <PelicanButton
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(position) }}
                >
                  <PencilSimple size={14} weight="regular" />
                  Edit
                </PelicanButton>
                <PelicanButton
                  variant="danger"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onClose(position) }}
                >
                  <XCircle size={14} weight="regular" />
                  Close
                </PelicanButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
