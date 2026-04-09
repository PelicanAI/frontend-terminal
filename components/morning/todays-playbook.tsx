'use client'

import { useMemo, useState, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar01Icon as CalendarBlank,
  BarChartIcon as ChartBar,
  ArrowRight01Icon as CaretRight,
} from '@hugeicons/core-free-icons'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface EconomicEvent {
  event: string
  country: string
  date: string
  time: string
  impact: 'low' | 'medium' | 'high'
  actual: number | null
  estimate: number | null
  prior: number | null
  unit: string
}

interface EarningsEvent {
  date: string
  symbol: string
  epsActual: number | null
  epsEstimate: number | null
  revenueActual: number | null
  revenueEstimate: number | null
  hour: 'bmo' | 'amc' | 'dmh' | null
  quarter: number
  year: number
}

interface PlaybookItem {
  time: string
  sortKey: number
  type: 'economic' | 'earnings'
  title?: string
  impact?: 'high' | 'medium' | 'low'
  estimate?: string
  prior?: string
  actual?: string
  ticker?: string
  epsEstimate?: string
  revenueEstimate?: string
}

interface TodaysPlaybookProps {
  economicEvents: EconomicEvent[]
  economicLoading: boolean
  onAnalyze: (ticker: string | null, prompt: string) => void
}

