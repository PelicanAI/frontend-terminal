import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { computeTradeGrade } from "@/lib/grading/trade-grader"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const gradeLimiter = createUserRateLimiter('grade-trade', 10, '1 m')

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success: rateLimitOk } = await gradeLimiter.limit(user.id)
    if (!rateLimitOk) return rateLimitResponse()

    const body = await req.json()
    const tradeId = body?.trade_id
    if (!tradeId || typeof tradeId !== 'string') {
      return NextResponse.json({ error: 'trade_id required' }, { status: 400 })
    }

    // Fetch trade (verify ownership via user_id)
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single()

    if (tradeError || !trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (trade.status !== 'closed') {
      return NextResponse.json({ error: 'Trade must be closed' }, { status: 400 })
    }

    // Fetch survey + plan
    const { data: survey } = await supabase
      .from('trader_survey')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: plan } = await supabase
      .from('trading_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    // Compute grade
    const grade = computeTradeGrade(trade, survey, plan)

    // Save — merge with existing ai_grade to preserve pelican_scan_count etc.
    const existingGrade = (trade.ai_grade as Record<string, unknown>) || {}
    await supabase
      .from('trades')
      .update({
        ai_grade: { ...existingGrade, ...grade },
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)

    return NextResponse.json({ grade })
  } catch (err) {
    logger.error('Grade trade error', err instanceof Error ? err : undefined)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
