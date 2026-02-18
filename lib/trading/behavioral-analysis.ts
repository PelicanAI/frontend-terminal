import type { Trade } from '@/hooks/use-trades'
import type { BehavioralInsight, InsightCategory } from '@/types/trading'

/**
 * Analyze trades for behavioral patterns and generate insights
 */
export function analyzeBehavior(trades: Trade[]): BehavioralInsight[] {
  if (trades.length < 3) return []

  const insights: BehavioralInsight[] = []
  const closed = trades.filter(t => t.status === 'closed' && t.pnl_amount !== null)
  if (closed.length < 3) return []

  // Sort by entry date
  const sorted = [...closed].sort((a, b) =>
    new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  )

  // ── Streaks ──
  const streaks = detectStreaks(sorted)
  if (streaks.winStreak >= 3) {
    insights.push({
      id: 'win_streak',
      category: 'win_streak',
      title: `${streaks.winStreak}-trade winning streak`,
      description: `You've won ${streaks.winStreak} trades in a row. Stay disciplined — don't increase size out of overconfidence.`,
      severity: 'positive',
      data: { streak: streaks.winStreak },
      actionable: 'Stick to your plan. Winning streaks end when discipline slips.',
      created_at: new Date().toISOString(),
    })
  }
  if (streaks.lossStreak >= 3) {
    insights.push({
      id: 'loss_streak',
      category: 'loss_streak',
      title: `${streaks.lossStreak}-trade losing streak`,
      description: `You've lost ${streaks.lossStreak} trades in a row. Consider stepping back to reassess.`,
      severity: streaks.lossStreak >= 5 ? 'critical' : 'warning',
      data: { streak: streaks.lossStreak },
      actionable: 'Take a break. Review your last entries for pattern deviations.',
      created_at: new Date().toISOString(),
    })
  }

  // ── Overtrading detection ──
  const overtradingInsight = detectOvertrading(sorted)
  if (overtradingInsight) insights.push(overtradingInsight)

  // ── Revenge trading detection ──
  const revengeInsight = detectRevengeTrading(sorted)
  if (revengeInsight) insights.push(revengeInsight)

  // ── Best/worst setup ──
  const setupInsights = analyzeSetups(closed)
  insights.push(...setupInsights)

  // ── Best/worst time ──
  const timeInsights = analyzeTradeTime(closed)
  insights.push(...timeInsights)

  // ── Risk/reward analysis ──
  const rrInsight = analyzeRiskReward(closed)
  if (rrInsight) insights.push(rrInsight)

  // ── Hold time analysis ──
  const holdInsight = analyzeHoldTime(closed)
  if (holdInsight) insights.push(holdInsight)

  // ── Ticker concentration ──
  const concentrationInsight = analyzeTickerConcentration(closed)
  if (concentrationInsight) insights.push(concentrationInsight)

  return insights
}

function detectStreaks(sorted: Trade[]) {
  let winStreak = 0
  let lossStreak = 0
  let currentWin = 0
  let currentLoss = 0

  for (const trade of sorted) {
    if ((trade.pnl_amount ?? 0) > 0) {
      currentWin++
      currentLoss = 0
    } else {
      currentLoss++
      currentWin = 0
    }
    winStreak = Math.max(winStreak, currentWin)
    lossStreak = Math.max(lossStreak, currentLoss)
  }

  // Current streak (from most recent)
  const recent = [...sorted].reverse()
  let recentWin = 0
  let recentLoss = 0
  for (const trade of recent) {
    if ((trade.pnl_amount ?? 0) > 0) {
      recentWin++
    } else break
  }
  for (const trade of recent) {
    if ((trade.pnl_amount ?? 0) <= 0) {
      recentLoss++
    } else break
  }

  return {
    winStreak: Math.max(winStreak, recentWin),
    lossStreak: Math.max(lossStreak, recentLoss),
  }
}

function detectOvertrading(sorted: Trade[]): BehavioralInsight | null {
  // Check last 7 days of trades
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recent = sorted.filter(t => new Date(t.entry_date) >= sevenDaysAgo)
  const avgPerDay = recent.length / 7

  if (avgPerDay > 5) {
    return {
      id: 'overtrading',
      category: 'overtrading',
      title: 'Potential overtrading detected',
      description: `You're averaging ${avgPerDay.toFixed(1)} trades per day this week. High frequency often reduces quality.`,
      severity: 'warning',
      data: { trades_this_week: recent.length, avg_per_day: avgPerDay },
      actionable: 'Focus on A+ setups only. Quality over quantity.',
      created_at: new Date().toISOString(),
    }
  }
  return null
}

