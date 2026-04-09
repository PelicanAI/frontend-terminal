import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const checkoutLimiter = createUserRateLimiter('stripe-checkout', 5, '1 h')

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(secretKey, { apiVersion: '2025-12-15.clover' })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { success } = await checkoutLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    let stripe: Stripe
    try {
      stripe = getStripeClient()
    } catch (error) {
      logger.error('Stripe checkout config error', error instanceof Error ? error : undefined)
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate price ID against allowlist from env vars
    const allowedPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID,
    ].filter(Boolean)

    if (!allowedPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // Derive plan name and credits server-side from priceId — never trust client-supplied values
    const PRICE_TO_PLAN: Record<string, string> = {
      [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!]: 'starter',
      [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!]: 'pro',
      [process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID!]: 'power',
    }
    const serverPlanName = PRICE_TO_PLAN[priceId]
    if (!serverPlanName) {
      return NextResponse.json(
        { error: 'Invalid price configuration' },
        { status: 400 }
      )
    }

    const PLAN_CREDITS: Record<string, number> = {
      [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!]: 1000,
      [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!]: 3500,
      [process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID!]: 10000,
    }
    const planCredits = PLAN_CREDITS[priceId]
    if (!planCredits) {
      return NextResponse.json(
        { error: 'Invalid price configuration' },
        { status: 400 }
      )
    }

    const userEmail = user.email

    let customerId: string | undefined
    
    if (userEmail) {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      })
      
      if (existingCustomers.data.length > 0 && existingCustomers.data[0]) {
        customerId = existingCustomers.data[0].id
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat?subscribed=true&plan=${serverPlanName}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: serverPlanName,
        credits: planCredits.toString()
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: serverPlanName,
          credits: planCredits.toString()
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Stripe Terms of Service consent collection
      consent_collection: {
        terms_of_service: 'required'
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: 'I agree to the [Terms of Service](https://pelican.ai/terms)'
        }
      }
    })

    return NextResponse.json({ url: session.url }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    logger.error('Stripe checkout error', error instanceof Error ? error : undefined)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : error.message },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

