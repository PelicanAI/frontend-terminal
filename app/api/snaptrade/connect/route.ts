import { NextResponse } from 'next/server'
import { Snaptrade } from 'snaptrade-typescript-sdk'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/admin'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const connectLimiter = createUserRateLimiter('snaptrade-connect', 10, '1 h')

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

    const { success } = await connectLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Look up SnapTrade credentials
    const serviceClient = getServiceClient()
    const { data: connection, error: lookupError } = await serviceClient
      .from('broker_connections')
      .select('snaptrade_user_id, snaptrade_user_secret')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (lookupError || !connection) {
      return NextResponse.json(
        { error: 'No SnapTrade registration found. Please register first.' },
        { status: 404 }
      )
    }

    // Generate login link
    const snaptrade = getSnapTradeClient()
    const response = await snaptrade.authentication.loginSnapTradeUser({
      userId: connection.snaptrade_user_id,
      userSecret: connection.snaptrade_user_secret,
    })

    const data = response.data as { redirectURI?: string }
    const redirectURI = data.redirectURI

    if (!redirectURI) {
      return NextResponse.json({ error: 'No redirect URI returned from broker' }, { status: 502 })
    }

    return NextResponse.json({ redirectURI }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('SnapTrade connect error:', error)
    return NextResponse.json({ error: 'Failed to generate broker login link' }, { status: 500 })
  }
}
