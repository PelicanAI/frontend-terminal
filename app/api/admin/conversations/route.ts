import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'
import { classifyConversation, type ConvoTag } from '@/lib/admin/classify-conversation'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 50)
  const cursor = searchParams.get('cursor') || ''
  const email = searchParams.get('email') || ''
  const contentSearch = searchParams.get('content') || ''
  const ownerFilter = searchParams.get('owner') || '' // 'user' | 'team' | ''
  const typeFilter = searchParams.get('type') || ''   // 'organic' | 'action' | 'brief' | ''

  const admin = getServiceClient()

  // Always fetch all auth users (needed for email mapping and team classification)
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const allUsers = authData?.users ?? []
  const userEmailMap = new Map(allUsers.map((u) => [u.id, u.email ?? null]))

  // Get team user IDs (founders) for classification
  const { data: teamData } = await admin
    .from('user_credits')
    .select('user_id')
    .eq('plan_type', 'founder')
  const teamUserIds = new Set((teamData ?? []).map((r) => r.user_id as string))

  // If email filter, find matching user IDs
  let filterUserIds: string[] | null = null
  if (email) {
    filterUserIds = allUsers
      .filter((u) => u.email?.toLowerCase().includes(email.toLowerCase()))
      .map((u) => u.id)

    if (filterUserIds.length === 0) {
      return NextResponse.json(
        { conversations: [], hasMore: false, counts: { user: 0, team: 0 } },
        { headers: { 'Cache-Control': 'private, no-cache' } }
      )
    }
  }

  // If owner filter, restrict to user IDs for that owner type
  if (ownerFilter === 'user' || ownerFilter === 'team') {
    const ownerIds = allUsers
      .filter((u) => {
        const isTeam = teamUserIds.has(u.id)
        return ownerFilter === 'team' ? isTeam : !isTeam
      })
      .map((u) => u.id)

    if (filterUserIds) {
      filterUserIds = filterUserIds.filter((id) => ownerIds.includes(id))
    } else {
      filterUserIds = ownerIds
    }

    if (filterUserIds.length === 0) {
      return NextResponse.json(
        { conversations: [], hasMore: false, counts: { user: 0, team: 0 } },
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
          { conversations: [], hasMore: false, counts: { user: 0, team: 0 } },
          { headers: { 'Cache-Control': 'private, no-cache' } }
        )
      }
    }
  }

  // Fetch more than limit to allow client-side type filtering
  const fetchLimit = typeFilter ? limit * 4 : limit

  let query = admin
    .from('conversations')
    .select('id, title, user_id, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

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

  // Get actual message counts via a batch query
  const convoIds = rows.map((c) => c.id as string)
  const msgCountMap = new Map<string, number>()
  if (convoIds.length > 0) {
    const { data: msgData } = await admin
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convoIds)

    if (msgData) {
      for (const m of msgData) {
        const cid = m.conversation_id as string
        msgCountMap.set(cid, (msgCountMap.get(cid) ?? 0) + 1)
      }
    }
  }

  // Classify all conversations and apply type filter
  let classified = rows.map((c) => {
    const tag = classifyConversation(
      {
        user_id: c.user_id as string,
        title: c.title as string | null,
        metadata: (c.metadata as Record<string, unknown> | null) ?? null,
      },
      teamUserIds
    )
    return {
      id: c.id as string,
      title: c.title as string | null,
      userName: userEmailMap.get(c.user_id as string) ?? null,
      createdAt: c.created_at as string,
      messageCount: msgCountMap.get(c.id as string) ?? 0,
      metadata: (c.metadata as Record<string, unknown> | null) ?? null,
      tag,
    }
  })

  // Apply type filter
  if (typeFilter) {
    classified = classified.filter((c) => c.tag.classification === typeFilter)
  }

  // Trim to limit
  const trimmed = classified.slice(0, limit)

  // Count user vs team for the filter pills (from the unfiltered set)
  const userCount = rows.filter((c) => !teamUserIds.has(c.user_id as string)).length
  const teamCount = rows.filter((c) => teamUserIds.has(c.user_id as string)).length

  return NextResponse.json({
    conversations: trimmed,
    hasMore: typeFilter ? classified.length > limit : rows.length === fetchLimit,
    counts: { user: userCount, team: teamCount },
  }, {
    headers: { 'Cache-Control': 'private, no-cache' },
  })
  } catch (error) {
    console.error('Admin conversations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
