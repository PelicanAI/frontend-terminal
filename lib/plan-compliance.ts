import type { TradingPlan } from '@/types/trading'
import type { Trade } from '@/hooks/use-trades'

// ── Types ──

export type ComplianceStatus = 'ok' | 'warning' | 'critical'

export interface MetricValue {
  current: number
  max: number | null
  status: ComplianceStatus
  displayValue: string
}

export interface LivePlanMetrics {
  tradesToday: MetricValue
  dailyPnl: MetricValue
  openPositions: MetricValue
  consecutiveLosses: MetricValue
}

export interface RuleScore {
  rule: string
  label: string
  score: number // 0-100
  detail: string
  enabled: boolean
}

export interface PlanViolation {
  id: string
  rule: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  ticker?: string
  tradeId?: string
}

export interface PlanCompliance {
  overallScore: number
  ruleScores: RuleScore[]
  violations: PlanViolation[]
  liveMetrics: LivePlanMetrics
  streakData: { consecutive: number; direction: 'win' | 'loss' | 'none' }
}

export interface PlanComplianceInput {
  plan: TradingPlan
  trades: Trade[] // last 30 days
  openPositions: Trade[]
  todayTrades: Trade[]
  todayClosedPnl: number
}

// ── Helpers ──

function metricStatus(current: number, max: number | null): ComplianceStatus {
  if (max == null || max === 0) return 'ok'
  const pct = (current / max) * 100
  if (pct >= 100) return 'critical'
  if (pct >= 60) return 'warning'
  return 'ok'
}

function countConsecutiveLosses(trades: Trade[]): number {
  const closed = trades
    .filter((t) => t.status === 'closed' && t.exit_date)
    .sort((a, b) => (b.exit_date! > a.exit_date! ? 1 : -1))
  let count = 0
  for (const t of closed) {
    if ((t.pnl_amount ?? 0) < 0) {
      count++
    } else {
      break
    }
  }
  return count
}

function getStreak(trades: Trade[]): { consecutive: number; direction: 'win' | 'loss' | 'none' } {
  const closed = trades
    .filter((t) => t.status === 'closed' && t.exit_date)
    .sort((a, b) => (b.exit_date! > a.exit_date! ? 1 : -1))
  if (closed.length === 0) return { consecutive: 0, direction: 'none' }

  const firstPnl = closed[0]!.pnl_amount ?? 0
  if (firstPnl === 0) return { consecutive: 0, direction: 'none' }

  const dir = firstPnl > 0 ? 'win' : 'loss'
  let count = 0
  for (const t of closed) {
    const pnl = t.pnl_amount ?? 0
    if ((dir === 'win' && pnl > 0) || (dir === 'loss' && pnl < 0)) {
      count++
    } else {
      break
    }
  }
  return { consecutive: count, direction: dir }
}

