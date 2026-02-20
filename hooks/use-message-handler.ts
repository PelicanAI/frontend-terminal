"use client"

import { useState, useCallback } from "react"
import type { ChatInputRef } from "@/components/chat/chat-input"

interface PendingMessage {
  content: string
  fileIds?: string[]
  attachments?: any[]
}

interface UseMessageHandlerOptions {
  chatLoading: boolean
  currentConversationId: string | null
  sendMessage: (content: string, options?: { attachments?: any[]; fileIds?: string[] }) => Promise<void>
  chatInputRef: React.RefObject<ChatInputRef>
}

export function useMessageHandler({
  chatLoading,
  currentConversationId,
  sendMessage,
  chatInputRef,
}: UseMessageHandlerOptions) {
  const [isDraftWhileStreaming, setIsDraftWhileStreaming] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null)
  const [draftConversationId, setDraftConversationId] = useState<string | null>(null)
  const [isTypingDuringResponse, setIsTypingDuringResponse] = useState(false)
  const [isQueueingMessage, setIsQueueingMessage] = useState(false)

  const setDraftConversationIdSafe = useCallback((conversationId: string | null) => {
    setDraftConversationId(conversationId)
  }, [])

  const handleSendMessage = useCallback(
    async (content: string, options?: { forceQueue?: boolean; fileIds?: string[]; attachments?: any[] }) => {
      if (chatLoading || options?.forceQueue) {
        setPendingMessage({
          content,
          fileIds: options?.fileIds,
          attachments: options?.attachments,
        })
        setDraftConversationId(currentConversationId)
        setIsQueueingMessage(true)
        return
      }

      await sendMessage(content, { 
        fileIds: options?.fileIds, 
        attachments: options?.attachments 
      })
      setTimeout(() => chatInputRef.current?.focus(), 100)
    },
    [chatLoading, currentConversationId, sendMessage, chatInputRef],
  )

  const handleTypingDuringResponse = useCallback(() => {
    if (chatLoading && !isDraftWhileStreaming) {
      setIsDraftWhileStreaming(true)
      setIsTypingDuringResponse(true)
      setDraftConversationId(currentConversationId)
    }
  }, [chatLoading, isDraftWhileStreaming, currentConversationId])

  const handleForceQueue = useCallback(
    (content: string, options?: { fileIds?: string[]; attachments?: any[] }) => {
      handleSendMessage(content, { forceQueue: true, ...options })
    },
    [handleSendMessage],
  )

  const handleMessageFinish = useCallback(async () => {
    setIsDraftWhileStreaming(false)
    setIsTypingDuringResponse(false)
    setIsQueueingMessage(false)

    if (pendingMessage) {
      const messageToSend = pendingMessage
      setPendingMessage(null)
      setTimeout(async () => {
        await sendMessage(messageToSend.content, {
          fileIds: messageToSend.fileIds,
          attachments: messageToSend.attachments,
        })
        chatInputRef.current?.focus()
      }, 100)
    }
  }, [pendingMessage, sendMessage, chatInputRef])

  const clearDraftForConversation = useCallback(
    (conversationId: string) => {
      if (draftConversationId !== conversationId) {
        setPendingMessage(null)
        setDraftConversationId(null)
        setIsDraftWhileStreaming(false)
        setIsQueueingMessage(false)
      }
    },
    [draftConversationId],
  )

  const cancelPendingMessage = useCallback(() => {
    const cancelled = pendingMessage?.content || null
    setPendingMessage(null)
    setIsQueueingMessage(false)
    setIsDraftWhileStreaming(false)
    return cancelled
  }, [pendingMessage])

  const resetDraftState = useCallback(() => {
    setIsDraftWhileStreaming(false)
    setIsTypingDuringResponse(false)
    setIsQueueingMessage(false)
  }, [])

  return {
    handleSendMessage,
    handleTypingDuringResponse,
    handleForceQueue,
    handleMessageFinish,
    clearDraftForConversation,
    cancelPendingMessage,
    resetDraftState,
    pendingDraft: pendingMessage?.content || null,
    isDraftWhileStreaming,
    isTypingDuringResponse,
    isQueueingMessage,
    draftConversationId,
    setDraftConversationId: setDraftConversationIdSafe,
  }
}
