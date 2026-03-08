'use client'

import Link from 'next/link'
import {
  ChatCircle,
  Notebook,
  Crosshair,
  Sun,
  SquaresFour,
  Strategy,
  CalendarCheck,
  LinkSimple,
  Brain,
} from '@phosphor-icons/react'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

const sections = [
  {
    id: 'chat',
    icon: ChatCircle,
    title: 'AI Chat — Ask Anything About Any Market',
    description:
      'Type any market question in plain English. Pelican connects to live market data across 10,000+ tickers in stocks, forex, crypto, and futures.',
    content: [
      'Price checks, technicals, fundamentals, and macro analysis',
      'Backtesting: "How does SPY perform after a 3% drop?"',
      'Trade ideas based on your strengths and playbook performance',
      'Education: turn on Learning Mode to highlight terms with definitions',
    ],
    keyPoint:
      'Pelican doesn\u2019t give the same answer to everyone. If you\u2019ve logged trades, it knows your win rate, your best setups, and your worst habits \u2014 and factors that into every response.',
    cta: { label: 'Start a conversation \u2192', href: '/auth/signup' },
  },
  {
    id: 'journal',
    icon: Notebook,
    title: 'Trade Journal — Track Every Trade, Spot Every Pattern',
    description:
      'Log your trades with entry, exit, stop, thesis, and conviction. Pelican tracks your P&L, R-multiples, and builds analytics you can\u2019t get from a spreadsheet.',
    content: [
      'Dashboard with equity curve and running P&L',
      'Analytics by setup, day of week, conviction, holding period, and time of day',
      'AI trade grading \u2014 Pelican reviews your execution and scores it',
      'Link trades to playbooks to track which strategies actually work',
    ],
    keyPoint:
      'After 20+ trades, Pelican can tell you which setups make you money, which days you lose, and whether you\u2019re revenge trading after losses. The journal is how Pelican learns you.',
    cta: { label: 'Start journaling \u2192', href: '/auth/signup' },
  },
  {
    id: 'positions',
    icon: Crosshair,
    title: 'Positions — All Open Trades at a Glance',
    description:
      'See every open position with risk metrics, days held, distance to stop and target, and portfolio-level exposure.',
    content: [
      'Per-position risk/reward ratio, conviction, and thesis',
      'Portfolio summary: total exposure, long/short split, sector concentration',
      'One-click Pelican Scan for deep analysis of any position',
      'Flags missing stop losses and plan violations automatically',
    ],
    keyPoint:
      'Pelican cross-references your positions against your trading history. If you\u2019re holding a ticker you historically lose on, it tells you.',
    cta: { label: 'See your positions \u2192', href: '/auth/signup' },
  },
  {
    id: 'morning',
    icon: Sun,
    title: 'Morning Brief — Start Every Day Informed',
    description:
      'A personalized snapshot of what matters to you today: market overview, your positions, your watchlist, and what Pelican thinks you should watch.',
    content: [
      'Market indices, top movers, and sector performance',
      'Your positions: which are near stops, targets, or have earnings coming',
      'Personalized Pelican Brief analyzing your specific risks today',
      'Click any ticker or insight to ask Pelican follow-up questions',
    ],
    keyPoint:
      'Check this before the market opens. Thirty seconds to know what needs your attention.',
    cta: { label: 'See your morning brief \u2192', href: '/auth/signup' },
  },
  {
    id: 'heatmap',
    icon: SquaresFour,
    title: 'Heatmap — See the Whole Market in One View',
    description:
      'Visual snapshot of market performance. Bigger tiles = larger market cap. Colors show performance. Click any stock for instant AI analysis.',
    content: [
      'S&P 500 by sector with drill-down',
      'Top movers: biggest gainers and losers today',
      'Custom view: your watchlist as a heatmap',
      'Available as a sidebar widget or full page',
    ],
    keyPoint:
      'Click any tile and Pelican checks if you hold it, if it\u2019s on your watchlist, and whether there\u2019s a trade that fits your style.',
    cta: { label: 'Explore the heatmap \u2192', href: '/auth/signup' },
  },
  {
    id: 'playbooks',
    icon: Strategy,
    title: 'Playbooks — Define, Track, and Improve Your Strategies',
    description:
      'Write down your strategies with entry rules, exit rules, risk management, and pre-trade checklists. Then track which ones actually make you money.',
    content: [
      'Browse strategies: Opening Range Breakout, VWAP Reclaim, Earnings Momentum, Iron Condor, and more',
      'Create your own with custom rules and checklists',
      'Link trades to playbooks \u2014 see win rate, avg R, and total P&L per strategy',
      'Pelican suggests your best playbook when you\u2019re looking at a new trade',
    ],
    keyPoint:
      'Most traders think they have a strategy. Playbooks prove it. After linking 10+ trades, you\u2019ll know exactly which setups are your edge and which are costing you.',
    cta: { label: 'Browse strategies \u2192', href: '/auth/signup' },
  },
  {
    id: 'earnings',
    icon: CalendarCheck,
    title: 'Earnings Calendar — Never Get Caught Off Guard',
    description:
      'See upcoming earnings for every stock on your watchlist and in your portfolio. Pelican flags positions with earnings in the next 7 days.',
    content: [
      'Earnings dates for all your held positions and watchlist',
      'Pre-earnings analysis: historical reactions, implied move, consensus estimates',
      'Post-earnings review: what happened and what to do next',
      'One-click "Ask Pelican" for any earnings event',
    ],
    keyPoint:
      'Earnings are the highest-volatility events in trading. Know when they\u2019re coming and have a plan.',
    cta: { label: 'See upcoming earnings \u2192', href: '/auth/signup' },
  },
  {
    id: 'correlations',
    icon: LinkSimple,
    title: 'Correlations — Understand How Your Positions Move Together',
    description:
      'See how your positions correlate with each other and the broader market. Detect hidden concentration risk in your portfolio.',
    content: [
      'Asset correlation matrix across your portfolio',
      'Detect divergences and mean-reversion opportunities',
      'Portfolio risk assessment: are you more concentrated than you think?',
      'AI-powered signal cards with trade ideas from correlation data',
    ],
    keyPoint:
      'If you\u2019re long 5 tech stocks, you might think you\u2019re diversified. Correlations shows you that you\u2019re running one concentrated bet.',
    cta: { label: 'Check your correlations \u2192', href: '/auth/signup' },
  },
]

