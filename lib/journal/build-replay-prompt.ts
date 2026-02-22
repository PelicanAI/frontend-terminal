import type { Trade } from '@/hooks/use-trades'

interface ReplayPromptResult {
  visibleMessage: string
  fullPrompt: string
}

export function buildReplayNarrationPrompt(trade: Trade): ReplayPromptResult {
  const pnlDisplay = trade.pnl_amount != null
    ? `$${trade.pnl_amount.toFixed(2)} (${trade.r_multiple?.toFixed(1) ?? '?'}R)`
    : 'Open'

  return {
    visibleMessage: `Replay my ${trade.ticker} ${trade.direction} trade`,
    fullPrompt: `[PELICAN TRADE REPLAY — COACH REVIEW]

Replay and narrate my trade like a coach reviewing game film.

TRADE DETAILS:
- Direction: ${trade.direction.toUpperCase()} ${trade.ticker}
- Entry: $${trade.entry_price} on ${new Date(trade.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
- Exit: ${trade.exit_price ? `$${trade.exit_price}` : 'Still open'} on ${trade.exit_date ? new Date(trade.exit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
- Stop Loss: ${trade.stop_loss ? `$${trade.stop_loss}` : 'Not set'}
- Take Profit: ${trade.take_profit ? `$${trade.take_profit}` : 'Not set'}
- Result: ${pnlDisplay}
- Thesis: ${trade.thesis || 'None provided'}
- Notes: ${trade.notes || 'None provided'}
${trade.setup_tags?.length ? `- Setup Tags: ${trade.setup_tags.join(', ')}` : ''}

NARRATE THIS TRADE IN 4 PHASES:

1. **AT ENTRY**: Was this a clean entry? What was the market context? Was the timing right or could it have been better?
2. **AFTER ENTRY**: How did the trade develop? Were there early warning signs or confirmation signals? Key moments to act on?
3. **AT EXIT**: Was the exit well-timed? Did the trader follow their rules? Was money left on the table or loss cut appropriately?
4. **OVERALL GRADE & KEY LESSON**: Grade this trade (A-F) with specific reasoning. What is the ONE thing to improve for next time?

Be specific with price levels. Be direct and honest like a trading coach who wants me to improve.`,
  }
}
