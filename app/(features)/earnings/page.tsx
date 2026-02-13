"use client"

import { useState, useMemo } from "react"
import { useEarnings } from "@/hooks/use-earnings"
import { usePelicanPanel } from "@/hooks/use-pelican-panel"
import { PelicanChatPanel } from "@/components/pelican-panel/pelican-chat-panel"
import { Calendar, RefreshCw, TrendingUp, Search } from "lucide-react"

export default function EarningsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { events, isLoading, refetch } = useEarnings()
  const { state: pelicanState, openWithPrompt } = usePelicanPanel()

  // Group events by date
  const groupedEvents = useMemo(() => {
    const filtered = events.filter((event) =>
      event.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groups = filtered.reduce((acc, event) => {
      acc[event.date] = acc[event.date] || []
      acc[event.date]!.push(event)
      return acc
    }, {} as Record<string, typeof events>)

    // Sort dates
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [events, searchQuery])

  const handleEarningsClick = (event: typeof events[0]) => {
    const prompt = `Analyze ${event.symbol} earnings report:

**Earnings Details:**
- Date: ${new Date(event.date).toLocaleDateString()}
- Time: ${event.hour === 'bmo' ? 'Before Market Open' : event.hour === 'amc' ? 'After Market Close' : 'During Market Hours'}
- Quarter: Q${event.quarter} ${event.year}
${event.epsEstimate ? `- EPS Estimate: $${event.epsEstimate.toFixed(2)}` : ''}
${event.revenueEstimate ? `- Revenue Estimate: $${(event.revenueEstimate / 1000000).toFixed(0)}M` : ''}

Please provide:
1. Recent price action and technical setup
2. Key metrics to watch in the earnings report
3. Historical earnings reaction patterns
4. Risk/reward assessment for trading the event`

    openWithPrompt(event.symbol, prompt, 'earnings')
  }

  const showPelicanPanel = pelicanState.isOpen

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Earnings Calendar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {events.length} upcoming earnings reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticker..."
                className="w-64 pl-10 pr-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg bg-white/[0.06] border border-border hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-foreground/70 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Earnings List */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && events.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-foreground/50 text-sm">Loading earnings calendar...</p>
              </div>
            </div>
          ) : groupedEvents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-foreground/50 text-sm">
                {searchQuery ? 'No earnings found matching your search' : 'No upcoming earnings'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedEvents.map(([date, dateEvents]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold text-foreground">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </h2>
                    <span className="text-xs text-foreground/40">({dateEvents.length} reports)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dateEvents.map((event, idx) => (
                      <button
                        key={`${event.symbol}-${idx}`}
                        onClick={() => handleEarningsClick(event)}
                        className="p-4 rounded-lg border border-border bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-mono font-bold text-foreground text-lg group-hover:text-purple-400 transition-colors">
                            {event.symbol}
                          </div>
                          {event.hour && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
                                event.hour === 'bmo'
                                  ? 'bg-blue-600/20 text-blue-400'
                                  : event.hour === 'amc'
                                  ? 'bg-orange-600/20 text-orange-400'
                                  : 'bg-purple-600/20 text-purple-400'
                              }`}
                            >
                              {event.hour === 'bmo' ? 'Pre-Market' : event.hour === 'amc' ? 'After-Hours' : 'Intraday'}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-foreground/60">Quarter</span>
                            <span className="text-foreground font-medium">
                              Q{event.quarter} {event.year}
                            </span>
                          </div>

                          {event.epsEstimate !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-foreground/60">EPS Est.</span>
                              <span className="font-mono text-foreground">
                                ${event.epsEstimate.toFixed(2)}
                              </span>
                            </div>
                          )}

                          {event.revenueEstimate !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-foreground/60">Rev. Est.</span>
                              <span className="font-mono text-foreground">
                                ${(event.revenueEstimate / 1000000).toFixed(0)}M
                              </span>
                            </div>
                          )}

                          {event.epsActual !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-foreground/60">EPS Actual</span>
                              <span
                                className={`font-mono font-medium ${
                                  event.epsEstimate && event.epsActual > event.epsEstimate
                                    ? 'text-green-400'
                                    : event.epsEstimate && event.epsActual < event.epsEstimate
                                    ? 'text-red-400'
                                    : 'text-foreground'
                                }`}
                              >
                                ${event.epsActual.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TrendingUp className="w-3 h-3" />
                          Click to analyze
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Pelican AI */}
        {showPelicanPanel && (
          <div className="flex-shrink-0 w-[min(420px,30%)] h-full">
            <PelicanChatPanel />
          </div>
        )}
      </div>
    </div>
  )
}
