"use client"

export const dynamic = "force-dynamic"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { MagnifyingGlass, CaretLeft, CaretRight, ArrowsClockwise, Sun, Moon } from "@phosphor-icons/react"
import { useEarnings, type EarningsEvent } from "@/hooks/use-earnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { cn } from "@/lib/utils"
import { LogoImg } from "@/components/ui/logo-img"
import { PageHeader, PelicanButton, staggerContainer, staggerItem } from "@/components/ui/pelican"

const MAX_VISIBLE_BMO = 3  // Cap Before Open at 3 rows
const MAX_VISIBLE_AMC = 8  // After Close shows 8 rows initially

// Revenue formatting helper
function formatRevenue(value: number | null): string {
  if (value === null || value === 0) return '—'
  const abs = Math.abs(value)
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${(value / 1e3).toFixed(0)}K`
}

// Loading skeleton for instant visual feedback
function EarningsGridSkeleton() {
  return (
    <div className="hidden md:grid grid-cols-5 gap-px bg-[var(--border-subtle)] mx-4 sm:mx-6 rounded-xl overflow-hidden border border-[var(--border-subtle)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[var(--bg-surface)] flex flex-col min-h-[400px]">
          {/* Day header skeleton */}
          <div className="p-3 text-center border-b border-[var(--border-subtle)]">
            <div className="h-3 w-10 bg-white/5 rounded mx-auto mb-1 animate-pulse" />
            <div className="h-5 w-14 bg-white/5 rounded mx-auto mb-1 animate-pulse" />
            <div className="h-3 w-8 bg-white/5 rounded mx-auto animate-pulse" />
          </div>
          {/* Section skeletons */}
          <div className="px-2 pt-3 space-y-3">
            <div>
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse mb-2" />
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-7 w-full bg-white/5 rounded-md animate-pulse" />
                ))}
              </div>
            </div>
            <div>
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse mb-2" />
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-7 w-full bg-white/5 rounded-md animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Sort events by importance (revenue estimate as proxy for market cap)
function sortByImportance(events: EarningsEvent[]): EarningsEvent[] {
  return [...events].sort((a, b) => {
    const aRev = a.revenueEstimate ?? 0
    const bRev = b.revenueEstimate ?? 0
    if (bRev !== aRev) return bRev - aRev
    return a.symbol.localeCompare(b.symbol)
  })
}

// Enlarged earnings card component with horizontal single-line layout
function EarningsCard({
  event,
  onClick,
  highlighted
}: {
  event: EarningsEvent
  onClick: (e: EarningsEvent) => void
  highlighted?: boolean
}) {
  const epsBeat = event.epsActual !== null && event.epsEstimate !== null
    ? event.epsActual > event.epsEstimate
    : null
  const epsMiss = event.epsActual !== null && event.epsEstimate !== null
    ? event.epsActual < event.epsEstimate
    : null
  const revBeat = event.revenueActual !== null && event.revenueEstimate !== null
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
          : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Left: logo + ticker */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <LogoImg symbol={event.symbol} size={20} />
          <span className="font-mono font-semibold text-sm text-[var(--accent-primary)] group-hover:text-[var(--accent-hover)] truncate">
            {event.symbol}
          </span>
        </div>

        {/* Center-right: EPS */}
        {(event.epsActual !== null || event.epsEstimate !== null) && (
          <div className={cn(
            "font-mono tabular-nums whitespace-nowrap text-xs",
            event.epsActual !== null
              ? epsBeat
                ? "text-[var(--data-positive)]"
                : epsMiss
                  ? "text-[var(--data-negative)]"
                  : "text-[var(--text-muted)]"
              : "text-[var(--text-disabled)]"
          )}>
            <span className="text-[var(--text-disabled)] mr-1">
              {event.epsActual !== null ? 'EPS:' : 'Est. EPS:'}
            </span>
            {event.epsActual !== null
              ? event.epsActual.toFixed(2)
              : event.epsEstimate?.toFixed(2)}
            {event.epsActual !== null && event.epsEstimate !== null && (
              <span className="ml-0.5 text-[10px]">
                {epsBeat ? '▲' : epsMiss ? '▼' : ''}
              </span>
            )}
          </div>
        )}

        {/* Far right: Revenue */}
        {(event.revenueActual !== null || event.revenueEstimate !== null) && (
          <div className={cn(
            "font-mono tabular-nums whitespace-nowrap text-xs",
            event.revenueActual !== null
              ? revBeat
                ? "text-[var(--data-positive)]/70"
                : "text-[var(--data-negative)]/70"
              : "text-[var(--text-disabled)]"
          )}>
            <span className="text-[var(--text-disabled)] mr-1">
              {event.revenueActual !== null ? 'Rev:' : 'Est. Rev:'}
            </span>
            {formatRevenue(event.revenueActual ?? event.revenueEstimate)}
            {event.revenueActual !== null && event.revenueEstimate !== null && (
              <span className="ml-0.5 text-[10px]">
                {event.revenueActual > event.revenueEstimate ? '▲' :
                 event.revenueActual < event.revenueEstimate ? '▼' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  )
}

// Earnings section with expand/collapse
function EarningsSection({
  events,
  label,
  onClick,
  searchTerm,
  autoExpand
}: {
  events: EarningsEvent[]
  label: 'bmo' | 'amc'
  onClick: (e: EarningsEvent) => void
  searchTerm?: string
  autoExpand?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const shouldExpand = autoExpand || expanded

  // Before Open caps at 3, After Close at 8
  const maxVisible = label === 'bmo' ? MAX_VISIBLE_BMO : MAX_VISIBLE_AMC

  const visible = shouldExpand ? events : events.slice(0, maxVisible)
  const hasMore = events.length > maxVisible

  const searchMatch = (event: EarningsEvent) => {
    if (!searchTerm) return false
    return event.symbol.toUpperCase().includes(searchTerm.toUpperCase())
  }

  return (
    <div className="px-2 pt-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        {label === 'bmo' ? (
          <Sun weight="bold" className="w-3 h-3 text-[var(--data-warning)]" />
        ) : (
          <Moon weight="bold" className="w-3 h-3 text-[var(--accent-primary)]" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label === 'bmo' ? 'Before Open' : 'After Close'}
        </span>
        <span className="text-[10px] font-mono tabular-nums text-[var(--text-disabled)]">({events.length})</span>
      </div>
      <motion.div
        className="space-y-1.5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {visible.map(event => (
          <EarningsCard
            key={event.symbol}
            event={event}
            onClick={onClick}
            highlighted={searchMatch(event)}
          />
        ))}
      </motion.div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-1 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
        >
          {expanded ? '− collapse' : `+${events.length - maxVisible} more`}
        </button>
      )}
    </div>
  )
}

export default function EarningsPage() {
  const [search, setSearch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  // Calculate the week's date range (Monday-Friday)
  const weekDays = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7) // Monday

    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return {
        date: d,
        dateStr: d.toISOString().split('T')[0] ?? '',
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    })
  }, [weekOffset])

  const weekStart = weekDays[0]?.dateStr ?? ''
  const weekEnd = weekDays[4]?.dateStr ?? ''
  const todayStr = new Date().toISOString().split('T')[0] ?? ''

  const { events, isLoading, refetch } = useEarnings({ from: weekStart, to: weekEnd })
  const { openWithPrompt } = usePelicanPanelContext()

  // Get events for a specific date
  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => e.date === dateStr)
  }

  // Total reports this week
  const totalReports = events.length

  // Handle ticker click - open Pelican panel with earnings preview
  const handleClick = (event: EarningsEvent) => {
    const hourText = event.hour === 'bmo'
      ? 'before market open'
      : event.hour === 'amc'
      ? 'after hours'
      : 'during market hours'

    const prompt = `Earnings preview for ${event.symbol}:
Reporting Q${event.quarter} ${event.year} earnings ${hourText} on ${event.date}.
EPS estimate: ${event.epsEstimate != null ? `$${event.epsEstimate.toFixed(2)}` : 'N/A'}
Revenue estimate: ${event.revenueEstimate != null ? `$${(event.revenueEstimate / 1e6).toFixed(0)}M` : 'N/A'}

What are the key things to watch? Any whisper numbers or sentiment shifts? How has this stock reacted to the last few earnings?`

    if (typeof openWithPrompt === 'function') {
      openWithPrompt(event.symbol, prompt, 'earnings')
    }
  }

  const prevWeek = () => setWeekOffset(prev => prev - 1)
  const nextWeek = () => setWeekOffset(prev => prev + 1)
  const goToThisWeek = () => setWeekOffset(0)

  const formatWeekRange = () => {
    const start = weekDays[0]?.date
    const end = weekDays[4]?.date
    if (!start || !end) return ''

    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // Day column renderer (shared between desktop and mobile)
  const renderDayColumn = (day: typeof weekDays[0], i: number) => {
    const dayEvents = getEventsForDate(day.dateStr)
    const bmo = sortByImportance(dayEvents.filter(e => e.hour === 'bmo'))
    const amc = sortByImportance(dayEvents.filter(e => e.hour === 'amc' || e.hour === 'dmh' || !e.hour))
    const isToday = day.dateStr === todayStr

    return (
      <motion.div
        key={i}
        variants={staggerItem}
        className={cn(
          "bg-[var(--bg-surface)] flex flex-col min-h-[400px]",
          // Mobile: fixed width
          "md:w-auto w-[200px] flex-shrink-0"
        )}
      >
        {/* Day header */}
        <div className={cn(
          "p-3 text-center border-b border-[var(--border-subtle)]",
          isToday && "bg-[var(--accent-muted)]"
        )}>
          {isToday && (
            <div className="h-0.5 bg-[var(--accent-primary)] rounded-full -mt-3 mb-2 mx-auto w-8" />
          )}
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {day.dayName}
          </div>
          <div className={cn(
            "text-sm font-bold font-mono tabular-nums",
            isToday ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
          )}>
            {day.monthDay}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
            ({dayEvents.length})
          </div>
        </div>

        {/* BMO Section */}
        {bmo.length > 0 && (
          <EarningsSection
            events={bmo}
            label="bmo"
            onClick={handleClick}
            searchTerm={search}
            autoExpand={!!search}
          />
        )}

        {/* Divider between sections */}
        {bmo.length > 0 && amc.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] my-2 mx-2" />
        )}

        {/* AMC Section - The main event */}
        {amc.length > 0 && (
          <EarningsSection
            events={amc}
            label="amc"
            onClick={handleClick}
            searchTerm={search}
            autoExpand={!!search}
          />
        )}

        {/* Empty state */}
        {dayEvents.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-[var(--text-disabled)]">No reports</span>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        title="Earnings Calendar"
        subtitle={`${totalReports} reports this week`}
        actions={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Week navigator */}
            <div className="flex items-center gap-2">
              <PelicanButton
                variant="ghost"
                size="sm"
                onClick={prevWeek}
                className="min-h-[44px] min-w-[44px]"
              >
                <CaretLeft weight="bold" className="h-4 w-4" />
              </PelicanButton>
              <span className="text-sm font-medium text-[var(--text-primary)] min-w-[220px] text-center">
                {formatWeekRange()}
              </span>
              <PelicanButton
                variant="ghost"
                size="sm"
                onClick={nextWeek}
                className="min-h-[44px] min-w-[44px]"
              >
                <CaretRight weight="bold" className="h-4 w-4" />
              </PelicanButton>
              {weekOffset !== 0 && (
                <PelicanButton
                  variant="secondary"
                  size="sm"
                  onClick={goToThisWeek}
                  className="min-h-[44px]"
                >
                  This Week
                </PelicanButton>
              )}
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search ticker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-48 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors duration-150 min-h-[44px]"
              />
            </div>

            <PelicanButton
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowsClockwise className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </PelicanButton>
          </div>
        }
      />

      {isLoading ? (
        <EarningsGridSkeleton />
      ) : (
        <motion.div
          className="relative"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Desktop: 5-column grid */}
          <motion.div
            className="hidden md:grid grid-cols-5 gap-px bg-[var(--border-subtle)] rounded-xl overflow-hidden border border-[var(--border-subtle)]"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {weekDays.map((day, i) => renderDayColumn(day, i))}
          </motion.div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden overflow-x-auto scrollbar-hide">
            <motion.div
              className="flex gap-px min-w-[1000px] bg-[var(--border-subtle)] rounded-xl overflow-hidden border border-[var(--border-subtle)]"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {weekDays.map((day, i) => renderDayColumn(day, i))}
            </motion.div>
          </div>

          {/* Watermark - renders on top of grid content */}
          <img
            src="/pelican-logo-transparent.webp"
            alt=""
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain opacity-[0.03] select-none pointer-events-none"
            style={{ filter: 'brightness(0) invert(1)' }}
            draggable={false}
            aria-hidden="true"
          />
        </motion.div>
      )}

      {/* Attribution for Parqet logos */}
      <div className="text-center py-3 mt-2">
        <a
          href="https://elbstream.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[var(--text-disabled)] hover:text-[var(--text-muted)] transition-colors duration-150"
        >
          Logos provided by Elbstream
        </a>
      </div>
    </div>
  )
}
