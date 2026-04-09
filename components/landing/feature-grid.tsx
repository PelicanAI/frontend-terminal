'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Chat01Icon as ChatCircle,
  Sun01Icon as Sun,
  Target01Icon as Crosshair,
  Notebook01Icon as Notebook,
  DashboardSquare01Icon as SquaresFour,
  ChartLineData01Icon as ChartLineUp,
  CalendarCheckIn01Icon as CalendarCheck,
  StrategyIcon as Strategy,
  Mortarboard01Icon as GraduationCap,
} from '@hugeicons/core-free-icons'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'

const features = [
  {
    icon: ChatCircle,
    title: 'AI Chat',
    description: 'Ask any market question in plain English. Live data and your trade history, one conversation.',
  },
  {
    icon: Sun,
    title: 'Morning Briefings',
    description: 'Personalized daily briefing with overnight moves, your positions, and today\'s events.',
  },
  {
    icon: Crosshair,
    title: 'Positions',
    description: 'Monitor all open positions with real-time P&L, session indicators, and one-click AI scanning.',
  },
  {
    icon: Notebook,
    title: 'Trade Journal',
    description: 'Six analytics views, automatic P&L, and AI grading. A journal you\'ll actually keep.',
  },
  {
    icon: SquaresFour,
    title: 'Heatmap',
    description: 'Real-time heatmap across stocks, forex, and crypto. Click any tile for instant analysis.',
  },
  {
    icon: ChartLineUp,
    title: 'Correlations',
    description: 'See how assets move together. Detect divergences. Understand portfolio risk.',
  },
  {
    icon: CalendarCheck,
    title: 'Earnings Calendar',
    description: 'Upcoming earnings with AI analysis. Never get blindsided by a report again.',
  },
  {
    icon: Strategy,
    title: 'Playbook Lab',
    description: 'Document your setups with rules and checklists. Track win rate per playbook.',
  },
  {
    icon: GraduationCap,
    title: 'Learning Mode',
    description: 'Toggle on to highlight trading terms. Click any term for an instant explanation.',
  },
]

export function FeatureGrid() {
  return (
    <Section id="features">
      <ScrollReveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            The Full Platform
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Everything you need, nothing you don&apos;t. All included in every plan.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <HugeiconsIcon icon={Icon} className="h-5 w-5 text-violet-600 mb-3" strokeWidth={1.5} color="currentColor" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
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
