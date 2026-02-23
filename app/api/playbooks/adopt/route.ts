import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sourcePlaybookId = body?.sourcePlaybookId

    if (!sourcePlaybookId || typeof sourcePlaybookId !== 'string') {
      return NextResponse.json({ error: 'sourcePlaybookId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch source playbook — must be curated or published
    const { data: source, error: sourceError } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', sourcePlaybookId)
      .or('is_curated.eq.true,is_published.eq.true')
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    // Check if already adopted
    const { data: existing } = await supabase
      .from('playbooks')
      .select('id')
      .eq('user_id', user.id)
      .eq('forked_from', sourcePlaybookId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Already adopted', playbook_id: existing.id },
        { status: 409 }
      )
    }

    // Insert new playbook copying fields from source
    const { data: newPlaybook, error: insertError } = await supabase
      .from('playbooks')
      .insert({
        user_id: user.id,
        name: source.name,
        description: source.description,
        setup_type: source.setup_type,
        timeframe: source.timeframe,
        entry_rules: source.entry_rules,
        exit_rules: source.exit_rules,
        risk_rules: source.risk_rules,
        checklist: source.checklist,
        market_conditions: source.market_conditions,
        category: source.category,
        difficulty: source.difficulty,
        market_type: source.market_type,
        instruments: source.instruments,
        best_when: source.best_when,
        avoid_when: source.avoid_when,
        recommended_assets: source.recommended_assets,
        forked_from: source.id,
        fork_depth: (source.fork_depth || 0) + 1,
        is_curated: false,
        is_published: false,
        is_active: true,
        display_order: 0,
        total_trades: 0,
        winning_trades: 0,
        adoption_count: 0,
        community_rating: null,
        rating_count: 0,
      })
      .select()
      .single()

    if (insertError || !newPlaybook) {
      console.error('Failed to insert adopted playbook:', insertError)
      return NextResponse.json({ error: 'Failed to adopt strategy' }, { status: 500 })
    }

    // Record adoption in template_adoptions
    await supabase
      .from('template_adoptions')
      .insert({
        user_id: user.id,
        source_playbook_id: sourcePlaybookId,
        adopted_playbook_id: newPlaybook.id,
      })

    // Increment adoption_count on source
    await supabase
      .from('playbooks')
      .update({ adoption_count: (source.adoption_count || 0) + 1 })
      .eq('id', sourcePlaybookId)

    return NextResponse.json({ success: true, playbook: newPlaybook })
  } catch (err) {
    console.error('Adopt strategy error:', err)
    return NextResponse.json({ error: 'Failed to adopt strategy' }, { status: 500 })
  }
}
