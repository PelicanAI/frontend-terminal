import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { id: conversationId } = await params
  const admin = getServiceClient()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '200')), 200)
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

  // Get total count
  const { count, error: countError } = await admin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)

  if (countError) {
    console.error('[Admin Convo Messages] count failed:', countError.message)
  }

  const { data: messages, error } = await admin
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[Admin Convo Messages] query failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  return NextResponse.json({
    messages: messages ?? [],
    total: count ?? 0,
  }, {
    headers: { "Cache-Control": "private, no-cache" },
  })
  } catch (error) {
    console.error('Admin conversation messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
