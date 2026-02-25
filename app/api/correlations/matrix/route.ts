import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

const correlationMatrixLimiter = createUserRateLimiter('correlation-matrix', 20, '1 m')

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await correlationMatrixLimiter.limit(user.id)
  if (!success) return rateLimitResponse()

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '30d'

  const [correlations, assets, regime] = await Promise.all([
    supabase
      .from('correlation_cache')
      .select('*')
      .eq('period', period)
      .order('asset_a'),
    supabase
      .from('correlation_assets')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('market_regimes')
      .select('*')
      .order('regime_date', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (correlations.error || assets.error) {
    return NextResponse.json(
      { error: correlations.error?.message || assets.error?.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    correlations: correlations.data || [],
    assets: assets.data || [],
    regime: regime.data || null,
    period,
  })
}