const intelligenceTracks = [
  'Win rate by setup, ticker, day of week, time of day, and conviction level',
  'Holding periods: do you cut winners too early or hold losers too long?',
  'Losing streaks and how you trade after consecutive losses',
  'Position sizing: do oversized trades perform differently?',
  'Your most common mistakes and what they cost you',
  'Trading plan rules and how often you follow them',
]

const intelligenceActions = [
  'Warns you before you repeat a pattern that costs you money',
  'Tells you which setups to focus on and which to stop trading',
  'Flags when you\u2019re trading on a weak day or time',
  'Enforces your trading plan when you\u2019re tempted to break it',
  'Detects tilt \u2014 trading emotionally after losses \u2014 and tells you to step back',
  'Suggests trades that match your proven edge, not random ideas',
]

export function HowToUsePage() {
  return (
    <main className="pt-24 pb-16 overflow-x-hidden">
      <Section>
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How Pelican Works
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              From your first question to personalized coaching &mdash; everything the platform does and how it learns you.
            </p>
          </div>
        </ScrollReveal>

        {/* Quick nav */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl mx-auto mb-16">
            {[...sections, { id: 'intelligence', icon: Brain, title: 'Intelligence Layer' }].map(
              (section) => {
                const Icon = section.icon
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                  >
                    <Icon weight="duotone" className="h-4 w-4 text-violet-600 shrink-0" />
                    {section.title.split(' — ')[0]}
                  </a>
                )
              }
            )}
          </div>
        </ScrollReveal>

        {/* Sections */}
        <div className="max-w-3xl mx-auto space-y-16">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <ScrollReveal key={section.id} delay={0.1}>
                <div id={section.id} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-violet-50">
                      <Icon weight="duotone" className="h-5 w-5 text-violet-600" />
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
                      <div key={j} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>

                  {section.keyPoint && (
                    <div className="ml-[52px] mt-4 rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-3">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {section.keyPoint}
                      </p>
                    </div>
                  )}

                  {section.cta && (
                    <div className="ml-[52px] mt-4">
                      <Link
                        href={section.cta.href}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
                      >
                        {section.cta.label}
                      </Link>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            )
          })}

          {/* Section 9: Intelligence Layer */}
          <ScrollReveal delay={0.1}>
            <div id="intelligence" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-violet-50">
                  <Brain weight="duotone" className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    The Intelligence Layer — How Pelican Gets Smarter
                  </h2>
                  <p className="text-sm text-slate-400">
                    Everything you do feeds data into Pelican&apos;s understanding of you as a trader. The more you use it, the more specific and useful it becomes.
                  </p>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="ml-[52px] grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    What Pelican Tracks
                  </h3>
                  <div className="space-y-2.5">
                    {intelligenceTracks.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    What Pelican Does With It
                  </h3>
                  <div className="space-y-2.5">
                    {intelligenceActions.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-2 shrink-0" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom callout */}
              <div className="ml-[52px] mt-6 text-center rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-slate-500 text-base leading-relaxed">
                  After 30 days of logging trades, Pelican knows your trading better than you know it yourself.
                  Your win rates, your blind spots, your costly habits, your real edge.{' '}
                  <span className="text-slate-900 font-medium">
                    That&apos;s not something you walk away from.
                  </span>
                </p>
              </div>

              <div className="ml-[52px] mt-4">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
                >
                  Start building your profile &rarr;
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Section>
    </main>
  )
}
