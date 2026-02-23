import { Trade } from '@/hooks/use-trades'

interface ScanContext {
  trade: Trade
  currentPrice?: number
  unrealizedPnL?: { amount: number; percent: number; rMultiple: number | null }
  holdingDays: number
  distanceToStop?: number // percentage
  distanceToTarget?: number // percentage
  scanCount: number // how many times this trade has been scanned
}

interface ScanPromptResult {
  visibleMessage: string
  fullPrompt: string
}

export function buildScanPrompt(ctx: ScanContext): ScanPromptResult {
  const { trade, currentPrice, unrealizedPnL, holdingDays, distanceToStop, distanceToTarget, scanCount } = ctx

  const isOpen = trade.status === 'open'
  const isClosed = trade.status === 'closed'

  // Build visible message (what user sees in chat)
  let visibleMessage = `Scan my ${trade.ticker} ${trade.direction} position`

  if (isOpen && currentPrice) {
    visibleMessage += ` — entered at $${trade.entry_price.toFixed(2)}, currently at $${currentPrice.toFixed(2)}`
    if (unrealizedPnL) {
      visibleMessage += ` (${unrealizedPnL.percent >= 0 ? '+' : ''}${unrealizedPnL.percent.toFixed(1)}%)`
    }
  } else if (isClosed) {
    visibleMessage += ` — closed trade with ${trade.pnl_percent ? `${trade.pnl_percent >= 0 ? '+' : ''}${Number(trade.pnl_percent).toFixed(1)}%` : 'N/A'} P&L`
  }

  // Build structured context block (sent to backend)
  let prompt = `[PELICAN SCAN — ${trade.ticker} — ${isOpen ? 'OPEN POSITION' : 'CLOSED POSITION'} REVIEW]

${trade.ticker} POSITION DETAILS:
• Ticker: ${trade.ticker}
• Direction: ${trade.direction.toUpperCase()}
• Entry: $${trade.entry_price} on ${new Date(trade.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
• Quantity: ${trade.quantity} shares
• Position Size: $${(trade.entry_price * trade.quantity).toLocaleString()}`

  if (trade.stop_loss) prompt += `\n• Stop Loss: $${trade.stop_loss}`
  if (trade.take_profit) prompt += `\n• Take Profit: $${trade.take_profit}`
  if (trade.conviction) prompt += `\n• Conviction at Entry: ${trade.conviction}/10`

  if (isOpen && currentPrice) {
    prompt += `\n
LIVE STATUS:
• Current Price: $${currentPrice.toFixed(2)}
• Holding Period: ${holdingDays} day${holdingDays !== 1 ? 's' : ''}
• Unrealized P&L: ${unrealizedPnL ? `$${unrealizedPnL.amount.toFixed(2)} (${unrealizedPnL.percent >= 0 ? '+' : ''}${unrealizedPnL.percent.toFixed(2)}%)` : 'N/A'}`

    if (unrealizedPnL?.rMultiple != null) {
      prompt += `\n• R-Multiple: ${unrealizedPnL.rMultiple.toFixed(2)}R`
    }
    if (distanceToStop != null) {
      prompt += `\n• Distance to Stop: ${distanceToStop.toFixed(1)}%`
    }
    if (distanceToTarget != null) {
      prompt += `\n• Distance to Target: ${distanceToTarget.toFixed(1)}%`
    }
  }

  if (isClosed) {
    prompt += `\n
RESULT:
• Exit: $${trade.exit_price} on ${trade.exit_date ? new Date(trade.exit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
• P&L: $${trade.pnl_amount?.toFixed(2) || 'N/A'} (${trade.pnl_percent ? `${trade.pnl_percent >= 0 ? '+' : ''}${Number(trade.pnl_percent).toFixed(2)}%` : 'N/A'})
• R-Multiple: ${trade.r_multiple ? `${Number(trade.r_multiple).toFixed(2)}R` : 'N/A'}
• Holding Period: ${holdingDays} day${holdingDays !== 1 ? 's' : ''}`
  }

  if (trade.thesis) {
    prompt += `\n
TRADER'S THESIS:
"${trade.thesis}"`
  }

  if (trade.notes) {
    prompt += `\n
NOTES:
"${trade.notes}"`
  }

  if (trade.setup_tags && trade.setup_tags.length > 0) {
    prompt += `\n• Setup Tags: ${trade.setup_tags.join(', ')}`
  }

  // Different instructions based on open vs closed
  if (isOpen) {
    prompt += `\n
ANALYZE THIS OPEN POSITION. Use current market data and price action to provide:

1. **Position Health**: Is this trade working? Is the thesis still intact based on current price action?
2. **Risk Assessment**: How close am I to getting stopped out? Should I adjust my stop? Is my position size appropriate?
3. **Key Levels**: What are the nearest support/resistance levels relative to my entry and current price?
4. **Action Plan**: Should I hold, take partial profits, tighten my stop, or cut it? Be specific with price levels.
5. **Grade**: Grade this trade's ENTRY and RISK MANAGEMENT on A-F scale with one-line reasoning for each.

Be brutally honest. I'm not looking for confirmation bias — I want to know if I should still be in this trade.`
  } else {
    prompt += `\n
ANALYZE THIS COMPLETED TRADE. Provide:

1. **Entry Quality**: Was the entry well-timed? Was there a better price available in that session?
2. **Exit Quality**: Did I leave money on the table? Did I exit too early or hold too long?
3. **Risk Management**: Was my stop placement correct? Did I size the position appropriately for the setup?
4. **Thesis Execution**: Did the trade play out as planned, or did I deviate? If I deviated, was it justified?
5. **Behavioral Notes**: Any signs of emotional trading (chasing, revenge, FOMO, premature exit)?
6. **Grade**: Grade this trade on Entry (A-F), Exit (A-F), Risk (A-F), Thesis (A-F), Plan Execution (A-F), with overall grade and one-line reasoning per category.

Be specific. Reference actual price levels and percentages. Tell me what I did right and what I need to fix.`
  }

  if (scanCount > 0) {
    prompt += `\n
(This is scan #${scanCount + 1} for this trade. Focus on what's CHANGED since the last scan.)`
  }

  return {
    visibleMessage,
    fullPrompt: prompt
  }
}
