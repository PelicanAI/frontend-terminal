import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { id: userId } = await params
  const body = await req.json().catch(() => null)
  const amount = body?.amount

  if (typeof amount !== 'number' || amount <= 0 || amount >= 10000) {
    return NextResponse.json(
      { error: 'amount must be a number between 1 and 9999' },
      { status: 400 }
    )
  }

  const admin = getServiceClient()

  // TODO: This read-then-write has a race condition. Replace with an atomic RPC:
  // CREATE OR REPLACE FUNCTION grant_credits(p_user_id uuid, p_amount integer)
  // RETURNS integer AS $$ UPDATE user_credits SET credits_balance = credits_balance + p_amount
  // WHERE user_id = p_user_id RETURNING credits_balance; $$ LANGUAGE sql SECURITY DEFINER;

  // Get current balance
  const { data: current, error: fetchErr } = await admin
    .from('user_credits')
    .select('credits_balance')
    .eq('user_id', userId)
    .single()

  if (fetchErr || !current) {
    console.error('[Admin Grant Credits] Failed to fetch user credits:', fetchErr?.message)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const newBalance = (current.credits_balance ?? 0) + amount

  const { error: updateErr } = await admin
    .from('user_credits')
    .update({ credits_balance: newBalance })
    .eq('user_id', userId)

  if (updateErr) {
    console.error('[Admin Grant Credits] Failed to update credits:', updateErr.message)
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
  }

  return NextResponse.json({ credits_balance: newBalance })
  } catch (error) {
    console.error('Admin grant credits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
