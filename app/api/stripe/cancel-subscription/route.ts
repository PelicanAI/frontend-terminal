import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/admin'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const cancelSubLimiter = createUserRateLimiter('cancel-subscription', 3, '5 m')

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(secretKey, { apiVersion: '2025-12-15.clover' })
}

export async function POST() {
  try {
    let stripe: Stripe
    try {
      stripe = getStripeClient()
    } catch (error) {
      console.error('Stripe config error:', error)
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { success: rateLimitOk } = await cancelSubLimiter.limit(user.id)
    if (!rateLimitOk) return rateLimitResponse()

    // Get user's stripe subscription ID from Supabase
    const { data: userCredits, error: dbError } = await supabase
      .from('user_credits')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (dbError || !userCredits?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Cancel the subscription in Stripe
    const subscription = await stripe.subscriptions.cancel(
      userCredits.stripe_subscription_id
    )

    // Update database immediately (don't wait for webhook as belt-and-suspenders)
    const supabaseAdmin = getServiceClient()
    const { error: rpcError } = await supabaseAdmin.rpc('cancel_subscription', {
      p_user_id: user.id
    })

    if (rpcError) {
      console.error('Failed to update database after Stripe cancellation:', rpcError)
      // Don't return error - Stripe cancelled successfully, webhook will retry DB update
    }

    return NextResponse.json({
      success: true,
      status: subscription.status,
      message: 'Subscription cancelled successfully'
    }, {
      headers: { "Cache-Control": "no-store" },
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: process.env.NODE_ENV === 'production' ? 'Failed to cancel subscription' : error.message },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