function detectRevengeTrading(sorted: Trade[]): BehavioralInsight | null {
  // Look for pattern: loss → quick re-entry within 30 min with larger size
  let revengeCount = 0

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    const curr = sorted[i]!

    if ((prev.pnl_amount ?? 0) < 0) {
      const prevDate = new Date(prev.entry_date)
      const currDate = new Date(curr.entry_date)
      const diffMs = currDate.getTime() - prevDate.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      // Same day re-entry after a loss
      if (diffHours < 2 && diffHours >= 0) {
        revengeCount++
      }
    }
  }

  if (revengeCount >= 2) {
    return {
      id: 'revenge_trading',
      category: 'revenge_trading',
      title: 'Revenge trading pattern detected',
      description: `${revengeCount} times you re-entered quickly after a loss. This often leads to emotional decisions.`,
      severity: 'critical',
      data: { count: revengeCount },
      actionable: 'After a loss, wait at least 1 hour before your next trade.',
      created_at: new Date().toISOString(),
    }
  }
  return null
}

function analyzeSetups(closed: Trade[]): BehavioralInsight[] {
  const insights: BehavioralInsight[] = []
  const setupMap = new Map<string, { wins: number; losses: number; totalPnl: number }>()

  for (const trade of closed) {
    const tags = trade.setup_tags || []
    for (const tag of tags) {
      const existing = setupMap.get(tag) || { wins: 0, losses: 0, totalPnl: 0 }
      if ((trade.pnl_amount ?? 0) > 0) existing.wins++
      else existing.losses++
      existing.totalPnl += trade.pnl_amount ?? 0
      setupMap.set(tag, existing)
    }
  }

  let bestSetup: { tag: string; winRate: number; pnl: number } | null = null
  let worstSetup: { tag: string; winRate: number; pnl: number } | null = null

  for (const [tag, stats] of setupMap) {
    const total = stats.wins + stats.losses
    if (total < 3) continue
    const winRate = (stats.wins / total) * 100

    if (!bestSetup || winRate > bestSetup.winRate) {
      bestSetup = { tag, winRate, pnl: stats.totalPnl }
    }
    if (!worstSetup || winRate < worstSetup.winRate) {
      worstSetup = { tag, winRate, pnl: stats.totalPnl }
    }
  }

  if (bestSetup && bestSetup.winRate >= 60) {
    insights.push({
      id: 'best_setup',
      category: 'best_setup',
      title: `Best setup: "${bestSetup.tag}"`,
      description: `${bestSetup.winRate.toFixed(0)}% win rate. Focus more on this setup.`,
      severity: 'positive',
      data: bestSetup,
      actionable: `Prioritize "${bestSetup.tag}" setups in your trading plan.`,
      created_at: new Date().toISOString(),
    })
  }

  if (worstSetup && worstSetup.winRate < 40 && worstSetup.tag !== bestSetup?.tag) {
    insights.push({
      id: 'worst_setup',
      category: 'worst_setup',
      title: `Weakest setup: "${worstSetup.tag}"`,
      description: `Only ${worstSetup.winRate.toFixed(0)}% win rate. Consider removing from your playbook.`,
      severity: 'warning',
      data: worstSetup,
      actionable: `Review or eliminate "${worstSetup.tag}" from your strategy.`,
      created_at: new Date().toISOString(),
    })
  }

  return insights
}

