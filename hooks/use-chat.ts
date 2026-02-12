/**
 * Chat Hook - Production Grade Implementation
 * =============================================
 * 
 * This hook manages conversation state and message sending with:
 * - Message loading when conversation changes
 * - Synchronous state/ref updates to prevent race conditions
 * - Proper conversation history capture before API calls
 * - Backend-handled message persistence (no dual persistence)
 * - Comprehensive logging for debugging
 * 
 * @author Pelican Engineering
 * @version 3.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStreamingChat, type TrialExhaustedInfo, type InsufficientCreditsInfo } from './use-streaming-chat';
import { logger } from '@/lib/logger';
import type { Message, Attachment } from '@/lib/chat-utils';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const LIMITS = {
  MESSAGE_CONTEXT: 150,
  MAX_MESSAGE_LENGTH: 50000,
  MIN_MESSAGE_LENGTH: 1,
};

// =============================================================================
// TYPES
// =============================================================================

interface UseChatOptions {
  conversationId?: string | null;
  userId?: string | null;
  onError?: (error: Error) => void;
  onMessageSent?: (message: Message) => void;
  onResponseComplete?: (response: string) => void;
  onFinish?: (message: Message) => void;
  onConversationCreated?: (conversationId: string) => void;
  onTrialExhausted?: (info: TrialExhaustedInfo) => void;
  onInsufficientCredits?: (info: InsufficientCreditsInfo) => void;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  regenerateLastMessage: () => Promise<void>;
  retryLastMessage: () => Promise<void>;
  addSystemMessage: (content: string) => string;
  conversationNotFound: boolean;
  isLoadingMessages: boolean;
}

interface SendMessageOptions {
  fileIds?: string[];
  attachments?: Attachment[];
  skipUserMessage?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createUserMessage(content: string, attachments?: Attachment[]): Message {
  return {
    id: createMessageId(),
    role: 'user',
    content: content, // Store raw content (no trim) to preserve formatting
    timestamp: new Date(),
    isStreaming: false,
    attachments: attachments,
  };
}

function createAssistantMessage(content: string = ''): Message {
  return {
    id: createMessageId(),
    role: 'assistant',
    content,
    timestamp: new Date(),
    isStreaming: true,
  };
}

function validateMessage(content: string): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Message content is required' };
  }

  const trimmed = content.trim();

  if (trimmed.length < LIMITS.MIN_MESSAGE_LENGTH) {
    return { valid: false, error: 'Message is too short' };
  }

  if (trimmed.length > LIMITS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: 'Message is too long' };
  }

  return { valid: true };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    conversationId: initialConversationId,
    userId,
    onError,
    onMessageSent,
    onResponseComplete,
    onFinish,
    onConversationCreated,
    onTrialExhausted,
    onInsufficientCredits,
  } = options;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversationNotFound, setConversationNotFound] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId ?? null
  );

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const messagesRef = useRef<Message[]>([]);
  const loadedConversationRef = useRef<string | null>(null);
  const lastSentMessageRef = useRef<string | null>(null);
  const loadingAbortRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // STREAMING HOOK
  // ---------------------------------------------------------------------------

  const { sendMessage: sendStreamingMessage, isStreaming, abortStream } = useStreamingChat();

  // ---------------------------------------------------------------------------
  // SYNCHRONOUS STATE UPDATE
  // ---------------------------------------------------------------------------

  const updateMessagesWithSync = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

  const getCurrentMessages = useCallback((): Message[] => {
    return messagesRef.current;
  }, []);

  // ---------------------------------------------------------------------------
  // HISTORY CAPTURE
  // ---------------------------------------------------------------------------

  const captureConversationHistory = useCallback(
    (excludeSystemMessages: boolean = true, maxMessages?: number): Array<{ role: string; content: string }> => {
      const currentMessages = getCurrentMessages();
      const limit = maxMessages ?? LIMITS.MESSAGE_CONTEXT - 1;

      logger.debug('[CHAT-CAPTURE] Capturing history', {
        currentMessagesCount: currentMessages.length,
        limit,
        conversationId: currentConversationId,
      });

      let history = currentMessages;

      if (excludeSystemMessages) {
        history = history.filter((msg) => msg.role !== 'system');
      }

      history = history.slice(-limit);

      const apiHistory = history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (apiHistory.length === 0 && currentConversationId) {
        logger.warn('[CHAT-CAPTURE] WARNING: Empty history for existing conversation!', {
          conversationId: currentConversationId,
          messagesStateLength: currentMessages.length,
          messagesRoles: currentMessages.map((m) => m.role),
        });
      }

      return apiHistory;
    },
    [getCurrentMessages, currentConversationId]
  );

  // ---------------------------------------------------------------------------
  // LOAD MESSAGES
  // ---------------------------------------------------------------------------

  const loadMessages = useCallback(async (conversationId: string): Promise<boolean> => {
    // Abort any in-flight load
    if (loadingAbortRef.current) {
      loadingAbortRef.current.abort();
    }
    
    const abortController = new AbortController();
    loadingAbortRef.current = abortController;
    
    logger.info('[CHAT-LOAD] Loading conversation', { conversationId });
    setIsLoadingMessages(true);
    setError(null);
    setConversationNotFound(false);
    
    // Clear existing messages immediately
    updateMessagesWithSync(() => []);
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        signal: abortController.signal,
      });
      
      if (abortController.signal.aborted) {
        return false;
      }
      
      // ✅ FIX: Treat 404 as empty conversation, not an error
      // This happens for new conversations where memory_conversations doesn't exist yet
      if (response.status === 404) {
        logger.info('[CHAT-LOAD] No messages yet (new conversation)', { conversationId });
        updateMessagesWithSync(() => []);
        loadedConversationRef.current = conversationId;
        setConversationNotFound(false);
        return true; // Success - empty conversation is valid
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (abortController.signal.aborted) {
        return false;
      }
      
      // Transform API messages to our Message format
      // Includes attachments resolved from message metadata (image persistence)
      const loadedMessages: Message[] = (data.messages || []).map((msg: any) => ({
        id: msg.id || createMessageId(),
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.created_at || Date.now()),
        isStreaming: false,
        ...(msg.attachments?.length ? { attachments: msg.attachments } : {}),
      }));
      
      logger.info('[CHAT-LOAD] Loaded messages', { 
        conversationId, 
        count: loadedMessages.length 
      });
      
      updateMessagesWithSync(() => loadedMessages);
      loadedConversationRef.current = conversationId;
      return true;
      
    } catch (err) {
      if (abortController.signal.aborted) {
        return false;
      }
      
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Don't log abort errors
      if (error.name !== 'AbortError') {
        logger.error('[CHAT-LOAD] Failed to load messages', error);
        setError(error);
        onError?.(error);
      }
      return false;
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingMessages(false);
      }
      if (loadingAbortRef.current === abortController) {
        loadingAbortRef.current = null;
      }
    }
  }, [updateMessagesWithSync, onError]);

  // ---------------------------------------------------------------------------
  // SEND MESSAGE - STREAMING
  // ---------------------------------------------------------------------------

  const sendMessageStreaming = useCallback(
    async (content: string, sendOptions: SendMessageOptions = {}): Promise<void> => {
      const validation = validateMessage(content);
      if (!validation.valid) {
        const err = new Error(validation.error);
        setError(err);
        onError?.(err);
        return;
      }

      lastSentMessageRef.current = content;
      setError(null);
      setIsLoading(true);

      const userMessage = createUserMessage(content, sendOptions.attachments);
      const conversationHistory = captureConversationHistory();

      logger.info('[CHAT-SEND] Preparing to send message', {
        messageLength: content.length,
        historyLength: conversationHistory.length,
        conversationId: currentConversationId,
        isNewConversation: !currentConversationId,
      });

      if (!sendOptions.skipUserMessage) {
        updateMessagesWithSync((prev) => [...prev, userMessage]);
        onMessageSent?.(userMessage);
      }

      const assistantMessage = createAssistantMessage('');
      const assistantMessageId = assistantMessage.id;

      updateMessagesWithSync((prev) => [...prev, assistantMessage]);

      try {
        await sendStreamingMessage(
          content,
          conversationHistory,
          {
            onChunk: (chunk: string) => {
              updateMessagesWithSync((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + chunk }
                    : msg
                )
              );
            },
            onComplete: async (fullResponse: string, newConversationId?: string) => {
              let conversationId = newConversationId;
              
              // If backend didn't return valid UUID, create conversation ourselves
              if (!conversationId && fullResponse) {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { data } = await supabase
                    .from('conversations')
                    .insert({ user_id: user.id, title: 'New conversation' })
                    .select('id')
                    .single();
                  conversationId = data?.id;
                }
              }

              // Capture conversation ID for new conversations
              if (!currentConversationId && conversationId) {
                logger.info('[CHAT-COMPLETE] Capturing conversation ID from backend', {
                  conversationId,
                });
                // Mark as already loaded so the URL-change effect doesn't re-fetch
                // (messages are already in state from streaming)
                loadedConversationRef.current = conversationId;
                setCurrentConversationId(conversationId);
                onConversationCreated?.(conversationId);
              }

              const finalMessage: Message = {
                ...assistantMessage,
                content: fullResponse,
                isStreaming: false,
              };
              updateMessagesWithSync((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId ? finalMessage : msg
                )
              );
              onResponseComplete?.(fullResponse);
              onFinish?.(finalMessage);
              logger.info('[CHAT-COMPLETE] Response complete', {
                responseLength: fullResponse.length,
                conversationId: newConversationId || currentConversationId,
              });
            },
            onError: (err: Error) => {
              setError(err);
              onError?.(err);
              updateMessagesWithSync((prev) =>
                prev.filter((msg) => msg.id !== assistantMessageId)
              );
              logger.error('[CHAT-ERROR] Streaming error', err);
            },
            onTrialExhausted: (info: TrialExhaustedInfo) => {
              updateMessagesWithSync((prev) =>
                prev.filter((msg) => msg.id !== assistantMessageId)
              );
              setIsLoading(false);
              onTrialExhausted?.(info);
              logger.warn('[CHAT-TRIAL] Trial exhausted during stream', { ...info });
            },
            onInsufficientCredits: (info: InsufficientCreditsInfo) => {
              updateMessagesWithSync((prev) =>
                prev.filter((msg) => msg.id !== assistantMessageId)
              );
              setIsLoading(false);
              onInsufficientCredits?.(info);
              logger.warn('[CHAT-CREDITS] Insufficient credits during stream', { ...info });
            },
          },
          currentConversationId,
          sendOptions.fileIds || []
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        updateMessagesWithSync((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );
        logger.error('[CHAT-ERROR] Send failed', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      captureConversationHistory,
      currentConversationId,
      messages.length,
      onError,
      onMessageSent,
      onResponseComplete,
      onFinish,
      sendStreamingMessage,
      updateMessagesWithSync,
    ]
  );

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions): Promise<void> => {
      return sendMessageStreaming(content, options);
    },
    [sendMessageStreaming]
  );

  const clearMessages = useCallback(() => {
    updateMessagesWithSync(() => []);
    setError(null);
    loadedConversationRef.current = null;
    logger.info('[CHAT-CLEAR] Messages cleared');
  }, [updateMessagesWithSync]);

  const retryLastMessage = useCallback(async () => {
    if (lastSentMessageRef.current) {
      // Delete old messages from DB so they don't reappear on reload
      const current = messagesRef.current;
      const lastUserIndex = current.findLastIndex((m) => m.role === 'user');
      if (lastUserIndex >= 0) {
        const removed = current.slice(lastUserIndex);
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const dbIds = removed.filter((m) => uuidRe.test(m.id)).map((m) => m.id);
        if (dbIds.length > 0) {
          try {
            const supabase = createClient();
            await supabase.from('messages').delete().in('id', dbIds);
          } catch (e) {
            logger.warn('[CHAT-REGEN] Failed to delete old messages from DB');
          }
        }
      }

      // Compute sliced messages (remove last user + assistant pair)
      const sliced = lastUserIndex >= 0 ? current.slice(0, lastUserIndex) : current;

      // CRITICAL: Update ref BEFORE sendMessage so captureConversationHistory()
      // reads the correct (sliced) messages.  React 18 batches setMessages —
      // the updater inside updateMessagesWithSync won't run until the next
      // render, but sendMessage reads messagesRef.current synchronously.
      // Without this, the backend receives the OLD response in conversation
      // history and generates a differently-formatted regeneration.
      messagesRef.current = sliced;
      updateMessagesWithSync(() => sliced);
      await sendMessage(lastSentMessageRef.current);
    }
  }, [sendMessage, updateMessagesWithSync]);

  const regenerateLastMessage = retryLastMessage;

  const stopGeneration = useCallback(() => {
    abortStream();
    setIsLoading(false);
    updateMessagesWithSync((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
    logger.info('[CHAT-STOP] Generation stopped');
  }, [abortStream, updateMessagesWithSync]);

  const addSystemMessage = useCallback(
    (content: string): string => {
      const systemMessage: Message = {
        id: createMessageId(),
        role: 'system',
        content,
        timestamp: new Date(),
        isStreaming: false,
      };
      updateMessagesWithSync((prev) => [...prev, systemMessage]);
      return systemMessage.id;
    },
    [updateMessagesWithSync]
  );

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Store loadMessages in a ref to avoid dependency issues
  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;

  // Load messages when conversation changes
  useEffect(() => {
    const conversationId = initialConversationId;

    // Skip if no conversation ID (e.g. "New Chat" with no messages to fetch)
    if (!conversationId) {
      // Only clear if we have messages (avoid unnecessary state updates)
      if (messagesRef.current.length > 0) {
        setMessages([]);
        messagesRef.current = [];
      }
      setIsLoadingMessages(false);
      setConversationNotFound(false);
      loadedConversationRef.current = null;
      setCurrentConversationId(null);
      return;
    }

    // Skip if already loaded this conversation
    if (loadedConversationRef.current === conversationId) {
      return;
    }

    // Skip if messages are already in state from streaming.
    // When onComplete fires it sets currentConversationId (state) before the
    // URL updates.  By the time this effect runs with the new URL-based
    // conversationId, the state already matches — so we know messages came
    // from the stream and there's nothing to fetch.
    if (messagesRef.current.length > 0 && currentConversationId === conversationId) {
      logger.info('[CHAT-LOAD] Skipping fetch — messages already in state from streaming', {
        conversationId,
        messageCount: messagesRef.current.length,
      });
      loadedConversationRef.current = conversationId;
      return;
    }

    logger.info('[CHAT-LOAD] Loading messages for conversation', {
      conversationId,
      loadedRef: loadedConversationRef.current,
      currentConvId: currentConversationId,
      messagesInState: messagesRef.current.length,
    });

    // Update current conversation ID
    setCurrentConversationId(conversationId);

    // Load messages using ref to avoid dependency loop
    loadMessagesRef.current(conversationId);

    // Cleanup: abort loading on unmount or conversation change
    return () => {
      if (loadingAbortRef.current) {
        loadingAbortRef.current.abort();
      }
    };
  }, [initialConversationId]); // Only depend on conversationId - use refs for functions

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearMessages,
    regenerateLastMessage,
    retryLastMessage,
    addSystemMessage,
    conversationNotFound,
    isLoadingMessages,
  };
}

export default useChat;
