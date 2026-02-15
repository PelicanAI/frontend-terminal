"use client"

export const dynamic = "force-dynamic"

import { useState, useMemo } from "react"
import { Search, RefreshCw, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react"
import { useEarnings, type EarningsEvent } from "@/hooks/use-earnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"

export default function EarningsPage() {
  const [search, setSearch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  // Default to today's date
  const todayStr = new Date().toISOString().split('T')[0] ?? ''
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  // Calculate the week's date range
  const weekDates = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7) // Monday

    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
  }, [weekOffset])

  function formatDate(d: Date): string {
    return d.toISOString().split('T')[0] ?? ''
  }

  function isToday(d: Date) {
    return formatDate(d) === formatDate(new Date())
  }

  // Calculate week range for API call (Monday to Friday)
  const weekStart = formatDate(weekDates[0] ?? new Date())
  const weekEnd = formatDate(weekDates[4] ?? new Date())

  const { events, isLoading, refetch } = useEarnings({ from: weekStart, to: weekEnd })
  const { openWithPrompt } = usePelicanPanelContext()

  // Count events for a specific date
  const countForDate = (dateStr: string) =>
    events.filter(e => e.date === dateStr).length

  // Filter events by selected date and search
  const filtered = useMemo(() => {
    if (!selectedDate) return []
    let result = events.filter(e => e.date === selectedDate)
    if (search) {
      const q = search.toUpperCase()
      result = result.filter(e => e.symbol?.toUpperCase().includes(q))
    }
    return result
  }, [events, selectedDate, search])

  // Split into BMO (before market open) and AMC (after market close)
  const bmo = filtered.filter(e => e.hour === 'bmo')
  const amc = filtered.filter(e => e.hour === 'amc')
  const other = filtered.filter(e => e.hour !== 'bmo' && e.hour !== 'amc')

  const handleRowClick = (ticker: string) => {
    if (typeof openWithPrompt === 'function') {
      openWithPrompt(
        ticker,
        `Analyze ${ticker} earnings report. Include recent price action, key metrics to watch, and risk/reward assessment.`,
        'earnings'
      )
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Earnings Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">{filtered.length} reports</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#13131a] border border-[#1e1e2e] rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] w-full sm:w-64 min-h-[44px]"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#13131a] border border-[#1e1e2e] hover:bg-[#1a1a24] active:scale-95 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Week Date Picker */}
      <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-1.5 rounded hover:bg-[#1e1e2e] text-gray-400 hover:text-white active:scale-95 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-1 flex-1 justify-center">
          {weekDates.map((d) => {
            const dateStr = formatDate(d)
            const active = dateStr === selectedDate
            const count = countForDate(dateStr)
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative min-h-[44px] flex-shrink-0 ${
                  active
                    ? 'bg-[#8b5cf6] text-white shadow-inner'
                    : isToday(d)
                    ? 'bg-[#1e1e2e] text-[#8b5cf6] border border-[#8b5cf6]/30'
                    : 'bg-[#13131a] text-gray-400 hover:bg-[#1e1e2e] hover:text-white active:scale-95'
                }`}
              >
                <div className="text-[10px] sm:text-xs opacity-70">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="flex items-center justify-center gap-1">
                  {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {count > 0 && (
                    <span className="text-[9px] opacity-60 ml-0.5">({count})</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-1.5 rounded hover:bg-[#1e1e2e] text-gray-400 hover:text-white active:scale-95 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="ml-2 text-xs text-[#8b5cf6] hover:underline"
          >
            This week
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 text-gray-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>No earnings reports for this date</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Before Market Open */}
          {bmo.length > 0 && (
            <EarningsSection title="Before Market Open" icon={<Sun className="h-4 w-4 text-amber-400" />} events={bmo} onRowClick={handleRowClick} />
          )}

          {/* After Hours */}
          {amc.length > 0 && (
            <EarningsSection title="After Hours" icon={<Moon className="h-4 w-4 text-blue-400" />} events={amc} onRowClick={handleRowClick} />
          )}

          {/* Time TBD */}
          {other.length > 0 && (
            <EarningsSection title="Time TBD" events={other} onRowClick={handleRowClick} />
          )}
        </div>
      )}
    </div>
  )
}

function EarningsSection({
  title,
  icon,
  events,
  onRowClick
}: {
  title: string
  icon?: React.ReactNode
  events: EarningsEvent[]
  onRowClick: (ticker: string) => void
}) {
  const borderColor = title === "Before Market Open" ? "border-amber-400/50" : title === "After Hours" ? "border-blue-400/50" : "border-gray-500/50"

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 pl-3 border-l-2 ${borderColor}`}>
        {icon}
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
        <span className="text-xs text-gray-500">({events.length})</span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-[#1e1e2e] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="section-header-gradient text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-right px-4 py-3">Quarter</th>
              <th className="text-right px-4 py-3">EPS Est.</th>
              <th className="text-right px-4 py-3">Rev. Est.</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <tr
                key={`${event.symbol}-${i}`}
                className="table-row-hover border-t border-[#1e1e2e]/50 cursor-pointer transition-colors group"
                onClick={() => onRowClick(event.symbol)}
              >
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-sm text-[#8b5cf6] group-hover:text-[#a78bfa] transition-colors">
                    {event.symbol}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                  Q{event.quarter} {event.year}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {event.epsEstimate != null ? (
                    <span className={event.epsEstimate >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ${event.epsEstimate.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                  {event.revenueEstimate != null ? (
                    formatRevenue(event.revenueEstimate)
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {events.map((event, i) => (
          <div
            key={`${event.symbol}-${i}`}
            onClick={() => onRowClick(event.symbol)}
            className="rounded-lg border border-[#1e1e2e] bg-[#13131a] p-4 cursor-pointer transition-colors hover:bg-[#1a1a24] active:scale-[0.98] min-h-[44px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold text-lg text-[#8b5cf6]">
                {event.symbol}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Q{event.quarter} {event.year}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">EPS Est.</div>
                <div className="font-mono text-sm">
                  {event.epsEstimate != null ? (
                    <span className={event.epsEstimate >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ${event.epsEstimate.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Rev. Est.</div>
                <div className="font-mono text-sm text-gray-400">
                  {event.revenueEstimate != null ? (
                    formatRevenue(event.revenueEstimate)
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatRevenue(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toLocaleString()}`
}
