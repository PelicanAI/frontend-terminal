"use client"

export const dynamic = "force-dynamic"

import { useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { CaretLeft, CaretRight, ArrowsClockwise } from "@phosphor-icons/react"
import { useEnrichedEarnings, applyEarningsFilters } from "@/hooks/use-enriched-earnings"
import { useEconomicCalendar } from "@/hooks/use-economic-calendar"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { cn } from "@/lib/utils"
import { PageHeader, PelicanButton, staggerContainer, staggerItem } from "@/components/ui/pelican"
import { EarningsSpotlight } from "@/components/earnings/earnings-spotlight"
import { EarningsFilters } from "@/components/earnings/earnings-filters"
import { EarningsSection } from "@/components/earnings/earnings-section"
import { EarningsGridSkeleton } from "@/components/earnings/earnings-grid-skeleton"
import { EarningsEmptyState } from "@/components/earnings/earnings-empty-state"
import { EconomicCalendar } from "@/components/calendar/economic-calendar"
import type { EnrichedEarningsEvent, EarningsFilters as EarningsFiltersType } from "@/types/earnings"

const DEFAULT_FILTERS: EarningsFiltersType = {
  myPortfolio: false,
  sp500: false,
  mag7: false,
  bmo: false,
  amc: false,
  reported: false,
}

// Sort events by importance (revenue estimate as proxy for market cap)
function sortByImportance(events: EnrichedEarningsEvent[]): EnrichedEarningsEvent[] {
  return [...events].sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore
    const aRev = a.revenueEstimate ?? 0
    const bRev = b.revenueEstimate ?? 0
    if (bRev !== aRev) return bRev - aRev
    return a.symbol.localeCompare(b.symbol)
  })
}

