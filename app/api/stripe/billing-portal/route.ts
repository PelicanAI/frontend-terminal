import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const billingPortalLimiter = createUserRateLimiter('billing-portal', 5, '1 m')

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
      logger.error('Billing portal config error', error instanceof Error ? error : undefined)
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

    const { success: rateLimitOk } = await billingPortalLimiter.limit(user.id)
    if (!rateLimitOk) return rateLimitResponse()

    const { data: userCredits, error: dbError } = await supabase
      .from('user_credits')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (dbError || !userCredits?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userCredits.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`
    })

    return NextResponse.json({ url: session.url }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    logger.error('Billing portal error', error instanceof Error ? error : undefined)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : error.message },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
