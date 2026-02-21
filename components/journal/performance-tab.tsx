'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lightning, Notebook, CalendarCheck } from '@phosphor-icons/react'
import { Trade } from '@/hooks/use-trades'
import { formatPnl } from '@/lib/formatters'
import { TradeStats, EquityCurvePoint } from '@/hooks/use-trade-stats'
import { Quote } from '@/hooks/use-live-quotes'
import { PositionsDashboardTab } from '@/components/positions/positions-dashboard-tab'
import { CalendarTab } from '@/components/positions/calendar-tab'
import { PelicanCard, PelicanButton, staggerContainer, staggerItem } from '@/components/ui/pelican'

// ============================================================================
// Types
// ============================================================================

interface PerformanceTabProps {
  trades: Trade[]
  quotes: Record<string, Quote>
  stats: TradeStats | null
  equityCurve: EquityCurvePoint[]
  isLoading: boolean
  onOpenLogTrade?: () => void
  onSelectTrade?: (tradeId: string) => void
  onAskPelican: (prompt: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

function getClosedTradesInRange(trades: Trade[], startDate: Date, endDate: Date): Trade[] {
  return trades.filter(t => {
    if (t.status !== 'closed' || !t.exit_date) return false
    const d = new Date(t.exit_date)
    return d >= startDate && d <= endDate
  })
}

function computePeriodStats(trades: Trade[]) {
  const wins = trades.filter(t => (t.pnl_amount ?? 0) > 0).length
  const total = trades.length
  return {
    trades: total,
    pnl: trades.reduce((s, t) => s + (t.pnl_amount ?? 0), 0),
    winRate: total > 0 ? (wins / total) * 100 : 0,
    avgR: trades.filter(t => t.r_multiple != null).length > 0
      ? trades.filter(t => t.r_multiple != null).reduce((s, t) => s + t.r_multiple!, 0) / trades.filter(t => t.r_multiple != null).length
      : 0,
  }
}

function getWeekRange(weeksAgo: number) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + mondayOffset)
  thisMonday.setHours(0, 0, 0, 0)

  const start = new Date(thisMonday)
  start.setDate(start.getDate() - weeksAgo * 7)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}


// ============================================================================
// Period Comparison Banner
// ============================================================================

function PeriodComparison({ trades }: { trades: Trade[] }) {
  const comparison = useMemo(() => {
    const thisWeek = getWeekRange(0)
    const lastWeek = getWeekRange(1)

    const thisWeekTrades = getClosedTradesInRange(trades, thisWeek.start, thisWeek.end)
    const lastWeekTrades = getClosedTradesInRange(trades, lastWeek.start, lastWeek.end)

    return {
      current: computePeriodStats(thisWeekTrades),
      previous: computePeriodStats(lastWeekTrades),
    }
  }, [trades])

  const pnlDelta = comparison.current.pnl - comparison.previous.pnl
  const hasPrevious = comparison.previous.trades > 0

  return (
    <PelicanCard>
      <div className="flex items-center gap-2 mb-3">
        <Lightning size={16} weight="bold" className="text-[var(--accent-primary)]" />
        <span className="text-xs uppercase tracking-wider font-medium text-[var(--text-muted)]">
          This Week vs Last Week
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-[var(--text-muted)] block mb-0.5">P&L</span>
          <span className={`text-lg font-mono tabular-nums font-semibold ${comparison.current.pnl >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}`}>
            {formatPnl(comparison.current.pnl)}
          </span>
          {hasPrevious && (
            <span className={`text-xs font-mono tabular-nums block ${pnlDelta >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}`}>
              {pnlDelta >= 0 ? '\u2191' : '\u2193'} {formatPnl(pnlDelta)} vs last
            </span>
          )}
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)] block mb-0.5">Win Rate</span>
          <span className="text-lg font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {comparison.current.winRate.toFixed(1)}%
          </span>
          {hasPrevious && (
            <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] block">
              was {comparison.previous.winRate.toFixed(1)}%
            </span>
          )}
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)] block mb-0.5">Trades</span>
          <span className="text-lg font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {comparison.current.trades}
          </span>
          {hasPrevious && (
            <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] block">
              was {comparison.previous.trades}
            </span>
          )}
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)] block mb-0.5">Avg R</span>
          <span className={`text-lg font-mono tabular-nums font-semibold ${comparison.current.avgR >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}`}>
            {comparison.current.avgR.toFixed(2)}R
          </span>
          {hasPrevious && (
            <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] block">
              was {comparison.previous.avgR.toFixed(2)}R
            </span>
          )}
        </div>
      </div>
    </PelicanCard>
  )
}

