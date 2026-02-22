'use client'

import {
  GraduationCap,
  MagnifyingGlass,
  ChartLineUp,
  CalendarCheck,
  Translate,
  ShieldCheck,
  Lightning,
  DeviceMobile,
} from '@phosphor-icons/react'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'

const features = [
  {
    icon: GraduationCap,
    title: 'Learning Mode',
    description:
      'Toggle on to highlight trading terms. Click any term for an instant explanation.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Cmd+K Search',
    description:
      'Search any ticker instantly. Start typing and the market comes to you.',
  },
  {
    icon: ChartLineUp,
    title: 'Correlations',
    description:
      'See how assets move together. Detect divergences. Understand portfolio risk.',
  },
  {
    icon: CalendarCheck,
    title: 'Economic Calendar',
    description:
      'High-impact events with Pelican analysis. Never get blindsided by NFP again.',
  },
  {
    icon: Translate,
    title: '30 Languages',
    description:
      'Trade in your language. Full interface translation and AI responses in your tongue.',
  },
  {
    icon: ShieldCheck,
    title: 'Bank-Grade Security',
    description:
      'Row-level security on every table. Your data is yours alone.',
  },
  {
    icon: Lightning,
    title: 'Streaming Responses',
    description:
      'Watch Pelican think in real-time. No waiting for walls of text.',
  },
  {
    icon: DeviceMobile,
    title: 'Mobile Ready',
    description:
      'Full functionality on any device. Your trading AI in your pocket.',
  },
]

export function FeatureGrid() {
  return (
    <Section id="features">
      <ScrollReveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            And everything else
          </h2>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <ScrollReveal key={i} delay={i * 0.06}>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Icon
                  className="h-5 w-5 text-purple-400 mb-3"
                  weight="duotone"
                />
                <h3 className="text-sm font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    </Section>
  )
}
