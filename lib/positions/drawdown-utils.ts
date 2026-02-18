export interface DrawdownPoint {
  date: string
  equity: number
  peak: number
  drawdown: number // percentage, always <= 0
  drawdownDollar: number // always <= 0
}

export interface DrawdownStats {
  maxDrawdownPercent: number
  maxDrawdownDollar: number
  maxDrawdownDate: string
  currentDrawdownPercent: number
  currentDrawdownDollar: number
  avgDrawdownPercent: number
  longestDrawdownDays: number
  recoveryDate: string | null
}

const ZEROED_STATS: DrawdownStats = {
  maxDrawdownPercent: 0,
  maxDrawdownDollar: 0,
  maxDrawdownDate: '',
  currentDrawdownPercent: 0,
  currentDrawdownDollar: 0,
  avgDrawdownPercent: 0,
  longestDrawdownDays: 0,
  recoveryDate: null,
}

export function calculateDrawdown(
  equityCurve: { date: string; cumulative_pnl: number }[],
  startingBalance: number
): { points: DrawdownPoint[]; stats: DrawdownStats } {
  if (equityCurve.length === 0) {
    return { points: [], stats: { ...ZEROED_STATS } }
  }

  let peak = startingBalance
  let maxDrawdownPercent = 0
  let maxDrawdownDollar = 0
  let maxDrawdownDate = ''
  let drawdownSum = 0
  let drawdownCount = 0
  let currentStreak = 0
  let longestStreak = 0

  const points: DrawdownPoint[] = equityCurve.map((point) => {
    const equity = startingBalance + point.cumulative_pnl

    if (equity > peak) {
      peak = equity
    }

    const drawdownDollar = equity - peak // <= 0 when below peak
    const drawdown = peak > 0 ? (drawdownDollar / peak) * 100 : 0

    // Track max drawdown
    if (drawdown < maxDrawdownPercent) {
      maxDrawdownPercent = drawdown
      maxDrawdownDollar = drawdownDollar
      maxDrawdownDate = point.date
    }

    // Track average of non-zero drawdowns
    if (drawdown < 0) {
      drawdownSum += drawdown
      drawdownCount++
      currentStreak++
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }
    } else {
      currentStreak = 0
    }

    return {
      date: point.date,
      equity,
      peak,
      drawdown,
      drawdownDollar,
    }
  })

  const lastPoint = points[points.length - 1] as DrawdownPoint | undefined
  const currentDrawdownPercent = lastPoint?.drawdown ?? 0
  const currentDrawdownDollar = lastPoint?.drawdownDollar ?? 0
  const avgDrawdownPercent = drawdownCount > 0 ? drawdownSum / drawdownCount : 0
  const recoveryDate = lastPoint && lastPoint.drawdown === 0 ? lastPoint.date : null

  return {
    points,
    stats: {
      maxDrawdownPercent,
      maxDrawdownDollar,
      maxDrawdownDate,
      currentDrawdownPercent,
      currentDrawdownDollar,
      avgDrawdownPercent,
      longestDrawdownDays: longestStreak,
      recoveryDate,
    },
  }
}

export function calculateAccountBalance(
  equityCurve: { date: string; cumulative_pnl: number }[],
  startingBalance: number
): { date: string; balance: number; pnl: number }[] {
  return equityCurve.map((point) => ({
    date: point.date,
    balance: startingBalance + point.cumulative_pnl,
    pnl: point.cumulative_pnl,
  }))
}
