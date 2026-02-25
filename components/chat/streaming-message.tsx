"use client"

import React, { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { MessageBubble } from "./message-bubble"
import type { Message } from "@/lib/chat-utils"
import type { ActionTrade, ActionWatchlistItem } from "@/types/action-buttons"

interface StreamingMessageProps {
  message: Message
  onStop?: () => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  isGlobalLoading?: boolean
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
  onPin?: (id: string) => void
  showActions?: boolean
  isDarkMode?: boolean
  // Action bar props (passed through to MessageBubble)
  conversationId?: string
  allTrades?: ActionTrade[]
  watchlistItems?: ActionWatchlistItem[]
  onAddToWatchlist?: (ticker: string, options?: { added_from?: 'manual' | 'chat' | 'trade' | 'onboarding'; conversationId?: string }) => Promise<boolean>
  onRemoveFromWatchlist?: (ticker: string) => Promise<boolean>
  onOpenLogTrade?: (ticker: string) => void
  onOpenCloseTrade?: (tradeId: string) => void
  onSubmitPrompt?: (prompt: string) => void
  onSaveInsight?: (content: string, tickers: string[]) => Promise<boolean>
}

export const StreamingMessage = React.memo(function StreamingMessage({
  message,
  onStop,
  onRegenerate,
  isRegenerating,
  isGlobalLoading,
  onEdit,
  onDelete,
  onPin,
  isDarkMode,
  conversationId,
  allTrades,
  watchlistItems,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onOpenLogTrade,
  onOpenCloseTrade,
  onSubmitPrompt,
  onSaveInsight,
}: StreamingMessageProps) {
  // Defensive check - ensure content is always a string
  const safeContent = typeof message.content === 'string' ? message.content : String(message.content || '')
  
  const [displayedContent, setDisplayedContent] = useState(message.role === "user" ? safeContent : "")
  const [isRevealing, setIsRevealing] = useState(false)
  const [showTypingIndicator, setShowTypingIndicator] = useState(false)

  useEffect(() => {
    if (message.role === "user") {
      setDisplayedContent(safeContent)
      setIsRevealing(false)
      setShowTypingIndicator(false)
      return
    }

    // For real backend streaming - display content immediately as it arrives
    if (message.isStreaming && safeContent !== displayedContent) {
      // Show content immediately when streaming (no artificial delays)
      // This gives users instant feedback as tokens arrive from the backend
      setDisplayedContent(safeContent)
      setIsRevealing(false)
      setShowTypingIndicator(false)
    } 
    // For non-streaming: Show content immediately (no animation for now)
    else if (!message.isStreaming && safeContent) {
      setDisplayedContent(safeContent)
      setIsRevealing(false)
      setShowTypingIndicator(false)
    }
  }, [safeContent, message.isStreaming, displayedContent, message.role, showTypingIndicator, isRevealing])

  const displayMessage = useMemo(() => ({
    ...message,
    content: displayedContent,
  }), [message, displayedContent])

  // Allow user to click to instantly reveal full message
  const handleClick = () => {
    if (isRevealing && message.role === "assistant") {
      setDisplayedContent(safeContent)
      setIsRevealing(false)
      setShowTypingIndicator(false)
    }
  }

  return (
    <motion.div
      className="relative group w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      onClick={handleClick}
      style={{ cursor: isRevealing ? 'pointer' : 'default' }}
      title={isRevealing ? 'Click to show full message' : ''}
    >
      <MessageBubble
        message={displayMessage}
        isStreaming={message.isStreaming || isRevealing}
        isGlobalLoading={isGlobalLoading}
        showSkeleton={showTypingIndicator}
        isDarkMode={isDarkMode}
        onStop={message.isStreaming ? onStop : undefined}
        onRegenerate={!message.isStreaming && !isRevealing && message.role === "assistant" ? onRegenerate : undefined}
        isRegenerating={isRegenerating}
        onEdit={onEdit}
        onDelete={onDelete}
        onPin={onPin}
        conversationId={conversationId}
        allTrades={allTrades}
        watchlistItems={watchlistItems}
        onAddToWatchlist={onAddToWatchlist}
        onRemoveFromWatchlist={onRemoveFromWatchlist}
        onOpenLogTrade={onOpenLogTrade}
        onOpenCloseTrade={onOpenCloseTrade}
        onSubmitPrompt={onSubmitPrompt}
        onSaveInsight={onSaveInsight}
      />
    </motion.div>
  )
})
