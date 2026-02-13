"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { usePelicanPanel, type PelicanPanelContext } from '@/hooks/use-pelican-panel'

// =============================================================================
// TYPES
// =============================================================================

interface PelicanPanelContextValue {
  isOpen: boolean
  conversationId: string | null
  messages: any[]
  isStreaming: boolean
  ticker: string | null
  context: PelicanPanelContext
  openWithPrompt: (ticker: string | null, prompt: string, context: PelicanPanelContext) => Promise<void>
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
  onTrialExhausted?: (info: any) => void
  onInsufficientCredits?: (info: any) => void
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

  const value: PelicanPanelContextValue = {
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
  }

  return (
    <PelicanPanelContext.Provider value={value}>
      {children}
    </PelicanPanelContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

export function usePelicanPanelContext(): PelicanPanelContextValue {
  const context = useContext(PelicanPanelContext)

  if (context === undefined) {
    throw new Error('usePelicanPanelContext must be used within PelicanPanelProvider')
  }

  return context
}
