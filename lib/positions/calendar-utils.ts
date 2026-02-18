import { Trade } from '@/hooks/use-trades'

// ─── Types ──────────────────────────────────────────────

export interface CalendarDay {
  date: string          // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  data: DayData | null
}

export interface DayData {
  pnl: number
  tradeCount: number
  trades: Trade[]
  isWinningDay: boolean
  winCount: number
  lossCount: number
}

export interface MonthStats {
  totalPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number
  tradingDays: number
  avgDailyPnl: number
  bestDay: { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
}

// ─── Calendar Grid ──────────────────────────────────────

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildCalendarGrid(
  year: number,
  month: number, // 0-indexed
  trades: Trade[],
): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1)

  // Week starts Monday: shift Sunday (0) to index 6, Monday (1) to index 0
  const startDayOfWeek = (firstOfMonth.getDay() + 6) % 7
  const startDate = new Date(firstOfMonth)
  startDate.setDate(startDate.getDate() - startDayOfWeek)

  const todayStr = toDateString(new Date())

  // Group closed trades by exit_date
  const tradesByDate = new Map<string, Trade[]>()
  for (const t of trades) {
    if (t.status !== 'closed' || !t.exit_date) continue
    const dateKey = t.exit_date.split('T')[0]!
    const arr = tradesByDate.get(dateKey)
    if (arr) arr.push(t)
    else tradesByDate.set(dateKey, [t])
  }

  // Build 6 weeks × 7 days = 42 cells
  const days: CalendarDay[] = []
  const cursor = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    const dateStr = toDateString(cursor)
    const dow = cursor.getDay()
    const dayTrades = tradesByDate.get(dateStr)

    let data: DayData | null = null
    if (dayTrades && dayTrades.length > 0) {
      const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0)
      data = {
        pnl,
        tradeCount: dayTrades.length,
        trades: dayTrades,
        isWinningDay: pnl > 0,
        winCount: dayTrades.filter((t) => (t.pnl_amount || 0) > 0).length,
        lossCount: dayTrades.filter((t) => (t.pnl_amount || 0) < 0).length,
      }
    }

    days.push({
      date: dateStr,
      dayNumber: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === month,
      isToday: dateStr === todayStr,
      isWeekend: dow === 0 || dow === 6,
      data,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

// ─── Month Stats ────────────────────────────────────────

export function calculateMonthStats(days: CalendarDay[]): MonthStats {
  const tradingDays = days.filter((d) => d.isCurrentMonth && d.data)

  if (tradingDays.length === 0) {
    return {
      totalPnl: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      tradingDays: 0,
      avgDailyPnl: 0,
      bestDay: null,
      worstDay: null,
    }
  }

  const totalPnl = tradingDays.reduce((sum, d) => sum + d.data!.pnl, 0)
  const tradeCount = tradingDays.reduce((sum, d) => sum + d.data!.tradeCount, 0)
  const winCount = tradingDays.reduce((sum, d) => sum + d.data!.winCount, 0)
  const lossCount = tradingDays.reduce((sum, d) => sum + d.data!.lossCount, 0)

  const sorted = [...tradingDays].sort((a, b) => a.data!.pnl - b.data!.pnl)
  const worst = sorted[0]!
  const best = sorted[sorted.length - 1]!

  return {
    totalPnl,
    tradeCount,
    winCount,
    lossCount,
    winRate: tradeCount > 0 ? (winCount / tradeCount) * 100 : 0,
    tradingDays: tradingDays.length,
    avgDailyPnl: totalPnl / tradingDays.length,
    bestDay: { date: best.date, pnl: best.data!.pnl },
    worstDay: { date: worst.date, pnl: worst.data!.pnl },
  }
}

// ─── Color Intensity ────────────────────────────────────

export function getCellBackground(pnl: number, maxAbsPnl: number): string {
  if (pnl === 0 || maxAbsPnl === 0) return 'transparent'
  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1)
  const alpha = 0.03 + intensity * 0.12

  if (pnl > 0) return `rgba(34,197,94,${alpha.toFixed(3)})`
  return `rgba(239,68,68,${alpha.toFixed(3)})`
}

// ─── Formatters ─────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const currencyFmtPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number, precise = false): string {
  return precise ? currencyFmtPrecise.format(value) : currencyFmt.format(value)
}

export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `$${(value / 1_000).toFixed(1)}k`
  return currencyFmt.format(value)
}

export function formatCurrencySigned(value: number, precise = false): string {
  const formatted = precise
    ? currencyFmtPrecise.format(Math.abs(value))
    : currencyFmt.format(Math.abs(value))
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}
