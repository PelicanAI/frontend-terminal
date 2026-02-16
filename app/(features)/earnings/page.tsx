"use client"

export const dynamic = "force-dynamic"

import { useState, useMemo } from "react"
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useEarnings, type EarningsEvent } from "@/hooks/use-earnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { cn } from "@/lib/utils"

const MAX_VISIBLE = 8

// Loading skeleton for instant visual feedback
function EarningsGridSkeleton() {
  return (
    <div className="hidden md:grid grid-cols-5 gap-px bg-[rgba(139,92,246,0.08)] mx-4 sm:mx-6 rounded-xl overflow-hidden border border-[rgba(139,92,246,0.08)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[var(--surface-0)] flex flex-col min-h-[400px]">
          {/* Day header skeleton */}
          <div className="p-3 text-center border-b border-[rgba(139,92,246,0.08)]">
            <div className="h-3 w-10 bg-white/5 rounded mx-auto mb-1 animate-pulse" />
            <div className="h-5 w-14 bg-white/5 rounded mx-auto mb-1 animate-pulse" />
            <div className="h-3 w-8 bg-white/5 rounded mx-auto animate-pulse" />
          </div>
          {/* Section skeletons */}
          <div className="px-2 pt-3 space-y-3">
            {/* BMO section */}
            <div>
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse mb-2" />
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-7 w-full bg-white/5 rounded-md animate-pulse" />
                ))}
              </div>
            </div>
            {/* AMC section */}
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

