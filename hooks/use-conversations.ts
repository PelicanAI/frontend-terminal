"use client"

/**
 * Conversations Hook
 * 
 * Manages conversation state for both authenticated and guest users.
 * Uses RLS-safe operations for all database interactions.
 * 
 * @version 3.0.0 - Streamlined (removed legacy duplicates)
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"
import { captureError } from "@/lib/sentry-helper"
import {
  isValidUUID,
  updateConversation as updateConversationDB,
  hardDeleteConversation,
  logRLSError
} from "@/lib/supabase/helpers"

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  last_message_preview: string
  user_id: string
  archived?: boolean
}

export interface UseConversationsReturn {
  // State
  conversations: Conversation[]
  loading: boolean
  user: User | null
  guestUserId: string | null
  effectiveUserId: string | null

  // Pagination
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void

  // Filters
  filter: "all" | "archived" | "active"
  setFilter: (filter: "all" | "archived" | "active") => void
  search: string
  setSearch: (search: string) => void

  // Filtered list
  list: Conversation[]

  // Operations
  create: (title?: string) => Promise<Conversation | null>
  rename: (id: string, title: string) => Promise<boolean>
  archive: (id: string, archived?: boolean) => Promise<boolean>
  remove: (id: string) => Promise<boolean>

  // Guest-specific
  updateGuestMessages: (id: string, count: number, preview: string, messages?: unknown[]) => void
  loadGuestMessages: (id: string) => unknown[]
  ensureGuestConversation: (id: string, title?: string) => void
}

// ============================================================================
// Guest User Utilities
// ============================================================================

function generateGuestUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const GUEST_CONVERSATIONS_KEY = "pelican_guest_conversations"
const GUEST_USER_ID_KEY = "pelican_guest_user_id"

function saveGuestConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(conversations))
  } catch (error) {
    // Silent fail
  }
}

function loadGuestConversations(): Conversation[] {
  try {
    const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    return []
  }
}

// ============================================================================
// Debounce Hook
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// Main Hook
// ============================================================================

const PAGE_SIZE = 20

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [guestUserId, setGuestUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "archived" | "active">("active")
  const [search, setSearch] = useState("")

  const debouncedSearch = useDebounce(search, 300)
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const effectiveUserId = user?.id || guestUserId

  // --------------------------------------------------------------------------
  // Debug: Log user ID sources
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Debug logging removed for performance
  }, [user, guestUserId, effectiveUserId, pathname])

  // --------------------------------------------------------------------------
  // Load from database
  // --------------------------------------------------------------------------
  const loadFromDatabase = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(PAGE_SIZE)

      if (error) throw error

      const rows = data || []
      setConversations(rows)
      setHasMore(rows.length === PAGE_SIZE)
    } catch (error) {
      setConversations([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // --------------------------------------------------------------------------
  // Initialize guest user ID
  // --------------------------------------------------------------------------
  useEffect(() => {
    const storedGuestId = localStorage.getItem(GUEST_USER_ID_KEY)

    if (storedGuestId && isValidUUID(storedGuestId)) {
      setGuestUserId(storedGuestId)
    } else {
      const newGuestId = generateGuestUUID()
      localStorage.setItem(GUEST_USER_ID_KEY, newGuestId)
      setGuestUserId(newGuestId)
    }
  }, [])

  // --------------------------------------------------------------------------
  // Auth state management
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!guestUserId) return

    let cancelled = false
    let subscription: { unsubscribe: () => void } | null = null

    const init = async () => {
      const { data: { user: fetchedUser }, error: authError } = await supabase.auth.getUser()
      if (cancelled) return

      setUser(fetchedUser)

      if (fetchedUser?.id) {
        await loadFromDatabase(fetchedUser.id)
      } else {
        setConversations(loadGuestConversations())
        setLoading(false)
      }
    }

    const setupListener = () => {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return

        setUser(session?.user || null)

        if (session?.user?.id) {
          loadFromDatabase(session.user.id)
        } else {
          setConversations(loadGuestConversations())
          setLoading(false)
        }
      })
      subscription = data.subscription
    }

    init()
    setupListener()

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [guestUserId, loadFromDatabase])

  // --------------------------------------------------------------------------
  // Real-time subscription
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "conversations", 
          filter: `user_id=eq.${user.id}` 
        },
        () => loadFromDatabase(user.id)
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user?.id, loadFromDatabase])

  // --------------------------------------------------------------------------
  // Instant refresh on conversation creation (supplements Realtime)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handler = () => {
      if (user?.id) loadFromDatabase(user.id)
    }
    window.addEventListener('pelican:conversation-created', handler)
    return () => window.removeEventListener('pelican:conversation-created', handler)
  }, [user?.id, loadFromDatabase])

  // --------------------------------------------------------------------------
  // Load more (pagination)
  // --------------------------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return

    const userId = user?.id || guestUserId
    if (!userId || !user?.id) return // Guest conversations are all in localStorage

    const oldest = conversations[conversations.length - 1]
    if (!oldest) return

    setLoadingMore(true)
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .lt("updated_at", oldest.updated_at)
        .order("updated_at", { ascending: false })
        .limit(PAGE_SIZE)

      if (error) throw error

      const rows = data || []
      if (rows.length > 0) {
        setConversations(prev => [...prev, ...rows])
      }
      setHasMore(rows.length === PAGE_SIZE)
    } catch (error) {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, user?.id, guestUserId, conversations, supabase])

  // --------------------------------------------------------------------------
  // Refetch on route change to /chat
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Refetch conversations when navigating to /chat
    if (pathname === '/chat') {
      // Get fresh auth state instead of relying on potentially stale user state
      supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
        if (freshUser?.id) {
          loadFromDatabase(freshUser.id)
        } else if (user?.id) {
          loadFromDatabase(user.id)
        } else {
          setConversations(loadGuestConversations())
          setLoading(false)
        }
      })
    }
  }, [pathname, user?.id, loadFromDatabase, guestUserId, effectiveUserId])

  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------
  const create = useCallback(async (title = "New Conversation"): Promise<Conversation | null> => {
    // Get fresh auth state
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      Sentry.captureException(authError, { tags: { action: "create_conversation" } })
    }

    const userId = currentUser?.id || guestUserId
    if (!userId) {
      return null
    }

    // Authenticated user: save to database
    if (currentUser?.id) {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title })
          .select()
          .single()

        if (error || !data) {
          throw error || new Error("No data returned")
        }

        await loadFromDatabase(currentUser.id)
        if (!user) setUser(currentUser)
        
        return data
      } catch (error) {
        Sentry.captureException(error, { 
          tags: { action: "create_conversation" },
          extra: { userId, title }
        })
        return null
      }
    }

    // Guest user: save to localStorage
    const newConversation: Conversation = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message_preview: "",
      user_id: userId,
      archived: false,
    }

    const updated = [newConversation, ...loadGuestConversations()]
    saveGuestConversations(updated)
    setConversations(updated)

    return newConversation
  }, [guestUserId, user, loadFromDatabase])

  // --------------------------------------------------------------------------
  // RENAME
  // --------------------------------------------------------------------------
  const rename = useCallback(async (conversationId: string, newTitle: string): Promise<boolean> => {
    if (!effectiveUserId) return false

    // Optimistic update
    const previous = conversations
    setConversations(prev => 
      prev.map(c => c.id === conversationId 
        ? { ...c, title: newTitle, updated_at: new Date().toISOString() } 
        : c
      )
    )

    try {
      if (user?.id) {
        // Use API route for consistency with other clients
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || "Rename failed")
        }
      } else {
        // Guest: update localStorage
        const updated = loadGuestConversations().map(c =>
          c.id === conversationId
            ? { ...c, title: newTitle, updated_at: new Date().toISOString() }
            : c
        )
        saveGuestConversations(updated)
      }
      return true
    } catch (error) {
      captureError(error, { action: "rename_conversation", conversationId })
      setConversations(previous) // Rollback
      return false
    }
  }, [conversations, effectiveUserId, user?.id])

  // --------------------------------------------------------------------------
  // ARCHIVE
  // --------------------------------------------------------------------------
  const archive = useCallback(async (conversationId: string, archived = true): Promise<boolean> => {
    if (!effectiveUserId) return false

    // Optimistic update
    const previous = conversations
    setConversations(prev =>
      prev.map(c => c.id === conversationId
        ? { ...c, archived, updated_at: new Date().toISOString() }
        : c
      )
    )

    try {
      if (user?.id) {
        const { success, error } = await updateConversationDB(
          supabase,
          conversationId,
          effectiveUserId,
          { archived, archived_at: archived ? new Date().toISOString() : null }
        )

        if (!success || error) {
          logRLSError("update", "conversations", error, { conversationId, archived })
          throw error || new Error("Archive failed")
        }
      } else {
        // Guest: update localStorage
        const updated = loadGuestConversations().map(c =>
          c.id === conversationId
            ? { ...c, archived, updated_at: new Date().toISOString() }
            : c
        )
        saveGuestConversations(updated)
      }
      return true
    } catch (error) {
      setConversations(previous) // Rollback
      return false
    }
  }, [conversations, effectiveUserId, user?.id])

  // --------------------------------------------------------------------------
  // REMOVE (hard delete)
  // --------------------------------------------------------------------------
  const remove = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!effectiveUserId) return false

    // Optimistic update
    const previous = conversations
    setConversations(prev => prev.filter(c => c.id !== conversationId))

    try {
      if (user?.id) {
        const { deleted, error } = await hardDeleteConversation(
          supabase,
          conversationId,
          effectiveUserId
        )

        if (!deleted || error) {
          logRLSError("delete", "conversations", error, { conversationId })
          throw error || new Error("Delete failed")
        }
      } else {
        // Guest: update localStorage and clean up messages
        const updated = loadGuestConversations().filter(c => c.id !== conversationId)
        saveGuestConversations(updated)
        localStorage.removeItem(`pelican_guest_messages_${conversationId}`)
      }
      return true
    } catch (error) {
      setConversations(previous) // Rollback
      return false
    }
  }, [conversations, effectiveUserId, user?.id])

  // --------------------------------------------------------------------------
  // Guest-specific utilities
  // --------------------------------------------------------------------------
  const updateGuestMessages = useCallback((
    conversationId: string,
    messageCount: number,
    lastMessagePreview: string,
    messages?: unknown[]
  ) => {
    if (user?.id) return // Auth users don't use this

    const updated = loadGuestConversations().map(c =>
      c.id === conversationId
        ? { ...c, message_count: messageCount, last_message_preview: lastMessagePreview, updated_at: new Date().toISOString() }
        : c
    )
    saveGuestConversations(updated)
    setConversations(updated)

    if (messages?.length) {
      const toStore = messages.map((m: unknown) => {
        const msg = m as { id: string; role: string; content: string; timestamp: unknown; attachments?: unknown }
        return { id: msg.id, role: msg.role, content: msg.content, timestamp: msg.timestamp, attachments: msg.attachments }
      })
      localStorage.setItem(`pelican_guest_messages_${conversationId}`, JSON.stringify(toStore))
    }
  }, [user?.id])

  const loadGuestMessages = useCallback((conversationId: string): unknown[] => {
    if (user?.id) return []
    
    try {
      const stored = localStorage.getItem(`pelican_guest_messages_${conversationId}`)
      if (!stored) return []
      
      return JSON.parse(stored).map((m: { timestamp: string }) => ({
        ...m,
        timestamp: new Date(m.timestamp),
        isStreaming: false,
      }))
    } catch {
      return []
    }
  }, [user?.id])

  const ensureGuestConversation = useCallback((conversationId: string, title?: string) => {
    if (user?.id) return

    const existing = loadGuestConversations()
    if (existing.some(c => c.id === conversationId)) return

    const newConv: Conversation = {
      id: conversationId,
      title: title || "New Conversation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message_preview: "",
      user_id: guestUserId || "",
      archived: false,
    }

    const updated = [newConv, ...existing]
    saveGuestConversations(updated)
    setConversations(updated)
  }, [user?.id, guestUserId])

  // --------------------------------------------------------------------------
  // Filtered list
  // --------------------------------------------------------------------------
  const list = useMemo(() => {
    let result = conversations

    // Filter by archived status
    if (filter === "archived") {
      result = result.filter(c => c.archived)
    } else if (filter === "active") {
      result = result.filter(c => !c.archived)
    }

    // Filter by search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.last_message_preview.toLowerCase().includes(q)
      )
    }

    return result
  }, [conversations, filter, debouncedSearch])

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------
  return {
    conversations,
    loading,
    user,
    guestUserId,
    effectiveUserId,
    hasMore,
    loadingMore,
    loadMore,
    filter,
    setFilter,
    search,
    setSearch,
    list,
    create,
    rename,
    archive,
    remove,
    updateGuestMessages,
    loadGuestMessages,
    ensureGuestConversation,
  }
}
