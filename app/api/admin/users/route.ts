import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100)
  const search = (searchParams.get('search') || '').toLowerCase().trim()
  const planFilter = (searchParams.get('plan') || '').toLowerCase().trim()
  const activityFilter = (searchParams.get('activity') || '').toLowerCase().trim()
  const sortBy = (searchParams.get('sort') || 'newest').toLowerCase().trim()

  const admin = getServiceClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Get all auth users
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authError) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const authUsers = authData.users ?? []
  const allUserIds = authUsers.map((u) => u.id)

  // Fetch credit info for ALL users (needed for filtering/sorting)
  let allCredits: Record<string, unknown>[] = []
  if (allUserIds.length > 0) {
    const { data, error } = await admin
      .from('user_credits')
      .select('user_id, credits_balance, plan_type, credits_used_this_month, free_questions_remaining, is_admin')
      .in('user_id', allUserIds)
    if (error) console.error('[Admin Users API] credits query failed:', error.message)
    allCredits = data ?? []
  }

  const creditMap = new Map(
    allCredits.map((c) => [c.user_id as string, c])
  )

  // Fetch message counts and last active for all users (needed for sorting, activity filter, CSV export)
  const userMsgCounts = new Map<string, number>()
  const userConvoCounts = new Map<string, number>()
  const userLastActive = new Map<string, string>()

  // Always fetch message data for activity filter, sorting, and enhanced user rows
  const [msgDataResult, convoDataResult, recentMsgResult] = await Promise.all([
    admin.from('messages').select('user_id'),
    admin.from('conversations').select('user_id'),
    admin.from('messages').select('user_id, created_at').order('created_at', { ascending: false }),
  ])

  if (msgDataResult.data) {
    for (const m of msgDataResult.data) {
      const uid = m.user_id as string
      userMsgCounts.set(uid, (userMsgCounts.get(uid) ?? 0) + 1)
    }
  }

  if (convoDataResult.data) {
    for (const c of convoDataResult.data) {
      const uid = c.user_id as string
      userConvoCounts.set(uid, (userConvoCounts.get(uid) ?? 0) + 1)
    }
  }

  if (recentMsgResult.data) {
    for (const m of recentMsgResult.data) {
      const uid = m.user_id as string
      if (!userLastActive.has(uid)) {
        userLastActive.set(uid, m.created_at as string)
      }
    }
  }

  // For activity filter, determine which users were active in 7d and which have no messages in 30d
  const activeIn7d = new Set<string>()
  const activeIn30d = new Set<string>()

  if (recentMsgResult.data) {
    const sevenDaysAgoDate = new Date(sevenDaysAgo)
    const thirtyDaysAgoDate = new Date(thirtyDaysAgo)
    for (const m of recentMsgResult.data) {
      const uid = m.user_id as string
      const ts = new Date(m.created_at as string)
      if (ts >= sevenDaysAgoDate) activeIn7d.add(uid)
      if (ts >= thirtyDaysAgoDate) activeIn30d.add(uid)
    }
  }

  // Build merged user list
  let merged = authUsers.map((u) => {
    const credit = creditMap.get(u.id) as Record<string, unknown> | undefined
    return {
      id: u.id,
      displayName: u.email ?? null,
      email: u.email ?? '',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      isAdmin: (credit?.is_admin ?? false) as boolean,
      plan: (credit?.plan_type ?? 'none') as string,
      creditsBalance: (credit?.credits_balance ?? 0) as number,
      creditsUsed: (credit?.credits_used_this_month ?? 0) as number,
      freeQuestionsRemaining: (credit?.free_questions_remaining ?? 0) as number,
      messageCount: userMsgCounts.get(u.id) ?? 0,
      totalConversations: userConvoCounts.get(u.id) ?? 0,
      lastActive: userLastActive.get(u.id) ?? null,
    }
  })

  // Filter by search
  if (search) {
    merged = merged.filter((u) =>
      (u.email).toLowerCase().includes(search) ||
      (u.displayName ?? '').toLowerCase().includes(search)
    )
  }

  // Filter by plan
  if (planFilter && planFilter !== 'all') {
    merged = merged.filter((u) => u.plan === planFilter)
  }

  // Filter by activity
  if (activityFilter === 'active') {
    merged = merged.filter((u) => activeIn7d.has(u.id))
  } else if (activityFilter === 'inactive') {
    merged = merged.filter((u) => !activeIn30d.has(u.id))
  }

  // Sort
  switch (sortBy) {
    case 'oldest':
      merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'most_credits':
      merged.sort((a, b) => b.creditsBalance - a.creditsBalance)
      break
    case 'least_credits':
      merged.sort((a, b) => a.creditsBalance - b.creditsBalance)
      break
    case 'most_active':
      merged.sort((a, b) => b.messageCount - a.messageCount)
      break
    default: // newest
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const total = merged.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const pageUsers = merged.slice(offset, offset + limit)

  const users = pageUsers.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    createdAt: u.createdAt,
    lastSignIn: u.lastSignIn,
    isAdmin: u.isAdmin,
    plan: u.plan,
    creditsBalance: u.creditsBalance,
    creditsUsed: u.creditsUsed,
    freeQuestionsRemaining: u.freeQuestionsRemaining,
    messageCount: u.messageCount,
    totalConversations: u.totalConversations,
    lastActive: u.lastActive,
  }))

  return NextResponse.json({ users, total, page, limit, totalPages }, {
    headers: { "Cache-Control": "private, no-cache" },
  })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
