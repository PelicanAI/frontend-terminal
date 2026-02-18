import type { Trade, TradeFormData } from '@/hooks/use-trades'
import type { TradingPlan, PlanViolation } from '@/types/trading'

interface PlanCheckResult {
  violations: PlanViolation[]
  checklistItems: { text: string; checked: boolean }[]
  isCompliant: boolean
}

/**
 * Check a new trade against the user's active trading plan
 * Returns violations and pre-entry checklist status
 */
export function checkTradeAgainstPlan(
  tradeData: TradeFormData,
  plan: TradingPlan,
  existingTrades: Trade[],
  accountSize?: number,
): PlanCheckResult {
  const violations: PlanViolation[] = []

  // ── Risk per trade check ──
  if (plan.max_risk_per_trade_pct && tradeData.stop_loss && accountSize) {
    const riskPerShare = Math.abs(tradeData.entry_price - tradeData.stop_loss)
    const totalRisk = riskPerShare * tradeData.quantity
    const riskPercent = (totalRisk / accountSize) * 100

    if (riskPercent > plan.max_risk_per_trade_pct) {
      violations.push({
        violation_type: 'risk',
        rule_text: `Risk per trade exceeds ${plan.max_risk_per_trade_pct}% limit (current: ${riskPercent.toFixed(1)}%)`,
        severity: 'violation',
      })
    }
  }

  // ── Max position size (%) check ──
  if (plan.max_position_size_pct && accountSize) {
    const positionValue = tradeData.entry_price * tradeData.quantity
    const positionPercent = (positionValue / accountSize) * 100

    if (positionPercent > plan.max_position_size_pct) {
      violations.push({
        violation_type: 'risk',
        rule_text: `Position size exceeds ${plan.max_position_size_pct}% limit (current: ${positionPercent.toFixed(1)}%)`,
        severity: 'violation',
      })
    }
  }

  // ── Max position size ($) check ──
  if (plan.max_position_size_usd) {
    const positionValue = tradeData.entry_price * tradeData.quantity
    if (positionValue > plan.max_position_size_usd) {
      violations.push({
        violation_type: 'risk',
        rule_text: `Position value $${positionValue.toFixed(0)} exceeds $${plan.max_position_size_usd} limit`,
        severity: 'violation',
      })
    }
  }

  // ── Max open positions check ──
  if (plan.max_open_positions) {
    const openCount = existingTrades.filter(t => t.status === 'open').length
    if (openCount >= plan.max_open_positions) {
      violations.push({
        violation_type: 'risk',
        rule_text: `Max open positions reached (${openCount}/${plan.max_open_positions})`,
        severity: 'violation',
      })
    }
  }

  // ── Max trades per day check ──
  if (plan.max_trades_per_day) {
    const today = new Date().toISOString().split('T')[0]!
    const todaysTrades = existingTrades.filter(t =>
      t.entry_date.startsWith(today)
    )
    if (todaysTrades.length >= plan.max_trades_per_day) {
      violations.push({
        violation_type: 'discipline',
        rule_text: `Max daily trades reached (${todaysTrades.length}/${plan.max_trades_per_day})`,
        severity: 'violation',
      })
    }
  }

  // ── Daily loss limit check ──
  if (plan.max_daily_loss) {
    const today = new Date().toISOString().split('T')[0]!
    const todaysClosed = existingTrades.filter(t =>
      t.status === 'closed' && t.exit_date?.startsWith(today)
    )
    const todayPnl = todaysClosed.reduce((sum, t) => sum + (t.pnl_amount ?? 0), 0)

    if (todayPnl < 0 && Math.abs(todayPnl) >= plan.max_daily_loss) {
      violations.push({
        violation_type: 'risk',
        rule_text: `Daily loss limit reached ($${Math.abs(todayPnl).toFixed(2)} / $${plan.max_daily_loss})`,
        severity: 'violation',
      })
    }
  }

  // ── Consecutive losses check ──
  if (plan.max_consecutive_losses_before_stop) {
    const sorted = [...existingTrades]
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(b.exit_date || b.entry_date).getTime() - new Date(a.exit_date || a.entry_date).getTime())

    let consecutiveLosses = 0
    for (const trade of sorted) {
      if ((trade.pnl_amount ?? 0) < 0) consecutiveLosses++
      else break
    }

    if (consecutiveLosses >= plan.max_consecutive_losses_before_stop) {
      violations.push({
        violation_type: 'discipline',
        rule_text: `${consecutiveLosses} consecutive losses — plan says stop after ${plan.max_consecutive_losses_before_stop}`,
        severity: 'violation',
      })
    }
  }

  // ── Same ticker after loss ──
  if (plan.no_same_ticker_after_loss) {
    const lastClosed = [...existingTrades]
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(b.exit_date || b.entry_date).getTime() - new Date(a.exit_date || a.entry_date).getTime())[0]

    if (lastClosed && (lastClosed.pnl_amount ?? 0) < 0 && lastClosed.ticker === tradeData.ticker.toUpperCase()) {
      violations.push({
        violation_type: 'discipline',
        rule_text: `Last trade on ${tradeData.ticker} was a loss — plan says no re-entry on same ticker`,
        severity: 'warning',
      })
    }
  }

  // ── Allowed asset types check ──
  if (plan.allowed_asset_types && plan.allowed_asset_types.length > 0 && tradeData.asset_type) {
    if (!plan.allowed_asset_types.includes(tradeData.asset_type)) {
      violations.push({
        violation_type: 'general',
        rule_text: `${tradeData.asset_type} is not in your allowed assets (${plan.allowed_asset_types.join(', ')})`,
        severity: 'warning',
      })
    }
  }

  // ── Blocked tickers ──
  if (plan.blocked_tickers && plan.blocked_tickers.length > 0) {
    if (plan.blocked_tickers.includes(tradeData.ticker.toUpperCase())) {
      violations.push({
        violation_type: 'general',
        rule_text: `${tradeData.ticker} is on your blocked tickers list`,
        severity: 'violation',
      })
    }
  }

  // ── Required fields ──
  if (plan.require_stop_loss && !tradeData.stop_loss) {
    violations.push({
      violation_type: 'risk',
      rule_text: 'Your plan requires a stop loss on every trade',
      severity: 'violation',
    })
  }

  if (plan.require_take_profit && !tradeData.take_profit) {
    violations.push({
      violation_type: 'risk',
      rule_text: 'Your plan requires a take profit target on every trade',
      severity: 'warning',
    })
  }

  if (plan.require_thesis && !tradeData.thesis?.trim()) {
    violations.push({
      violation_type: 'entry',
      rule_text: 'Your plan requires a trade thesis',
      severity: 'warning',
    })
  }

  // ── Min risk/reward ratio ──
  if (plan.min_risk_reward_ratio && tradeData.stop_loss && tradeData.take_profit) {
    const risk = Math.abs(tradeData.entry_price - tradeData.stop_loss)
    const reward = Math.abs(tradeData.take_profit - tradeData.entry_price)
    const rr = risk > 0 ? reward / risk : 0

    if (rr < plan.min_risk_reward_ratio) {
      violations.push({
        violation_type: 'risk',
        rule_text: `R:R ratio ${rr.toFixed(1)} is below minimum ${plan.min_risk_reward_ratio}`,
        severity: 'warning',
      })
    }
  }

  // ── Pre-entry checklist ──
  const checklistItems = (plan.pre_entry_checklist || []).map(text => ({
    text,
    checked: false,
  }))

  return {
    violations,
    checklistItems,
    isCompliant: violations.filter(v => v.severity === 'violation').length === 0,
  }
}

/**
 * Build a summary of plan compliance for chat context
 */
export function buildPlanComplianceSummary(
  plan: TradingPlan,
  trades: Trade[],
): string {
  const openTrades = trades.filter(t => t.status === 'open')
  const todayStr = new Date().toISOString().split('T')[0]!
  const todaysClosed = trades.filter(t =>
    t.status === 'closed' && t.exit_date?.startsWith(todayStr)
  )
  const todayPnl = todaysClosed.reduce((sum, t) => sum + (t.pnl_amount ?? 0), 0)

  const lines = [
    `Trading Plan: "${plan.name}"`,
    `Open positions: ${openTrades.length}${plan.max_open_positions ? `/${plan.max_open_positions}` : ''}`,
  ]

  if (plan.max_daily_loss) {
    lines.push(`Daily P&L: $${todayPnl.toFixed(2)} (limit: -$${plan.max_daily_loss})`)
  }

  if (plan.max_risk_per_trade_pct) {
    lines.push(`Max risk/trade: ${plan.max_risk_per_trade_pct}%`)
  }

  if (plan.require_stop_loss) {
    lines.push('Stop loss required on all trades')
  }

  return lines.join('\n')
}
