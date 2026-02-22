'use client'

import { TrendUp, Brain, Rocket } from '@phosphor-icons/react'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'

const steps = [
  {
    number: '01',
    icon: TrendUp,
    title: 'You trade',
    description:
      'Log trades, journal your process, tag your playbooks. Every interaction adds to your data.',
  },
  {
    number: '02',
    icon: Brain,
    title: 'Pelican learns',
    description:
      'Which setups work for you. When you overtrade. Your best sessions. Your costly habits.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'You improve',
    description:
      'Personalized coaching, preemptive warnings, surfaced opportunities. The edge compounds.',
  },
]

export function FlywheelSection() {
  return (
    <Section className="bg-white/[0.01]">
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The platform that compounds with you
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Day 1, Pelican gives great analysis. Day 100, it gives{' '}
            <span className="text-white font-medium">YOU-specific</span>{' '}
            coaching based on your actual patterns, setups, and tendencies.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <ScrollReveal key={i} delay={i * 0.15}>
              <div className="relative p-6 rounded-xl bg-[#13131a] border border-white/[0.06]">
                {/* Faded number */}
                <span className="absolute top-4 right-4 text-4xl font-bold text-white/[0.04] select-none">
                  {step.number}
                </span>

                <Icon
                  className="h-8 w-8 text-purple-400 mb-4"
                  weight="duotone"
                />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </ScrollReveal>
          )
        })}
      </div>

      <ScrollReveal delay={0.5}>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-white/30 text-sm leading-relaxed">
            After 6 months, Pelican has analyzed hundreds of your trades,
            identified your patterns, learned your psychology, and built a
            coaching profile unique to you.{' '}
            <span className="text-white/50">
              That&apos;s not something you can export to a spreadsheet.
            </span>
          </p>
        </div>
      </ScrollReveal>
    </Section>
  )
}
