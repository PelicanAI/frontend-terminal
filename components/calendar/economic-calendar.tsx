"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { cn } from "@/lib/utils"
import { staggerContainer, staggerItem } from "@/components/ui/pelican"
import type { EconomicEvent } from "@/hooks/use-economic-calendar"

interface EconomicCalendarProps {
  events: EconomicEvent[]
  primaryMarket?: string
}

function groupByDate(events: EconomicEvent[]): { date: string; events: EconomicEvent[] }[] {
  const groups = new Map<string, EconomicEvent[]>()
  for (const event of events) {
    const existing = groups.get(event.date)
    if (existing) existing.push(event)
    else groups.set(event.date, [event])
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({
      date,
      events: events.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    }))
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function EconomicCalendar({ events, primaryMarket = 'stocks' }: EconomicCalendarProps) {
  const grouped = useMemo(() => groupByDate(events), [events])
  const { openWithPrompt } = usePelicanPanelContext()

  const handleEventClick = (event: EconomicEvent) => {
    const hasActual = event.actual !== null
    const marketContext = primaryMarket === 'forex'
      ? 'the major currency pairs'
      : primaryMarket === 'futures'
        ? 'ES, NQ, and bond futures'
        : 'the stock market'

    const prompt = hasActual
      ? `${event.event} (${event.country}) just came in at ${event.actual}${event.unit} vs estimate of ${event.estimate}${event.unit}. Prior was ${event.prior}${event.unit}. How should this affect ${marketContext}? What's the trade?`
      : `${event.event} (${event.country}) is scheduled for ${event.date}${event.time ? ` at ${event.time}` : ''}. Estimate: ${event.estimate ?? 'N/A'}${event.unit}. Prior: ${event.prior ?? 'N/A'}${event.unit}. What's the expected impact on ${primaryMarket === 'forex' ? 'major pairs' : primaryMarket === 'futures' ? 'futures' : 'the market'}? How should I position?`

    openWithPrompt(event.event, prompt, 'calendar', 'economic_calendar_click')
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[var(--text-muted)]">No economic events for this period</p>
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {grouped.map(group => (
        <motion.div key={group.date} variants={staggerItem}>
          {/* Date header */}
          <div className="text-sm font-medium text-[var(--text-primary)] mb-3 sticky top-0 bg-[var(--bg-base)] py-1 z-10">
            {formatDate(group.date)}
            <span className="ml-2 text-xs text-[var(--text-muted)]">({group.events.length} events)</span>
          </div>

          {/* Events */}
          <div className="space-y-1.5">
            {group.events.map((event, i) => {
              const hasActual = event.actual !== null
              const betterThanExpected = hasActual && event.estimate !== null
                ? event.actual! > event.estimate
                : null

              return (
                <button
                  key={`${event.date}-${event.event}-${i}`}
                  onClick={() => handleEventClick(event)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                             bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                             hover:border-[var(--accent-primary)]/20 hover:bg-[var(--bg-elevated)]
                             transition-all duration-150 text-left group"
                >
                  {/* Time */}
                  <span className="text-xs font-mono text-[var(--text-muted)] w-12 flex-shrink-0 tabular-nums">
                    {event.time || '\u2014'}
                  </span>

                  {/* Impact dot */}
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    event.impact === 'high' && "bg-red-400",
                    event.impact === 'medium' && "bg-amber-400",
                    event.impact === 'low' && "bg-gray-500",
                  )} />

                  {/* Country + Event */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] bg-white/[0.06] px-1 py-0.5 rounded">
                        {event.country}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)] transition-colors">
                        {event.event}
                      </span>
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="flex items-center gap-4 flex-shrink-0 text-xs font-mono tabular-nums">
                    {hasActual ? (
                      <span className={cn(
                        "font-semibold",
                        betterThanExpected === true && "text-emerald-400",
                        betterThanExpected === false && "text-red-400",
                        betterThanExpected === null && "text-[var(--text-primary)]",
                      )}>
                        {event.actual}{event.unit}
                      </span>
                    ) : event.estimate !== null ? (
                      <span className="text-[var(--text-muted)]">
                        Est: {event.estimate}{event.unit}
                      </span>
                    ) : null}

                    {event.prior !== null && (
                      <span className="text-[var(--text-muted)]/60 hidden sm:inline">
                        Prior: {event.prior}{event.unit}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