function formatPnl(amount: number): string {
  const sign = amount >= 0 ? '+' : '-'
  const abs = Math.abs(amount)
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

// ── Main calculation ──

export function calculateCompliance(input: PlanComplianceInput): PlanCompliance {
  const { plan, trades, openPositions, todayTrades, todayClosedPnl } = input

  // Live metrics
  const tradesTodayCount = todayTrades.length
  const maxTrades = plan.max_trades_per_day ?? null

  const absLoss = todayClosedPnl < 0 ? Math.abs(todayClosedPnl) : 0
  const maxDailyLoss = plan.max_daily_loss ?? null

  const openCount = openPositions.length
  const maxOpen = plan.max_open_positions ?? null

  const consecutiveLosses = countConsecutiveLosses(trades)
  const maxConsecutive = plan.max_consecutive_losses_before_stop ?? null

  const liveMetrics: LivePlanMetrics = {
    tradesToday: {
      current: tradesTodayCount,
      max: maxTrades,
      status: metricStatus(tradesTodayCount, maxTrades),
      displayValue: maxTrades != null ? `${tradesTodayCount}/${maxTrades}` : `${tradesTodayCount}`,
    },
    dailyPnl: {
      current: todayClosedPnl,
      max: maxDailyLoss,
      status: metricStatus(absLoss, maxDailyLoss),
      displayValue: formatPnl(todayClosedPnl),
    },
    openPositions: {
      current: openCount,
      max: maxOpen,
      status: metricStatus(openCount, maxOpen),
      displayValue: maxOpen != null ? `${openCount}/${maxOpen}` : `${openCount}`,
    },
    consecutiveLosses: {
      current: consecutiveLosses,
      max: maxConsecutive,
      status: metricStatus(consecutiveLosses, maxConsecutive),
      displayValue: maxConsecutive != null ? `${consecutiveLosses}/${maxConsecutive}` : `${consecutiveLosses}`,
    },
  }

  // Rule scores (based on last 30 days of closed trades)
  const closedTrades = trades.filter((t) => t.status === 'closed')
  const total = closedTrades.length
  const ruleScores: RuleScore[] = []

  if (plan.require_stop_loss) {
    const withSL = closedTrades.filter((t) => t.stop_loss != null).length
    const score = total > 0 ? Math.round((withSL / total) * 100) : 100
    ruleScores.push({
      rule: 'require_stop_loss',
      label: 'Stop Loss',
      score,
      detail: `${withSL}/${total} trades`,
      enabled: true,
    })
  }

  if (plan.require_take_profit) {
    const withTP = closedTrades.filter((t) => t.take_profit != null).length
    const score = total > 0 ? Math.round((withTP / total) * 100) : 100
    ruleScores.push({
      rule: 'require_take_profit',
      label: 'Take Profit',
      score,
      detail: `${withTP}/${total} trades`,
      enabled: true,
    })
  }

  if (plan.require_thesis) {
    const withThesis = closedTrades.filter((t) => t.thesis && t.thesis.trim().length > 0).length
    const score = total > 0 ? Math.round((withThesis / total) * 100) : 100
    ruleScores.push({
      rule: 'require_thesis',
      label: 'Thesis',
      score,
      detail: `${withThesis}/${total} trades`,
      enabled: true,
    })
  }

  // Overall score
  const enabledScores = ruleScores.filter((r) => r.enabled)
  const overallScore =
    enabledScores.length > 0
      ? Math.round(enabledScores.reduce((sum, r) => sum + r.score, 0) / enabledScores.length)
      : 100

  // Violations
  const violations: PlanViolation[] = []

  // Critical metric violations
  if (liveMetrics.tradesToday.status === 'critical') {
    violations.push({
      id: 'trades-limit',
      rule: 'max_trades_per_day',
      severity: 'critical',
      message: `Daily trade limit (${maxTrades}) reached.`,
    })
  }
  if (liveMetrics.dailyPnl.status === 'critical') {
    violations.push({
      id: 'daily-loss',
      rule: 'max_daily_loss',
      severity: 'critical',
      message: `Daily loss limit ($${maxDailyLoss?.toLocaleString()}) hit.`,
    })
  }
  if (liveMetrics.consecutiveLosses.status === 'critical') {
    violations.push({
      id: 'consecutive-losses',
      rule: 'max_consecutive_losses',
      severity: 'critical',
      message: `${consecutiveLosses} consecutive losses — plan says stop.`,
    })
  }

  // Open position violations (missing required fields)
  for (const pos of openPositions) {
    if (plan.require_stop_loss && pos.stop_loss == null) {
      violations.push({
        id: `no-sl-${pos.id}`,
        rule: 'require_stop_loss',
        severity: 'warning',
        message: `${pos.ticker} has no stop loss.`,
        ticker: pos.ticker,
        tradeId: pos.id,
      })
    }
    if (plan.require_take_profit && pos.take_profit == null) {
      violations.push({
        id: `no-tp-${pos.id}`,
        rule: 'require_take_profit',
        severity: 'warning',
        message: `${pos.ticker} has no take profit.`,
        ticker: pos.ticker,
        tradeId: pos.id,
      })
    }
    if (plan.require_thesis && (!pos.thesis || pos.thesis.trim().length === 0)) {
      violations.push({
        id: `no-thesis-${pos.id}`,
        rule: 'require_thesis',
        severity: 'warning',
        message: `${pos.ticker} has no thesis.`,
        ticker: pos.ticker,
        tradeId: pos.id,
      })
    }
    // Blocked tickers
    if (plan.blocked_tickers?.includes(pos.ticker)) {
      violations.push({
        id: `blocked-${pos.id}`,
        rule: 'blocked_ticker',
        severity: 'critical',
        message: `${pos.ticker} is on your blocked list.`,
        ticker: pos.ticker,
        tradeId: pos.id,
      })
    }
  }

  // Sort: critical > warning > info
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const streakData = getStreak(trades)

  return {
    overallScore,
    ruleScores,
    violations,
    liveMetrics,
    streakData,
  }
}

// ── Insight generator ──

export function generatePlanInsight(compliance: PlanCompliance): string {
  const { liveMetrics, overallScore } = compliance

  // Critical — specific limit hit
  if (liveMetrics.dailyPnl.status === 'critical') {
    return 'Daily loss limit hit — step away.'
  }
  if (liveMetrics.tradesToday.status === 'critical') {
    return `Trade limit reached. No more trades today.`
  }
  if (liveMetrics.consecutiveLosses.status === 'critical') {
    return `${liveMetrics.consecutiveLosses.current} losses in a row. Take a break.`
  }

  // Warning — approaching limits
  if (liveMetrics.tradesToday.status === 'warning' && liveMetrics.tradesToday.max != null) {
    const remaining = liveMetrics.tradesToday.max - liveMetrics.tradesToday.current
    return `${liveMetrics.tradesToday.current} of ${liveMetrics.tradesToday.max} trades used today. ${remaining} left.`
  }
  if (liveMetrics.dailyPnl.status === 'warning') {
    return 'Approaching daily loss limit. Trade smaller or sit out.'
  }
  if (liveMetrics.openPositions.status === 'warning' && liveMetrics.openPositions.max != null) {
    const remaining = liveMetrics.openPositions.max - liveMetrics.openPositions.current
    return `${liveMetrics.openPositions.current} of ${liveMetrics.openPositions.max} positions open. ${remaining} slots left.`
  }

  // OK states
  if (overallScore >= 80) {
    return 'Clean day so far. You\'re following your plan.'
  }
  if (overallScore < 80) {
    return `Plan is green today, but 30-day compliance is ${overallScore}%. Check your plan tab.`
  }

  return 'On track. Keep following your rules.'
}
