import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 50)
  const cursor = searchParams.get('cursor') || ''
  const email = searchParams.get('email') || ''
  const contentSearch = searchParams.get('content') || ''

  const admin = getServiceClient()

  // If email filter, find matching user IDs first
  let allUsers: Array<{ id: string; email?: string | null }> = []
  let filterUserIds: string[] | null = null

  if (email) {
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    allUsers = authData?.users ?? []
    filterUserIds = allUsers
      .filter((u) => u.email?.toLowerCase().includes(email.toLowerCase()))
      .map((u) => u.id)

    if (filterUserIds.length === 0) {
      return NextResponse.json(
        { conversations: [], hasMore: false },
        { headers: { 'Cache-Control': 'private, no-cache' } }
      )
    }
  }

  // If content search, find conversation IDs with matching messages
  let contentConversationIds: string[] | null = null

  if (contentSearch) {
    const { data: matchingMessages, error: searchError } = await admin
      .from('messages')
      .select('conversation_id')
      .ilike('content', `%${contentSearch}%`)
      .limit(500)

    if (searchError) {
      console.error('[Admin Conversations] content search failed:', searchError.message)
    } else {
      contentConversationIds = [...new Set(
        (matchingMessages ?? []).map((m) => m.conversation_id as string)
      )]

      if (contentConversationIds.length === 0) {
        return NextResponse.json(
          { conversations: [], hasMore: false },
          { headers: { 'Cache-Control': 'private, no-cache' } }
        )
      }
    }
  }

  let query = admin
    .from('conversations')
    .select('id, title, user_id, created_at, message_count')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  if (filterUserIds) {
    query = query.in('user_id', filterUserIds)
  }

  if (contentConversationIds) {
    query = query.in('id', contentConversationIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Admin Conversations] query failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }

  const rows = data ?? []

  // Resolve user emails — reuse allUsers if already fetched for email filter
  if (allUsers.length === 0) {
    const userIds = [...new Set(rows.map((c) => c.user_id as string))]
    if (userIds.length > 0) {
      const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      allUsers = authData?.users ?? []
    }
  }

  const userEmailMap = new Map(allUsers.map((u) => [u.id, u.email ?? null]))

  const conversations = rows.map((c) => ({
    id: c.id as string,
    title: c.title as string | null,
    userName: userEmailMap.get(c.user_id as string) ?? null,
    createdAt: c.created_at as string,
    messageCount: (c.message_count as number | null) ?? null,
  }))

  return NextResponse.json({
    conversations,
    hasMore: rows.length === limit,
  }, {
    headers: { 'Cache-Control': 'private, no-cache' },
  })
}
