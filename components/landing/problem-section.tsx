'use client'

import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import {
  Table,
  ChartLineUp,
  UserCircle,
  Funnel,
  ArrowRight,
} from '@phosphor-icons/react'

const problems = [
  {
    icon: Table,
    tool: 'Spreadsheet',
    issue: 'No analysis',
    description: 'You log trades manually but get zero insight from the data.',
  },
  {
    icon: ChartLineUp,
    tool: 'TradingView',
    issue: 'No journal',
    description: 'Great charts, but nothing connects to your trade history.',
  },
  {
    icon: UserCircle,
    tool: 'Broker',
    issue: 'No coaching',
    description: 'Executes trades but never tells you what you did wrong.',
  },
  {
    icon: Funnel,
    tool: 'Screener',
    issue: "Doesn't know you",
    description: 'Generic filters that ignore your setups and risk rules.',
  },
]

export function ProblemSection() {
  return (
    <Section id="problem">
      <ScrollReveal>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Your trading tools don&apos;t talk to each other
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 md:text-lg">
            You journal in a spreadsheet. Chart on TradingView. Track positions
            in your broker. Screen ideas on Finviz. None of them share data —
            and none of them learn from you.
          </p>
        </div>
      </ScrollReveal>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {problems.map((problem, i) => (
          <ScrollReveal key={problem.tool} delay={0.1 + i * 0.1}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50">
              <problem.icon
                weight="regular"
                className="mb-3 h-8 w-8 text-slate-300"
              />
              <div className="text-sm font-medium text-slate-900">{problem.tool}</div>
              <div className="mt-0.5 text-xs font-medium text-red-500">
                {problem.issue}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {problem.description}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.5}>
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <p className="text-lg font-medium text-slate-600 md:text-xl">
            What if everything lived in one place?
          </p>
          <p className="mt-3 flex items-center justify-center gap-2 text-base text-violet-600">
            And an AI connected all of it — for you, automatically.
            <ArrowRight weight="bold" className="h-4 w-4" />
          </p>
        </div>
      </ScrollReveal>
    </Section>
  )
}
