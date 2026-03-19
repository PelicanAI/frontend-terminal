"use client"

import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { usePelicanPanel, type PelicanPanelContext } from '@/hooks/use-pelican-panel'
import type { Message } from '@/lib/chat-utils'
import type { TrialExhaustedInfo, InsufficientCreditsInfo } from '@/hooks/use-streaming-chat'
import type { MessageSource } from '@/lib/chat/message-source'

// =============================================================================
// TYPES
// =============================================================================

interface PelicanPanelContextValue {
  isOpen: boolean
  conversationId: string | null
  messages: Message[]
  isStreaming: boolean
  ticker: string | null
  context: PelicanPanelContext
  openWithPrompt: (ticker: string | null, prompt: string | { visibleMessage: string; fullPrompt: string }, context: PelicanPanelContext, source?: MessageSource) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  close: () => void
  clearMessages: () => void
  regenerateLastMessage: () => Promise<void>
}

// =============================================================================
// CONTEXT
// =============================================================================

const PelicanPanelContext = createContext<PelicanPanelContextValue | undefined>(undefined)

// =============================================================================
// PROVIDER
// =============================================================================

interface PelicanPanelProviderProps {
  children: ReactNode
  onTrialExhausted?: (info: TrialExhaustedInfo) => void
  onInsufficientCredits?: (info: InsufficientCreditsInfo) => void
  onError?: (error: Error) => void
}

export function PelicanPanelProvider({
  children,
  onTrialExhausted,
  onInsufficientCredits,
  onError,
}: PelicanPanelProviderProps) {
  const panel = usePelicanPanel({
    onTrialExhausted,
    onInsufficientCredits,
    onError,
  })

  const value: PelicanPanelContextValue = useMemo(() => ({
    isOpen: panel.state.isOpen,
    conversationId: panel.state.conversationId,
    messages: panel.state.messages,
    isStreaming: panel.state.isStreaming,
    ticker: panel.state.ticker,
    context: panel.state.context,
    openWithPrompt: panel.openWithPrompt,
    sendMessage: panel.sendMessage,
    close: panel.close,
    clearMessages: panel.clearMessages,
    regenerateLastMessage: panel.regenerateLastMessage,
  }), [
    panel.state.isOpen,
    panel.state.conversationId,
    panel.state.messages,
    panel.state.isStreaming,
    panel.state.ticker,
    panel.state.context,
    panel.openWithPrompt,
    panel.sendMessage,
    panel.close,
    panel.clearMessages,
    panel.regenerateLastMessage,
  ])

  return (
    <PelicanPanelContext.Provider value={value}>
      {children}
    </PelicanPanelContext.Provider>
  )
}

// =============================================================================
// NOOP FALLBACK (for components rendered outside PelicanPanelProvider)
// =============================================================================

const noopPanel: PelicanPanelContextValue = {
  isOpen: false,
  conversationId: null,
  messages: [],
  isStreaming: false,
  ticker: null,
  context: null,
  openWithPrompt: async () => {},
  sendMessage: async () => {},
  close: () => {},
  clearMessages: () => {},
  regenerateLastMessage: async () => {},
}

// =============================================================================
// HOOK
// =============================================================================

export function usePelicanPanelContext(): PelicanPanelContextValue {
  const context = useContext(PelicanPanelContext)
  return context ?? noopPanel
}
