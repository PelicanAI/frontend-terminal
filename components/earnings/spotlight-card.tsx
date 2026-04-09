"use client"

import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Sun01Icon as Sun,
  MoonIcon as Moon,
  Briefcase01Icon as Briefcase,
  BinocularsIcon as Binoculars,
} from '@hugeicons/core-free-icons'
import { LogoImg } from '@/components/ui/logo-img'
import { staggerItem } from '@/components/ui/pelican/motion-variants'
import { cn } from '@/lib/utils'
import type { EnrichedEarningsEvent } from '@/types/earnings'

interface SpotlightCardProps {
  event: EnrichedEarningsEvent
  onClick: (event: EnrichedEarningsEvent) => void
}

function formatRevenue(value: number | null): string {
  if (value === null || value === 0) return '\u2014'
  const abs = Math.abs(value)
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${(value / 1e3).toFixed(0)}K`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function SpotlightCard({ event, onClick }: SpotlightCardProps) {
  const hasBadge = event.inPortfolio || event.inWatchlist
  const hasReported = event.epsActual !== null
  const epsBeat =
    hasReported && event.epsEstimate !== null
      ? event.epsActual! > event.epsEstimate
      : null

  return (
    <m.button
      variants={staggerItem}
      type="button"
      onClick={() => onClick(event)}
      className="relative group text-left p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-elevated)] transition-all duration-150 cursor-pointer w-full"
    >
      {/* Portfolio / Watchlist badge */}
      {hasBadge && (
        <span
          className={cn(
            'absolute -top-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
            event.inPortfolio
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
          )}
        >
          {event.inPortfolio ? (
            <>
              <HugeiconsIcon icon={Briefcase} className="h-2.5 w-2.5" strokeWidth={2} color="currentColor" />
              Position
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Binoculars} className="h-2.5 w-2.5" strokeWidth={2} color="currentColor" />
              Watching
            </>
          )}
        </span>
      )}

      {/* Row 1: Logo + Ticker + Timing pill */}
      <div className="flex items-center gap-2">
        <LogoImg symbol={event.symbol} size={28} />
        <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
          {event.symbol}
        </span>
        {event.hour === 'bmo' && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--data-warning)]/10 text-[var(--data-warning)]">
            <HugeiconsIcon icon={Sun} className="h-3 w-3" strokeWidth={2} color="currentColor" />
            Before Open
          </span>
        )}
        {event.hour === 'amc' && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <HugeiconsIcon icon={Moon} className="h-3 w-3" strokeWidth={2} color="currentColor" />
            After Close
          </span>
        )}
      </div>

      {/* Row 2: Company name */}
      {event.name && (
        <p className="mt-1.5 text-xs text-[var(--text-secondary)] truncate">
          {event.name}
        </p>
      )}

      {/* Row 3: Date */}
      <p className="mt-1 text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
        {formatDate(event.date)}
      </p>

      {/* Row 4: EPS + Revenue */}
      <div className="mt-3 flex items-baseline gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            EPS
          </p>
          <p
            className={cn(
              'font-mono tabular-nums text-sm font-semibold',
              hasReported && epsBeat === true && 'text-[var(--data-positive)]',
              hasReported && epsBeat === false && 'text-[var(--data-negative)]',
              !hasReported && 'text-[var(--text-primary)]'
            )}
          >
            {hasReported
              ? `$${event.epsActual!.toFixed(2)}`
              : event.epsEstimate !== null
                ? `$${event.epsEstimate.toFixed(2)}e`
                : '\u2014'}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Revenue
          </p>
          <p className="font-mono tabular-nums text-sm font-semibold text-[var(--text-primary)]">
            {hasReported
              ? formatRevenue(event.revenueActual)
              : event.revenueEstimate !== null
                ? `${formatRevenue(event.revenueEstimate)}e`
                : '\u2014'}
          </p>
        </div>
      </div>

      {/* Row 5: Beat/miss indicator */}
      {hasReported && epsBeat !== null && (
        <div
          className={cn(
            'mt-3 px-2.5 py-1 rounded-lg text-[11px] font-medium text-center',
            epsBeat
              ? 'bg-[var(--data-positive)]/10 text-[var(--data-positive)]'
              : 'bg-[var(--data-negative)]/10 text-[var(--data-negative)]'
          )}
        >
          {epsBeat ? 'Beat estimates' : 'Missed estimates'}
        </div>
      )}
    </m.button>
  )
}
