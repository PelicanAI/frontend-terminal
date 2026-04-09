'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ActionButton } from './action-button'
import { extractTickers, resolveActions } from '@/lib/chat/detect-actions'
import type { MessageAction, ActionTrade, ActionWatchlistItem } from '@/types/action-buttons'
import { useToast } from '@/hooks/use-toast'
import {
  ConfirmDestructiveAction,
  useDestructiveAction,
  isDestructiveAction,
} from '@/components/ui/confirm-destructive-action'

interface MessageActionBarProps {
  content: string
  role: string
  isStreaming: boolean
  messageId: string
  conversationId?: string

  // Shared state from parent
  allTrades: ActionTrade[]
  watchlistItems: ActionWatchlistItem[]

  // Mutation callbacks from parent
  onAddToWatchlist: (ticker: string, options?: { added_from?: 'manual' | 'chat' | 'trade' | 'onboarding'; conversationId?: string }) => Promise<boolean>
  onRemoveFromWatchlist: (ticker: string) => Promise<boolean>

  // Modal openers
  onOpenLogTrade: (ticker: string) => void
  onOpenCloseTrade: (tradeId: string) => void

  // Chat actions
  onSubmitPrompt: (prompt: string) => void

  // Save insight
  onSaveInsight: (content: string, tickers: string[]) => Promise<boolean>
}

