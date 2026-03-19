import { NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const QUERY_PATTERNS: Array<{ type: string; patterns: RegExp }> = [
  { type: 'Price Check', patterns: /\b(price|what'?s?\s+(at|trading)|how much|quote|current)\b/i },
  { type: 'Backtest', patterns: /\b(backtest|historical|back\s*test)\b/i },
  { type: 'Technical Analysis', patterns: /\b(support|resistance|technical|rsi|macd|moving average|ema|sma|fibonacci|bollinger|volume|chart|candle)\b/i },
  { type: 'Earnings', patterns: /\b(earnings|eps|revenue|report|guidance|quarter|fiscal)\b/i },
  { type: 'Opinion/Coaching', patterns: /\b(should i|would you|recommend|opinion|what do you think|advice)\b/i },
  { type: 'Educational', patterns: /\b(explain|what is|what are|how does|how do|teach|learn|definition)\b/i },
  { type: 'Screener', patterns: /\b(scan|screen|filter|show me stocks|find stocks|top stocks)\b/i },
  { type: 'Portfolio Review', patterns: /\b(portfolio|position|risk|exposure|allocation|diversif)\b/i },
]

function classifyQuery(content: string): string {
  for (const { type, patterns } of QUERY_PATTERNS) {
    if (patterns.test(content)) return type
  }
  return 'General'
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const admin = getServiceClient()

    const [
      authUsersResult,
      recentMessagesResult,
      popularTickersResult,
      longestConvosResult,
      flaggedContentResult,
      fallbackMessagesResult,
    ] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      // Last 500 user messages for classification
      admin.from('messages').select('content')
        .eq('role', 'user')
        .order('timestamp', { ascending: false })
        .limit(500),
      // Popular tickers via RPC
      admin.rpc('get_popular_tickers'),
      // Longest conversations
      admin.from('conversations')
        .select('id, user_id, title, message_count, created_at')
        .order('message_count', { ascending: false })
        .limit(10),
      // Flagged content — user messages with correction keywords
      admin.from('messages')
        .select('id, conversation_id, content, user_id, timestamp')
        .eq('role', 'user')
        .or('content.ilike.%wrong%,content.ilike.%incorrect%,content.ilike.%not right%,content.ilike.%you\'re wrong%')
        .order('timestamp', { ascending: false })
        .limit(20),
      // Fallback-used assistant messages
      admin.from('messages')
        .select('id, conversation_id, content, user_id, timestamp')
        .eq('role', 'assistant')
        .eq('metadata->>fallback_used', 'true')
        .order('timestamp', { ascending: false })
        .limit(10),
    ])

    const emailMap = new Map(
      (authUsersResult.data?.users ?? []).map((u) => [u.id, u.email ?? 'unknown'])
    )

    // Query classification
    const messages = (recentMessagesResult.data ?? []) as Array<{ content: string }>
    const classificationCounts = new Map<string, number>()

    for (const m of messages) {
      if (!m.content) continue
      const type = classifyQuery(m.content)
      classificationCounts.set(type, (classificationCounts.get(type) ?? 0) + 1)
    }

    const totalClassified = messages.length
    const queryClassification = Array.from(classificationCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Top tickers
    const topTickers = (popularTickersResult.data ?? []) as Array<{
      ticker: string
      mention_count: number
    }>

    // Longest conversations with email
    const longestConversations = ((longestConvosResult.data ?? []) as Array<{
      id: string
      user_id: string
      title: string | null
      message_count: number
      created_at: string
    }>).map((c) => ({
      id: c.id,
      title: c.title ?? 'Untitled',
      email: emailMap.get(c.user_id) ?? 'unknown',
      messageCount: c.message_count,
      createdAt: c.created_at,
    }))

    // Flagged content — combine user corrections and fallback messages
    type FlaggedMsg = {
      id: string
      conversation_id: string
      content: string
      user_id: string
      timestamp: string
    }

    const flaggedContent = [
      ...((flaggedContentResult.data ?? []) as FlaggedMsg[]).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        content: m.content?.slice(0, 200) ?? '',
        reason: 'user_correction' as const,
        email: emailMap.get(m.user_id) ?? 'unknown',
        timestamp: m.timestamp,
      })),
      ...((fallbackMessagesResult.data ?? []) as FlaggedMsg[]).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        content: m.content?.slice(0, 200) ?? '',
        reason: 'fallback_used' as const,
        email: emailMap.get(m.user_id) ?? 'unknown',
        timestamp: m.timestamp,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30)

    return NextResponse.json(
      { queryClassification, topTickers, longestConversations, flaggedContent },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('Admin content error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
