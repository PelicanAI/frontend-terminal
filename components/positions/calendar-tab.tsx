'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, CalendarBlank, X } from '@phosphor-icons/react'
import { Trade } from '@/hooks/use-trades'
import { PelicanCard, PelicanButton, staggerContainer, staggerItem } from '@/components/ui/pelican'
import { Plus } from '@phosphor-icons/react'
import {
  buildCalendarGrid,
  calculateMonthStats,
  getCellBackground,
  formatCurrency,
  formatCurrencySigned,
  formatCurrencyCompact,
  type CalendarDay,
  type MonthStats,
} from '@/lib/positions/calendar-utils'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_HEADERS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface CalendarTabProps {
  trades: Trade[]
  isLoading: boolean
  onOpenLogTrade?: () => void
}

export function CalendarTab({ trades, isLoading, onOpenLogTrade }: CalendarTabProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const calendarDays = useMemo(
    () => buildCalendarGrid(year, month, trades),
    [year, month, trades],
  )

  const monthStats = useMemo(
    () => calculateMonthStats(calendarDays),
    [calendarDays],
  )

  const maxAbsPnl = useMemo(() => {
    let max = 0
    for (const d of calendarDays) {
      if (d.data) max = Math.max(max, Math.abs(d.data.pnl))
    }
    return max
  }, [calendarDays])

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return []
    return trades.filter(
      (t) => t.status === 'closed' && t.exit_date?.startsWith(selectedDate),
    )
  }, [selectedDate, trades])

  const selectedDayPnl = useMemo(
    () => selectedDayTrades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0),
    [selectedDayTrades],
  )

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const navigateMonth = (delta: number) => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + delta)
      return d
    })
    setSelectedDate(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <CalendarBlank size={40} className="text-[var(--text-muted)] mb-3" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Your trade calendar starts here
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1 text-center max-w-sm">
          Log and close trades to see your daily performance
        </p>
        {onOpenLogTrade && (
          <PelicanButton
            variant="primary"
            size="lg"
            className="mt-4"
            onClick={onOpenLogTrade}
          >
            <Plus size={16} weight="bold" />
            Log Trade
          </PelicanButton>
        )}
      </div>
    )
  }

  const closedTradesInMonth = trades.filter((t) => {
    if (t.status !== 'closed' || !t.exit_date) return false
    const d = t.exit_date.split('T')[0]!
    const [ty, tm] = d.split('-').map(Number)
    return ty === year && tm === month + 1
  })

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Calendar Card */}
      <motion.div variants={staggerItem}>
        <PelicanCard>
          {/* Header: navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <CaretLeft size={16} />
              </button>

              <h3 className="text-sm font-semibold text-[var(--text-primary)] min-w-[140px] text-center">
                {monthName}
              </h3>

              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <CaretRight size={16} />
              </button>

              <button
                onClick={() => {
                  setCurrentMonth(new Date())
                  setSelectedDate(null)
                }}
                className="px-2 py-1 text-xs rounded-md transition-colors hover:bg-[var(--bg-elevated)]"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Today
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d, i) => (
              <div
                key={d + i}
                className="text-center py-1.5"
              >
                <span
                  className="text-xs font-medium uppercase tracking-wider hidden sm:inline"
                  style={{ color: i >= 5 ? 'var(--text-disabled)' : 'var(--text-muted)' }}
                >
                  {d}
                </span>
                <span
                  className="text-xs font-medium uppercase tracking-wider sm:hidden"
                  style={{ color: i >= 5 ? 'var(--text-disabled)' : 'var(--text-muted)' }}
                >
                  {DAY_HEADERS_SHORT[i]}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-[var(--border-subtle)]">
            {calendarDays.map((day) => (
              <CalendarCell
                key={day.date}
                day={day}
                maxAbsPnl={maxAbsPnl}
                isSelected={selectedDate === day.date}
                onClick={() => {
                  if (day.data && day.isCurrentMonth) {
                    setSelectedDate(
                      selectedDate === day.date ? null : day.date,
                    )
                  }
                }}
              />
            ))}
          </div>
        </PelicanCard>
      </motion.div>

      {/* Day Detail Panel */}
      <AnimatePresence>
        {selectedDate && selectedDayTrades.length > 0 && (
          <motion.div
            key="day-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DayDetailPanel
              date={selectedDate}
              trades={selectedDayTrades}
              totalPnl={selectedDayPnl}
              onClose={() => setSelectedDate(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Summary */}
      {closedTradesInMonth.length > 0 && (
        <motion.div variants={staggerItem}>
          <MonthSummary stats={monthStats} monthName={monthName} />
        </motion.div>
      )}

      {/* Empty month */}
      {closedTradesInMonth.length === 0 && (
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <div className="flex flex-col items-center justify-center py-10">
              <CalendarBlank size={28} className="text-[var(--text-muted)]" />
              <p className="text-sm mt-2 text-[var(--text-secondary)]">
                No closed trades in {monthName.split(' ')[0]}
              </p>
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                Close trades to see daily P&L on the calendar
              </p>
            </div>
          </PelicanCard>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Calendar Cell ──────────────────────────────────────

function CalendarCell({
  day,
  maxAbsPnl,
  isSelected,
  onClick,
}: {
  day: CalendarDay
  maxAbsPnl: number
  isSelected: boolean
  onClick: () => void
}) {
  const hasTrades = day.data && day.isCurrentMonth
  const bg = hasTrades
    ? getCellBackground(day.data!.pnl, maxAbsPnl)
    : 'var(--bg-surface)'

  return (
    <button
      onClick={onClick}
      disabled={!hasTrades}
      className={`
        relative flex flex-col items-start p-1.5 sm:p-2 min-h-[60px] sm:min-h-[80px]
        transition-all duration-150 text-left
        ${hasTrades ? 'hover:brightness-110 cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-1 ring-[var(--accent-primary)] ring-inset' : ''}
        ${!day.isCurrentMonth ? 'opacity-30' : ''}
        ${day.isWeekend && !day.data ? 'opacity-60' : ''}
      `}
      style={{ background: bg }}
    >
      {/* Day number */}
      <span
        className={`text-xs ${day.isToday ? 'font-bold' : ''}`}
        style={{
          color: day.isToday
            ? 'var(--accent-primary)'
            : day.isCurrentMonth
              ? 'var(--text-secondary)'
              : 'var(--text-muted)',
        }}
      >
        {day.isToday ? (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold">
            {day.dayNumber}
          </span>
        ) : (
          day.dayNumber
        )}
      </span>

      {/* P&L */}
      {hasTrades && (
        <div className="mt-auto w-full">
          <span
            className="text-[10px] sm:text-xs font-mono font-semibold tabular-nums block truncate"
            style={{
              color: day.data!.isWinningDay
                ? 'var(--data-positive)'
                : 'var(--data-negative)',
            }}
          >
            <span className="hidden sm:inline">
              {formatCurrencySigned(day.data!.pnl)}
            </span>
            <span className="sm:hidden">
              {day.data!.pnl >= 0 ? '+' : ''}
              {formatCurrencyCompact(day.data!.pnl)}
            </span>
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            <span
              className="text-[10px] font-mono hidden sm:inline"
              style={{ color: 'var(--text-muted)' }}
            >
              {day.data!.tradeCount}
            </span>
            <span
              className="text-[8px]"
              style={{
                color: day.data!.isWinningDay
                  ? 'var(--data-positive)'
                  : 'var(--data-negative)',
              }}
            >
              {day.data!.isWinningDay ? '\u25B2' : '\u25BC'}
            </span>
          </div>
        </div>
      )}
    </button>
  )
}

// ─── Day Detail Panel ───────────────────────────────────

function DayDetailPanel({
  date,
  trades,
  totalPnl,
  onClose,
}: {
  date: string
  trades: Trade[]
  totalPnl: number
  onClose: () => void
}) {
  const dateObj = new Date(date + 'T12:00:00')
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const wins = trades.filter((t) => (t.pnl_amount || 0) > 0).length
  const losses = trades.filter((t) => (t.pnl_amount || 0) < 0).length

  const rValues = trades
    .filter((t) => t.r_multiple != null)
    .map((t) => t.r_multiple!)
  const avgR =
    rValues.length > 0
      ? rValues.reduce((a, b) => a + b, 0) / rValues.length
      : 0

  return (
    <PelicanCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          {formattedDate}
        </h4>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-mono font-semibold tabular-nums"
            style={{
              color: totalPnl >= 0 ? 'var(--data-positive)' : 'var(--data-negative)',
            }}
          >
            Total: {formatCurrencySigned(totalPnl, true)}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Trade rows */}
      <div className="space-y-2">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between p-3 rounded-lg"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {trade.ticker}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                  style={{
                    background:
                      trade.direction === 'long'
                        ? 'rgba(34,197,94,0.1)'
                        : 'rgba(239,68,68,0.1)',
                    color:
                      trade.direction === 'long'
                        ? 'var(--data-positive)'
                        : 'var(--data-negative)',
                  }}
                >
                  {trade.direction}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {trade.quantity}{' '}
                {trade.asset_type === 'option' ? 'contracts' : 'shares'}
                {trade.setup_tags && trade.setup_tags.length > 0 && (
                  <> &middot; {trade.setup_tags[0]}</>
                )}
              </span>
            </div>

            <div className="text-right">
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{
                  color:
                    (trade.pnl_amount || 0) >= 0
                      ? 'var(--data-positive)'
                      : 'var(--data-negative)',
                }}
              >
                {formatCurrencySigned(trade.pnl_amount || 0, true)}
                {trade.pnl_percent != null && (
                  <span className="text-xs ml-1">
                    ({trade.pnl_percent >= 0 ? '+' : ''}
                    {trade.pnl_percent.toFixed(1)}%)
                  </span>
                )}
              </span>
              <div
                className="text-xs font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                {formatCurrency(trade.entry_price, true)} &rarr;{' '}
                {trade.exit_price != null
                  ? formatCurrency(trade.exit_price, true)
                  : '\u2014'}
                {trade.r_multiple != null && (
                  <span className="ml-2">
                    R: {trade.r_multiple.toFixed(1)}x
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Day summary */}
      <div
        className="flex items-center gap-4 sm:gap-6 mt-3 pt-3 flex-wrap"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <MiniStat label="Trades" value={String(trades.length)} />
        <MiniStat label="W/L" value={`${wins}/${losses}`} />
        {rValues.length > 0 && (
          <MiniStat label="Avg R" value={`${avgR.toFixed(1)}x`} />
        )}
      </div>
    </PelicanCard>
  )
}

// ─── Month Summary Bar ──────────────────────────────────

function MonthSummary({
  stats,
  monthName,
}: {
  stats: MonthStats
  monthName: string
}) {
  const shortMonth = monthName.split(' ')[0]

  return (
    <PelicanCard>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <span className="text-xs text-[var(--text-muted)]">
            {shortMonth} P&L
          </span>
          <p
            className="text-sm font-mono font-bold tabular-nums"
            style={{
              color:
                stats.totalPnl >= 0
                  ? 'var(--data-positive)'
                  : 'var(--data-negative)',
            }}
          >
            {formatCurrencySigned(stats.totalPnl)}
          </p>
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">Win Rate</span>
          <p className="text-sm font-mono font-bold tabular-nums text-[var(--text-primary)]">
            {stats.winRate.toFixed(1)}%
          </p>
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">Trades</span>
          <p className="text-sm font-mono font-bold tabular-nums text-[var(--text-primary)]">
            {stats.winCount}W / {stats.lossCount}L
          </p>
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">
            Trading Days
          </span>
          <p className="text-sm font-mono font-bold tabular-nums text-[var(--text-primary)]">
            {stats.tradingDays}
          </p>
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">
            Avg Daily
          </span>
          <p
            className="text-sm font-mono font-bold tabular-nums"
            style={{
              color:
                stats.avgDailyPnl >= 0
                  ? 'var(--data-positive)'
                  : 'var(--data-negative)',
            }}
          >
            {formatCurrencySigned(stats.avgDailyPnl)}
          </p>
        </div>

        {stats.bestDay && (
          <div className="ml-auto text-right hidden sm:block">
            <span className="text-[10px] text-[var(--text-muted)]">
              Best Day
            </span>
            <p
              className="text-xs font-mono font-semibold tabular-nums"
              style={{ color: 'var(--data-positive)' }}
            >
              {formatCurrencySigned(stats.bestDay.pnl)} (
              {new Date(stats.bestDay.date + 'T12:00:00').toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' },
              )}
              )
            </p>
          </div>
        )}

        {stats.worstDay && (
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-[var(--text-muted)]">
              Worst Day
            </span>
            <p
              className="text-xs font-mono font-semibold tabular-nums"
              style={{ color: 'var(--data-negative)' }}
            >
              {formatCurrencySigned(stats.worstDay.pnl)} (
              {new Date(stats.worstDay.date + 'T12:00:00').toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' },
              )}
              )
            </p>
          </div>
        )}
      </div>
    </PelicanCard>
  )
}

// ─── Mini Stat ──────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      <p className="text-xs font-mono font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  )
}