// ============================================================================
// Review CTAs
// ============================================================================

function ReviewCTAs({ trades, onAskPelican }: { trades: Trade[]; onAskPelican: (prompt: string) => void }) {
  const thisWeek = getWeekRange(0)
  const weekTrades = getClosedTradesInRange(trades, thisWeek.start, thisWeek.end)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const monthTrades = getClosedTradesInRange(trades, monthStart, monthEnd)

  const buildWeeklyPrompt = () => {
    const stats = computePeriodStats(weekTrades)
    return [
      `Weekly review: I closed ${stats.trades} trades this week.`,
      `P&L: ${formatPnl(stats.pnl)}, Win rate: ${stats.winRate.toFixed(1)}%, Avg R: ${stats.avgR.toFixed(2)}.`,
      `Analyze my week: what patterns do you see? What should I do differently next week? Grade my discipline A-F.`,
    ].join(' ')
  }

  const buildMonthlyPrompt = () => {
    const stats = computePeriodStats(monthTrades)
    const monthName = now.toLocaleDateString('en-US', { month: 'long' })
    return [
      `Monthly review for ${monthName}: I closed ${stats.trades} trades.`,
      `P&L: ${formatPnl(stats.pnl)}, Win rate: ${stats.winRate.toFixed(1)}%, Avg R: ${stats.avgR.toFixed(2)}.`,
      `Give me a comprehensive monthly review: trends, patterns, strengths, weaknesses, and specific goals for next month.`,
    ].join(' ')
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <PelicanCard interactive onClick={() => onAskPelican(buildWeeklyPrompt())} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
            <Notebook size={18} weight="bold" className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Weekly Review</p>
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-mono tabular-nums">{weekTrades.length}</span> trades this week
            </p>
          </div>
        </div>
      </PelicanCard>
      <PelicanCard interactive onClick={() => onAskPelican(buildMonthlyPrompt())} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
            <CalendarCheck size={18} weight="bold" className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Monthly Review</p>
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-mono tabular-nums">{monthTrades.length}</span> trades this month
            </p>
          </div>
        </div>
      </PelicanCard>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PerformanceTab({
  trades,
  quotes,
  stats,
  equityCurve,
  isLoading,
  onOpenLogTrade,
  onSelectTrade,
  onAskPelican,
}: PerformanceTabProps) {
  const hasClosedTrades = trades.some(t => t.status === 'closed')

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Period Comparison */}
      {hasClosedTrades && (
        <motion.div variants={staggerItem}>
          <PeriodComparison trades={trades} />
        </motion.div>
      )}

      {/* Dashboard Stats & Charts */}
      <PositionsDashboardTab
        trades={trades}
        quotes={quotes}
        stats={stats}
        equityCurve={equityCurve}
        isLoading={isLoading}
        onOpenLogTrade={onOpenLogTrade}
        onSelectTrade={onSelectTrade}
      />

      {/* Review CTAs */}
      {hasClosedTrades && (
        <motion.div variants={staggerItem}>
          <ReviewCTAs trades={trades} onAskPelican={onAskPelican} />
        </motion.div>
      )}

      {/* Calendar (folded in from Calendar tab) */}
      <motion.div variants={staggerItem}>
        <CalendarTab
          trades={trades}
          isLoading={isLoading}
          onOpenLogTrade={onOpenLogTrade}
        />
      </motion.div>
    </motion.div>
  )
}
