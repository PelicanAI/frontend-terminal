'use client'

import Link from 'next/link'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

const plans = [
  {
    name: 'Starter',
    price: 29,
    credits: '1,000',
    planId: 'starter',
    description: 'For traders getting started with AI-assisted trading',
    features: [
      'AI chat with live market data',
      'Morning briefing',
      'Trade journal with analytics',
      'Market heatmap (all asset classes)',
      'Correlations dashboard',
      'Learning mode',
    ],
    cta: 'Start with Starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 99,
    credits: '3,500',
    planId: 'pro',
    description: 'For active traders who want the full edge',
    features: [
      'Everything in Starter',
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
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-500 text-lg">
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
                  ? 'bg-blue-50 border border-blue-200 shadow-md'
                  : 'bg-white border border-slate-200 shadow-sm'
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-400">{plan.description}</p>
              </div>

              <div className="mb-1">
                <span className="text-4xl font-bold text-slate-900 font-mono">
                  ${plan.price}
                </span>
                <span className="text-sm text-slate-400">/mo</span>
              </div>
              <p className="text-xs text-slate-400 mb-8">
                {plan.credits} credits/month
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      weight="bold"
                      className="h-4 w-4 text-blue-600 mt-0.5 shrink-0"
                    />
                    <span className="text-sm text-slate-500">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/auth/signup?plan=${plan.planId}`}
                className={cn(
                  'block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]',
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                )}
              >
                {plan.cta}
              </Link>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.35}>
        <div className="mt-12 max-w-3xl mx-auto rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 text-center">How Pelican compares</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400 mb-1">Bloomberg</div>
              <div className="font-mono text-sm font-bold text-slate-900">$24,000<span className="text-slate-400 font-normal">/yr</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Refinitiv</div>
              <div className="font-mono text-sm font-bold text-slate-900">$22,000<span className="text-slate-400 font-normal">/yr</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">FactSet</div>
              <div className="font-mono text-sm font-bold text-slate-900">$12,000<span className="text-slate-400 font-normal">/yr</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Pelican AI</div>
              <div className="font-mono text-sm font-bold text-blue-600">$348<span className="text-slate-400 font-normal">/yr</span></div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.4}>
        <p className="text-center text-sm text-slate-400 mt-10">
          Not ready to commit? Start with 10 free questions, no signup required.
        </p>
      </ScrollReveal>
    </Section>
  )
}
