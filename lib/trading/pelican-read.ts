import type { Trade } from '@/hooks/use-trades'
import type { TradeStats } from '@/hooks/use-trade-stats'
import type { TradingProfile, TradingPlan, TraderSurvey, Playbook } from '@/types/trading'

/**
 * Build a comprehensive trader context string for Pelican AI prompts.
 * This gives the AI deep understanding of the trader's profile, plan, and performance.
 */
export function buildTraderContext(params: {
  survey?: TraderSurvey | null
  profile?: TradingProfile | null
  plan?: TradingPlan | null
  stats?: TradeStats | null
  playbooks?: Playbook[]
  recentTrades?: Trade[]
}): string {
  const { survey, profile, plan, stats, playbooks, recentTrades } = params
  const sections: string[] = []

  // ── Trader Profile ──
  if (survey) {
    sections.push([
      '## Trader Profile',
      `Experience: ${survey.experience_level}`,
      `Style: ${survey.primary_style}`,
      `Risk tolerance: ${survey.risk_tolerance || 'not set'}`,
      `Markets: ${survey.markets_traded?.join(', ') || 'not set'}`,
      `Account size: ${survey.account_size_range || 'not disclosed'}`,
      `Analysis: ${survey.prefers_technical_or_fundamental || 'not set'}`,
      survey.primary_goal ? `Primary goal: ${survey.primary_goal}` : '',
    ].filter(Boolean).join('\n'))
  } else if (profile) {
    sections.push([
      '## Trader Profile',
      `Style: ${profile.seed_style || 'not set'}`,
      `Holding period: ${profile.seed_holding_period || 'not set'}`,
      `Risk comfort: ${profile.seed_risk_comfort || 'not set'}`,
    ].join('\n'))
  }

  // ── Trading Plan ──
  if (plan) {
    const planLines = [`## Active Trading Plan: "${plan.name}"`]

    if (plan.max_risk_per_trade_pct) planLines.push(`Max risk/trade: ${plan.max_risk_per_trade_pct}%`)
    if (plan.max_daily_loss) planLines.push(`Max daily loss: $${plan.max_daily_loss}`)
    if (plan.max_open_positions) planLines.push(`Max open positions: ${plan.max_open_positions}`)
    if (plan.max_trades_per_day) planLines.push(`Max trades/day: ${plan.max_trades_per_day}`)
    if (plan.require_stop_loss) planLines.push('Requires stop loss on all trades')
    if (plan.require_thesis) planLines.push('Requires trade thesis')
    if (plan.min_risk_reward_ratio) planLines.push(`Min R:R ratio: ${plan.min_risk_reward_ratio}`)
    if (plan.max_consecutive_losses_before_stop) planLines.push(`Stop after ${plan.max_consecutive_losses_before_stop} consecutive losses`)
    if (plan.allowed_asset_types?.length) planLines.push(`Allowed assets: ${plan.allowed_asset_types.join(', ')}`)

    sections.push(planLines.join('\n'))
  }

  // ── Performance Stats ──
  if (stats && stats.total_trades > 0) {
    sections.push([
      '## Performance Summary',
      `Total trades: ${stats.total_trades}`,
      `Win rate: ${stats.win_rate.toFixed(1)}%`,
      `Total P&L: $${stats.total_pnl.toFixed(2)}`,
      `Profit factor: ${stats.profit_factor.toFixed(2)}`,
      `Avg win: $${stats.avg_win.toFixed(2)}`,
      `Avg loss: $${stats.avg_loss.toFixed(2)}`,
      `Avg R-multiple: ${stats.avg_r_multiple.toFixed(2)}`,
      `Expectancy: $${stats.expectancy.toFixed(2)}`,
    ].join('\n'))
  }

  // ── Playbooks ──
  if (playbooks && playbooks.length > 0) {
    const pbLines = ['## Playbooks']
    for (const pb of playbooks) {
      pbLines.push(`### ${pb.name} (${pb.setup_type})`)
      if (pb.win_rate) pbLines.push(`Win rate: ${pb.win_rate.toFixed(0)}% over ${pb.total_trades} trades`)
      if (pb.entry_rules) pbLines.push(`Entry: ${pb.entry_rules}`)
    }
    sections.push(pbLines.join('\n'))
  }

  // ── Recent Trades ──
  if (recentTrades && recentTrades.length > 0) {
    const recent = recentTrades.slice(0, 5)
    const tradeLines = ['## Recent Trades (last 5)']
    for (const t of recent) {
      const pnl = t.pnl_amount ? `$${t.pnl_amount.toFixed(2)}` : 'open'
      tradeLines.push(`- ${t.ticker} ${t.direction} ${t.quantity}@${t.entry_price} → ${pnl}`)
    }
    sections.push(tradeLines.join('\n'))
  }

  return sections.join('\n\n')
}

/**
 * Build a prompt that asks Pelican to analyze the trader's behavior
 */
export function buildBehaviorAnalysisPrompt(traderContext: string): string {
  return `You are analyzing a trader's profile and recent performance. Based on the following data, provide:

1. **Strengths** — What this trader does well
2. **Areas for Improvement** — Specific, actionable feedback
3. **Risk Assessment** — Are they managing risk appropriately?
4. **Recommendations** — 2-3 concrete next steps

Be specific, cite actual numbers from the data. No generic advice.

${traderContext}`
}

/**
 * Build a prompt that asks Pelican to review a specific trade against the plan
 */
export function buildTradeReviewPrompt(
  trade: Trade,
  traderContext: string,
): string {
  const pnlStr = trade.pnl_amount !== null ? `$${trade.pnl_amount.toFixed(2)}` : 'still open'

  return `Review this specific trade in the context of my trading plan and profile:

**Trade:** ${trade.ticker} ${trade.direction} ${trade.quantity} shares @ $${trade.entry_price}
**Status:** ${trade.status} (P&L: ${pnlStr})
**Thesis:** ${trade.thesis || 'None provided'}
**Setup tags:** ${trade.setup_tags?.join(', ') || 'None'}
${trade.stop_loss ? `**Stop Loss:** $${trade.stop_loss}` : '**No stop loss set**'}
${trade.take_profit ? `**Take Profit:** $${trade.take_profit}` : ''}

Evaluate:
1. Did this trade align with my trading plan rules?
2. Was the position sizing appropriate?
3. What could I have done better?
4. Grade this trade A-F with justification.

${traderContext}`
}
