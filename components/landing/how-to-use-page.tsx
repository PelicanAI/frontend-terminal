'use client'

import Link from 'next/link'
import {
  Sun,
  ChatCircle,
  Notebook,
  SquaresFour,
  CalendarCheck,
  GraduationCap,
  Lightning,
} from '@phosphor-icons/react'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

const sections = [
  {
    id: 'morning',
    icon: Sun,
    title: 'Morning Routine',
    description: 'Start every day with your personalized Pelican Brief.',
    content: [
      'Open the Morning Brief page \u2014 your briefing is generated fresh each day.',
      'Review overnight moves, economic events, and your open positions.',
      'The brief adapts to your timezone and the markets you trade.',
      'Click "Discuss with Pelican" to ask follow-up questions in chat.',
    ],
    cta: { label: 'Try Morning Brief', href: '/morning' },
  },
  {
    id: 'prompts',
    icon: ChatCircle,
    title: 'Smarter Prompts',
    description: 'Get more from Pelican by asking better questions.',
    content: [
      '"Break down NVDA heading into earnings" \u2014 contextual analysis with your position data.',
      '"Compare AAPL vs MSFT over the last quarter" \u2014 side-by-side fundamentals.',
      '"How does SPY typically react after CPI misses?" \u2014 event studies with historical data.',
      '"Is EUR/USD overbought on the daily?" \u2014 technical analysis with live data.',
      '"Grade my last 10 trades" \u2014 AI coaching based on your actual journal.',
    ],
    cta: { label: 'Start Chatting', href: '/chat' },
  },
  {
    id: 'tracking',
    icon: Notebook,
    title: 'Track Everything',
    description: 'Journal trades and monitor positions in one place.',
    content: [
      'Log trades from the Journal page \u2014 entry, exit, stop, target, and thesis.',
      'Tag trades to your playbooks for per-strategy performance tracking.',
      'View analytics: equity curve, P&L calendar, by setup, by day of week, by ticker.',
      'Open positions show real-time P&L with session indicators (NY, London, Asia).',
      'Click "Pelican Scan" on any position for an AI-powered analysis.',
    ],
    cta: { label: 'Open Journal', href: '/journal' },
  },
  {
    id: 'intel',
    icon: SquaresFour,
    title: 'Market Intel',
    description: 'Heatmaps and correlations across every asset class.',
    content: [
      'The Heatmap shows stocks, forex, and crypto in one real-time view.',
      'Drill into sectors to find what\u2019s moving and spot rotation.',
      'Click any tile for instant AI analysis of that ticker.',
      'The Correlations page shows how assets move together \u2014 spot divergences.',
    ],
    cta: { label: 'View Heatmap', href: '/heatmap' },
  },
  {
    id: 'earnings',
    icon: CalendarCheck,
    title: 'Earnings Edge',
    description: 'Never get blindsided by an earnings report.',
    content: [
      'The Earnings Calendar shows upcoming reports with consensus estimates.',
      'Click any company for AI-powered pre-earnings analysis.',
      'See historical beat/miss rates and typical post-earnings moves.',
      'Pelican factors your open positions into every analysis.',
    ],
    cta: { label: 'Check Earnings', href: '/earnings' },
  },
  {
    id: 'learn',
    icon: GraduationCap,
    title: 'Learn as You Go',
    description: 'Turn every conversation into a learning opportunity.',
    content: [
      'Toggle Learning Mode in the chat header \u2014 trading terms get highlighted.',
      'Hover any highlighted term for a quick definition.',
      'Click to open the Learn tab for a detailed explanation.',
      '120+ terms covering technical analysis, options, risk management, and more.',
    ],
    cta: { label: 'Start Learning', href: '/chat' },
  },
  {
    id: 'tips',
    icon: Lightning,
    title: 'Pro Tips',
    description: 'Power user techniques to get the most from Pelican.',
    content: [
      'Use Cmd+K to search any ticker instantly from anywhere in the app.',
      'Create playbooks with entry/exit rules \u2014 Pelican tracks your win rate per setup.',
      'Ask Pelican to grade your execution: "How disciplined was I this week?"',
      'The more you journal, the smarter Pelican\u2019s coaching becomes.',
      'Set watchlist alerts for price levels you\u2019re watching.',
    ],
  },
]

export function HowToUsePage() {
  return (
    <main className="pt-24 pb-16 overflow-x-hidden">
      <Section>
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How to Use Pelican
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              From your first question to becoming a power user \u2014 everything you need to know.
            </p>
          </div>
        </ScrollReveal>

        {/* Quick nav */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto mb-16">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <Icon weight="duotone" className="h-4 w-4 text-blue-600 shrink-0" />
                  {section.title}
                </a>
              )
            })}
          </div>
        </ScrollReveal>

        {/* Sections */}
        <div className="max-w-3xl mx-auto space-y-16">
          {sections.map((section, i) => {
            const Icon = section.icon
            return (
              <ScrollReveal key={section.id} delay={0.1}>
                <div id={section.id} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50">
                      <Icon weight="duotone" className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {section.title}
                      </h2>
                      <p className="text-sm text-slate-400">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 ml-[52px]">
                    {section.content.map((item, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-3"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>

                  {section.cta && (
                    <div className="ml-[52px] mt-4">
                      <Link
                        href={section.cta.href}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        {section.cta.label}
                      </Link>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </Section>
    </main>
  )
}
