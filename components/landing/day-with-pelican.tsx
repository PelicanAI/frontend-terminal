'use client'

import { Sun, Target, Lightning, Eye, Notebook, Brain } from '@phosphor-icons/react'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'
import { cn } from '@/lib/utils'

const timelineItems = [
  {
    time: '6:30 AM',
    title: 'Your brief is waiting',
    description:
      'Market overnight moves, positions analyzed, events flagged.',
    color: 'amber' as DotColor,
    icon: Sun,
  },
  {
    time: '7:15 AM',
    title: 'Setups surfaced for you',
    description:
      'EUR/USD at daily FVG with liquidity swept. Matches your iFVG playbook. Win rate: 67%.',
    color: 'purple' as DotColor,
    icon: Target,
  },
  {
    time: '9:32 AM',
    title: 'You take a trade',
    description:
      'Run through pre-trade checklist, log entry/stop/target. Risk sizing confirmed. 15 seconds.',
    color: 'emerald' as DotColor,
    icon: Lightning,
  },
  {
    time: '2:15 PM',
    title: 'Positions monitored',
    description:
      'Position hits 1R profit. Pelican notes tendency to close early. "Your average winner when you hold: 2.1R."',
    color: 'cyan' as DotColor,
    icon: Eye,
  },
  {
    time: '4:30 PM',
    title: 'Review and learn',
    description:
      'Journal the day. Pelican grades execution: "A- today. Clean entry, followed rules, but added size without checklist."',
    color: 'purple' as DotColor,
    icon: Notebook,
  },
  {
    time: 'Over time',
    title: 'Pelican gets smarter',
    description:
      'After 100 trades, knows you win 72% on London session iFVGs but only 38% during NY news. Best days: 1-2 trades max.',
    color: 'purple' as DotColor,
    icon: Brain,
  },
]

type DotColor = 'amber' | 'purple' | 'emerald' | 'cyan'

const dotColors: Record<DotColor, { border: string; bg: string }> = {
  amber: { border: 'border-amber-400', bg: 'bg-amber-400/20' },
  purple: { border: 'border-purple-400', bg: 'bg-purple-400/20' },
  emerald: { border: 'border-emerald-400', bg: 'bg-emerald-400/20' },
  cyan: { border: 'border-cyan-400', bg: 'bg-cyan-400/20' },
}

export function DayWithPelican() {
  return (
    <Section>
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            A day with Pelican
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            From pre-market to review, every step is connected.
          </p>
        </div>
      </ScrollReveal>

      <div className="relative max-w-2xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />

        <div className="space-y-10">
          {timelineItems.map((item, i) => {
            const Icon = item.icon
            const colors = dotColors[item.color]
            return (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="relative pl-16">
                  {/* Dot */}
                  <div
                    className={cn(
                      'absolute left-4 top-1 w-4 h-4 rounded-full border-2',
                      colors.border,
                      colors.bg
                    )}
                  />

                  {/* Content */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <Icon
                        className="h-5 w-5 text-white/40"
                        weight="duotone"
                      />
                      <span className="text-xs font-mono text-white/30 tabular-nums">
                        {item.time}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
