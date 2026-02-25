/**
 * Pelican Panel Hook
 * ====================
 *
 * Manages state for the Pelican AI side panel used across V2 feature pages.
 * The panel reuses the existing SSE streaming system (use-streaming-chat.ts).
 *
 * Key behaviors:
 * - Opens with pre-filled contextual prompts (heatmap clicks, trade scans, etc.)
 * - Maintains ONE conversation per page session (appends on multiple clicks)
 * - Closes/resets when switching pages
 * - Conversations are saved to DB and appear in Chat page history
 *
 * @version 1.0.0
 */

"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { useStreamingChat, type TrialExhaustedInfo, type InsufficientCreditsInfo } from './use-streaming-chat'
import { logger, type LogContext } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/tracking'
import type { Message } from '@/lib/chat-utils'
import {
  type MessageSource,
  type ConversationSourceMetadata,
  contextToSource,
  createConversationSourceMetadata,
  updateConversationSourceMetadata,
} from '@/lib/chat/message-source'

// =============================================================================
// TYPES
// =============================================================================

export type PelicanPanelContext = 'heatmap' | 'earnings' | 'journal' | 'morning' | 'brief' | 'search' | 'correlations' | 'calendar' | 'playbooks' | null

interface PelicanPanelState {
  isOpen: boolean
  conversationId: string | null
  messages: Message[]
  isStreaming: boolean
  ticker: string | null
  context: PelicanPanelContext
}

interface UsePelicanPanelOptions {
  onTrialExhausted?: (info: TrialExhaustedInfo) => void
  onInsufficientCredits?: (info: InsufficientCreditsInfo) => void
  onError?: (error: Error) => void
}

interface UsePelicanPanelReturn {
  state: PelicanPanelState
  openWithPrompt: (ticker: string | null, prompt: string | { visibleMessage: string; fullPrompt: string }, context: PelicanPanelContext, source?: MessageSource) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  close: () => void
  clearMessages: () => void
  regenerateLastMessage: () => Promise<void>
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function createUserMessage(content: string): Message {
  return {
    id: createMessageId(),
    role: 'user',
    content,
    timestamp: new Date(),
    isStreaming: false,
  }
}

function createAssistantMessage(content: string = ''): Message {
  return {
    id: createMessageId(),
    role: 'assistant',
    content,
    timestamp: new Date(),
    isStreaming: true,
  }
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function usePelicanPanel(options: UsePelicanPanelOptions = {}): UsePelicanPanelReturn {
  const { onTrialExhausted, onInsufficientCredits, onError } = options

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [state, setState] = useState<PelicanPanelState>({
    isOpen: false,
    conversationId: null,
    messages: [],
    isStreaming: false,
    ticker: null,
    context: null,
  })

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const messagesRef = useRef<Message[]>([])
  const conversationIdRef = useRef<string | null>(null)
  const lastUserMessageRef = useRef<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // ---------------------------------------------------------------------------
  // STREAMING HOOK
  // ---------------------------------------------------------------------------

  const { sendMessage: sendStreamingMessage, isStreaming, abortStream } = useStreamingChat()

  // Sync isStreaming to state
  useEffect(() => {
    setState(prev => ({ ...prev, isStreaming }))
  }, [isStreaming])

  // ---------------------------------------------------------------------------
  // HELPER: Update messages with sync
  // ---------------------------------------------------------------------------

  const updateMessagesWithSync = useCallback((updater: (prev: Message[]) => Message[]) => {
    setState(prev => {
      const nextMessages = updater(prev.messages)
      messagesRef.current = nextMessages
      return { ...prev, messages: nextMessages }
    })
  }, [])

  // ---------------------------------------------------------------------------
  // HELPER: Capture conversation history
  // ---------------------------------------------------------------------------

  const captureConversationHistory = useCallback((): Array<{ role: string; content: string }> => {
    const currentMessages = messagesRef.current
    return currentMessages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
  }, [])

  // ---------------------------------------------------------------------------
  // HELPER: Create conversation in Supabase
  // ---------------------------------------------------------------------------

  const createConversation = useCallback(async (ticker: string | null, context: PelicanPanelContext, source?: MessageSource): Promise<string | null> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        logger.warn('[PELICAN-PANEL] No authenticated user for conversation creation')
        return null
      }

      // Create title based on context
      let title = 'Pelican Analysis'
      if (ticker) {
        title = `${ticker} Analysis`
      } else if (context === 'morning') {
        title = 'Daily Brief'
      } else if (context === 'journal') {
        title = 'Trade Journal'
      }

      const resolvedSource = source || contextToSource(context)
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          metadata: {
            context, ticker, source: 'pelican_panel',
            source_tracking: createConversationSourceMetadata(resolvedSource),
          },
        })
        .select('id')
        .single()

