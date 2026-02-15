"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState, useEffect } from "react"
import { useTrades } from "@/hooks/use-trades"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { PelicanCard } from "@/components/ui/pelican-card"
import { Sparkles, RefreshCw, CalendarDays } from "lucide-react"
import { getMarketStatus } from "@/hooks/use-market-data"

type MoversTab = "gainers" | "losers"

interface EconomicEvent {
  event: string
  country: string
  date: string
  time: string
  impact: "low" | "medium" | "high"
  actual: number | null
  estimate: number | null
  prior: number | null
  unit: string
}

export default function MorningPage() {
  const [moversTab, setMoversTab] = useState<MoversTab>("gainers")
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false)
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [economicLoading, setEconomicLoading] = useState(true)

  const { openTrades, isLoading: tradesLoading } = useTrades({ status: 'open' })
  const { movers, isLoading: moversLoading, refetch: refetchMovers } = useMorningBrief()
  const { isOpen: isPanelOpen, openWithPrompt } = usePelicanPanelContext()

  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === 'open'

  // Fetch economic calendar
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    setEconomicLoading(true)
    fetch(`/api/economic-calendar?from=${today}&to=${nextWeek}`)
      .then(r => r.json())
      .then(data => {
        setEconomicEvents(data.events || [])
        setEconomicLoading(false)
      })
      .catch(() => {
        setEconomicLoading(false)
      })
  }, [])

  // Filter to only HIGH and MEDIUM impact events, sorted by date/time
  const macroEvents = useMemo(() => {
    return economicEvents
      .filter(e => e.impact === 'high' || e.impact === 'medium')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 6)
  }, [economicEvents])

  // Sort movers by price (highest first)
  const currentMovers = useMemo(() => {
    const moversToSort = moversTab === "gainers" ? movers.gainers : movers.losers
    return [...moversToSort].sort((a, b) => (b.price || 0) - (a.price || 0))
  }, [moversTab, movers.gainers, movers.losers])

  const handleAnalyzeTicker = async (ticker: string, name?: string) => {
    await openWithPrompt(
      ticker,
      `Analyze this mover: ${ticker}${name ? ` (${name})` : ""}. Include setup quality, risk zones, and a trade plan with invalidation.`,
      "morning"
    )
  }

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true)

    const prompt = `Generate my morning trading brief for ${new Date().toLocaleDateString()}:

**My Open Positions** (${openTrades.length} trades):
${openTrades.map((t) => `- ${t.ticker} ${t.direction.toUpperCase()} @ $${t.entry_price} (${t.quantity} shares)`).join('\n') || 'No open positions'}

**Top Gainers**:
${movers.gainers.slice(0, 5).map((m) => `- ${m.ticker}: +${m.changePercent.toFixed(2)}% @ $${m.price.toFixed(2)}`).join('\n')}

**Top Losers**:
${movers.losers.slice(0, 5).map((m) => `- ${m.ticker}: ${m.changePercent.toFixed(2)}% @ $${m.price.toFixed(2)}`).join('\n')}

**Market Status**: ${marketStatus}

Please provide:
1. Key market themes for today
2. Analysis of my open positions with risk/opportunity assessment
3. Notable movers and what's driving them
4. 2-3 actionable insights for today's session`

    await openWithPrompt(null, prompt, "brief")
    setIsGeneratingBrief(false)
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Morning Brief</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-2 sm:px-3 py-1.5">
            <div className={`h-2 w-2 rounded-full ${isMarketOpen ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="text-xs text-foreground/70">{isMarketOpen ? "Market Open" : marketStatus.replace("-", " ")}</span>
          </div>
          <button
            onClick={() => refetchMovers()}
            disabled={moversLoading}
            className="rounded-lg border border-border bg-white/[0.06] px-2 sm:px-3 py-1.5 transition-colors hover:bg-white/[0.08] active:scale-95 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Refresh movers"
          >
            <RefreshCw className={`h-4 w-4 text-foreground/70 ${moversLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 p-0 lg:grid-cols-2">
        <PelicanCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Active Exposure</h2>
            <span className="text-xs text-muted-foreground">{openTrades.length} open</span>
          </div>
          {tradesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
            </div>
          ) : openTrades.length === 0 ? (
            <p className="text-sm text-foreground/50">No open positions.</p>
          ) : (
            <div className="space-y-3">
              {openTrades.slice(0, 8).map((trade) => {
                const pnl = trade.pnl_amount ?? 0
                const pnlColor = pnl >= 0 ? "text-green-400" : "text-[var(--destructive)]"
                return (
                  <button
                    key={trade.id}
                    onClick={() => handleAnalyzeTicker(trade.ticker)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.98] min-h-[44px]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-foreground">{trade.ticker}</span>
                      <span className={`text-xs font-medium uppercase ${trade.direction === "long" ? "text-green-400" : "text-red-400"}`}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/60">Entry ${trade.entry_price.toFixed(2)} · Qty {trade.quantity}</span>
                      <span className={`font-mono ${pnlColor}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </PelicanCard>

        <PelicanCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-purple-300" />
              Macro Pulse
            </h2>
          </div>
          {economicLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
            </div>
          ) : macroEvents.length === 0 ? (
            <p className="text-sm text-foreground/50">No major events this week</p>
          ) : (
            <div className="space-y-2">
              {macroEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[#1e1e2e] bg-[#13131a] p-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{event.event}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {event.time ? ` • ${event.time} ET` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Estimate vs Prior */}
                    <div className="text-right">
                      {event.estimate != null && (
                        <span className="text-xs text-gray-400 block">Est: {event.estimate}{event.unit}</span>
                      )}
                      {event.prior != null && (
                        <span className="text-xs text-gray-500 block">Prior: {event.prior}{event.unit}</span>
                      )}
                    </div>
                    {/* Impact badge */}
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      event.impact === 'high'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {event.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PelicanCard>

        <PelicanCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Market Movers</h2>
            <div className="rounded-lg border border-border bg-white/[0.06] p-1">
              <button
                onClick={() => setMoversTab("gainers")}
                className={`rounded px-2 py-1 text-xs ${moversTab === "gainers" ? "bg-purple-600 text-white" : "text-foreground/70"}`}
              >
                Gainers
              </button>
              <button
                onClick={() => setMoversTab("losers")}
                className={`rounded px-2 py-1 text-xs ${moversTab === "losers" ? "bg-purple-600 text-white" : "text-foreground/70"}`}
              >
                Losers
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {currentMovers.slice(0, 10).map((mover) => (
              <button
                key={`${moversTab}-${mover.ticker}`}
                onClick={() => handleAnalyzeTicker(mover.ticker, mover.name)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06] active:scale-[0.98] min-h-[44px]"
              >
                <div className="text-left">
                  <div className="font-mono text-sm font-semibold text-foreground">{mover.ticker}</div>
                  <div className="text-xs text-foreground/60">${mover.price.toFixed(2)}</div>
                </div>
                <div className={`font-mono text-sm tabular-nums ${mover.changePercent >= 0 ? "stat-positive" : "stat-negative"}`}>
                  {mover.changePercent >= 0 ? "+" : ""}
                  {mover.changePercent.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        </PelicanCard>

        <PelicanCard hover={false} className="relative overflow-hidden border border-primary/60 p-5">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 opacity-50 pointer-events-none" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-purple-300" />
                The Daily Roast
              </h2>
              {isPanelOpen && (
                <div className="flex items-center gap-1.5">
                  <div className="live-dot" />
                  <span className="text-xs text-purple-300">Live</span>
                </div>
              )}
            </div>
            <p className="thinking-shimmer-text mb-4 text-sm text-foreground/85">
              Generate AI context across your positions, movers, and macro setup for a high-signal briefing.
            </p>
            <button
              onClick={handleGenerateBrief}
              disabled={isGeneratingBrief}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 sm:py-3 text-sm font-medium text-white transition-all hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingBrief ? "Generating..." : "Run Daily Roast"}
            </button>
          </div>
        </PelicanCard>
      </div>
    </div>
  )
}
