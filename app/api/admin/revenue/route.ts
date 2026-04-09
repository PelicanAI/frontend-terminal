import { NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'
import { PLAN_PRICES, PLAN_CREDITS } from '@/lib/plans'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const admin = getServiceClient()

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [authUsersResult, creditsResult, recentMessagesResult] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from('user_credits').select('user_id, plan_type, credits_balance, credits_used_this_month, plan_credits_monthly, stripe_subscription_id, free_questions_remaining'),
      admin.from('messages').select('user_id, timestamp')
        .eq('role', 'user')
        .gte('timestamp', fourteenDaysAgo),
    ])

    const allUsers = authUsersResult.data?.users ?? []
    const credits = creditsResult.data ?? []
    const recentMessages = recentMessagesResult.data ?? []

    const emailMap = new Map<string, string>(allUsers.map((u) => [u.id, u.email ?? 'unknown']))

    // Last active per user
    const lastActiveMap = new Map<string, string>()
    for (const m of recentMessages) {
      const uid = m.user_id as string
      const ts = m.timestamp as string
      if (!lastActiveMap.has(uid) || ts > lastActiveMap.get(uid)!) {
        lastActiveMap.set(uid, ts)
      }
    }

    // Active user IDs in last 14 days
    const activeIn14d = new Set(recentMessages.map((m) => m.user_id as string))

    // MRR, paid users, plan distribution
    const planGroups = new Map<string, typeof credits>()
    let paidCount = 0
    let mrr = 0

    for (const c of credits) {
      const plan = (c.plan_type as string) ?? 'none'
      if (!planGroups.has(plan)) planGroups.set(plan, [])
      planGroups.get(plan)!.push(c)

      const price = PLAN_PRICES[plan] ?? 0
      if (c.stripe_subscription_id && price > 0) {
        paidCount++
        mrr += price
      }
    }

    const planDistribution = Array.from(planGroups.entries())
      .filter(([plan]) => plan !== 'none' && plan !== 'trial')
      .map(([plan, users]) => {
        const planMrr = users
          .filter((u) => u.stripe_subscription_id)
          .reduce((sum) => sum + (PLAN_PRICES[plan] ?? 0), 0)
        const totalCreditsUsed = users.reduce(
          (sum, u) => sum + ((u.credits_used_this_month as number) ?? 0), 0
        )
        const totalCreditsAvail = users.reduce(
          (sum, u) => sum + ((u.plan_credits_monthly as number) ?? PLAN_CREDITS[plan] ?? 0), 0
        )
        return {
          plan,
          count: users.length,
          mrr: planMrr,
          avgCreditsUsed: users.length > 0 ? Math.round(totalCreditsUsed / users.length) : 0,
          avgCreditsTotal: users.length > 0 ? Math.round(totalCreditsAvail / users.length) : 0,
          utilization: totalCreditsAvail > 0
            ? Math.round((totalCreditsUsed / totalCreditsAvail) * 100)
            : 0,
        }
      })

    const arr = mrr * 12
    const arpu = paidCount > 0 ? Math.round((mrr / paidCount) * 100) / 100 : 0

    // At-risk users
    const atRiskUsers: Array<{
      email: string
      plan: string
      reason: string
      lastActive?: string
      creditsBalance?: number
      utilization?: number
    }> = []

    for (const c of credits) {
      const plan = (c.plan_type as string) ?? 'none'
      const price = PLAN_PRICES[plan] ?? 0
      const uid = c.user_id as string
      const email = emailMap.get(uid) ?? 'unknown'
      const balance = (c.credits_balance as number) ?? 0
      const used = (c.credits_used_this_month as number) ?? 0
      const total = (c.plan_credits_monthly as number) ?? PLAN_CREDITS[plan] ?? 0

      // Inactive 14d — paid user with no messages in 14 days
      if (price > 0 && c.stripe_subscription_id && !activeIn14d.has(uid)) {
        atRiskUsers.push({
          email,
          plan,
          reason: 'inactive_14d',
          lastActive: lastActiveMap.get(uid) ?? undefined,
        })
      }

      // Credit depleted — zero balance, no subscription
      if (balance <= 0 && !c.stripe_subscription_id && plan === 'none') {
        const freeRemaining = (c.free_questions_remaining as number) ?? 0
        if (freeRemaining <= 0) {
          atRiskUsers.push({ email, plan, reason: 'credit_depleted', creditsBalance: balance })
        }
      }

      // Low utilization — paid, using < 20% of plan credits
      if (price > 0 && c.stripe_subscription_id && total > 0) {
        const util = Math.round((used / total) * 100)
        if (util < 20) {
          atRiskUsers.push({ email, plan, reason: 'low_utilization', utilization: util })
        }
      }
    }

    // Conversion funnel
    const signedUp = allUsers.length
    // For full funnel, query all-time message senders
    const { data: allMsgUsers } = await admin
      .from('messages')
      .select('user_id')
      .eq('role', 'user')
    const allSenders = new Set((allMsgUsers ?? []).map((m) => m.user_id as string))

    const usedFreeQs = credits.filter((c) => {
      const freeRemaining = (c.free_questions_remaining as number) ?? 10
      return freeRemaining < 10 || allSenders.has(c.user_id as string)
    }).length

    const hitLimit = credits.filter((c) => {
      const freeRemaining = (c.free_questions_remaining as number) ?? 10
      const balance = (c.credits_balance as number) ?? 0
      return freeRemaining <= 0 || balance <= 0
    }).length

    const convertedPaid = paidCount

    return NextResponse.json(
      {
        mrr,
        arr,
        arpu,
        paidUsers: paidCount,
        planDistribution,
        atRiskUsers: atRiskUsers.slice(0, 50),
        conversionFunnel: {
          signedUp,
          usedFreeQs,
          hitLimit,
          convertedPaid,
        },
      },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    logger.error('Admin revenue error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
