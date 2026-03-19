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
    const reason = body?.reason

    // Validate amount
    if (typeof amount !== 'number' || amount === 0 || amount < -99999 || amount > 99999) {
      return NextResponse.json(
        { error: 'amount must be a non-zero number between -99999 and 99999' },
        { status: 400 }
      )
    }

    // Validate reason
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason must be a non-empty string' },
        { status: 400 }
      )
    }

    const admin = getServiceClient()

    // Get current balance
    const { data: current, error: fetchErr } = await admin
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', userId)
      .single()

    if (fetchErr || !current) {
      console.error('[Admin Credits] Failed to fetch user credits:', fetchErr?.message)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const newBalance = (current.credits_balance ?? 0) + amount

    // Update balance and log transaction in parallel
    const [updateResult, logResult] = await Promise.all([
      admin
        .from('user_credits')
        .update({ credits_balance: newBalance })
        .eq('user_id', userId),
      admin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount,
          balance_after: newBalance,
          transaction_type: 'admin_adjustment',
          description: reason.trim(),
        }),
    ])

    if (updateResult.error) {
      console.error('[Admin Credits] Failed to update credits:', updateResult.error.message)
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
    }

    if (logResult.error) {
      // Non-fatal: log but don't fail the request
      console.error('[Admin Credits] Failed to log transaction:', logResult.error.message)
    }

    return NextResponse.json(
      { success: true, newBalance },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('Admin credits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
