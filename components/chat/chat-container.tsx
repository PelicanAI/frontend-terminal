"use client"

import type React from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useCallback, useRef } from "react"
import { StreamingMessage } from "./streaming-message"
import { WelcomeScreen } from "./welcome-screen"
import { ScrollContainer } from "./scroll-container"
import { useSmartScroll } from "@/hooks/use-smart-scroll"
import type { Message } from "@/lib/chat-utils"
import type { ActionTrade, ActionWatchlistItem } from "@/types/action-buttons"
import { useToast } from "@/hooks/use-toast"
import { useResponseTimer } from '@/hooks/use-response-timer'
import { DragDropOverlay } from "./drag-drop-overlay"
import { isAcceptedFileType } from "@/lib/file-utils"
import { EnhancedTypingDots } from "./enhanced-typing-dots"
import { JumpToLatestButton } from "./JumpToLatestButton"
import { SystemMessage } from "./SystemMessage"
import { ConversationHistorySkeleton } from "./conversation-history-skeleton"
import { NewMessagesPill } from "./new-messages-pill"
import { ErrorMessage } from "./error-message"
import { LearningModeToggle } from "./LearningModeToggle"

interface ChatContainerProps {
  messages: Message[]
  isLoading: boolean
  isLoadingHistory: boolean
  onStopGeneration?: () => void
  onRegenerateMessage?: () => void
  onQuickStart?: (message: string) => void
  onEditMessage?: (id: string, content: string) => void
  onDeleteMessage?: (id: string) => void
  onPinMessage?: (id: string) => void
  onFileUpload?: (files: File[]) => void
  onSettingsClick?: () => void
  networkError?: string | null
  outOfCredits?: boolean
  // Action bar props
  conversationId?: string
  allTrades?: ActionTrade[]
  watchlistItems?: ActionWatchlistItem[]
  onAddToWatchlist?: (ticker: string, conversationId?: string) => Promise<boolean>
  onRemoveFromWatchlist?: (ticker: string) => Promise<boolean>
  onOpenLogTrade?: (ticker: string) => void
  onOpenCloseTrade?: (tradeId: string) => void
  onSubmitPrompt?: (prompt: string) => void
  onOpenChart?: (ticker: string) => void
}

