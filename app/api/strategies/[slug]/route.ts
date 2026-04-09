import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createIpRateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const limiter = createIpRateLimiter('strategies-slug', 30, '1 m')

const PUBLIC_COLUMNS = 'id, name, description, setup_type, timeframe, market_conditions, entry_rules, exit_rules, risk_rules, checklist, win_rate, total_trades, winning_trades, avg_r_multiple, avg_pnl_percent, is_active, market_type, is_curated, is_published, published_at, slug, category, difficulty, recommended_assets, best_when, avoid_when, author_display_name, adoption_count, community_rating, rating_count, stats_verified, stats_trade_count, has_backtest, created_at'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { success: rlOk } = await limiter.limit(getClientIp(request))
    if (!rlOk) return rateLimitResponse()

    const { slug } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('playbooks')
      .select(PUBLIC_COLUMNS)
      .eq('slug', slug)
      .eq('is_active', true)
      .or('is_published.eq.true,is_curated.eq.true')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('[strategies/slug] error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
