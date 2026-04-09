import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createIpRateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const limiter = createIpRateLimiter('strategies', 30, '1 m')

const PUBLIC_COLUMNS = 'id, name, description, setup_type, timeframe, market_conditions, entry_rules, exit_rules, risk_rules, checklist, win_rate, total_trades, winning_trades, avg_r_multiple, avg_pnl_percent, is_active, market_type, is_curated, is_published, published_at, slug, category, difficulty, recommended_assets, best_when, avoid_when, author_display_name, adoption_count, community_rating, rating_count, stats_verified, stats_trade_count, has_backtest, created_at'

const ALLOWED_SORTS = ['popular', 'rating', 'newest'] as const

function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\./g, '\\.')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

export async function GET(request: Request) {
  try {
    const { success: rlOk } = await limiter.limit(getClientIp(request))
    if (!rlOk) return rateLimitResponse()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const sortParam = searchParams.get('sort') || 'popular'
    const sort = ALLOWED_SORTS.includes(sortParam as typeof ALLOWED_SORTS[number])
      ? sortParam
      : 'popular'

    const supabase = await createClient()

    let query = supabase
      .from('playbooks')
      .select(PUBLIC_COLUMNS)
      .eq('is_active', true)
      .or('is_published.eq.true,is_curated.eq.true')

    if (source === 'curated') query = query.eq('is_curated', true)
    else if (source === 'community') query = query.eq('is_curated', false).eq('is_published', true)

    if (category && category !== 'all') query = query.eq('category', category)
    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)
    if (search) {
      const sanitized = sanitizePostgrestSearch(search.trim())
      query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
    }

    switch (sort) {
      case 'popular':
        query = query.order('is_curated', { ascending: false }).order('adoption_count', { ascending: false })
        break
      case 'rating':
        query = query.order('community_rating', { ascending: false, nullsFirst: false })
        break
      case 'newest':
        query = query.order('published_at', { ascending: false, nullsFirst: false })
        break
    }

    const { data, error } = await query
    if (error) {
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message
      return NextResponse.json({ error: message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error) {
    logger.error('[strategies] error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