function analyzeTradeTime(closed: Trade[]): BehavioralInsight[] {
  const insights: BehavioralInsight[] = []
  const dayMap = new Map<number, { wins: number; losses: number; pnl: number }>()

  for (const trade of closed) {
    const day = new Date(trade.entry_date).getDay()
    const existing = dayMap.get(day) || { wins: 0, losses: 0, pnl: 0 }
    if ((trade.pnl_amount ?? 0) > 0) existing.wins++
    else existing.losses++
    existing.pnl += trade.pnl_amount ?? 0
    dayMap.set(day, existing)
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  let bestDay: { day: string; winRate: number; pnl: number } | null = null
  let worstDay: { day: string; winRate: number; pnl: number } | null = null

  for (const [day, stats] of dayMap) {
    const total = stats.wins + stats.losses
    if (total < 3) continue
    const winRate = (stats.wins / total) * 100

    if (!bestDay || winRate > bestDay.winRate) {
      bestDay = { day: dayNames[day] ?? 'Unknown', winRate, pnl: stats.pnl }
    }
    if (!worstDay || winRate < worstDay.winRate) {
      worstDay = { day: dayNames[day] ?? 'Unknown', winRate, pnl: stats.pnl }
    }
  }

  if (bestDay && bestDay.winRate >= 60) {
    insights.push({
      id: 'best_time',
      category: 'best_time',
      title: `Best day: ${bestDay.day}`,
      description: `${bestDay.winRate.toFixed(0)}% win rate on ${bestDay.day}s.`,
      severity: 'positive',
      data: bestDay,
      actionable: null,
      created_at: new Date().toISOString(),
    })
  }

  if (worstDay && worstDay.winRate < 40 && worstDay.day !== bestDay?.day) {
    insights.push({
      id: 'worst_time',
      category: 'worst_time',
      title: `Weakest day: ${worstDay.day}`,
      description: `Only ${worstDay.winRate.toFixed(0)}% win rate on ${worstDay.day}s.`,
      severity: 'warning',
      data: worstDay,
      actionable: `Consider reducing position size or sitting out on ${worstDay.day}s.`,
      created_at: new Date().toISOString(),
    })
  }

  return insights
}

function analyzeRiskReward(closed: Trade[]): BehavioralInsight | null {
  const tradesWithRR = closed.filter(t => t.r_multiple !== null)
  if (tradesWithRR.length < 5) return null

  const avgR = tradesWithRR.reduce((sum, t) => sum + (t.r_multiple ?? 0), 0) / tradesWithRR.length

  if (avgR < 0.5) {
    return {
      id: 'risk_reward',
      category: 'risk_reward',
      title: 'Risk/reward needs improvement',
      description: `Average R-multiple: ${avgR.toFixed(2)}. You're risking more than you're making per trade.`,
      severity: 'warning',
      data: { avg_r: avgR, trade_count: tradesWithRR.length },
      actionable: 'Target minimum 1:2 risk/reward on entries.',
      created_at: new Date().toISOString(),
    }
  }

  if (avgR >= 2) {
    return {
      id: 'risk_reward',
      category: 'risk_reward',
      title: 'Excellent risk/reward management',
      description: `Average R-multiple: ${avgR.toFixed(2)}. You're consistently capturing more than you risk.`,
      severity: 'positive',
      data: { avg_r: avgR, trade_count: tradesWithRR.length },
      actionable: null,
      created_at: new Date().toISOString(),
    }
  }

  return null
}

function analyzeHoldTime(closed: Trade[]): BehavioralInsight | null {
  const withDates = closed.filter(t => t.exit_date)
  if (withDates.length < 5) return null

  const holdTimes = withDates.map(t => {
    const entry = new Date(t.entry_date)
    const exit = new Date(t.exit_date!)
    return (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)
  })

  const avgHold = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length

  // Check if winners are held shorter than losers (cutting winners short)
  const winners = withDates.filter(t => (t.pnl_amount ?? 0) > 0)
  const losers = withDates.filter(t => (t.pnl_amount ?? 0) <= 0)

  if (winners.length >= 3 && losers.length >= 3) {
    const avgWinHold = winners.reduce((sum, t) => {
      const days = (new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0) / winners.length

    const avgLossHold = losers.reduce((sum, t) => {
      const days = (new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0) / losers.length

    if (avgWinHold < avgLossHold * 0.6) {
      return {
        id: 'hold_time',
        category: 'hold_time',
        title: 'Cutting winners short',
        description: `You hold winners ${avgWinHold.toFixed(1)} days vs losers ${avgLossHold.toFixed(1)} days. Let your winners run.`,
        severity: 'warning',
        data: { avg_win_hold: avgWinHold, avg_loss_hold: avgLossHold, avg_hold: avgHold },
        actionable: 'Use trailing stops instead of fixed targets. Let momentum work.',
        created_at: new Date().toISOString(),
      }
    }
  }

  return null
}

function analyzeTickerConcentration(closed: Trade[]): BehavioralInsight | null {
  const tickerMap = new Map<string, number>()
  for (const trade of closed) {
    tickerMap.set(trade.ticker, (tickerMap.get(trade.ticker) || 0) + 1)
  }

  const topTicker = [...tickerMap.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!topTicker) return null

  const concentration = (topTicker[1] / closed.length) * 100
  if (concentration > 40 && closed.length >= 10) {
    return {
      id: 'ticker_concentration',
      category: 'ticker_concentration',
      title: `Heavy concentration in ${topTicker[0]}`,
      description: `${concentration.toFixed(0)}% of your trades are in ${topTicker[0]}. Diversification reduces risk.`,
      severity: 'warning',
      data: { ticker: topTicker[0], count: topTicker[1], percent: concentration },
      actionable: 'Explore similar setups in other tickers to reduce single-name risk.',
      created_at: new Date().toISOString(),
    }
  }

  return null
}
