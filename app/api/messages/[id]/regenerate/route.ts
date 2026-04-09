/**
 * Message Regeneration API Route
 *
 * Regenerates an assistant message using the Pelican API.
 *
 * @version 2.0.0 - UUID Migration Compatible with RLS-safe operations
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"
import { updateMessage, logRLSError } from "@/lib/supabase/helpers"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const regenerateLimiter = createUserRateLimiter('message-regenerate', 30, '1 h')

export async function POST(
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

    const { success: rateLimitOk } = await regenerateLimiter.limit(user.id)
    if (!rateLimitOk) return rateLimitResponse()

    // Get the message and verify ownership through conversation
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        role,
        content,
        conversations!inner (
          user_id
        )
      `)
      .eq("id", id)
      .eq("conversations.user_id", user.id)
      .single()

    if (messageError || !message) {
      Sentry.captureMessage("Message not found for regeneration", {
        level: "warning",
        tags: { action: "regenerate_message", message_id: id },
        extra: { userId: user.id, error: messageError }
      })
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      )
    }

    // Only allow regenerating assistant messages
    if (message.role !== "assistant") {
      return NextResponse.json(
        { error: "Can only regenerate assistant messages" },
        { status: 400 }
      )
    }

    // Get conversation context (last 10 messages before this one)
    const { data: contextMessages, error: contextError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", message.conversation_id)
      .lt("created_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10)

    if (contextError) {
      logger.error("[regenerate] Error fetching context", undefined, { error: contextError.message, conversationId: message.conversation_id })
      Sentry.captureException(contextError, {
        tags: { action: "regenerate_fetch_context" },
        extra: { conversationId: message.conversation_id }
      })
      return NextResponse.json(
        { error: "Failed to fetch context" },
        { status: 500 }
      )
    }

    // Call Pelican API for regeneration
    const pelApiKey = process.env.PEL_API_KEY
    if (!pelApiKey) {
      logger.error("[regenerate] Pelican API key not configured")
      return NextResponse.json(
        { error: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : 'Pelican API key not configured' },
        { status: 500 }
      )
    }

    const pelResponse = await fetch("https://api.pelican.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pelApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: contextMessages?.reverse() || [],
        stream: false,
      }),
    })

    if (!pelResponse.ok) {
      const errorText = await pelResponse.text()
      logger.error("[regenerate] Pelican API error", undefined, { status: pelResponse.status, responseBody: errorText })
      Sentry.captureMessage("Pelican API error during regeneration", {
        level: "error",
        tags: { action: "regenerate_api_call" },
        extra: { status: pelResponse.status, error: errorText }
      })
      return NextResponse.json(
        { error: "Failed to regenerate response" },
        { status: 500 }
      )
    }

    const pelData = await pelResponse.json()
    const newContent = pelData.choices[0]?.message?.content

    if (!newContent) {
      logger.error("[regenerate] No content in API response")
      return NextResponse.json(
        { error: "No response generated" },
        { status: 500 }
      )
    }

    // Update the message with new content using RLS-safe helper
    const { data: updatedMessage, error: updateError, success } = await updateMessage(
      supabase,
      id,
      { content: newContent }
    )

    if (!success || updateError) {
      logRLSError('update', 'messages', updateError, { messageId: id, userId: user.id })
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: updateError?.message?.includes('RLS rejection') ? 403 : 500 }
      )
    }

    return NextResponse.json({
      content: newContent,
      message_id: id,
      updated_at: updatedMessage?.updated_at
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    })

  } catch (error) {
    logger.error("[regenerate] Unexpected error", error instanceof Error ? error : undefined)
    Sentry.captureException(error, {
      tags: { endpoint: "/api/messages/[id]/regenerate", method: "POST" },
      level: "error"
    })
    return NextResponse.json(
      {
        error: "Failed to regenerate message",
        details: process.env.NODE_ENV === 'production' ? undefined : (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    )
  }
}
