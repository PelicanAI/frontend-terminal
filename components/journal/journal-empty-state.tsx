'use client'

import { motion } from 'framer-motion'
import {
  ChartLineUp,
  MagnifyingGlass,
  Brain,
  Target,
  Check,
  Plus,
  ChatCircleDots,
} from '@phosphor-icons/react'
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
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem}>
        <ChartLineUp
          size={48}
          weight="thin"
          className="text-[var(--text-muted)] mb-5"
        />
      </motion.div>

      <motion.h2
        variants={staggerItem}
        className="text-lg font-semibold text-[var(--text-primary)] mb-2"
      >
        Start Your Trading Journal
      </motion.h2>

      <motion.p
        variants={staggerItem}
        className="text-sm text-[var(--text-muted)] mb-8 max-w-sm"
      >
        Log your trades to unlock AI-powered insights
      </motion.p>

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-3 mb-8 text-left max-w-xs w-full"
      >
        {features.map((feature) => (
          <motion.li
            key={feature.text}
            variants={staggerItem}
            className="flex items-start gap-3"
          >
            <div className="mt-0.5 flex-shrink-0 rounded-full p-1 bg-[var(--accent-muted)]">
              <Check
                size={12}
                weight="bold"
                className="text-[var(--accent-primary)]"
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {feature.text}
            </span>
          </motion.li>
        ))}
      </motion.ul>

      <motion.p
        variants={staggerItem}
        className="text-xs text-[var(--text-muted)] mb-8 max-w-sm"
      >
        Every trade you log makes Pelican smarter about your strengths and weaknesses.
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row items-center gap-3"
      >
        <PelicanButton onClick={onLogTrade}>
          <Plus size={16} weight="bold" />
          Log Your First Trade
        </PelicanButton>
        <PelicanButton variant="secondary" onClick={onAskPelican}>
          <ChatCircleDots size={16} weight="regular" />
          Get a Trade Idea
        </PelicanButton>
      </motion.div>
    </motion.div>
  )
}
