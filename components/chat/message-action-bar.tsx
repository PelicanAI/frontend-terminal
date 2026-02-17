'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ActionButton } from './action-button'
import { extractTickers, resolveActions } from '@/lib/chat/detect-actions'
import type { MessageAction, ActionTrade, ActionWatchlistItem } from '@/types/action-buttons'
import { useToast } from '@/hooks/use-toast'

const MAX_VISIBLE = 3

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
  onAddToWatchlist: (ticker: string, conversationId?: string) => Promise<boolean>
  onRemoveFromWatchlist: (ticker: string) => Promise<boolean>

  // Modal openers
  onOpenLogTrade: (ticker: string) => void
  onOpenCloseTrade: (tradeId: string) => void

  // Chat actions
  onSubmitPrompt: (prompt: string) => void

  // Sidebar actions
  onOpenChart: (ticker: string) => void
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
  onOpenChart,
}: MessageActionBarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

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
          router.push(`/journal?highlight=${action.tradeId}`)
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
            onOpenCloseTrade(action.tradeId)
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
            const success = await onAddToWatchlist(action.ticker, conversationId)
            toast({
              title: success ? `${action.ticker} added to watchlist` : `Failed to add ${action.ticker}`,
              duration: 2000,
            })
          }
          break
        }

        case 'remove_watchlist': {
          if (action.ticker) {
            const success = await onRemoveFromWatchlist(action.ticker)
            toast({
              title: success ? `${action.ticker} removed from watchlist` : `Failed to remove ${action.ticker}`,
              duration: 2000,
            })
          }
          break
        }

        case 'open_chart': {
          if (action.ticker) {
            onOpenChart(action.ticker)
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

        case 'save_insight': {
          try {
            await navigator.clipboard.writeText(content)
            toast({ title: 'Insight copied to clipboard', duration: 2000 })
          } catch {
            const textarea = document.createElement('textarea')
            textarea.value = content
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            toast({ title: 'Insight copied to clipboard', duration: 2000 })
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
    router, allTrades, conversationId, content, toast,
    onSubmitPrompt, onOpenLogTrade, onOpenCloseTrade,
    onAddToWatchlist, onRemoveFromWatchlist, onOpenChart,
  ])

  if (actions.length === 0) return null

  const visible = expanded ? actions : actions.slice(0, MAX_VISIBLE)
  const overflowCount = actions.length - MAX_VISIBLE
  const hasOverflow = overflowCount > 0 && !expanded

  return (
    <div
      className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]"
    >
      {visible.map((action, i) => (
        <div
          key={action.id}
          className="action-button-enter"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <ActionButton
            action={action}
            onClick={handleAction}
            loading={loadingId === action.id}
          />
        </div>
      ))}

      {hasOverflow && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs transition-all duration-150 active:scale-95 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
        >
          +{overflowCount} more
        </button>
      )}
    </div>
  )
}
