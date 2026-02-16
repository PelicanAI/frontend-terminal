"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState, useEffect } from "react"
import { useTrades } from "@/hooks/use-trades"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { PelicanCard } from "@/components/ui/pelican-card"
import { Sparkles, RefreshCw, CalendarDays } from "lucide-react"
import { getMarketStatus } from "@/hooks/use-market-data"
import { LogoImg } from "@/components/ui/logo-img"
import { MessageContent } from "@/components/chat/message/message-content"

type MoversTab = "gainers" | "losers"

interface PriceTier {
  label: string
  min: number
  max: number
}

const PRICE_TIERS: PriceTier[] = [
  { label: 'All', min: 0, max: Infinity },
  { label: '$200+', min: 200, max: Infinity },
  { label: '$100–$200', min: 100, max: 200 },
  { label: '$50–$100', min: 50, max: 100 },
  { label: '$10–$50', min: 10, max: 50 },
  { label: 'Penny Stocks', min: 0, max: 10 },
]

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
  const [priceTier, setPriceTier] = useState<PriceTier>(PRICE_TIERS[1]!) // Default to $200+
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [economicLoading, setEconomicLoading] = useState(true)
  const [briefContent, setBriefContent] = useState<string>('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)

  const { openTrades, isLoading: tradesLoading } = useTrades({ status: 'open' })
  const { movers, isLoading: moversLoading, refetch: refetchMovers } = useMorningBrief()
  const { openWithPrompt } = usePelicanPanelContext()

  // Get live quotes for open positions to calculate unrealized P&L
  const openTickersWithTypes = openTrades
    .map(t => `${t.ticker}:${t.asset_type}`)
  const { quotes } = useLiveQuotes(openTickersWithTypes)

  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === 'open'

  // Load cached brief on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const cached = localStorage.getItem(`pelican-brief-${today}`)
    if (cached) {
      setBriefContent(cached)
    }
  }, [])

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

  // Sort movers by price (highest first) and filter by price tier
  const currentMovers = useMemo(() => {
    const moversToSort = moversTab === "gainers" ? movers.gainers : movers.losers
    return [...moversToSort]
      .filter(m => m.price >= priceTier.min && m.price < priceTier.max)
      .sort((a, b) => (b.price || 0) - (a.price || 0))
  }, [moversTab, movers.gainers, movers.losers, priceTier])

  const handleAnalyzeTicker = async (ticker: string, name?: string, price?: number, changePercent?: number) => {
    let prompt = `Analyze ${ticker}${name ? ` (${name})` : ""}`

    if (price !== undefined && changePercent !== undefined) {
      const direction = changePercent >= 0 ? 'up' : 'down'
      prompt = `Analyze ${ticker} — it's ${direction} ${Math.abs(changePercent).toFixed(2)}% today at $${price.toFixed(2)}. What's driving this move? Is there follow-through potential or is this a fade?`
    } else {
      prompt += `. Include setup quality, risk zones, and a trade plan with invalidation.`
    }

    await openWithPrompt(ticker, prompt, "morning")
  }

  const handleAnalyzePosition = async (trade: typeof openTrades[0]) => {
    const prompt = `Analyze my ${trade.direction} position in ${trade.ticker}: Entry $${trade.entry_price.toFixed(2)}, Qty ${trade.quantity}. What's the current technical setup? Any upcoming catalysts or risks I should watch?`
    await openWithPrompt(trade.ticker, prompt, "morning")
  }

  const handleGenerateBrief = async () => {
    setBriefLoading(true)
    setBriefError(null)
    setBriefContent('')

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

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          conversation_id: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate brief')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              throw new Error(parsed.error)
            }
            if (parsed.content) {
              fullContent += parsed.content
              setBriefContent(fullContent)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
          }
        }
      }

      // Cache for today
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem(`pelican-brief-${today}`, fullContent)
    } catch (err) {
      console.error('Brief generation error:', err)
      setBriefError('Failed to generate brief. Please try again.')
    } finally {
      setBriefLoading(false)
    }
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
                // Calculate unrealized P&L from live prices
                const quote = quotes[trade.ticker]
                const currentPrice = quote?.price
                const direction = trade.direction === 'long' ? 1 : -1

                let unrealizedPnL: number | null = null
                if (currentPrice) {
                  unrealizedPnL = (currentPrice - trade.entry_price) * trade.quantity * direction
                }

                const pnl = unrealizedPnL ?? trade.pnl_amount ?? null
                const pnlColor = pnl === null
                  ? "text-foreground/40"
                  : pnl >= 0
                    ? "text-green-400"
                    : "text-red-400"

                return (
                  <button
                    key={trade.id}
                    onClick={() => handleAnalyzePosition(trade)}
                    className="w-full rounded-lg border border-white/[0.04] bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.98] min-h-[44px]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LogoImg symbol={trade.ticker} size={20} />
                        <span className="font-mono text-sm font-semibold text-foreground">{trade.ticker}</span>
                      </div>
                      <span className={`text-xs font-medium uppercase ${trade.direction === "long" ? "text-green-400" : "text-red-400"}`}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/60">Entry ${trade.entry_price.toFixed(2)} · Qty {trade.quantity}</span>
                      <span className={`font-mono ${pnlColor}`}>
                        {pnl === null ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
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
            <p className="text-sm text-foreground/40">
              No upcoming economic events this week
            </p>
          ) : (
            <div className="space-y-2">
              {macroEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-[#13131a] p-3"
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
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Market Movers</h2>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.06] p-1">
                <button
                  onClick={() => setMoversTab("gainers")}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    moversTab === "gainers"
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : "text-foreground/40 border border-transparent"
                  }`}
                >
                  Gainers
                </button>
                <button
                  onClick={() => setMoversTab("losers")}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    moversTab === "losers"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "text-foreground/40 border border-transparent"
                  }`}
                >
                  Losers
                </button>
              </div>
            </div>

            {/* Price Tier Filter */}
            <div className="flex gap-1 flex-wrap">
              {PRICE_TIERS.map(tier => (
                <button
                  key={tier.label}
                  onClick={() => setPriceTier(tier)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    priceTier.label === tier.label
                      ? "bg-[#8b5cf6] text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {currentMovers.slice(0, 10).map((mover) => (
              <button
                key={`${moversTab}-${mover.ticker}`}
                onClick={() => handleAnalyzeTicker(mover.ticker, mover.name, mover.price, mover.changePercent)}
                className="flex w-full items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06] active:scale-[0.98] min-h-[44px]"
              >
                <div className="flex items-center gap-2 text-left">
                  <LogoImg symbol={mover.ticker} size={18} />
                  <div>
                    <div className="font-mono text-sm font-semibold text-foreground">{mover.ticker}</div>
                    <div className="text-xs text-foreground/60">${mover.price.toFixed(2)}</div>
                  </div>
                </div>
                <div className={`font-mono text-sm tabular-nums ${mover.changePercent >= 0 ? "stat-positive" : "stat-negative"}`}>
                  {mover.changePercent >= 0 ? "+" : ""}
                  {mover.changePercent.toFixed(2)}%
                </div>
              </button>
            ))}
            {currentMovers.length === 0 && !moversLoading && (
              <p className="text-sm text-foreground/50 text-center py-4">
                No {moversTab} in the {priceTier.label} range today
              </p>
            )}
          </div>
        </PelicanCard>

        <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-lg text-foreground">Pelican Brief</h3>
            </div>
            {briefContent && !briefLoading && (
              <button
                onClick={handleGenerateBrief}
                className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            )}
          </div>

          {/* Empty state */}
          {!briefContent && !briefLoading && !briefError && (
            <>
              <p className="text-sm text-foreground/50 mb-4">
                AI-generated morning intelligence across your positions, movers, and macro setup.
              </p>
              <button
                onClick={handleGenerateBrief}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors active:scale-95 min-h-[44px]"
              >
                <Sparkles className="h-4 w-4" />
                Generate Brief
              </button>
            </>
          )}

          {/* Loading state */}
          {briefLoading && (
            <div className="flex items-center gap-3 py-8">
              <div className="h-5 w-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              <span className="text-sm text-foreground/50">
                Generating your morning brief...
              </span>
            </div>
          )}

          {/* Streamed/completed content */}
          {briefContent && (
            <div className="text-foreground/80 leading-relaxed">
              <MessageContent
                content={briefContent}
                isStreaming={briefLoading}
                showSkeleton={false}
              />
            </div>
          )}

          {/* Error state */}
          {briefError && (
            <div>
              <p className="text-sm text-red-400 mb-3">{briefError}</p>
              <button
                onClick={handleGenerateBrief}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