export default function EarningsPage() {
  const [search, setSearch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [filters, setFilters] = useState<EarningsFiltersType>(DEFAULT_FILTERS)

  // Trader profile for market preferences
  const { survey } = useTraderProfile()
  const marketsTraded = survey?.markets_traded || ['stocks']
  const primaryMarket = marketsTraded[0] || 'stocks'
  const tradesForex = marketsTraded.includes('forex')
  const tradesFutures = marketsTraded.includes('futures')
  const showEconomicTab = tradesForex || tradesFutures

  // Default tab based on primary market
  const [calendarView, setCalendarView] = useState<'earnings' | 'economic'>(
    primaryMarket === 'forex' || primaryMarket === 'futures' ? 'economic' : 'earnings'
  )

  // Calculate the week's date range (Monday-Friday)
  const weekDays = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)

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

  const { events, stats, isLoading, refetch } = useEnrichedEarnings({ from: weekStart, to: weekEnd })
  const { events: economicEvents, isLoading: economicLoading } = useEconomicCalendar({ from: weekStart, to: weekEnd })
  const { openWithPrompt } = usePelicanPanelContext()

  // Apply filters + search
  const filteredEvents = useMemo(
    () => applyEarningsFilters(events, filters, search),
    [events, filters, search]
  )

  const hasActiveFilters = Object.values(filters).some(Boolean) || search.length > 0

  // Filter toggle handler
  const handleToggleFilter = useCallback((key: keyof EarningsFiltersType) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
  }, [])

  // Handle ticker click - open Pelican panel with contextual prompt
  const handleClick = useCallback((event: EnrichedEarningsEvent) => {
    const hourText = event.hour === 'bmo'
      ? 'before market open'
      : event.hour === 'amc'
      ? 'after hours'
      : 'during market hours'

    const nameStr = event.name ? ` (${event.name})` : ''
    const hasReported = event.epsActual !== null

    const prompt = hasReported
      ? `Earnings results for ${event.symbol}${nameStr}:
Reported Q${event.quarter} ${event.year} earnings ${hourText} on ${event.date}.
EPS: $${event.epsActual!.toFixed(2)} ${event.epsEstimate !== null ? `vs estimate $${event.epsEstimate.toFixed(2)}` : ''}
Revenue: ${event.revenueActual !== null ? `$${(event.revenueActual / 1e6).toFixed(0)}M` : 'N/A'} ${event.revenueEstimate !== null ? `vs estimate $${(event.revenueEstimate / 1e6).toFixed(0)}M` : ''}

Was this reaction justified? What are the key levels to watch? Any notable guidance or forward-looking commentary?`
      : `Earnings preview for ${event.symbol}${nameStr}:
Reporting Q${event.quarter} ${event.year} earnings ${hourText} on ${event.date}.
EPS estimate: ${event.epsEstimate != null ? `$${event.epsEstimate.toFixed(2)}` : 'N/A'}
Revenue estimate: ${event.revenueEstimate != null ? `$${(event.revenueEstimate / 1e6).toFixed(0)}M` : 'N/A'}

What are the key things to watch? Any whisper numbers or sentiment shifts? How has this stock reacted to the last few earnings? What's the implied move from options?`

    if (typeof openWithPrompt === 'function') {
      openWithPrompt(event.symbol, prompt, 'earnings', 'earnings_click')
    }
  }, [openWithPrompt])

  // Get filtered events for a specific date
  const getEventsForDate = useCallback((dateStr: string) => {
    return filteredEvents.filter(e => e.date === dateStr)
  }, [filteredEvents])

  const prevWeek = () => setWeekOffset(prev => prev - 1)
  const nextWeek = () => setWeekOffset(prev => prev + 1)
  const goToThisWeek = () => setWeekOffset(0)

  const formatWeekRange = () => {
    const start = weekDays[0]?.date
    const end = weekDays[4]?.date
    if (!start || !end) return ''
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // Build subtitle with stats
  const subtitle = useMemo(() => {
    const parts: string[] = [`${stats.total} reports`]
    if (stats.reported > 0) {
      parts.push(`${stats.reported} reported (${Math.round(stats.beatRate * 100)}% beat)`)
    }
    if (stats.portfolioOverlap > 0) {
      parts.push(`${stats.portfolioOverlap} in your portfolio`)
    }
    return parts.join(' · ')
  }, [stats])

  // Day column renderer
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

        {/* AMC Section */}
        {amc.length > 0 && (
          <EarningsSection
            events={amc}
            label="amc"
            onClick={handleClick}
            searchTerm={search}
            autoExpand={!!search}
          />
        )}

        {/* Empty state for day */}
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
        title={showEconomicTab ? "Calendar" : "Earnings Calendar"}
        subtitle={calendarView === 'economic'
          ? `${economicEvents.length} events \u00b7 ${economicEvents.filter(e => e.impact === 'high').length} high impact`
          : subtitle
        }
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

      {/* Tab switcher (only shown for forex/futures traders) */}
      {showEconomicTab && (
        <div className="flex items-center gap-1 mb-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setCalendarView('earnings')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              calendarView === 'earnings'
                ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Earnings
          </button>
          <button
            onClick={() => setCalendarView('economic')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              calendarView === 'economic'
                ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Economic Events
          </button>
        </div>
      )}

      {calendarView === 'earnings' ? (
        <>
          {/* Spotlight section — top 8 by impact score */}
          {!isLoading && events.length > 0 && (
            <EarningsSpotlight events={events} onClick={handleClick} />
          )}

          {/* Filters */}
          {!isLoading && events.length > 0 && (
            <EarningsFilters
              filters={filters}
              onToggle={handleToggleFilter}
              portfolioCount={stats.portfolioOverlap}
              search={search}
              onSearchChange={setSearch}
            />
          )}

          {isLoading ? (
            <EarningsGridSkeleton />
          ) : events.length === 0 ? (
            <EarningsEmptyState variant="no-data" />
          ) : filteredEvents.length === 0 && hasActiveFilters ? (
            <EarningsEmptyState variant="filtered" onClearFilters={clearFilters} />
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

              {/* Watermark */}
              <Image
                src="/pelican-logo-transparent.webp"
                alt=""
                width={500}
                height={500}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain opacity-[0.03] select-none pointer-events-none"
                style={{ filter: 'brightness(0) invert(1)' }}
                draggable={false}
                aria-hidden={true}
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
        </>
      ) : (
        economicLoading ? (
          <EarningsGridSkeleton />
        ) : (
          <EconomicCalendar events={economicEvents} primaryMarket={primaryMarket} />
        )
      )}
    </div>
  )
}
