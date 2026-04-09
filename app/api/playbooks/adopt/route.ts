import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const adoptLimiter = createUserRateLimiter('playbooks-adopt', 10, '1 m')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sourcePlaybookId = body?.sourcePlaybookId

    if (!sourcePlaybookId || typeof sourcePlaybookId !== 'string') {
      return NextResponse.json({ error: 'sourcePlaybookId is required' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sourcePlaybookId)) {
      return NextResponse.json({ error: 'Invalid playbook ID format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success: rateLimitOk } = await adoptLimiter.limit(user.id)
    if (!rateLimitOk) return rateLimitResponse()

    // Use the atomic adopt_template RPC to avoid race conditions
    // on adoption_count increment and duplicate adoption checks
    const { data, error: rpcError } = await supabase.rpc('adopt_template', {
      source_id: sourcePlaybookId,
    })

    if (rpcError) {
      // The RPC returns specific error messages for known cases
      const msg = rpcError.message || ''
      if (msg.includes('already adopted') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Already adopted' }, { status: 409 })
      }
      if (msg.includes('not found')) {
        return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
      }
      logger.error('adopt_template RPC error', undefined, { rpcError: rpcError.message })
      return NextResponse.json({ error: 'Failed to adopt strategy' }, { status: 500 })
    }

    return NextResponse.json({ success: true, playbook: data })
  } catch (err) {
    logger.error('Adopt strategy error', err instanceof Error ? err : undefined)
    return NextResponse.json({ error: 'Failed to adopt strategy' }, { status: 500 })
  }
}
