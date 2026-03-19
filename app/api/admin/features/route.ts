import { NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const admin = getServiceClient()

    const [authUsersResult, creditsResult, featureAdoptionResult, chatUsersResult] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from('user_credits').select('user_id, plan_type'),
      admin.rpc('get_feature_adoption'),
      admin.from('messages').select('user_id').eq('role', 'user'),
    ])

    const totalUsers = authUsersResult.data?.users?.length ?? 0
    const credits = creditsResult.data ?? []

    // Feature adoption from RPC
    const featureData = (featureAdoptionResult.data ?? []) as Array<{
      feature: string
      user_count: number
      total_count: number
    }>

    const features = featureData.map((f) => ({
      feature: f.feature,
      userCount: f.user_count,
      totalCount: f.total_count,
      adoptionRate: totalUsers > 0
        ? Math.round((f.user_count / totalUsers) * 1000) / 10
        : 0,
    }))

    // Ensure all expected features are present
    const expectedFeatures = ['chat', 'trades', 'daily_journal', 'playbooks', 'watchlist']
    for (const name of expectedFeatures) {
      if (!features.find((f) => f.feature === name)) {
        features.push({ feature: name, userCount: 0, totalCount: 0, adoptionRate: 0 })
      }
    }

    // Chat user count from messages
    const chatSenders = new Set<string>((chatUsersResult.data ?? []).map((m) => m.user_id as string))

    // Funnel
    const funnel = {
      signedUp: totalUsers,
      sentFirstMessage: chatSenders.size,
      loggedTrade: featureData.find((f) => f.feature === 'trades')?.user_count ?? 0,
      builtPlaybook: featureData.find((f) => f.feature === 'playbooks')?.user_count ?? 0,
      dailyJournal: featureData.find((f) => f.feature === 'daily_journal')?.user_count ?? 0,
    }

    // Feature by plan: for each plan, calculate % of users who used each feature
    const planUserMap = new Map<string, string[]>()
    for (const c of credits) {
      const plan = (c.plan_type as string) ?? 'none'
      if (!planUserMap.has(plan)) planUserMap.set(plan, [])
      planUserMap.get(plan)!.push(c.user_id as string)
    }

    // Get per-feature user sets
    const [tradesResult, journalResult, playbooksResult, watchlistResult] = await Promise.all([
      admin.from('trades').select('user_id'),
      admin.from('daily_journal').select('user_id'),
      admin.from('playbooks').select('user_id'),
      admin.from('watchlist').select('user_id'),
    ])

    const featureUserSets: Record<string, Set<string>> = {
      chat: chatSenders,
      trades: new Set((tradesResult.data ?? []).map((r) => r.user_id as string)),
      journal: new Set((journalResult.data ?? []).map((r) => r.user_id as string)),
      playbooks: new Set((playbooksResult.data ?? []).map((r) => r.user_id as string)),
      watchlist: new Set((watchlistResult.data ?? []).map((r) => r.user_id as string)),
    }

    const featureByPlan = Array.from(planUserMap.entries()).map(([plan, userIds]) => {
      const count = userIds.length
      const calcPercent = (featureSet: Set<string>) => {
        if (count === 0) return 0
        let overlap = 0
        for (const uid of userIds) {
          if (featureSet.has(uid)) overlap++
        }
        return Math.round((overlap / count) * 100)
      }

      const empty = new Set<string>()
      return {
        plan,
        chat: calcPercent(featureUserSets.chat ?? empty),
        trades: calcPercent(featureUserSets.trades ?? empty),
        journal: calcPercent(featureUserSets.journal ?? empty),
        playbooks: calcPercent(featureUserSets.playbooks ?? empty),
        watchlist: calcPercent(featureUserSets.watchlist ?? empty),
      }
    })

    return NextResponse.json(
      { totalUsers, features, funnel, featureByPlan },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('Admin features error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
