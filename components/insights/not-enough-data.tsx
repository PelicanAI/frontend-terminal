'use client'

import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { BarChartIcon as ChartBar } from '@hugeicons/core-free-icons'
import { PelicanCard, PelicanButton } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface NotEnoughDataProps {
  totalTrades: number
  minNeeded: number
  onLogTrade?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function NotEnoughData({ totalTrades, minNeeded, onLogTrade }: NotEnoughDataProps) {
  const remaining = Math.max(0, minNeeded - totalTrades)
  const progress = Math.min(1, totalTrades / minNeeded)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <PelicanCard className="flex flex-col items-center text-center py-8 px-6">
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full mb-4',
            'bg-[var(--accent-primary)]/10',
          )}
        >
          <HugeiconsIcon icon={ChartBar} size={24} className="text-[var(--accent-primary)]" strokeWidth={1} color="currentColor" />
        </div>

        {/* Heading */}
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Log{' '}
          <span className="font-mono tabular-nums">{remaining}</span>
          {' '}more trade{remaining !== 1 ? 's' : ''} to unlock behavioral insights
        </h3>

        <p className="text-xs text-[var(--text-muted)] mb-5 max-w-xs">
          Pelican needs at least{' '}
          <span className="font-mono tabular-nums">{minNeeded}</span>
          {' '}closed trades to identify your patterns and edge.
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-5">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
            <span>Progress</span>
            <span className="font-mono tabular-nums">
              {totalTrades}/{minNeeded}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <m.div
              className="h-full rounded-full"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            />
          </div>
        </div>

        {/* CTA */}
        {onLogTrade && (
          <PelicanButton variant="primary" size="md" onClick={onLogTrade}>
            Log a Trade
          </PelicanButton>
        )}
      </PelicanCard>
    </m.div>
  )
}
