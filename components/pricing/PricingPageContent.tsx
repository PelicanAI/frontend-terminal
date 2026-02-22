'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Zap, Loader2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCreditsContext } from '@/providers/credits-provider'
import { useT } from '@/lib/providers/translation-provider'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'

const QUERY_COSTS = {
  conversation: { label: 'Chat / Education', cost: 2 },
  simple: { label: 'Price check', cost: 10 },
  basic: { label: 'Technical analysis', cost: 25 },
  event_study: { label: 'Event study', cost: 75 },
  multi_day_tick: { label: 'Deep analysis / Backtest', cost: 250 },
}

function CostBreakdownTable() {
  return (
    <div className="cost-breakdown bracket-box">
      <h3 className="cost-breakdown-title">What things cost</h3>
      <div className="cost-breakdown-list">
        {Object.entries(QUERY_COSTS).map(([key, { label, cost }]) => (
          <div key={key} className="cost-breakdown-row">
            <span className="cost-breakdown-label">{label}</span>
            <span className="cost-breakdown-value">
              <Zap className="cost-breakdown-icon" />
              {cost}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    credits: 1000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_starter',
    popular: false,
    cta: 'Get Started',
    bullets: [
      'Learning what RSI, support, resistance actually mean?',
      "Tired of trading off YouTube clips and gut feelings?",
      "Want to ask basic questions without paying for tools you don't need yet?",
      'Perfect for building your foundation with real data',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    credits: 3500,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
    popular: true,
    cta: 'Start Trading',
    bullets: [
      'Using Pelican daily to validate trades before you make them',
      'Running enough analyses and event studies to need room to breathe',
      'Exploring multiple tickers, strategies, and setups each week',
      'The sweet spot between casual and all-in',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    price: 249,
    credits: 10000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID || 'price_power',
    popular: false,
    cta: 'Go Power',
    bullets: [
      "Research isn't something you do sometimes, it's how you trade",
      'Burning through analyses the way day traders burn through charts',
      'Pressure-testing every idea before real money touches it',
      'Maximum runway for traders who never stop asking questions',
    ],
  }
]

export default function PricingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const preselectedPlan = searchParams.get('plan')
  const { isSubscribed, isFounder, loading: creditsLoading, credits } = useCreditsContext()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const navLinks = [
    { href: '/#features', label: t.marketing.nav.features },
    { href: '/how-to-use', label: 'How to Use' },
    { href: '/', label: t.marketing.nav.backToHome },
    { href: '/faq', label: t.marketing.nav.faq },
  ]

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Redirect users who already have an active subscription to chat
  useEffect(() => {
    if (!creditsLoading && (isSubscribed || isFounder)) {
      router.push('/chat')
    }
  }, [isSubscribed, isFounder, creditsLoading, router])

  // Auto-select plan if arriving with ?plan= parameter
  useEffect(() => {
    if (preselectedPlan && user && !loadingPlan && !isSubscribed && !isFounder) {
      const plan = PLANS.find(p => p.id === preselectedPlan)
      if (plan) {
        setTimeout(() => {
          handleSelectPlan(plan)
        }, 100)
      }
      sessionStorage.removeItem('intended_plan')
    }
  }, [preselectedPlan, user, loadingPlan, isSubscribed, isFounder])

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    setLoadingPlan(plan.id)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        sessionStorage.setItem('intended_plan', plan.id)
        window.location.href = '/auth/login?redirect=/pricing'
        return
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          userId: user.id,
          userEmail: user.email,
          planName: plan.id,
          planCredits: plan.credits
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoadingPlan(null)
    }
  }

  if (creditsLoading) {
    return (
      <div className="pricing-loading">
        <Loader2 className="pricing-loading-spinner" />
      </div>
    )
  }

  return (
    <>
      <MarketingNav links={navLinks} ctaAction="signup" ctaLabel={t.marketing.nav.getStarted} />

      <section id="main-content" className="pricing-hero">
        <div className="pricing-hero-inner">
          <div className="pricing-nav-links">
            <Link href="/" className="pricing-back-link">
              &larr; {t.marketing.nav.backToHome}
            </Link>
            {user && (
              <Link href="/chat" className="pricing-back-link">
                &larr; Back to chat
              </Link>
            )}
          </div>

          <div className="section-tag">{'// Pricing'}</div>
          <h1 className="pricing-title">
            Simple, <span className="text-glow">Credit-Based</span> Pricing
          </h1>
          <p className="pricing-subtitle">
            Pay for what you use. No hidden fees. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="pricing-costs-section">
        <div className="section-inner">
          <CostBreakdownTable />
        </div>
      </section>

      <p className="pricing-unified-note">
        All plans include full access to Pelican. Same model, same capabilities. Choose the plan based on your expected usage.
      </p>

      {error && (
        <div className="pricing-error">
          {error}
        </div>
      )}

      {user && credits?.plan === 'none' && (credits.freeQuestionsRemaining ?? 0) > 0 && (
        <div className="pricing-trial-banner">
          <p className="pricing-trial-title">
            You have {credits.freeQuestionsRemaining} free question{credits.freeQuestionsRemaining === 1 ? '' : 's'}
          </p>
          <p className="pricing-trial-subtitle">
            Try Pelican&apos;s AI trading assistant &mdash; no card needed.
          </p>
          <Link href="/chat" className="btn-primary" style={{ marginTop: '1rem' }}>
            Start Free Trial
          </Link>
        </div>
      )}

      <section className="pricing-cards-section">
        <div className="pricing-cards-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card bracket-box ${plan.popular ? 'pricing-card-popular' : ''}`}
            >
              {plan.popular && (
                <div className="pricing-popular-badge">Most Popular</div>
              )}

              <h2 className="pricing-card-name">{plan.name}</h2>

              <div className="pricing-card-price">
                <span className="pricing-card-amount">${plan.price}</span>
                <span className="pricing-card-period">/month</span>
              </div>

              <div className="pricing-card-credits">
                <Zap className="pricing-card-credits-icon" />
                <span>{plan.credits.toLocaleString()} credits</span>
              </div>

              <ul className="pricing-card-bullets">
                {plan.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={loadingPlan !== null}
                className={`pricing-card-cta ${plan.popular ? 'pricing-card-cta-popular' : ''}`}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="pricing-card-cta-spinner" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>{plan.cta}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="pricing-guarantee">
        <ShieldCheck className="pricing-guarantee-icon" />
        <span>7-day money-back guarantee &mdash; no questions asked</span>
      </div>

      <div className="pricing-footer-notes">
        <p>Credits reset monthly. Unused credits roll over (up to 20%).</p>
        <p>
          By subscribing, you agree to our{' '}
          <Link href="/terms">Terms of Service</Link>
        </p>
        <p>
          Questions?{' '}
          <a href="mailto:support@pelicantrading.ai">Contact us</a>
        </p>
      </div>

      <MarketingFooter />
    </>
  )
}