export function MessageActionBar({
  content,
  role,
  isStreaming,
  conversationId,
  allTrades,
  watchlistItems,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onOpenLogTrade,
  onOpenCloseTrade,
  onSubmitPrompt,
  onSaveInsight,
}: MessageActionBarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const destructive = useDestructiveAction()

  // Layer 1: ticker extraction (pure function of content, never re-runs)
  const detectedTickers = useMemo(
    () => extractTickers(content),
    [content]
  )

  // Layer 2: action resolution (re-runs when user data changes)
  const actions = useMemo(
    () => resolveActions(
      detectedTickers,
      allTrades,
      watchlistItems,
      role,
      isStreaming,
      content.length > 0
    ),
    [detectedTickers, allTrades, watchlistItems, role, isStreaming, content]
  )

  const handleAction = useCallback(async (action: MessageAction) => {
    setLoadingId(action.id)

    try {
      switch (action.type) {
        case 'view_position':
        case 'review_trade': {
          router.push(`/portfolio?tab=history&highlight=${action.tradeId}`)
          break
        }

        case 'pelican_scan': {
          const trade = allTrades.find(t => t.id === action.tradeId)
          if (!trade) break

          const scanPrompt = [
            `Scan my ${trade.ticker} ${trade.direction} position.`,
            `Entry: ${trade.entry_price}`,
            trade.stop_loss ? `Stop: ${trade.stop_loss}` : null,
            trade.take_profit ? `Target: ${trade.take_profit}` : null,
            trade.thesis ? `Thesis: ${trade.thesis}` : null,
            trade.pnl_percent != null
              ? `Current P&L: ${trade.pnl_percent >= 0 ? '+' : ''}${trade.pnl_percent.toFixed(1)}%`
              : null,
            'Give me updated analysis: price action, key levels, news catalysts, and whether my thesis still holds.',
          ].filter(Boolean).join(' ')

          onSubmitPrompt(scanPrompt)
          break
        }

        case 'close_trade': {
          if (action.tradeId) {
            const trade = allTrades.find(t => t.id === action.tradeId)
            const ticker = trade?.ticker || action.ticker || 'position'
            destructive.requestConfirmation({
              title: `Close ${ticker} position?`,
              description: `This will mark the trade as closed. You'll need to enter your exit price.`,
              itemCount: 1,
              itemType: 'trade',
              confirmText: 'Close Trade',
              onConfirm: () => onOpenCloseTrade(action.tradeId!),
            })
          }
          break
        }

        case 'log_trade': {
          if (action.ticker) {
            onOpenLogTrade(action.ticker)
          }
          break
        }

        case 'add_watchlist': {
          if (action.ticker) {
            const success = await onAddToWatchlist(action.ticker, { added_from: 'chat', conversationId })
            toast({
              title: success ? `${action.ticker} added to watchlist` : `Failed to add ${action.ticker}`,
              duration: 2000,
            })
          }
          break
        }

        case 'remove_watchlist': {
          if (action.ticker) {
            const tickerName = action.ticker
            destructive.requestConfirmation({
              title: `Remove ${tickerName} from watchlist?`,
              description: `This will remove ${tickerName} from your watchlist and any associated alerts.`,
              itemCount: 1,
              itemType: 'watchlist item',
              confirmText: 'Remove',
              onConfirm: async () => {
                const success = await onRemoveFromWatchlist(tickerName)
                toast({
                  title: success ? `${tickerName} removed from watchlist` : `Failed to remove ${tickerName}`,
                  duration: 2000,
                })
              },
            })
          }
          break
        }

        case 'deep_dive': {
          const prompt = `Give me a comprehensive deep dive on ${action.ticker}. Cover: current price action and trend, key support/resistance levels, recent news and catalysts, upcoming earnings or events, and your overall outlook with bull and bear cases.`
          onSubmitPrompt(prompt)
          break
        }

        case 'compare': {
          if (action.compareTickers) {
            const [t1, t2] = action.compareTickers
            const prompt = `Compare ${t1} vs ${t2}: relative strength, valuation, momentum, sector positioning, and which you'd favor right now.`
            onSubmitPrompt(prompt)
          }
          break
        }

        case 'show_heatmap': {
          router.push('/markets')
          break
        }

        case 'show_correlations': {
          router.push('/markets?tab=correlations')
          break
        }

        case 'save_insight': {
          const success = await onSaveInsight(content, detectedTickers)
          toast({
            title: success ? 'Insight saved' : 'Failed to save insight',
            duration: 2000,
          })
          break
        }

        case 'analyze_behavior': {
          onSubmitPrompt('Analyze my recent trading behavior. Look at my win rate, risk management, streaks, and any patterns you notice. Give me specific, actionable feedback.')
          break
        }

        case 'check_plan': {
          onSubmitPrompt('Check my current trading plan compliance. Am I following my rules? How many open positions do I have vs my limits? Have I hit any daily loss limits?')
          break
        }

        case 'review_trade_vs_plan': {
          const reviewTrade = allTrades.find(t => t.id === action.tradeId)
          if (reviewTrade) {
            onSubmitPrompt(`Review my ${reviewTrade.ticker} ${reviewTrade.direction} trade against my trading plan. Did I follow my rules? Was the position sizing appropriate? Grade this trade.`)
          }
          break
        }
      }
    } catch (err) {
      console.error(`Action ${action.type} failed:`, err)
    } finally {
      setLoadingId(null)
    }
  }, [
    router, allTrades, conversationId, content, toast, detectedTickers,
    onSubmitPrompt, onOpenLogTrade, onOpenCloseTrade,
    onAddToWatchlist, onRemoveFromWatchlist, onSaveInsight,
  ])

  // Group actions by category
  const ANALYSIS_TYPES = new Set(['deep_dive', 'compare'])
  const TRADE_TYPES = new Set(['view_position', 'pelican_scan', 'close_trade', 'review_trade', 'review_trade_vs_plan', 'log_trade', 'add_watchlist', 'remove_watchlist'])
  // Everything else is tools

  const grouped = useMemo(() => {
    const analysis: MessageAction[] = []
    const trade: MessageAction[] = []
    const tools: MessageAction[] = []

    for (const action of actions) {
      if (ANALYSIS_TYPES.has(action.type)) analysis.push(action)
      else if (TRADE_TYPES.has(action.type)) trade.push(action)
      else tools.push(action)
    }

    const groups: { label: string; items: MessageAction[] }[] = []
    if (analysis.length > 0) groups.push({ label: 'Analysis', items: analysis })
    if (trade.length > 0) groups.push({ label: 'Trade Actions', items: trade })
    if (tools.length > 0) groups.push({ label: 'Tools', items: tools })

    return groups
  }, [actions])

  if (actions.length === 0) return null

  let buttonIndex = 0

  return (
    <>
      <div className="space-y-3 mt-3 pt-3 border-t border-border/20">
        {grouped.map((group) => (
          <div key={group.label}>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
              {group.label}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {group.items.map((action) => {
                const idx = buttonIndex++
                return (
                  <div
                    key={action.id}
                    className="action-button-enter"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <ActionButton
                      action={action}
                      onClick={handleAction}
                      loading={loadingId === action.id}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDestructiveAction
        open={destructive.state.isOpen}
        onOpenChange={destructive.setOpen}
        title={destructive.state.title}
        description={destructive.state.description}
        itemCount={destructive.state.itemCount}
        itemType={destructive.state.itemType}
        confirmText={destructive.state.confirmText}
        requireTypedConfirmation={destructive.state.requireTypedConfirmation}
        typedConfirmationValue={destructive.state.typedConfirmationValue}
        onConfirm={destructive.state.onConfirm}
        onCancel={destructive.state.onCancel}
      />
    </>
  )
}
