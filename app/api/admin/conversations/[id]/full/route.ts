import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'
import { classifyConversation } from '@/lib/admin/classify-conversation'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id: conversationId } = await params
    const admin = getServiceClient()

    // Fetch conversation, messages, and team user IDs in parallel
    const [convoResult, messagesResult, teamResult, authResult] = await Promise.all([
      admin
        .from('conversations')
        .select('id, title, user_id, created_at, updated_at, metadata')
        .eq('id', conversationId)
        .single(),
      admin
        .from('messages')
        .select('id, role, content, timestamp, metadata')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true }),
      admin
        .from('user_credits')
        .select('user_id')
        .eq('plan_type', 'founder'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    if (convoResult.error || !convoResult.data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const convo = convoResult.data
    const messages = messagesResult.data ?? []
    const teamUserIds = new Set(
      (teamResult.data ?? []).map((r) => r.user_id as string)
    )

    // Also include is_admin users as team
    const allUsers = authResult.data?.users ?? []
    // Look up email for this conversation's user
    const userEmail = allUsers.find((u) => u.id === convo.user_id)?.email ?? null

    // Classify
    const classification = classifyConversation(
      {
        user_id: convo.user_id as string,
        title: convo.title as string | null,
        metadata: (convo.metadata as Record<string, unknown> | null) ?? null,
      },
      teamUserIds
    )

    // Stats
    const userMessages = messages.filter((m) => m.role === 'user')
    const assistantMessages = messages.filter((m) => m.role === 'assistant')
    const firstMsg = messages[0]
    const lastMsg = messages[messages.length - 1]
    const firstAt = (firstMsg?.timestamp as string) ?? (convo.created_at as string)
    const lastAt = (lastMsg?.timestamp as string) ?? firstAt
    const durationMs = new Date(lastAt).getTime() - new Date(firstAt).getTime()
    const durationMinutes = Math.round(durationMs / 60000)

    return NextResponse.json({
      conversation: {
        id: convo.id as string,
        title: convo.title as string | null,
        user_id: convo.user_id as string,
        user_email: userEmail,
        metadata: (convo.metadata as Record<string, unknown> | null) ?? null,
        created_at: convo.created_at as string,
        updated_at: convo.updated_at as string | null,
      },
      messages: messages.map((m) => ({
        id: m.id as string,
        role: m.role as string,
        content: m.content as string,
        timestamp: m.timestamp as string,
        metadata: (m.metadata as Record<string, unknown> | null) ?? null,
      })),
      classification,
      stats: {
        total_messages: messages.length,
        user_messages: userMessages.length,
        assistant_messages: assistantMessages.length,
        first_message_at: firstAt,
        last_message_at: lastAt,
        duration_minutes: durationMinutes,
      },
    }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    })
  } catch (error) {
    console.error('Admin conversation full error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
