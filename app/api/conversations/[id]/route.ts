/**
 * Conversation API Route - Single Conversation Operations
 * 
 * Handles GET, PATCH, and DELETE for individual conversations.
 * 
 * @version 2.0.0 - UUID Migration Compatible with RLS-safe operations
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"
import {
  updateConversation,
  softDeleteConversation,
  logRLSError,
  isValidUUID
} from "@/lib/supabase/helpers"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

const limiter = createUserRateLimiter("conversations-id", 60, "1 m")

// ============================================================================
// GET - Fetch single conversation with messages
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Validate user.id is a valid UUID
    if (!isValidUUID(user.id)) {
      Sentry.captureMessage("Invalid user ID format", {
        level: "error",
        tags: { action: "conversation_fetch" },
        extra: { userId: user.id }
      })
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      )
    }

    const { success: rlOk } = await limiter.limit(user.id)
    if (!rlOk) return rateLimitResponse()

    // Get specific conversation with messages
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        created_at,
        updated_at,
        archived,
        messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single()

    if (error) {
      // PGRST116 = No rows found
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        )
      }

      Sentry.captureException(error, {
        tags: { action: "conversation_fetch", conversation_id: id },
        extra: { userId: user.id }
      })
      return NextResponse.json(
        { error: "Failed to fetch conversation" },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversation }, {
      headers: { "Cache-Control": "private, no-cache" },
    })

  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: "/api/conversations/[id]", method: "GET" },
      level: "error"
    })
    return NextResponse.json(
      {
        error: "Failed to fetch conversation",
        details: process.env.NODE_ENV === 'production' ? undefined : (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Update conversation (title, archived status)
// ============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { title, archived } = await req.json()
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Validate user.id is a valid UUID
    if (!isValidUUID(user.id)) {
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      )
    }

    const { success: rlOk } = await limiter.limit(user.id)
    if (!rlOk) return rateLimitResponse()

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (archived !== undefined) {
      updateData.archived = archived
      updateData.archived_at = archived ? new Date().toISOString() : null
      // Archiving is a meaningful state change — bump updated_at
      updateData.updated_at = new Date().toISOString()
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update data provided" },
        { status: 400 }
      )
    }

    // Update conversation using RLS-safe helper
    const { data, error, success } = await updateConversation(
      supabase,
      id,
      user.id,
      updateData
    )

    if (!success || error) {
      logRLSError('update', 'conversations', error, { 
        conversationId: id, 
        userId: user.id, 
        updateData 
      })

      // Determine appropriate status code
      const isRLSRejection = error?.message?.includes('RLS rejection')
      const isNotFound = error?.message?.includes('No rows') || error?.message?.includes('PGRST116')

      if (isRLSRejection || isNotFound) {
        return NextResponse.json(
          { error: "Conversation not found or access denied", code: "not_found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: "Failed to update conversation", code: "update_failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      conversation: data
    })

  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: "/api/conversations/[id]", method: "PATCH" },
      level: "error"
    })
    return NextResponse.json(
      {
        error: "Failed to update conversation",
        code: "update_failed",
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Soft delete conversation
// ============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Validate user.id is a valid UUID
    if (!isValidUUID(user.id)) {
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      )
    }

    const { success: rlOk } = await limiter.limit(user.id)
    if (!rlOk) return rateLimitResponse()

    // Soft delete using RLS-safe helper
    const { data, error, success } = await softDeleteConversation(
      supabase,
      id,
      user.id
    )

    if (!success || error) {
      logRLSError('update', 'conversations', error, { 
        conversationId: id, 
        userId: user.id,
        operation: 'soft_delete'
      })

      // Determine appropriate status code
      const isRLSRejection = error?.message?.includes('RLS rejection')
      const isNotFound = error?.message?.includes('No rows') || error?.message?.includes('PGRST116')

      if (isRLSRejection || isNotFound) {
        return NextResponse.json(
          { error: "Conversation not found or access denied", code: "not_found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: "Failed to delete conversation", code: "delete_failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      deleted_at: data?.deleted_at
    })

  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: "/api/conversations/[id]", method: "DELETE" },
      level: "error"
    })
    return NextResponse.json(
      {
        error: "Failed to delete conversation",
        code: "delete_failed",
      },
      { status: 500 }
    )
  }
}
