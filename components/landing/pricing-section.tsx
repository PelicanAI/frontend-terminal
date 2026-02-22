'use client'

import Link from 'next/link'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

const plans = [
  {
    name: 'Base',
    price: 29,
    credits: '1,000',
    planId: 'base',
    description: 'For traders getting started with AI-assisted trading',
    features: [
      'AI chat with live market data',
      'Morning briefing',
      'Trade journal with analytics',
      'Market heatmap (all asset classes)',
      'Correlations dashboard',
      'Learning mode',
    ],
    cta: 'Start with Base',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 99,
    credits: '3,500',
    planId: 'pro',
    description: 'For active traders who want the full edge',
    features: [
      'Everything in Base',
      '3.5x more monthly credits',
      'Playbook Lab with AI grading',
      'Advanced trade analytics',
      'Setup-specific performance tracking',
      'Priority response times',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
  {
    name: 'Power',
    price: 249,
    credits: '10,000',
    planId: 'power',
    description: 'For professional traders and power users',
    features: [
      'Everything in Pro',
      '10x more monthly credits',
      'Advanced portfolio analytics',
      'Maximum analysis depth',
      'Unlimited research runway',
      'Direct support channel',
    ],
    cta: 'Go Power',
    highlighted: false,
  },
]

export function PricingSection() {
  return (
    <Section id="pricing">
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-white/50 text-lg">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <ScrollReveal key={plan.planId} delay={i * 0.1}>
            <div
              className={cn(
                'relative rounded-2xl p-8 flex flex-col h-full transition-all duration-300',
                plan.highlighted
                  ? 'bg-purple-600/[0.06] border border-purple-500/30 shadow-[0_0_40px_rgba(139,92,246,0.1)]'
                  : 'bg-white/[0.02] border border-white/[0.06]'
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-white/40">{plan.description}</p>
              </div>

              <div className="mb-1">
                <span className="text-4xl font-bold text-white font-mono">
                  ${plan.price}
                </span>
                <span className="text-sm text-white/40">/mo</span>
              </div>
              <p className="text-xs text-white/30 mb-8">
                {plan.credits} credits/month
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      weight="bold"
                      className="h-4 w-4 text-purple-400 mt-0.5 shrink-0"
                    />
                    <span className="text-sm text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/auth/signup?plan=${plan.planId}`}
                className={cn(
                  'block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]',
                  plan.highlighted
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.06]'
                )}
              >
                {plan.cta}
              </Link>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.4}>
        <p className="text-center text-sm text-white/30 mt-10">
          Not ready to commit? Start with 10 free questions, no signup required.
        </p>
      </ScrollReveal>
    </Section>
  )
}
