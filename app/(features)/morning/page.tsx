"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import { useTrades } from "@/hooks/use-trades"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { useEarnings } from "@/hooks/use-earnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { PelicanCard } from "@/components/ui/pelican-card"
import { Sparkles, RefreshCw, CalendarDays } from "lucide-react"
import { getMarketStatus } from "@/hooks/use-market-data"

type MoversTab = "gainers" | "losers"

export default function MorningPage() {
  const [moversTab, setMoversTab] = useState<MoversTab>("gainers")
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false)

  const { openTrades, isLoading: tradesLoading } = useTrades({ status: 'open' })
  const { movers, isLoading: moversLoading, refetch: refetchMovers } = useMorningBrief()
  const { events: earningsEvents, isLoading: macroLoading } = useEarnings()
  const { isOpen: isPanelOpen, openWithPrompt } = usePelicanPanelContext()

  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === 'open'

  const macroPulseEvents = useMemo(() => earningsEvents.slice(0, 6), [earningsEvents])
  const currentMovers = moversTab === "gainers" ? movers.gainers : movers.losers

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
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Morning Brief</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-3 py-1.5">
            <div className={`h-2 w-2 rounded-full ${isMarketOpen ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="text-xs text-foreground/70">{isMarketOpen ? "Market Open" : marketStatus.replace("-", " ")}</span>
          </div>
          <button
            onClick={() => refetchMovers()}
            disabled={moversLoading}
            className="rounded-lg border border-border bg-white/[0.06] px-3 py-1.5 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
            aria-label="Refresh movers"
          >
            <RefreshCw className={`h-4 w-4 text-foreground/70 ${moversLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-0 lg:grid-cols-2">
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
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
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
          {macroLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
            </div>
          ) : macroPulseEvents.length === 0 ? (
            <p className="text-sm text-foreground/50">No economic/earnings dates found for this window.</p>
          ) : (
            <div className="space-y-2">
              {macroPulseEvents.map((event) => (
                <button
                  key={`${event.symbol}-${event.date}`}
                  onClick={() => handleAnalyzeTicker(event.symbol)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="font-mono text-sm font-semibold text-foreground">{event.symbol}</div>
                    <div className="text-xs text-foreground/60">{new Date(event.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--destructive)" }}
                    >
                      High Impact
                    </div>
                    <div className="text-xs uppercase text-foreground/60">{event.hour ?? "time tbd"}</div>
                  </div>
                </button>
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
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
              >
                <div className="text-left">
                  <div className="font-mono text-sm font-semibold text-foreground">{mover.ticker}</div>
                  <div className="text-xs text-foreground/60">${mover.price.toFixed(2)}</div>
                </div>
                <div className={`font-mono text-sm ${mover.changePercent >= 0 ? "text-green-400" : "text-[var(--destructive)]"}`}>
                  {mover.changePercent >= 0 ? "+" : ""}
                  {mover.changePercent.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        </PelicanCard>

        <PelicanCard hover={false} className="animate-pulse border border-primary/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-purple-300" />
              The Daily Roast
            </h2>
            {isPanelOpen && <span className="text-xs text-purple-300">Live</span>}
          </div>
          <p className="thinking-shimmer-text mb-4 text-sm text-foreground/85">
            Generate AI context across your positions, movers, and macro setup for a high-signal briefing.
          </p>
          <button
            onClick={handleGenerateBrief}
            disabled={isGeneratingBrief}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {isGeneratingBrief ? "Generating..." : "Run Daily Roast"}
          </button>
        </PelicanCard>
      </div>
    </div>
  )
}
