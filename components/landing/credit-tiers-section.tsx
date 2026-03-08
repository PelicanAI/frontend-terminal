'use client'

import {
  ChatCircle,
  CurrencyDollar,
  ChartLineUp,
  Calendar,
  Brain,
} from '@phosphor-icons/react'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

const tiers = [
  {
    icon: ChatCircle,
    label: 'Conversation',
    credits: 2,
    example: 'What\'s RSI? Explain options basics.',
  },
  {
    icon: CurrencyDollar,
    label: 'Price Check',
    credits: 10,
    example: 'What\'s AAPL at? Quick price lookups.',
  },
  {
    icon: ChartLineUp,
    label: 'Basic Analysis',
    credits: 25,
    example: 'Is NVDA overbought? Show moving averages.',
  },
  {
    icon: Calendar,
    label: 'Event Study',
    credits: 75,
    example: 'How does SPY react after CPI?',
  },
  {
    icon: Brain,
    label: 'Deep Analysis',
    credits: 200,
    example: 'Multi-day tick analysis and backtests.',
  },
]

export function CreditTiersSection() {
  return (
    <Section>
      <ScrollReveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            How credits work
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Credits scale with complexity. Simple questions cost less, deep analysis costs more.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {tiers.map((tier, i) => {
          const Icon = tier.icon
          return (
            <ScrollReveal key={tier.label} delay={i * 0.08}>
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                <Icon
                  className="h-7 w-7 text-violet-600 mx-auto mb-3"
                  weight="duotone"
                />
                <div className="font-mono text-2xl font-bold text-violet-600 tabular-nums mb-1">
                  {tier.credits}
                </div>
                <div className="text-xs text-slate-400 mb-2">credits</div>
                <div className="text-sm font-medium text-slate-900 mb-1.5">
                  {tier.label}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {tier.example}
                </p>
              </div>
            </ScrollReveal>
          )
        })}
      </div>

      <ScrollReveal delay={0.5}>
        <p className="text-center text-sm text-slate-400 mt-10 max-w-lg mx-auto">
          All plans include every feature. Choose based on how much you trade.
        </p>
      </ScrollReveal>
    </Section>
  )
}