// Compact earnings card component
function EarningsCard({
  event,
  onClick,
  highlighted
}: {
  event: EarningsEvent
  onClick: (e: EarningsEvent) => void
  highlighted?: boolean
}) {
  return (
    <button
      onClick={() => onClick(event)}
      className={cn(
        "w-full px-2 py-1.5 rounded-md border transition-colors text-left group",
        highlighted
          ? "bg-[#8b5cf6]/10 border-[#8b5cf6]/40 ring-1 ring-[#8b5cf6]/20"
          : "bg-[var(--surface-1)] border-[rgba(139,92,246,0.08)] hover:border-[#8b5cf6]/30 hover:bg-[var(--surface-2)]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={`https://eodhd.com/img/logos/US/${event.symbol}.png`}
            alt=""
            className="w-4 h-4 rounded-sm object-contain flex-shrink-0 bg-white/5"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="font-mono font-bold text-xs text-[#8b5cf6] group-hover:text-[#a78bfa] truncate">
            {event.symbol}
          </span>
        </div>
        {event.epsEstimate != null ? (
          <span className={cn(
            "text-[10px] font-mono",
            event.epsEstimate >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            ${event.epsEstimate.toFixed(2)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-600">—</span>
        )}
      </div>
    </button>
  )
}

// Earnings section with expand/collapse
function EarningsSection({
  events,
  label,
  icon,
  onClick,
  searchTerm,
  autoExpand
}: {
  events: EarningsEvent[]
  label: 'bmo' | 'amc'
  icon: string
  onClick: (e: EarningsEvent) => void
  searchTerm?: string
  autoExpand?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const shouldExpand = autoExpand || expanded
  const visible = shouldExpand ? events : events.slice(0, MAX_VISIBLE)
  const hasMore = events.length > MAX_VISIBLE

  const searchMatch = (event: EarningsEvent) => {
    if (!searchTerm) return false
    return event.symbol.toUpperCase().includes(searchTerm.toUpperCase())
  }

  return (
    <div className="px-2 pt-2">
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-wider",
            label === 'bmo' ? 'text-amber-400' : 'text-blue-400'
          )}
        >
          {icon} {label === 'bmo' ? 'Before Open' : 'After Close'}
        </span>
        <span className="text-[9px] text-gray-600">({events.length})</span>
      </div>
      <div className="space-y-1">
        {visible.map(event => (
          <EarningsCard
            key={event.symbol}
            event={event}
            onClick={onClick}
            highlighted={searchMatch(event)}
          />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-1 py-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? 'Show less' : `+${events.length - MAX_VISIBLE} more`}
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

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Earnings Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">{totalReports} reports this week</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Week navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-2 rounded-lg hover:bg-[#1e1e2e] text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-white min-w-[220px] text-center">
              {formatWeekRange()}
            </span>
            <button
              onClick={nextWeek}
              className="p-2 rounded-lg hover:bg-[#1e1e2e] text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={goToThisWeek}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#1e1e2e] text-gray-300 hover:bg-[#2a2a3a] transition-colors min-h-[44px]"
              >
                This Week
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-48 rounded-lg bg-[#13131a] border border-[#1e1e2e] text-sm text-white placeholder-gray-500 focus:border-[#8b5cf6]/50 focus:outline-none min-h-[44px]"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#13131a] border border-[#1e1e2e] hover:bg-[#1a1a24] active:scale-95 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <RefreshCw className={cn("h-4 w-4 text-gray-400", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <EarningsGridSkeleton />
      ) : (
        <>
          {/* Desktop: 5-column grid */}
          <div className="hidden md:grid grid-cols-5 gap-px bg-[rgba(139,92,246,0.08)] rounded-xl overflow-hidden border border-[rgba(139,92,246,0.08)]">
            {weekDays.map((day, i) => {
              const dayEvents = getEventsForDate(day.dateStr)
              const bmo = sortByImportance(dayEvents.filter(e => e.hour === 'bmo'))
              const amc = sortByImportance(dayEvents.filter(e => e.hour === 'amc' || e.hour === 'dmh' || !e.hour))
              const isToday = day.dateStr === todayStr

              return (
                <div key={i} className="bg-[var(--surface-0)] flex flex-col min-h-[400px]">
                  {/* Day header */}
                  <div className={cn(
                    "p-3 text-center border-b border-[#1e1e2e]",
                    isToday && "bg-[#8b5cf6]/10"
                  )}>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      {day.dayName}
                    </div>
                    <div className={cn(
                      "text-sm font-bold",
                      isToday ? "text-[#8b5cf6]" : "text-white"
                    )}>
                      {day.monthDay}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      ({dayEvents.length})
                    </div>
                  </div>

                  {/* BMO Section */}
                  {bmo.length > 0 && (
                    <EarningsSection
                      events={bmo}
                      label="bmo"
                      icon="☀"
                      onClick={handleClick}
                      searchTerm={search}
                      autoExpand={!!search}
                    />
                  )}

                  {/* AMC Section */}
                  {amc.length > 0 && (
                    <EarningsSection
                      events={amc}
                      label="amc"
                      icon="🌙"
                      onClick={handleClick}
                      searchTerm={search}
                      autoExpand={!!search}
                    />
                  )}

                  {/* Empty state */}
                  {dayEvents.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs text-gray-600">No reports</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden overflow-x-auto scrollbar-hide">
            <div className="flex gap-px min-w-[1000px] bg-[rgba(139,92,246,0.08)] rounded-xl overflow-hidden border border-[rgba(139,92,246,0.08)]">
              {weekDays.map((day, i) => {
                const dayEvents = getEventsForDate(day.dateStr)
                const bmo = sortByImportance(dayEvents.filter(e => e.hour === 'bmo'))
                const amc = sortByImportance(dayEvents.filter(e => e.hour === 'amc' || e.hour === 'dmh' || !e.hour))
                const isToday = day.dateStr === todayStr

                return (
                  <div key={i} className="w-[200px] flex-shrink-0 bg-[var(--surface-0)] flex flex-col min-h-[400px]">
                    {/* Day header */}
                    <div className={cn(
                      "p-3 text-center border-b border-[#1e1e2e]",
                      isToday && "bg-[#8b5cf6]/10"
                    )}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                        {day.dayName}
                      </div>
                      <div className={cn(
                        "text-sm font-bold",
                        isToday ? "text-[#8b5cf6]" : "text-white"
                      )}>
                        {day.monthDay}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        ({dayEvents.length})
                      </div>
                    </div>

                    {/* BMO Section */}
                    {bmo.length > 0 && (
                      <EarningsSection
                        events={bmo}
                        label="bmo"
                        icon="☀"
                        onClick={handleClick}
                        searchTerm={search}
                        autoExpand={!!search}
                      />
                    )}

                    {/* AMC Section */}
                    {amc.length > 0 && (
                      <EarningsSection
                        events={amc}
                        label="amc"
                        icon="🌙"
                        onClick={handleClick}
                        searchTerm={search}
                        autoExpand={!!search}
                      />
                    )}

                    {/* Empty state */}
                    {dayEvents.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-xs text-gray-600">No reports</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