export function ChatContainer({
  messages,
  isLoading,
  isLoadingHistory,
  onStopGeneration,
  onRegenerateMessage,
  onQuickStart,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onFileUpload,
  onSettingsClick,
  networkError,
  outOfCredits,
  conversationId,
  allTrades,
  watchlistItems,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onOpenLogTrade,
  onOpenCloseTrade,
  onSubmitPrompt,
  onOpenChart,
}: ChatContainerProps) {
  const { toast } = useToast()
  const elapsedSeconds = useResponseTimer(isLoading)
  const [isDragOver, setIsDragOver] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false)

  // Find the index of the last assistant message (for regenerate button)
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") return i
    }
    return -1
  })()

  // Track previous messages to detect when user sends
  const prevMessagesLengthRef = useRef(messages.length)
  const prevLastMessageIdRef = useRef<string | undefined>(messages[messages.length - 1]?.id)

  const {
    containerRef,
    bottomRef,
    state,
    scrollToBottom,
    handleNewMessage,
    handleStreamingEnd,
    resetScrollAwayState,
    resetScrollState,
    showJump,
    lastNewMessageAt,
  } = useSmartScroll({
    nearBottomThreshold: 100,
    mobileNearBottomThreshold: 150,
    scrollBehavior: "smooth",
    enableMomentumScrolling: true,
    debounceMs: 100,
  })

  const validateFiles = useCallback(
    (files: FileList): File[] => {
      const validFiles: File[] = []
      const maxSize = 15 * 1024 * 1024 // 15MB

      Array.from(files).forEach((file) => {
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 15MB`,
            variant: "destructive",
          })
          return
        }

        if (!isAcceptedFileType(file)) {
          toast({
            title: "File type not supported",
            description: `${file.name} is not a supported file type. Please upload Excel (.xlsx, .xls), CSV, PDF, images, or text files.`,
            variant: "destructive",
          })
          return
        }

        validFiles.push(file)
      })

      return validFiles
    },
    [toast],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length > 0 && onFileUpload) {
        const validFiles = validateFiles(files)
        if (validFiles.length > 0) {
          onFileUpload(validFiles)
          toast({
            title: "Files uploaded",
            description: `${validFiles.length} file(s) uploaded successfully`,
          })
        }
      }
    },
    [onFileUpload, validateFiles, toast],
  )

  const handleJumpToBottom = useCallback(() => {
    scrollToBottom("smooth")
    resetScrollAwayState() // Reset scroll-away state when user manually scrolls to bottom
    setNewMessageCount(0)
    setShowNewMessagesPill(false)
  }, [scrollToBottom, resetScrollAwayState])

  useEffect(() => {
    if (messages.length === 0) {
      prevMessagesLengthRef.current = 0
      prevLastMessageIdRef.current = undefined
      return
    }

    const lastMessage = messages[messages.length - 1]
    const isStreaming = lastMessage?.isStreaming || false
    const currentLastMessageId = lastMessage?.id
    
    const messageWasAdded = messages.length > prevMessagesLengthRef.current

    // ⚡ CRITICAL PERFORMANCE FIX:
    // During streaming, the messages array reference changes on every chunk
    // but no NEW messages are added - only content updates.
    // Skip ALL processing if we're just updating streaming content.
    // This prevents hundreds of unnecessary effect runs during large responses.
    if (!messageWasAdded) {
      // Update refs and return immediately - no scroll handling needed
      prevMessagesLengthRef.current = messages.length
      prevLastMessageIdRef.current = currentLastMessageId
      return
    }

    // From here, we KNOW a new message was added (not just content update)

    // Find if a user message was added (could be last or second-to-last due to
    // simultaneous user message + assistant placeholder addition)
    let userMessageToScrollTo: Message | undefined = undefined
    let isUserMessage = false

    const recentUserMessage = [...messages].reverse().find(m => m.role === 'user')

    if (recentUserMessage) {
      const wasInPreviousState = messages.slice(0, prevMessagesLengthRef.current)
        .some(m => m.id === recentUserMessage.id)

      if (!wasInPreviousState) {
        userMessageToScrollTo = recentUserMessage
        isUserMessage = true
      }
    }

    // Handle new messages pill visibility
    if (!state.isNearBottom && !isStreaming) {
      setNewMessageCount((prev) => prev + 1)
      setShowNewMessagesPill(true)
    } else {
      setNewMessageCount(0)
      setShowNewMessagesPill(false)
    }

    // Trigger scroll based on message type
    if (isUserMessage && userMessageToScrollTo) {
      handleNewMessage(false, true, userMessageToScrollTo.id)
    } else {
      handleNewMessage(isStreaming, false, lastMessage?.id)
    }

    // Handle streaming end
    if (!isStreaming && state.isStreaming) {
      handleStreamingEnd()
    }

    // Update refs for next comparison
    prevMessagesLengthRef.current = messages.length
    prevLastMessageIdRef.current = currentLastMessageId
  }, [messages, handleNewMessage, handleStreamingEnd, state.isStreaming, state.isNearBottom])

  // Reset scroll when conversation changes
  const prevMessagesRef = useRef(messages)
  useEffect(() => {
    if (prevMessagesRef.current.length > 0 && messages.length === 0) {
      resetScrollState()
    }
    prevMessagesRef.current = messages
  }, [messages, resetScrollState])

  // Only show skeleton when actually loading a conversation's history
  // and no messages are present yet (defensive guard against stale loading state)
  if (isLoadingHistory && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background relative">
        <ConversationHistorySkeleton messageCount={4} />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col min-h-0 bg-transparent relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="main"
        aria-label="Chat conversation"
      >
        <WelcomeScreen onQuickStart={onQuickStart || (() => {})} onSettingsClick={onSettingsClick} disabled={outOfCredits} />
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DragDropOverlay />
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-transparent relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="main"
      aria-label="Chat conversation"
    >
      <AnimatePresence>
        {networkError && (
          <ErrorMessage
            message={networkError}
            variant="banner"
            onRetry={() => {
              onRegenerateMessage?.()
            }}
          />
        )}
      </AnimatePresence>

      <ScrollContainer
        ref={containerRef}
        showScrollIndicator={!state.isNearBottom && !state.isUserScrolling}
        onScrollToBottom={() => scrollToBottom("smooth")}
      >
        <div
          className="w-full pb-6"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {/* Conversation Header - Sticky */}
          <div className="sticky top-0 z-10 flex items-center justify-between pb-2 pt-4 sm:pt-6 border-b border-[var(--border-subtle)] bg-transparent backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col">
                <h2 className="text-sm font-medium text-[var(--text-primary)]">
                  Trading Assistant
                </h2>
                <p className="text-xs text-[var(--text-muted)] hidden sm:block">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LearningModeToggle />
              <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[var(--data-positive)]/10">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--data-positive)] animate-pulse"></div>
                <span className="text-[10px] sm:text-xs font-medium text-[var(--data-positive)]">Open</span>
              </div>
            </div>
          </div>

          {/* Loading skeleton when switching conversations */}
          {isLoadingHistory && messages.length === 0 && (
            <div className="space-y-6">
              <ConversationHistorySkeleton />
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {!isLoadingHistory && messages.map((message, index) => {
              // Hide empty assistant messages during loading (handled by Thinking indicator below)
              if (isLoading && message.role === 'assistant' && !message.content && index === messages.length - 1) {
                return null
              }

              // Only animate the last 2 messages (new/streaming); skip entrance animation for history
              const isRecentMessage = index >= messages.length - 2
              const animationProps = isRecentMessage
                ? {
                    initial: { opacity: 0, y: 20 } as const,
                    animate: { opacity: 1, y: 0 } as const,
                    exit: { opacity: 0, y: -10 } as const,
                    transition: { duration: 0.2, ease: "easeOut" as const },
                  }
                : {
                    initial: false as const,
                    animate: { opacity: 1, y: 0 } as const,
                    exit: { opacity: 0, y: -10 } as const,
                    transition: { duration: 0.15 },
                  }

              return message.role === "system" ? (
                <motion.div
                  key={message.id}
                  {...animationProps}
                >
                  <SystemMessage message={message} />
                </motion.div>
              ) : (
                <motion.div
                  key={message.id}
                  {...animationProps}
                >
                  <StreamingMessage
                    message={message}
                    onStop={message.isStreaming ? onStopGeneration : undefined}
                    onRegenerate={
                      index === lastAssistantIndex && message.role === "assistant" && !message.isStreaming
                        ? onRegenerateMessage
                        : undefined
                    }
                    isRegenerating={index === lastAssistantIndex && message.role === "assistant" && isLoading && !message.isStreaming}
                    isGlobalLoading={isLoading}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onPin={onPinMessage}
                    showActions={index === messages.length - 1}
                    conversationId={conversationId}
                    allTrades={allTrades}
                    watchlistItems={watchlistItems}
                    onAddToWatchlist={onAddToWatchlist}
                    onRemoveFromWatchlist={onRemoveFromWatchlist}
                    onOpenLogTrade={onOpenLogTrade}
                    onOpenCloseTrade={onOpenCloseTrade}
                    onSubmitPrompt={onSubmitPrompt}
                    onOpenChart={onOpenChart}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Thinking indicator with timer - shows during initial processing */}
          {isLoading && messages.length > 0 && (messages[messages.length - 1]?.role === 'user' || (messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content)) && (
            <div className="flex items-center gap-3 py-4 px-4 sm:px-8 max-w-3xl mx-auto">
              <Image
                src="/pelican-logo-transparent.webp"
                alt="Pelican AI"
                width={32}
                height={32}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain opacity-80"
              />
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] backdrop-blur-sm bg-[var(--bg-surface)]">
                <EnhancedTypingDots
                  variant="thinking"
                  userMessage={[...messages].reverse().find(m => m.role === 'user')?.content || ''}
                  elapsedSeconds={elapsedSeconds}
                />
                <span className="text-xs text-muted-foreground/50 font-mono tabular-nums min-w-[2.5rem]">
                  {elapsedSeconds}s
                </span>
              </div>
            </div>
          )}

          {/* Streaming indicator with timer - shows while response is being generated */}
          {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.isStreaming && !!messages[messages.length - 1]?.content && (
            <div className="flex items-center gap-2 px-4 sm:px-8 max-w-3xl mx-auto pb-2">
              <span className="text-xs text-muted-foreground/50 font-mono tabular-nums">
                {elapsedSeconds}s
              </span>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </ScrollContainer>

      <NewMessagesPill show={showNewMessagesPill} messageCount={newMessageCount} onJumpToBottom={handleJumpToBottom} />

      <AnimatePresence>
        {showJump && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <JumpToLatestButton onJumpToLatest={() => scrollToBottom("smooth")} lastNewMessageAt={lastNewMessageAt} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DragDropOverlay />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
