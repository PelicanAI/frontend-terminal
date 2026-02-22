'use client'

import {
  ChatCircle,
  Sun,
  Crosshair,
  Notebook,
  SquaresFour,
  ChartLineUp,
  CalendarCheck,
  Strategy,
  GraduationCap,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'

const features = [
  {
    icon: ChatCircle,
    title: 'AI Chat',
    description: 'Ask any market question in plain English. GPT-5 with live data and your trade history.',
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
  {
    icon: ArrowsClockwise,
    title: 'Trade Replay',
    description: 'Replay any closed trade tick-by-tick. See what happened and what you could improve.',
  },
]

export function FeatureGrid() {
  return (
    <Section id="features">
      <ScrollReveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            And everything else
          </h2>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <Icon
                  className="h-5 w-5 text-blue-600 mb-3"
                  weight="duotone"
                />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
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
