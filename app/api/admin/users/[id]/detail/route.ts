import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { id: userId } = await params
  const admin = getServiceClient()

  // Fetch conversations and message count in parallel
  const [convosResult, messagesResult] = await Promise.all([
    admin
      .from('conversations')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin
      .from('messages')
      .select('conversation_id, created_at')
      .eq('user_id', userId),
  ])

  if (convosResult.error) console.error('[Admin User Detail] conversations query failed:', convosResult.error.message)
  if (messagesResult.error) console.error('[Admin User Detail] messages query failed:', messagesResult.error.message)

  const conversations = convosResult.data ?? []
  const allMessages = messagesResult.data ?? []

  // Count messages per conversation
  const msgCountByConvo = new Map<string, number>()
  let lastMessageAt: string | null = null
  for (const m of allMessages) {
    const cid = m.conversation_id as string
    msgCountByConvo.set(cid, (msgCountByConvo.get(cid) ?? 0) + 1)
    const ts = m.created_at as string
    if (!lastMessageAt || ts > lastMessageAt) lastMessageAt = ts
  }

  const totalMessages = allMessages.length
  const totalConversations = conversations.length
  const lastActive = lastMessageAt ?? (conversations[0]?.created_at as string | undefined) ?? null

  // Last 5 conversations with message counts
  const recentConversations = conversations.slice(0, 5).map((c) => ({
    id: c.id as string,
    title: (c.title as string | null) ?? 'Untitled',
    createdAt: c.created_at as string,
    messageCount: msgCountByConvo.get(c.id as string) ?? 0,
  }))

  return NextResponse.json({
    totalMessages,
    totalConversations,
    lastActive,
    recentConversations,
  }, {
    headers: { "Cache-Control": "private, no-cache" },
  })
  } catch (error) {
    console.error('Admin user detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
