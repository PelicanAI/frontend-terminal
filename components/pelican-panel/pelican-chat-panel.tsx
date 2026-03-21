"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, PaperPlaneRight, SpinnerGap, ArrowsClockwise, ArrowsOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { Message } from '@/lib/chat-utils'
import { MessageContent } from '@/components/chat/message/message-content'
import { extractTradingMetadata } from '@/lib/trading-metadata'
import { usePelicanPanelContext } from '@/providers/pelican-panel-provider'

// =============================================================================
// TYPES
// =============================================================================

interface PelicanChatPanelInternalProps {
  isOpen: boolean
  conversationId: string | null
  messages: Message[]
  isStreaming: boolean
  ticker: string | null
  onClose: () => void
  onSendMessage: (content: string) => void
  onRegenerate?: () => void
  onConversationSelect?: (conversationId: string) => void
  className?: string
}

// =============================================================================
// MESSAGE COMPONENT
// =============================================================================

interface PanelMessageProps {
  message: Message
  isStreaming?: boolean
  isAutoPrompt?: boolean
}

function PanelMessage({ message, isStreaming = false, isAutoPrompt = false }: PanelMessageProps) {
  const isUser = message.role === 'user'
  const tradingMeta = !isUser && !isStreaming ? extractTradingMetadata(message.content) : null

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full py-3"
      >
        <div className="flex gap-3 items-start justify-end">
          <div className="max-w-[85%]">
            <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
              <div className="text-[15px] leading-relaxed break-words text-foreground">
                {message.content}
              </div>
            </div>
            {isAutoPrompt && (
              <div className="flex justify-end mt-1.5">
                <span className="text-[10px] text-[var(--accent-primary)]/60 bg-[var(--accent-muted)] px-2 py-0.5 rounded-full">
                  Auto-prompt
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full py-3"
    >
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 mt-1">
          <Image
            src="/pelican-logo-transparent.webp"
            alt="Pelican AI"
            width={24}
            height={24}
            className="w-6 h-6 object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 max-w-[90%] select-text">
          <div className="text-[15px] leading-relaxed text-foreground">
            <MessageContent
              content={message.content}
              isStreaming={isStreaming}
              showSkeleton={false}
              tickers={tradingMeta?.tickers}
              economicTerms={tradingMeta?.economicTerms}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// INTERNAL COMPONENT
// =============================================================================

function PelicanChatPanelInternal({
  isOpen,
  conversationId,
  messages,
  isStreaming,
  ticker,
  onClose,
  onSendMessage,
  onRegenerate,
  onConversationSelect,
  className,
}: PelicanChatPanelInternalProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastNotifiedConversationRef = useRef<string | null>(null)
  const router = useRouter()

  const handleExpandToFullChat = useCallback(() => {
    if (conversationId) {
      router.push(`/chat?conversation=${conversationId}`)
    } else {
      router.push('/chat')
    }
    onClose()
  }, [conversationId, router, onClose])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isStreaming])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle send message
  const handleSend = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isStreaming) return

    onSendMessage(trimmed)
    setInputValue('')
  }

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Determine if first message is auto-prompt (from openWithPrompt)
  const firstMessageIsAutoPrompt = messages.length > 0 && messages[0]?.role === 'user'

  useEffect(() => {
    if (!conversationId) return
    if (lastNotifiedConversationRef.current === conversationId) return
    lastNotifiedConversationRef.current = conversationId
    onConversationSelect?.(conversationId)
  }, [conversationId, onConversationSelect])

  if (!isOpen) return null

  return (
    <>
      {/* Mobile: Full-screen overlay */}
      <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-[var(--bg-surface)]">
        {/* Header — pinned top */}
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <Image
              src="/pelican-logo-transparent.webp"
              alt="Pelican AI"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Pelican AI</span>
              {ticker && (
                <span className="text-xs text-[var(--text-muted)] font-mono">{ticker}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconTooltip label="Expand to full chat" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExpandToFullChat}
                className="h-9 w-9"
              >
                <ArrowsOut className="h-4 w-4" weight="regular" />
              </Button>
            </IconTooltip>
            <IconTooltip label="Close panel" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9"
              >
                <X className="h-5 w-5" weight="bold" />
              </Button>
            </IconTooltip>
          </div>
        </div>

        {/* Messages — scrollable middle */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 select-text"
        >
          <div className="space-y-1">
            {messages.map((message, index) => (
              <PanelMessage
                key={message.id}
                message={message}
                isStreaming={message.isStreaming}
                isAutoPrompt={index === 0 && firstMessageIsAutoPrompt}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input — pinned bottom */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Pelican anything..."
              disabled={isStreaming}
              className="flex-1 bg-white/[0.06] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm leading-relaxed text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] disabled:opacity-50 min-h-[40px] max-h-[120px]"
              rows={1}
            />
            <IconTooltip label={isStreaming ? "Generating..." : "Send message"} side="top" kbd={isStreaming ? undefined : "↵"}>
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                size="icon"
                className="h-10 w-10 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isStreaming ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <PaperPlaneRight className="h-4 w-4" weight="fill" />
                )}
              </Button>
            </IconTooltip>
          </div>
        </div>
      </div>

      {/* Desktop: Side panel */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "hidden md:flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]",
          "h-full w-full",
          className
        )}
        style={{
          minWidth: '330px',
          maxWidth: '420px',
        }}
      >
        {/* Header — pinned top */}
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <Image
              src="/pelican-logo-transparent.webp"
              alt="Pelican AI"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Pelican AI</span>
              {ticker && (
                <span className="text-xs text-[var(--text-muted)] font-mono">{ticker}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconTooltip label="Expand to full chat" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExpandToFullChat}
                className="h-8 w-8 hover:bg-white/[0.06]"
              >
                <ArrowsOut className="h-3.5 w-3.5" weight="regular" />
              </Button>
            </IconTooltip>
            <IconTooltip label="Close panel" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-white/[0.06]"
              >
                <X className="h-4 w-4" weight="bold" />
              </Button>
            </IconTooltip>
          </div>
        </div>

        {/* Messages — scrollable middle */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 select-text"
        >
          <div className="space-y-1">
            {messages.map((message, index) => (
              <PanelMessage
                key={message.id}
                message={message}
                isStreaming={message.isStreaming}
                isAutoPrompt={index === 0 && firstMessageIsAutoPrompt}
              />
            ))}
            {messages.length > 1 && !isStreaming && onRegenerate && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]"
                >
                  <ArrowsClockwise className="h-3 w-3 mr-1.5" weight="bold" />
                  Regenerate
                </Button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Image
                src="/pelican-logo-transparent.webp"
                alt="Pelican AI"
                width={48}
                height={48}
                className="w-12 h-12 object-contain opacity-40 mb-4"
              />
              <p className="text-sm text-[var(--text-muted)]">
                Ask Pelican anything about the markets
              </p>
            </div>
          )}
        </div>

        {/* Input — pinned bottom */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Pelican anything..."
              disabled={isStreaming}
              className="flex-1 bg-white/[0.06] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm leading-relaxed text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] disabled:opacity-50 min-h-[40px] max-h-[120px]"
              rows={1}
            />
            <IconTooltip label={isStreaming ? "Generating..." : "Send message"} side="top" kbd={isStreaming ? undefined : "↵"}>
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                size="icon"
                className="h-10 w-10 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isStreaming ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <PaperPlaneRight className="h-4 w-4" weight="fill" />
                )}
              </Button>
            </IconTooltip>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// =============================================================================
// CONNECTED COMPONENT (EXPORTED)
// =============================================================================

export function PelicanChatPanel({
  onConversationSelect,
}: {
  onConversationSelect?: (conversationId: string) => void
}) {
  const {
    isOpen,
    conversationId,
    messages,
    isStreaming,
    ticker,
    close,
    sendMessage,
    regenerateLastMessage,
  } = usePelicanPanelContext()

  return (
    <PelicanChatPanelInternal
      isOpen={isOpen}
      conversationId={conversationId}
      messages={messages}
      isStreaming={isStreaming}
      ticker={ticker}
      onClose={close}
      onSendMessage={sendMessage}
      onRegenerate={regenerateLastMessage}
      onConversationSelect={onConversationSelect}
    />
  )
}
