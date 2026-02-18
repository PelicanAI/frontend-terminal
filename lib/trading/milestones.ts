import type { Trade } from '@/hooks/use-trades'
import type { TradeStats } from '@/hooks/use-trade-stats'
import type { MilestoneDefinition, MilestoneProgress } from '@/types/trading'

const MILESTONES: MilestoneDefinition[] = [
  // Trade count milestones
  { id: 'first_trade', name: 'First Trade', description: 'Log your first trade', icon: 'Rocket', category: 'trades', threshold: 1, unit: 'trades' },
  { id: '10_trades', name: 'Getting Started', description: 'Log 10 trades', icon: 'ChartLineUp', category: 'trades', threshold: 10, unit: 'trades' },
  { id: '50_trades', name: 'Active Trader', description: 'Log 50 trades', icon: 'Lightning', category: 'trades', threshold: 50, unit: 'trades' },
  { id: '100_trades', name: 'Centurion', description: 'Log 100 trades', icon: 'Trophy', category: 'trades', threshold: 100, unit: 'trades' },
  { id: '500_trades', name: 'Veteran', description: 'Log 500 trades', icon: 'Crown', category: 'trades', threshold: 500, unit: 'trades' },

  // Profit milestones
  { id: 'first_profit', name: 'In the Green', description: 'Close your first profitable trade', icon: 'CurrencyDollar', category: 'profit', threshold: 1, unit: 'winning trades' },
  { id: 'profit_1k', name: '$1K Club', description: 'Reach $1,000 total profit', icon: 'Wallet', category: 'profit', threshold: 1000, unit: 'dollars' },
  { id: 'profit_10k', name: '$10K Club', description: 'Reach $10,000 total profit', icon: 'Bank', category: 'profit', threshold: 10000, unit: 'dollars' },

  // Discipline milestones
  { id: 'stop_loss_5', name: 'Risk Manager', description: 'Use stop losses on 5 consecutive trades', icon: 'Shield', category: 'discipline', threshold: 5, unit: 'trades with stops' },
  { id: 'plan_followed_10', name: 'Plan Follower', description: 'Follow your trading plan 10 times', icon: 'ClipboardText', category: 'discipline', threshold: 10, unit: 'trades' },
  { id: 'thesis_logged_10', name: 'Thoughtful Trader', description: 'Log thesis on 10 trades', icon: 'Notebook', category: 'discipline', threshold: 10, unit: 'trades with thesis' },

  // Streak milestones
  { id: 'win_streak_3', name: 'Hot Streak', description: '3 consecutive winning trades', icon: 'Fire', category: 'streak', threshold: 3, unit: 'consecutive wins' },
  { id: 'win_streak_5', name: 'On Fire', description: '5 consecutive winning trades', icon: 'Fire', category: 'streak', threshold: 5, unit: 'consecutive wins' },
  { id: 'journal_streak_7', name: 'Consistent', description: 'Trade for 7 consecutive days', icon: 'CalendarCheck', category: 'streak', threshold: 7, unit: 'days' },
  { id: 'journal_streak_30', name: 'Dedicated', description: 'Trade for 30 consecutive days', icon: 'CalendarCheck', category: 'streak', threshold: 30, unit: 'days' },

  // Learning milestones
  { id: 'scans_5', name: 'AI Student', description: 'Run 5 Pelican scans', icon: 'MagnifyingGlass', category: 'learning', threshold: 5, unit: 'scans' },
  { id: 'scans_25', name: 'AI Analyst', description: 'Run 25 Pelican scans', icon: 'Brain', category: 'learning', threshold: 25, unit: 'scans' },
]

/**
 * Calculate milestone progress from trades and stats
 */
export function calculateMilestones(
  trades: Trade[],
  stats: TradeStats | null,
): MilestoneProgress[] {
  const closed = trades.filter(t => t.status === 'closed')
  const winners = closed.filter(t => (t.pnl_amount ?? 0) > 0)
  const totalPnl = stats?.total_pnl ?? 0

  // Count consecutive stop-loss usage
  const sorted = [...trades].sort((a, b) =>
    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  )
  let consecutiveStops = 0
  for (const trade of sorted) {
    if (trade.stop_loss) consecutiveStops++
    else break
  }

  // Count consecutive wins from most recent
  let winStreak = 0
  const closedSorted = [...closed].sort((a, b) =>
    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  )
  for (const trade of closedSorted) {
    if ((trade.pnl_amount ?? 0) > 0) winStreak++
    else break
  }

  // Count trades with thesis
  const tradesWithThesis = trades.filter(t => t.thesis && t.thesis.trim().length > 0).length

  // Count Pelican scans
  const scanCount = trades.reduce((sum, t) => {
    const grade = t.ai_grade as { pelican_scan_count?: number } | null
    return sum + (grade?.pelican_scan_count ?? 0)
  }, 0)

  // Count consecutive trading days
  const tradeDays = new Set(trades.map(t => t.entry_date.split('T')[0] as string))
  const journalStreak = calculateJournalStreak(tradeDays)

  return MILESTONES.map(milestone => {
    let current = 0

    switch (milestone.id) {
      case 'first_trade':
      case '10_trades':
      case '50_trades':
      case '100_trades':
      case '500_trades':
        current = trades.length
        break
      case 'first_profit':
        current = winners.length > 0 ? 1 : 0
        break
      case 'profit_1k':
      case 'profit_10k':
        current = Math.max(0, totalPnl)
        break
      case 'stop_loss_5':
        current = consecutiveStops
        break
      case 'plan_followed_10':
        // Future: track actual plan compliance
        current = 0
        break
      case 'thesis_logged_10':
        current = tradesWithThesis
        break
      case 'win_streak_3':
      case 'win_streak_5':
        current = winStreak
        break
      case 'journal_streak_7':
      case 'journal_streak_30':
        current = journalStreak
        break
      case 'scans_5':
      case 'scans_25':
        current = scanCount
        break
    }

    const completed = current >= milestone.threshold

    return {
      milestone,
      current,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      progress_percent: Math.min(100, (current / milestone.threshold) * 100),
    }
  })
}

function calculateJournalStreak(tradeDays: Set<string>): number {
  if (tradeDays.size === 0) return 0

  const sorted = [...tradeDays].sort().reverse()
  let streak = 1
  const today = new Date().toISOString().split('T')[0]

  // Start from most recent trade day
  if (sorted[0] !== today) {
    // Check if yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (sorted[0] !== yesterday.toISOString().split('T')[0]) {
      return 0 // Streak broken
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]!)
    const curr = new Date(sorted[i]!)
    const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays <= 1.5) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export { MILESTONES }