function formatRevenue(val: number | null): string {
  if (val == null) return '---'
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toFixed(0)}`
}

/** Convert "HH:MM" 24hr to "H:MM AM/PM" */
function formatTimeET(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (h == null || m == null) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function TodaysPlaybook({ economicEvents, economicLoading, onAnalyze }: TodaysPlaybookProps) {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [earningsLoading, setEarningsLoading] = useState(true)

  // Fetch today's earnings
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/earnings?from=${today}&to=${today}`)
      .then(r => r.json())
      .then(data => setEarnings(data.events || []))
      .catch(() => setEarnings([]))
      .finally(() => setEarningsLoading(false))
  }, [])

  // Filter to today's economic events only (HIGH + MEDIUM impact)
  const todayStr = new Date().toISOString().split('T')[0]

  const playbook = useMemo(() => {
    const items: PlaybookItem[] = []

    // Add today's economic events
    economicEvents
      .filter(e => e.date === todayStr && (e.impact === 'high' || e.impact === 'medium'))
      .forEach(e => {
        let sortKey = 0
        if (e.time) {
          const [h, m] = e.time.split(':').map(Number)
          sortKey = (h || 0) * 60 + (m || 0)
        }

        items.push({
          time: e.time ? `${formatTimeET(e.time)} ET` : 'TBD',
          sortKey,
          type: 'economic',
          title: e.event,
          impact: e.impact,
          estimate: e.estimate != null ? `${e.estimate}${e.unit}` : undefined,
          prior: e.prior != null ? `${e.prior}${e.unit}` : undefined,
          actual: e.actual != null ? `${e.actual}${e.unit}` : undefined,
        })
      })

    // Add today's earnings grouped by session
    const bmoEarnings = earnings.filter(e => e.hour === 'bmo')
    const amcEarnings = earnings.filter(e => e.hour === 'amc')
    const otherEarnings = earnings.filter(e => e.hour !== 'bmo' && e.hour !== 'amc')

    // BMO earnings get sortKey of 540 (9:00 AM, before market open)
    bmoEarnings.forEach(e => {
      items.push({
        time: 'Pre-Market',
        sortKey: 540,
        type: 'earnings',
        ticker: e.symbol,
        epsEstimate: e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : undefined,
        revenueEstimate: formatRevenue(e.revenueEstimate),
      })
    })

    // AMC earnings get sortKey of 960 (4:00 PM, after market close)
    amcEarnings.forEach(e => {
      items.push({
        time: 'After Hours',
        sortKey: 960,
        type: 'earnings',
        ticker: e.symbol,
        epsEstimate: e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : undefined,
        revenueEstimate: formatRevenue(e.revenueEstimate),
      })
    })

    // Other earnings
    otherEarnings.forEach(e => {
      items.push({
        time: 'During Market',
        sortKey: 720,
        type: 'earnings',
        ticker: e.symbol,
        epsEstimate: e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : undefined,
        revenueEstimate: formatRevenue(e.revenueEstimate),
      })
    })

    // Sort by time
    items.sort((a, b) => a.sortKey - b.sortKey)
    return items
  }, [economicEvents, earnings, todayStr])

  // Group items by time slot for display
  const groupedPlaybook = useMemo(() => {
    const groups: { time: string; items: PlaybookItem[] }[] = []
    for (const item of playbook) {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.time === item.time) {
        lastGroup.items.push(item)
      } else {
        groups.push({ time: item.time, items: [item] })
      }
    }
    return groups
  }, [playbook])

  const isLoading = economicLoading || earningsLoading

  return (
    <PelicanCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={CalendarBlank} className="h-4 w-4 text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Today&apos;s Playbook</h2>
        </div>
        <Link
          href="/markets?tab=earnings"
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          View All
          <HugeiconsIcon icon={CaretRight} className="h-3 w-3" strokeWidth={2} color="currentColor" />
        </Link>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 w-20 bg-[var(--bg-elevated)] rounded mb-2" />
              <div className="h-10 w-full bg-[var(--bg-elevated)] rounded-lg" />
            </div>
          ))}
        </div>
      ) : playbook.length === 0 ? (
        /* Empty state */
        <div className="py-6 text-center">
          <HugeiconsIcon icon={CalendarBlank} className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" strokeWidth={1} color="currentColor" />
          <p className="text-sm text-[var(--text-secondary)]">No economic releases or earnings today</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Low-catalyst day — focus on technicals</p>
        </div>
      ) : (
        /* Timeline */
        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
          {groupedPlaybook.map((group) => (
            <div key={group.time}>
              {/* Time header */}
              <div className="sticky top-0 bg-[var(--bg-surface)]/95 backdrop-blur-sm z-10 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {group.time}
                </span>
              </div>

              {/* Events in this time slot */}
              <div className="space-y-1.5">
                {group.items.map((item, idx) => (
                  item.type === 'economic' ? (
                    <button
                      key={`eco-${idx}`}
                      onClick={() => {
                        const prompt = `How will today's ${item.title} release${item.estimate ? ` (consensus: ${item.estimate})` : ''} affect the market? What sectors and positions should I watch?`
                        onAnalyze(null, prompt)
                      }}
                      className="w-full flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-left transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          item.impact === 'high' ? 'bg-[var(--data-negative)]' :
                          item.impact === 'medium' ? 'bg-[var(--data-warning)]' :
                          'bg-[var(--data-positive)]'
                        )} />
                        <span className="text-sm text-[var(--text-primary)] truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {item.estimate && (
                          <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                            Est: {item.estimate}
                          </span>
                        )}
                        {item.prior && (
                          <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                            Prior: {item.prior}
                          </span>
                        )}
                      </div>
                    </button>
                  ) : (
                    <button
                      key={`earn-${item.ticker}-${idx}`}
                      onClick={() => {
                        const prompt = `Analyze ${item.ticker} ahead of earnings today. ${item.epsEstimate ? `EPS estimate: ${item.epsEstimate}.` : ''} ${item.revenueEstimate ? `Revenue estimate: ${item.revenueEstimate}.` : ''} What's the expected move and how should I position?`
                        onAnalyze(item.ticker!, prompt)
                      }}
                      className="w-full flex items-center justify-between rounded-lg bg-[var(--accent-muted)] px-3 py-2.5 text-left transition-all duration-150 hover:bg-[var(--accent-primary)]/15 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={ChartBar} className="h-3.5 w-3.5 text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
                        <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{item.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {item.epsEstimate && (
                          <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                            EPS: {item.epsEstimate}
                          </span>
                        )}
                        {item.revenueEstimate && (
                          <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                            Rev: {item.revenueEstimate}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PelicanCard>
  )
}
