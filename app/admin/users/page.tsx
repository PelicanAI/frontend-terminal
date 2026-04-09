export const dynamic = 'force-dynamic'

import { getServiceClient } from '@/lib/admin'
import { UsersTable } from '@/components/admin/UsersTable'
import { logger } from '@/lib/logger'

export default async function AdminUsersPage() {
  const admin = getServiceClient()
  const limit = 20

  // Get auth users for the first page
  let allUsers: { id: string; email?: string; created_at: string }[] = []
  try {
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (authError) logger.error('Admin listUsers failed', undefined, { message: authError.message })
    allUsers = (authData?.users ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (e) {
    logger.error('Failed to fetch auth users', e instanceof Error ? e : undefined)
  }

  const total = allUsers.length
  const pageUsers = allUsers.slice(0, limit)
  const totalPages = Math.ceil(total / limit)

  // Fetch credit info and message/conversation counts
  const userIds = pageUsers.map((u) => u.id)

  const [creditsResult, msgDataResult, convoDataResult, recentMsgResult] = await Promise.all([
    userIds.length > 0
      ? admin
          .from('user_credits')
          .select('user_id, credits_balance, plan_type, credits_used_this_month, free_questions_remaining, is_admin')
          .in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from('messages').select('user_id'),
    admin.from('conversations').select('user_id'),
    admin.from('messages').select('user_id, created_at').order('created_at', { ascending: false }),
  ])

  if (creditsResult.error) logger.error('Admin credits query failed', undefined, { message: creditsResult.error.message })

  const credits = creditsResult.data ?? []
  const creditMap = new Map(
    credits.map((c: Record<string, unknown>) => [c.user_id as string, c])
  )

  // Build message count and conversation count maps
  const userMsgCounts = new Map<string, number>()
  const userConvoCounts = new Map<string, number>()
  const userLastActive = new Map<string, string>()

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

  const users = pageUsers.map((u) => {
    const credit = creditMap.get(u.id) as Record<string, unknown> | undefined
    return {
      id: u.id,
      displayName: u.email ?? null,
      email: u.email ?? '',
      createdAt: u.created_at,
      isAdmin: ((credit)?.is_admin ?? false) as boolean,
      plan: ((credit)?.plan_type ?? 'none') as string,
      creditsBalance: ((credit)?.credits_balance ?? 0) as number,
      creditsUsed: ((credit)?.credits_used_this_month ?? 0) as number,
      freeQuestionsRemaining: ((credit)?.free_questions_remaining ?? 0) as number,
      messageCount: userMsgCounts.get(u.id) ?? 0,
      totalConversations: userConvoCounts.get(u.id) ?? 0,
      lastActive: userLastActive.get(u.id) ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <UsersTable
        initialData={{
          users,
          total,
          page: 1,
          limit,
          totalPages,
        }}
      />
    </div>
  )
}
