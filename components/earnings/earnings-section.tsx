"use client"

import { useState } from "react"
import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { Sun01Icon as Sun, MoonIcon as Moon } from "@hugeicons/core-free-icons"
import { staggerContainer } from "@/components/ui/pelican"
import { EarningsCard } from "@/components/earnings/earnings-card"
import type { EnrichedEarningsEvent } from "@/types/earnings"

const MAX_VISIBLE_BMO = 3
const MAX_VISIBLE_AMC = 8

interface EarningsSectionProps {
  events: EnrichedEarningsEvent[]
  label: "bmo" | "amc"
  onClick: (e: EnrichedEarningsEvent) => void
  searchTerm?: string
  autoExpand?: boolean
  watchlistTickers?: Set<string>
  onToggleWatchlist?: (ticker: string, isWatched: boolean) => void
}

export function EarningsSection({
  events,
  label,
  onClick,
  searchTerm,
  autoExpand,
  watchlistTickers,
  onToggleWatchlist,
}: EarningsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldExpand = autoExpand || expanded

  const maxVisible = label === "bmo" ? MAX_VISIBLE_BMO : MAX_VISIBLE_AMC
  const visible = shouldExpand ? events : events.slice(0, maxVisible)
  const hasMore = events.length > maxVisible

  const searchMatch = (event: EnrichedEarningsEvent) => {
    if (!searchTerm) return false
    return event.symbol.toUpperCase().includes(searchTerm.toUpperCase())
  }

  return (
    <div className="px-2 pt-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        {label === "bmo" ? (
          <HugeiconsIcon icon={Sun} className="w-3 h-3 text-[var(--data-warning)]" strokeWidth={2} color="currentColor" />
        ) : (
          <HugeiconsIcon icon={Moon} className="w-3 h-3 text-[var(--accent-primary)]" strokeWidth={2} color="currentColor" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label === "bmo" ? "Before Open" : "After Close"}
        </span>
        <span className="text-[10px] font-mono tabular-nums text-[var(--text-disabled)]">
          ({events.length})
        </span>
      </div>
      <m.div
        className="space-y-1.5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {visible.map((event) => (
          <EarningsCard
            key={event.symbol}
            event={event}
            onClick={onClick}
            highlighted={searchMatch(event)}
            isWatched={watchlistTickers?.has(event.symbol.toUpperCase())}
            onToggleWatchlist={onToggleWatchlist}
          />
        ))}
      </m.div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-1 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
        >
          {expanded
            ? "\u2212 collapse"
            : `+${events.length - maxVisible} more`}
        </button>
      )}
    </div>
  )
}
