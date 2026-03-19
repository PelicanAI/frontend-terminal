import { NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'
import { PLAN_PRICES } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const admin = getServiceClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayStartStr = new Date(
      yesterdayStart.getFullYear(),
      yesterdayStart.getMonth(),
      yesterdayStart.getDate()
    ).toISOString()

    const [
      authUsersResult,
      creditsResult,
      active7dResult,
      active7dPrevResult,
      active30dResult,
      active30dPrevResult,
      messagesTodayResult,
      messagesYesterdayResult,
    ] = await Promise.all([
      // Total users
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      // Credits data for MRR + credits used
      admin.from('user_credits').select('user_id, plan_type, credits_used_this_month, stripe_subscription_id'),
      // Active 7d (current)
      admin.from('messages').select('user_id', { count: 'exact', head: false })
        .gte('timestamp', sevenDaysAgo)
        .eq('role', 'user'),
      // Active 7d (previous period)
      admin.from('messages').select('user_id', { count: 'exact', head: false })
        .gte('timestamp', fourteenDaysAgo)
        .lt('timestamp', sevenDaysAgo)
        .eq('role', 'user'),
      // Active 30d (current)
      admin.from('messages').select('user_id', { count: 'exact', head: false })
        .gte('timestamp', thirtyDaysAgo)
        .eq('role', 'user'),
      // Active 30d (previous period)
      admin.from('messages').select('user_id', { count: 'exact', head: false })
        .gte('timestamp', sixtyDaysAgo)
        .lt('timestamp', thirtyDaysAgo)
        .eq('role', 'user'),
      // Messages today
      admin.from('messages').select('id', { count: 'exact', head: true })
        .gte('timestamp', todayStart)
        .eq('role', 'user'),
      // Messages yesterday
      admin.from('messages').select('id', { count: 'exact', head: true })
        .gte('timestamp', yesterdayStartStr)
        .lt('timestamp', todayStart)
        .eq('role', 'user'),
    ])

    // Total users + delta
    const allUsers = authUsersResult.data?.users ?? []
    const totalUsers = allUsers.length
    const oneWeekAgo = new Date(sevenDaysAgo)
    const newUsersThisWeek = allUsers.filter(
      (u) => new Date(u.created_at) >= oneWeekAgo
    ).length
    const twoWeeksAgo = new Date(fourteenDaysAgo)
    // Previous week signups (for future delta comparison)
    const _newUsersPrevWeek = allUsers.filter(
      (u) => new Date(u.created_at) >= twoWeeksAgo && new Date(u.created_at) < oneWeekAgo
    ).length
    void _newUsersPrevWeek

    // Active 7d
    const active7dUsers = new Set((active7dResult.data ?? []).map((m) => m.user_id))
    const active7d = active7dUsers.size
    const active7dPrevUsers = new Set((active7dPrevResult.data ?? []).map((m) => m.user_id))
    const active7dPrev = active7dPrevUsers.size
    const active7dDelta = active7d - active7dPrev

    // Active 30d
    const active30dUsers = new Set((active30dResult.data ?? []).map((m) => m.user_id))
    const active30d = active30dUsers.size
    const active30dPrevUsers = new Set((active30dPrevResult.data ?? []).map((m) => m.user_id))
    const active30dPrev = active30dPrevUsers.size
    const active30dDelta = active30d - active30dPrev

    // MRR
    const credits = creditsResult.data ?? []
    const paidUsers = credits.filter(
      (c) => c.stripe_subscription_id && c.plan_type && PLAN_PRICES[c.plan_type]
    )
    const mrr = paidUsers.reduce((sum, c) => sum + (PLAN_PRICES[c.plan_type] ?? 0), 0)

    // Credits used this month
    const creditsUsed = credits.reduce(
      (sum, c) => sum + ((c.credits_used_this_month as number) ?? 0),
      0
    )

    // Messages today
    const messagesToday = messagesTodayResult.count ?? 0
    const messagesYesterday = messagesYesterdayResult.count ?? 0
    const messagesTodayDelta = messagesToday - messagesYesterday

    // Recent signups (last 10)
    const recentSignups = allUsers
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((u) => {
        const credit = credits.find((c) => c.user_id === u.id)
        return {
          email: u.email ?? 'unknown',
          plan: (credit?.plan_type as string) ?? 'none',
          createdAt: u.created_at,
        }
      })

    // Alerts
    const zeroCreditUsers = credits.filter(
      (c) => ((c.credits_used_this_month as number) ?? 0) > 0 &&
        !c.stripe_subscription_id
    ).length
    const nearLimitUsers = credits.filter((c) => {
      const balance = (c as Record<string, unknown>).credits_balance as number | undefined
      return balance !== undefined && balance > 0 && balance <= 50
    }).length
    const newPaidThisWeek = paidUsers.filter((c) => {
      const user = allUsers.find((u) => u.id === c.user_id)
      return user && new Date(user.created_at) >= oneWeekAgo
    }).length

    const calcPercent = (delta: number, prev: number) =>
      prev === 0 ? (delta > 0 ? 100 : 0) : Math.round((delta / prev) * 1000) / 10

    return NextResponse.json(
      {
        totalUsers: {
          value: totalUsers,
          delta: newUsersThisWeek,
          deltaPercent: calcPercent(newUsersThisWeek, totalUsers - newUsersThisWeek),
        },
        active7d: {
          value: active7d,
          delta: active7dDelta,
          deltaPercent: calcPercent(active7dDelta, active7dPrev),
        },
        active30d: {
          value: active30d,
          delta: active30dDelta,
          deltaPercent: calcPercent(active30dDelta, active30dPrev),
        },
        mrr: {
          value: mrr,
          delta: 0,
          deltaPercent: 0,
        },
        creditsUsed: { value: creditsUsed },
        messagesToday: {
          value: messagesToday,
          delta: messagesTodayDelta,
          deltaPercent: calcPercent(messagesTodayDelta, messagesYesterday),
        },
        recentSignups,
        alerts: {
          zeroCreditUsers,
          nearLimitUsers,
          newPaidThisWeek,
        },
      },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
