import { NextRequest, NextResponse } from 'next/server'
import { Snaptrade } from 'snaptrade-typescript-sdk'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/admin'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const connectionsLimiter = createUserRateLimiter('snaptrade-connections', 30, '1 h')

function getSnapTradeClient() {
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY
  const clientId = process.env.SNAPTRADE_CLIENT_ID
  if (!consumerKey || !clientId) {
    throw new Error('Missing SNAPTRADE_CONSUMER_KEY or SNAPTRADE_CLIENT_ID')
  }
  return new Snaptrade({ consumerKey, clientId })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success } = await connectionsLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Fetch connections via RLS (user can only see their own)
    const { data: connections, error } = await supabase
      .from('broker_connections')
      .select('id, brokerage_authorization_id, brokerage_name, status, last_synced_at, connected_at')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch broker connections:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    return NextResponse.json({ connections: connections ?? [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('SnapTrade connections GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success } = await connectionsLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const { authorizationId } = await request.json()
    if (!authorizationId) {
      return NextResponse.json({ error: 'Missing authorizationId' }, { status: 400 })
    }

    // Activate the pending connection row for this user
    const serviceClient = getServiceClient()
    const { error: updateError } = await serviceClient
      .from('broker_connections')
      .update({
        brokerage_authorization_id: authorizationId,
        status: 'active',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .is('brokerage_authorization_id', null)

    if (updateError) {
      console.error('Failed to activate broker connection:', updateError)
      return NextResponse.json({ error: 'Failed to activate connection' }, { status: 500 })
    }

    return NextResponse.json({ activated: true }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('SnapTrade connections PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success } = await connectionsLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const { connectionId } = await request.json()
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Look up the connection and its SnapTrade credentials
    const serviceClient = getServiceClient()
    const { data: connection, error: lookupError } = await serviceClient
      .from('broker_connections')
      .select('snaptrade_user_id, snaptrade_user_secret, brokerage_authorization_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (lookupError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Disconnect from SnapTrade if there's an authorization
    if (connection.brokerage_authorization_id) {
      try {
        const snaptrade = getSnapTradeClient()
        await snaptrade.connections.removeBrokerageAuthorization({
          userId: connection.snaptrade_user_id,
          userSecret: connection.snaptrade_user_secret,
          authorizationId: connection.brokerage_authorization_id,
        })
      } catch (snapError) {
        console.error('SnapTrade disconnect error (continuing):', snapError)
        // Continue — mark as disabled even if SnapTrade call fails
      }
    }

    // Update status to disabled
    const { error: updateError } = await serviceClient
      .from('broker_connections')
      .update({ status: 'disabled', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update connection status:', updateError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ disconnected: true }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('SnapTrade connections DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
