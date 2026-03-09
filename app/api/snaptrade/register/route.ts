import { NextResponse } from 'next/server'
import { Snaptrade } from 'snaptrade-typescript-sdk'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/admin'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const registerLimiter = createUserRateLimiter('snaptrade-register', 5, '1 h')

function getSnapTradeClient() {
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY
  const clientId = process.env.SNAPTRADE_CLIENT_ID
  if (!consumerKey || !clientId) {
    throw new Error('Missing SNAPTRADE_CONSUMER_KEY or SNAPTRADE_CLIENT_ID')
  }
  return new Snaptrade({ consumerKey, clientId })
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success } = await registerLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Check if user already has a SnapTrade registration
    const serviceClient = getServiceClient()
    const { data: existing } = await serviceClient
      .from('broker_connections')
      .select('id, snaptrade_user_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json({ registered: true, connectionId: existing.id }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Register new SnapTrade user
    const snaptrade = getSnapTradeClient()
    const response = await snaptrade.authentication.registerSnapTradeUser({
      userId: user.id,
    })

    const snaptradeUserId = response.data.userId
    const userSecret = response.data.userSecret

    if (!snaptradeUserId || !userSecret) {
      console.error('SnapTrade registration returned incomplete data')
      return NextResponse.json({ error: 'Broker registration failed' }, { status: 502 })
    }

    // Store credentials using service client (bypass RLS for the insert since
    // we're in a server context and we've already verified the user)
    const { data: connection, error: insertError } = await serviceClient
      .from('broker_connections')
      .insert({
        user_id: user.id,
        snaptrade_user_id: snaptradeUserId,
        snaptrade_user_secret: userSecret,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to store SnapTrade credentials:', insertError)
      return NextResponse.json({ error: 'Failed to save broker connection' }, { status: 500 })
    }

    return NextResponse.json({ registered: true, connectionId: connection.id }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('SnapTrade register error:', error)
    return NextResponse.json({ error: 'Failed to register with broker service' }, { status: 500 })
  }
}
