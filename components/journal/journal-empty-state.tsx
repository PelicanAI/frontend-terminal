'use client'

import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartLineData01Icon as ChartLineUp,
  Search01Icon as MagnifyingGlass,
  Brain01Icon as Brain,
  Target01Icon as Target,
  Tick01Icon as Check,
  Add01Icon as Plus,
  MessageMultiple01Icon as ChatCircleDots,
} from '@hugeicons/core-free-icons'
import { PelicanButton, staggerContainer, staggerItem } from '@/components/ui/pelican'

interface JournalEmptyStateProps {
  onLogTrade: () => void
  onAskPelican: () => void
}

const features = [
  { icon: ChartLineUp, text: 'Performance analytics — win rate, P&L, profit factor' },
  { icon: MagnifyingGlass, text: 'Pattern detection — Pelican finds what you can\'t see' },
  { icon: Brain, text: 'AI trade grading — get each trade scored and reviewed' },
  { icon: Target, text: 'Playbook tracking — see which strategies actually work' },
]

export function JournalEmptyState({
  onLogTrade,
  onAskPelican,
}: JournalEmptyStateProps) {
  return (
    <m.div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div variants={staggerItem}>
        <HugeiconsIcon icon={ChartLineUp} size={48} className="text-[var(--text-muted)] mb-5" strokeWidth={1} color="currentColor" />
      </m.div>

      <m.h2
        variants={staggerItem}
        className="text-lg font-semibold text-[var(--text-primary)] mb-2"
      >
        Start Your Trading Journal
      </m.h2>

      <m.p
        variants={staggerItem}
        className="text-sm text-[var(--text-muted)] mb-8 max-w-sm"
      >
        Log your trades to unlock AI-powered insights
      </m.p>

      <m.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-3 mb-8 text-left max-w-xs w-full"
      >
        {features.map((feature) => (
          <m.li
            key={feature.text}
            variants={staggerItem}
            className="flex items-start gap-3"
          >
            <div className="mt-0.5 flex-shrink-0 rounded-full p-1 bg-[var(--accent-muted)]">
              <HugeiconsIcon icon={Check} size={12} className="text-[var(--accent-primary)]" strokeWidth={2} color="currentColor" />
            </div>
            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {feature.text}
            </span>
          </m.li>
        ))}
      </m.ul>

      <m.p
        variants={staggerItem}
        className="text-xs text-[var(--text-muted)] mb-8 max-w-sm"
      >
        Every trade you log makes Pelican smarter about your strengths and weaknesses.
      </m.p>

      <m.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row items-center gap-3"
      >
        <PelicanButton onClick={onLogTrade}>
          <HugeiconsIcon icon={Plus} size={16} strokeWidth={2} color="currentColor" />
          Log Your First Trade
        </PelicanButton>
        <PelicanButton variant="secondary" onClick={onAskPelican}>
          <HugeiconsIcon icon={ChatCircleDots} size={16} strokeWidth={1.5} color="currentColor" />
          Get a Trade Idea
        </PelicanButton>
      </m.div>
    </m.div>
  )
}