      if (error) {
        logger.error('[PELICAN-PANEL] Failed to create conversation', error)
        return null
      }

      logger.info('[PELICAN-PANEL] Created conversation', { id: data.id, ticker, context })
      return data.id
    } catch (error) {
      logger.error('[PELICAN-PANEL] Conversation creation error', error instanceof Error ? error : undefined)
      return null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // HELPER: Update source tracking on existing conversation
  // ---------------------------------------------------------------------------

  const updateSourceTracking = useCallback(async (source: MessageSource) => {
    const convId = conversationIdRef.current
    if (!convId) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', convId)
        .single()
      const existingMeta = (data?.metadata as Record<string, unknown>) || {}
      const updatedTracking = updateConversationSourceMetadata(
        existingMeta.source_tracking as ConversationSourceMetadata | null,
        source
      )
      await supabase
        .from('conversations')
        .update({ metadata: { ...existingMeta, source_tracking: updatedTracking } })
        .eq('id', convId)
    } catch {
      logger.warn('[PELICAN-PANEL] Failed to update source tracking')
    }
  }, [])

  // ---------------------------------------------------------------------------
  // PUBLIC: Open with prompt
  // ---------------------------------------------------------------------------

  const openWithPrompt = useCallback(async (
    ticker: string | null,
    prompt: string | { visibleMessage: string; fullPrompt: string },
    context: PelicanPanelContext,
    source?: MessageSource
  ): Promise<void> => {
    // Handle both string and object prompt formats
    const visibleMessage = typeof prompt === 'string' ? prompt : prompt.visibleMessage
    const fullPrompt = typeof prompt === 'string' ? prompt : prompt.fullPrompt

    logger.info('[PELICAN-PANEL] Opening with prompt', { ticker, context, promptLength: fullPrompt.length })

    trackEvent({
      eventType: 'chat_prefill_used',
      ticker: ticker || undefined,
      feature: context || 'unknown',
    })

    // If panel is already open for same context, append to existing conversation
    const shouldAppend = stateRef.current.isOpen && stateRef.current.context === context && conversationIdRef.current

    const resolvedSource = source || contextToSource(context)

    if (!shouldAppend) {
      // Opening fresh - create new conversation
      const newConversationId = await createConversation(ticker, context, resolvedSource)
      conversationIdRef.current = newConversationId

      setState({
        isOpen: true,
        conversationId: newConversationId,
        messages: [],
        isStreaming: false,
        ticker,
        context,
      })
      messagesRef.current = []
    } else {
      // Appending to existing conversation
      setState(prev => ({ ...prev, isOpen: true, ticker }))
      void updateSourceTracking(resolvedSource)
    }

    // Send the prompt - user sees visibleMessage, backend gets fullPrompt
    const userMessage = createUserMessage(visibleMessage)
    const assistantMessage = createAssistantMessage('')
    const assistantMessageId = assistantMessage.id

    // Capture history BEFORE updating state, then include the new user message.
    // updateMessagesWithSync is batched by React, so messagesRef may not update
    // before captureConversationHistory reads it — causing empty history warnings.
    const existingHistory = captureConversationHistory()
    const conversationHistory = [
      ...existingHistory,
      { role: 'user' as const, content: fullPrompt },
    ]

    updateMessagesWithSync(prev => [...prev, userMessage, assistantMessage])
    lastUserMessageRef.current = fullPrompt

    try {
      await sendStreamingMessage(
        fullPrompt,
        conversationHistory,
        {
          onChunk: (chunk: string) => {
            updateMessagesWithSync(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            )
          },
          onComplete: async (fullResponse: string, backendConversationId?: string) => {
            // Use backend conversation ID if provided (for new conversations)
            if (backendConversationId && !conversationIdRef.current) {
              conversationIdRef.current = backendConversationId
              setState(prev => ({ ...prev, conversationId: backendConversationId }))
            }

            // Mark message as complete
            updateMessagesWithSync(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullResponse, isStreaming: false }
                  : msg
              )
            )

            logger.info('[PELICAN-PANEL] Response complete', {
              conversationId: conversationIdRef.current,
              responseLength: fullResponse.length,
            })

            // Trigger conversation list refresh
            window.dispatchEvent(new CustomEvent('pelican:conversation-created'))
          },
          onError: (err: Error) => {
            // Remove failed assistant message
            updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
            onError?.(err)
            logger.error('[PELICAN-PANEL] Streaming error', err)
          },
          onTrialExhausted: (info: TrialExhaustedInfo) => {
            updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
            onTrialExhausted?.(info)
            logger.warn('[PELICAN-PANEL] Trial exhausted', info as unknown as LogContext)
          },
          onInsufficientCredits: (info: InsufficientCreditsInfo) => {
            updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
            onInsufficientCredits?.(info)
            logger.warn('[PELICAN-PANEL] Insufficient credits', info as unknown as LogContext)
          },
        },
        conversationIdRef.current,
        []
      )
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
      updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
      logger.error('[PELICAN-PANEL] Send message failed', err)
    }
  }, [sendStreamingMessage, onError, onTrialExhausted, onInsufficientCredits, updateMessagesWithSync, captureConversationHistory, createConversation, updateSourceTracking])

  // ---------------------------------------------------------------------------
  // PUBLIC: Send message (user-initiated)
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return

    logger.info('[PELICAN-PANEL] Sending user message', { length: content.length })
    void updateSourceTracking('typed')

    const userMessage = createUserMessage(content)
    const assistantMessage = createAssistantMessage('')
    const assistantMessageId = assistantMessage.id

    // Capture history before state update to avoid batching race condition
    const existingHistory = captureConversationHistory()
    const conversationHistory = [
      ...existingHistory,
      { role: 'user' as const, content },
    ]

    updateMessagesWithSync(prev => [...prev, userMessage, assistantMessage])
    lastUserMessageRef.current = content

    try {
      await sendStreamingMessage(
        content,
        conversationHistory,
        {
          onChunk: (chunk: string) => {
            updateMessagesWithSync(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            )
          },
          onComplete: async (fullResponse: string) => {
            updateMessagesWithSync(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullResponse, isStreaming: false }
                  : msg
              )
            )
          },
          onError: (err: Error) => {
            updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
            onError?.(err)
          },
          onTrialExhausted: (info: TrialExhaustedInfo) => {
            updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
            onTrialExhausted?.(info)
          },
          onInsufficientCredits: (info: InsufficientCreditsInfo) => {
            updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
            onInsufficientCredits?.(info)
          },
        },
        conversationIdRef.current,
        []
      )
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
      updateMessagesWithSync(prev => prev.filter(msg => msg.id !== assistantMessageId))
    }
  }, [sendStreamingMessage, onError, onTrialExhausted, onInsufficientCredits, updateMessagesWithSync, captureConversationHistory, updateSourceTracking])

  // ---------------------------------------------------------------------------
  // PUBLIC: Regenerate last message
  // ---------------------------------------------------------------------------

  const regenerateLastMessage = useCallback(async (): Promise<void> => {
    if (!lastUserMessageRef.current) {
      logger.warn('[PELICAN-PANEL] No last message to regenerate')
      return
    }

    const current = messagesRef.current
    const lastUserIndex = current.findLastIndex(m => m.role === 'user')
    if (lastUserIndex < 0) return

    // Delete old messages from DB
    const removed = current.slice(lastUserIndex)
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const dbIds = removed.filter(m => uuidRe.test(m.id)).map(m => m.id)

    if (dbIds.length > 0 && conversationIdRef.current) {
      try {
        const supabase = createClient()
        await supabase.from('messages').delete().in('id', dbIds)
      } catch (e) {
        logger.warn('[PELICAN-PANEL] Failed to delete old messages from DB')
      }
    }

    // Slice messages
    const sliced = current.slice(0, lastUserIndex)
    messagesRef.current = sliced
    updateMessagesWithSync(() => sliced)

    // Re-send
    await sendMessage(lastUserMessageRef.current)
  }, [sendMessage, updateMessagesWithSync])

  // ---------------------------------------------------------------------------
  // PUBLIC: Close panel
  // ---------------------------------------------------------------------------

  const close = useCallback(() => {
    abortStream()
    setState(prev => ({ ...prev, isOpen: false }))
    logger.info('[PELICAN-PANEL] Panel closed')
  }, [abortStream])

  // ---------------------------------------------------------------------------
  // PUBLIC: Clear messages (when switching pages)
  // ---------------------------------------------------------------------------

  const clearMessages = useCallback(() => {
    abortStream()
    messagesRef.current = []
    conversationIdRef.current = null
    lastUserMessageRef.current = null

    setState({
      isOpen: false,
      conversationId: null,
      messages: [],
      isStreaming: false,
      ticker: null,
      context: null,
    })

    logger.info('[PELICAN-PANEL] Messages cleared')
  }, [abortStream])

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    state,
    openWithPrompt,
    sendMessage,
    close,
    clearMessages,
    regenerateLastMessage,
  }
}

export default usePelicanPanel
