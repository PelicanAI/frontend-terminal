'use client'

import { ScrollReveal } from '@/components/landing/scroll-reveal'

const stats = [
  { value: '1/60th', label: 'The Cost of Institutional Tools' },
  { value: '10K+', label: 'Tickers Covered' },
  { value: '30+', label: 'Languages' },
  { value: '4', label: 'Asset Classes' },
]

export function SocialProofBar() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/80 px-6 py-12 md:py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
        {stats.map((stat, i) => (
          <ScrollReveal key={stat.label} delay={i * 0.1}>
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
