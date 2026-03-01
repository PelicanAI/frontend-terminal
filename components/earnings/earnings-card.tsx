"use client"

import { motion } from "framer-motion"
import { Briefcase, BookmarkSimple } from "@phosphor-icons/react"
import { LogoImg } from "@/components/ui/logo-img"
import { staggerItem } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import type { EnrichedEarningsEvent } from "@/types/earnings"

// Revenue formatting helper
function formatRevenue(value: number | null): string {
  if (value === null || value === 0) return "\u2014"
  const abs = Math.abs(value)
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${(value / 1e3).toFixed(0)}K`
}

interface EarningsCardProps {
  event: EnrichedEarningsEvent
  onClick: (e: EnrichedEarningsEvent) => void
  highlighted?: boolean
  isWatched?: boolean
  onToggleWatchlist?: (ticker: string, isWatched: boolean) => void
}

export function EarningsCard({ event, onClick, highlighted, isWatched, onToggleWatchlist }: EarningsCardProps) {
  const epsBeat =
    event.epsActual !== null && event.epsEstimate !== null
      ? event.epsActual > event.epsEstimate
      : null
  const epsMiss =
    event.epsActual !== null && event.epsEstimate !== null
      ? event.epsActual < event.epsEstimate
      : null
  const revBeat =
    event.revenueActual !== null && event.revenueEstimate !== null
      ? event.revenueActual > event.revenueEstimate
      : null

  return (
    <motion.button
      variants={staggerItem}
      onClick={() => onClick(event)}
      className={cn(
        "w-full rounded-lg border transition-all duration-150 text-left group px-3 py-2.5 cursor-pointer",
        highlighted
          ? "bg-[var(--accent-muted)] border-[var(--accent-primary)]/40 ring-1 ring-[var(--accent-primary)]/20"
          : event.inPortfolio
            ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] ring-1 ring-[var(--accent-primary)]/30 hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]"
            : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Left: logo + ticker + portfolio indicator */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <LogoImg symbol={event.symbol} size={20} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-mono font-semibold text-sm text-[var(--accent-primary)] group-hover:text-[var(--accent-hover)] truncate">
                {event.symbol}
              </span>
              {event.inPortfolio && (
                <Briefcase
                  weight="fill"
                  className="w-3 h-3 text-[var(--accent-primary)] flex-shrink-0"
                />
              )}
            </div>
            {event.name && (
              <div className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
                {event.name}
              </div>
            )}
          </div>
        </div>

        {/* Center-right: EPS */}
        {(event.epsActual !== null || event.epsEstimate !== null) && (
          <div
            className={cn(
              "font-mono tabular-nums whitespace-nowrap text-xs font-semibold",
              event.epsActual !== null
                ? epsBeat
                  ? "text-[var(--data-positive)]"
                  : epsMiss
                    ? "text-[var(--data-negative)]"
                    : "text-[var(--text-muted)]"
                : "text-[var(--text-secondary)]"
            )}
          >
            <span className="text-[var(--text-muted)] mr-1">
              {event.epsActual !== null ? "EPS:" : "Est. EPS:"}
            </span>
            {event.epsActual !== null
              ? event.epsActual.toFixed(2)
              : event.epsEstimate?.toFixed(2)}
            {event.epsActual !== null && event.epsEstimate !== null && (
              <span className="ml-0.5 text-[10px]">
                {epsBeat ? "\u25B2" : epsMiss ? "\u25BC" : ""}
              </span>
            )}
          </div>
        )}

        {/* Far right: Revenue */}
        {(event.revenueActual !== null || event.revenueEstimate !== null) && (
          <div
            className={cn(
              "font-mono tabular-nums whitespace-nowrap text-xs font-semibold",
              event.revenueActual !== null
                ? revBeat
                  ? "text-[var(--data-positive)]/70"
                  : "text-[var(--data-negative)]/70"
                : "text-[var(--text-secondary)]"
            )}
          >
            <span className="text-[var(--text-muted)] mr-1">
              {event.revenueActual !== null ? "Rev:" : "Est. Rev:"}
            </span>
            {formatRevenue(event.revenueActual ?? event.revenueEstimate)}
            {event.revenueActual !== null && event.revenueEstimate !== null && (
              <span className="ml-0.5 text-[10px]">
                {event.revenueActual > event.revenueEstimate
                  ? "\u25B2"
                  : event.revenueActual < event.revenueEstimate
                    ? "\u25BC"
                    : ""}
              </span>
            )}
          </div>
        )}

        {/* Watchlist bookmark */}
        {onToggleWatchlist && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onToggleWatchlist(event.symbol, !!isWatched)
            }}
            role="button"
            tabIndex={0}
            className="p-1 rounded hover:bg-white/5 transition-colors flex-shrink-0"
            title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <BookmarkSimple
              size={16}
              weight={isWatched ? 'fill' : 'regular'}
              className={isWatched ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}
            />
          </div>
        )}
      </div>
    </motion.button>
  )
}
