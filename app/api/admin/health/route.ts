import { NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const admin = getServiceClient()

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [
      messagesCount, conversationsCount, tradesCount,
      userCreditsCount, dailyJournalCount, playbooksCount, watchlistCount,
      fallbackResult, avgLengthResult, monthlyMessagesResult,
    ] = await Promise.all([
      admin.from('messages').select('id', { count: 'exact', head: true }),
      admin.from('conversations').select('id', { count: 'exact', head: true }),
      admin.from('trades').select('id', { count: 'exact', head: true }),
      admin.from('user_credits').select('user_id', { count: 'exact', head: true }),
      admin.from('daily_journal').select('id', { count: 'exact', head: true }),
      admin.from('playbooks').select('id', { count: 'exact', head: true }),
      admin.from('watchlist').select('id', { count: 'exact', head: true }),
      // Fallback messages
      admin.from('messages').select('id', { count: 'exact', head: true })
        .eq('metadata->>fallback_used', 'true'),
      // Average message length
      admin.from('messages').select('content')
        .eq('role', 'user')
        .limit(1000)
        .order('timestamp', { ascending: false }),
      // Messages this month
      admin.from('messages').select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('timestamp', monthStart.toISOString()),
    ])

    // Database status
    const tables = [
      { table_name: 'messages', row_count: messagesCount.count ?? 0 },
      { table_name: 'conversations', row_count: conversationsCount.count ?? 0 },
      { table_name: 'trades', row_count: tradesCount.count ?? 0 },
      { table_name: 'user_credits', row_count: userCreditsCount.count ?? 0 },
      { table_name: 'daily_journal', row_count: dailyJournalCount.count ?? 0 },
      { table_name: 'playbooks', row_count: playbooksCount.count ?? 0 },
      { table_name: 'watchlist', row_count: watchlistCount.count ?? 0 },
    ].sort((a, b) => b.row_count - a.row_count)
    const dbStatus = 'online'

    // Fallback count
    const fallbackMessages = fallbackResult.count ?? 0

    // Average message length
    const messageContents = (avgLengthResult.data ?? []) as Array<{ content: string }>
    const avgMessageLength = messageContents.length > 0
      ? Math.round(
          messageContents.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) /
            messageContents.length
        )
      : 0

    // Estimated API cost
    const messagesThisMonth = monthlyMessagesResult.count ?? 0
    const estimatedCost = Math.round(messagesThisMonth * 0.02 * 100) / 100

    return NextResponse.json(
      {
        database: { status: dbStatus, tables },
        fallbackMessages,
        avgMessageLength,
        estimatedApiCost: {
          messagesThisMonth,
          estimatedCost,
        },
      },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('Admin health error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
