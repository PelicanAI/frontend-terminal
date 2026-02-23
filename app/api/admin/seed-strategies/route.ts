import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CURATED_STRATEGIES } from '@/lib/data/curated-strategies'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existing } = await supabase
    .from('playbooks')
    .select('slug')
    .eq('is_curated', true)

  const existingSlugs = new Set((existing || []).map((e: { slug: string }) => e.slug))

  const toInsert = CURATED_STRATEGIES
    .filter(s => !existingSlugs.has(s.slug))
    .map(s => ({
      user_id: '00000000-0000-0000-0000-000000000000',
      name: s.name,
      slug: s.slug,
      description: s.description,
      setup_type: s.setup_type,
      category: s.category,
      difficulty: s.difficulty,
      timeframe: s.timeframe,
      market_conditions: s.market_conditions,
      entry_rules: s.entry_rules,
      exit_rules: s.exit_rules,
      risk_rules: s.risk_rules,
      checklist: s.checklist,
      recommended_assets: s.recommended_assets,
      best_when: s.best_when,
      avoid_when: s.avoid_when,
      market_type: s.market_type,
      is_curated: true,
      is_published: false,
      is_active: true,
      author_display_name: 'Pelican Team',
      adoption_count: 0,
      community_rating: null,
      rating_count: 0,
    }))

  if (toInsert.length === 0) {
    return NextResponse.json({ message: 'All curated strategies already exist', count: 0 })
  }

  const { data: adminUser } = await supabase
    .from('user_credits')
    .select('user_id')
    .eq('is_admin', true)
    .limit(1)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'No admin user found' }, { status: 500 })
  }

  const rows = toInsert.map(r => ({ ...r, user_id: adminUser.user_id }))

  const { data, error } = await supabase
    .from('playbooks')
    .insert(rows)
    .select('id, slug')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Seeded ${data.length} strategies`,
    count: data.length,
    strategies: data,
  })
}
