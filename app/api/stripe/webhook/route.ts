import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServiceClient } from '@/lib/admin'

const PLAN_CREDITS: Record<string, number> = {
  base: 1000,
  pro: 3500,
  power: 10000
}

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(secretKey, { apiVersion: '2025-12-15.clover' })
}

export async function POST(request: NextRequest) {
  let stripe: Stripe
  try {
    stripe = getStripeClient()
  } catch (error) {
    console.error('Stripe webhook config error:', error)
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    const supabaseAdmin = getServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const userId = session.client_reference_id || session.metadata?.user_id
          const planName = session.metadata?.plan
          const credits = session.metadata?.credits 
            ? parseInt(session.metadata.credits) 
            : PLAN_CREDITS[planName || 'base']

          if (!userId) {
            console.error('No user_id in checkout session')
            break
          }

          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          const { error } = await supabaseAdmin.rpc('setup_subscriber', {
            p_user_id: userId,
            p_plan_type: planName || 'base',
            p_credits: credits,
            p_stripe_customer_id: session.customer as string,
            p_stripe_subscription_id: subscription.id
          })

          if (error) {
            console.error('Failed to setup subscriber:', error)
            throw error
          }

          // Activate referral bonus if this user was referred
          const planAmount = planName === 'power' ? 249 : planName === 'pro' ? 99 : 29;
          const { error: referralError } = await supabaseAdmin.rpc('activate_referral_bonus', {
            p_user_id: userId,
            p_plan_type: planName || 'base',
            p_plan_amount: planAmount,
          });
          if (referralError) {
            // Log but don't throw - referral bonus failure shouldn't block subscription setup
            console.error('Referral bonus activation failed:', referralError);
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        
        const subscriptionId = invoice.parent?.subscription_details?.subscription
        if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId as string
          )
          
          const userId = subscription.metadata?.user_id
          
          if (!userId) {
            console.error('No user_id in subscription metadata')
            break
          }

          const { error } = await supabaseAdmin.rpc('reset_monthly_credits', {
            p_user_id: userId
          })

          if (error) {
            console.error('Failed to reset monthly credits:', error)
            throw error
          }

        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        const subscriptionId = invoice.parent?.subscription_details?.subscription
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId as string
          )
          
          const userId = subscription.metadata?.user_id
          
          if (userId) {
            await supabaseAdmin
              .from('user_credits')
              .update({ 
                plan_type: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)

          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id

        if (userId) {
          const { error } = await supabaseAdmin.rpc('cancel_subscription', {
            p_user_id: userId
          })

          if (error) {
            console.error('Failed to cancel subscription:', error)
            throw error
          }

        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const previousAttributes = event.data.previous_attributes
        
        if (previousAttributes?.items) {
          const userId = subscription.metadata?.user_id
          const planName = subscription.metadata?.plan
          const credits = subscription.metadata?.credits
            ? parseInt(subscription.metadata.credits)
            : PLAN_CREDITS[planName || 'base']

          if (userId && planName) {
            await supabaseAdmin
              .from('user_credits')
              .update({
                plan_type: planName,
                plan_credits_monthly: credits,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)

          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// CRITICAL: Disable body parsing for Stripe webhooks
// Stripe needs the raw request body to verify the signature
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

