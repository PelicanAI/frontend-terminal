'use client'

import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartLineData01Icon as ChartLineUp,
  SecurityCheckIcon as ShieldCheck,
  Brain01Icon as Brain,
  Notification01Icon as Bell,
  FlashIcon as Lightning,
  Tick01Icon as Check,
  Add01Icon as Plus,
  MessageMultiple01Icon as ChatCircleDots,
} from '@hugeicons/core-free-icons'
import { PelicanButton, staggerContainer, staggerItem } from '@/components/ui/pelican'

interface PositionsEmptyStateProps {
  onLogTrade: () => void
  onAskPelican: () => void
}

const features = [
  { icon: ChartLineUp, text: 'Position cards with risk/reward visualization' },
  { icon: ShieldCheck, text: 'Portfolio-level risk budget tracking' },
  { icon: Brain, text: 'AI health scores per position' },
  { icon: Bell, text: 'Smart alerts for tight stops, oversizing, and more' },
  { icon: Lightning, text: 'One-click Pelican analysis on any position' },
]

export function PositionsEmptyState({
  onLogTrade,
  onAskPelican,
}: PositionsEmptyStateProps) {
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
        Your Portfolio Command Center
      </m.h2>

      <m.p
        variants={staggerItem}
        className="text-sm text-[var(--text-muted)] mb-8 max-w-sm"
      >
        Log your first position to unlock portfolio intelligence
      </m.p>

      <m.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-3 mb-8 text-left max-w-xs w-full"
      >
        {features.map((feature) => {
          const Icon = feature.icon
          return (
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
          )
        })}
      </m.ul>

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
