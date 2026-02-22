'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import {
  ChatCircle,
  Sun,
  SquaresFour,
  Notebook,
  Strategy,
  Crosshair,
} from '@phosphor-icons/react'
import { ChatMock } from '@/components/landing/mocks/chat-mock'
import { BriefMock } from '@/components/landing/mocks/brief-mock'
import { HeatmapMock } from '@/components/landing/mocks/heatmap-mock'
import { JournalMock } from '@/components/landing/mocks/journal-mock'
import { PlaybookMock } from '@/components/landing/mocks/playbook-mock'
import { PositionsMock } from '@/components/landing/mocks/positions-mock'

const features = [
  {
    id: 'chat',
    label: 'AI Chat',
    icon: ChatCircle,
    title: 'Ask anything about any market',
    description:
      'GPT-5 with live market data, your positions, and institutional-grade analysis. Like having a senior analyst on call 24/7.',
    highlights: [
      'GPT-5 powered with real-time Polygon data',
      'Knows your open positions and trade history',
      'Pre-trade checklists built into every analysis',
    ],
    mock: ChatMock,
  },
  {
    id: 'brief',
    label: 'Morning Brief',
    icon: Sun,
    title: 'Your daily edge, waiting for you',
    description:
      'A personalized market briefing generated fresh every morning. Adapts to your timezone, your positions, and your playbooks.',
    highlights: [
      'Adapts to NY, London, and Asia market sessions',
      'Analyzes your open positions with overnight risk',
      'Surfaces setups matching your active playbooks',
    ],
    mock: BriefMock,
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    icon: SquaresFour,
    title: 'See the whole market in one glance',
    description:
      'Real-time heatmap across stocks, forex, and crypto. Spot sector rotation, find opportunities, click any tile for instant AI analysis.',
    highlights: [
      '3 markets: stocks, forex, and crypto in one view',
      'Sector drill-down to find what\'s moving',
      'Click any ticker for instant AI analysis',
    ],
    mock: HeatmapMock,
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: Notebook,
    title: 'Your trading journal that actually works',
    description:
      'Six analytics views, automatic P&L calculation, and AI-powered trade grading. Finally, a journal you\'ll stick with.',
    highlights: [
      '6 analytics views: equity curve, calendar, by setup',
      'Tag trades to playbooks for per-strategy analysis',
      'AI grading scores every trade for continuous improvement',
    ],
    mock: JournalMock,
  },
  {
    id: 'playbooks',
    label: 'Playbooks',
    icon: Strategy,
    title: 'Define your edge. Track if it works.',
    description:
      'Document your setups with entry rules, exit rules, and checklists. Pelican tracks win rate, R-multiple, and profit factor per playbook.',
    highlights: [
      'Per-setup stats: win rate, R-multiple, profit factor',
      'Pre-trade checklist enforces discipline',
      'AI detects when a playbook starts underperforming',
    ],
    mock: PlaybookMock,
  },
  {
    id: 'positions',
    label: 'Positions',
    icon: Crosshair,
    title: 'Every position, monitored',
    description:
      'See all open positions across stocks, forex, and crypto with real-time P&L, session indicators, and one-click AI scanning.',
    highlights: [
      'Session indicators: NY, London, Asia, 24/7',
      'Click any position for an AI-powered scan',
      'Portfolio-level risk and exposure overview',
    ],
    mock: PositionsMock,
  },
] as const

export function PlatformShowcase() {
  const [activeFeature, setActiveFeature] = useState(0)
  const feature = features[activeFeature]!
  const MockComponent = feature.mock

  return (
    <Section id="platform">
      {/* Header */}
      <ScrollReveal>
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
            One platform. Every tool you need.
          </h2>
          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto">
            AI chat, morning briefs, heatmaps, journaling, playbooks, and position tracking
            &mdash; all connected, all learning from you.
          </p>
        </div>
      </ScrollReveal>

      {/* Tab bar */}
      <ScrollReveal delay={0.1}>
        <div className="flex justify-start md:justify-center gap-1.5 mb-10 md:mb-14 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {features.map((f, i) => {
            const Icon = f.icon
            const isActive = i === activeFeature
            return (
              <button
                key={f.id}
                onClick={() => setActiveFeature(i)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0',
                  isActive
                    ? 'bg-blue-500/15 text-blue-600'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon
                  weight={isActive ? 'fill' : 'regular'}
                  className="w-4 h-4"
                />
                {f.label}
              </button>
            )
          })}
        </div>
      </ScrollReveal>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={feature.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: text content */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <ul className="space-y-3">
                {feature.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                    <span className="text-sm text-slate-600 leading-relaxed">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: mock component */}
            <div className="w-full rounded-xl border border-slate-200 bg-[#0a0a0f] shadow-lg overflow-hidden">
              <MockComponent />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Section>
  )
}
