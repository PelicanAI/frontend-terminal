"use client"

/**
 * Authentication Provider
 * 
 * Handles user authentication state and guest-to-user migration.
 * 
 * @version 2.0.0 - RLS-safe operations
 */

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { bulkInsertWithRLSCheck, isValidUUID } from "@/lib/supabase/helpers"

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================================
// Constants
// ============================================================================

const GUEST_CONVERSATIONS_KEY = "pelican_guest_conversations"
const GUEST_USER_ID_KEY = "pelican_guest_user_id"
const GUEST_MODE_KEY = "pelican_guest_mode"

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  // --------------------------------------------------------------------------
  // Guest Migration
  // --------------------------------------------------------------------------
  const migrateGuestConversations = useCallback(async (userId: string) => {
    // Validate user ID
    if (!isValidUUID(userId)) {
      // Invalid user ID for migration — skip silently
      return
    }

    try {
      const guestConversationsRaw = localStorage.getItem(GUEST_CONVERSATIONS_KEY)
      if (!guestConversationsRaw) return

      const guestConversations = JSON.parse(guestConversationsRaw)
      if (!Array.isArray(guestConversations) || guestConversations.length === 0) return

      for (const guestConv of guestConversations) {
        try {
          // Create conversation in Supabase
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              user_id: userId,
              title: guestConv.title || `Migrated conversation from ${new Date(guestConv.created_at).toLocaleDateString()}`,
              created_at: guestConv.created_at,
              metadata: {
                migrated_from_guest: true,
                original_guest_id: guestConv.id,
              },
            })
            .select()
            .single()

          if (convError || !newConv) {
            // Failed to migrate conversation — skip to next
            continue
          }

          // Get messages for this conversation
          const guestMessagesRaw = localStorage.getItem(`pelican_guest_messages_${guestConv.id}`)
          if (guestMessagesRaw) {
            const guestMessages = JSON.parse(guestMessagesRaw)

            if (Array.isArray(guestMessages) && guestMessages.length > 0) {
              // Prepare messages for insertion
              const messagesToInsert = guestMessages.map((msg: {
                role: string
                content: string
                created_at?: string
                metadata?: Record<string, unknown>
              }) => ({
                conversation_id: newConv.id,
                user_id: userId,
                role: msg.role,
                content: msg.content,
                created_at: msg.created_at || new Date().toISOString(),
                metadata: msg.metadata || {},
              }))

              // Insert messages with RLS-safe helper
              const { success, error: msgError } = await bulkInsertWithRLSCheck(
                supabase,
                "messages",
                messagesToInsert
              )

              if (!success || msgError) {
                // Failed to migrate messages — continue cleanup
              }
            }
          }

          // Clear the guest messages from localStorage
          localStorage.removeItem(`pelican_guest_messages_${guestConv.id}`)

        } catch (error) {
          // Migration error for individual conversation — skip to next
        }
      }

      // Clear all guest data
      localStorage.removeItem(GUEST_CONVERSATIONS_KEY)
      localStorage.removeItem(GUEST_MODE_KEY)
      localStorage.removeItem(GUEST_USER_ID_KEY)

    } catch (error) {
      // Guest migration failed — non-blocking, user still logs in
    }
  }, [supabase])

  // --------------------------------------------------------------------------
  // Auth State
  // --------------------------------------------------------------------------
  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on setup, providing the user
    // without a separate getUser() call — single network request instead of two
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only update user state if the user ID actually changed
      // This prevents cascading re-renders from TOKEN_REFRESHED events
      // which provide a new User object with the same ID
      setUser(prev => {
        const newUser = session?.user ?? null
        if (prev?.id === newUser?.id) return prev
        return newUser
      })
      setLoading(false)

      // Migrate guest conversations when user logs in
      if (event === "SIGNED_IN" && session?.user && typeof window !== "undefined") {
        await migrateGuestConversations(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, migrateGuestConversations])

  // --------------------------------------------------------------------------
  // Sign Out
  // --------------------------------------------------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()

    // Clear guest mode if set
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_MODE_KEY)
      localStorage.removeItem('pelican_guest_user_id')
      localStorage.removeItem('pelican_guest_conversations')
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('pelican_guest_messages_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }, [supabase.auth])

  const authValue = useMemo(() => ({ user, loading, signOut }), [user, loading, signOut])

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
