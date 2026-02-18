"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useTrades } from "@/hooks/use-trades"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import {
  PelicanCard,
  PageHeader,
  PelicanButton,
  DataCell,
  staggerContainer,
  staggerItem,
} from "@/components/ui/pelican"
import {
  ArrowsClockwise,
  CalendarBlank,
  RocketLaunch,
  Lightning,
} from "@phosphor-icons/react"
import { getMarketStatus } from "@/hooks/use-market-data"
import { LogoImg } from "@/components/ui/logo-img"
import { MessageContent } from "@/components/chat/message/message-content"
import { MarketSessions } from "@/components/morning/market-sessions"
import type { IPOEntry } from "@/app/api/ipos/route"
import type { Mover } from "@/hooks/use-morning-brief"

type MoversTab = "gainers" | "losers"
type AssetClass = "stocks" | "crypto" | "forex" | "etfs"

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

const CRYPTO_CATEGORIES: Record<string, string[]> = {
  'Top 20': [],
  'DeFi': ['UNI', 'AAVE', 'MKR', 'COMP', 'CRV', 'SNX', 'SUSHI', 'YFI', 'DYDX', 'LDO'],
  'L1/L2': ['ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'ATOM', 'APT', 'SUI', 'SEI', 'MATIC', 'ARB', 'OP'],
  'Meme': ['DOGE', 'SHIB', 'PEPE', 'WIF', 'FLOKI', 'BONK'],
}

const FOREX_CATEGORIES: Record<string, string[]> = {
  'Majors': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'],
  'Crosses': ['EURGBP', 'EURJPY', 'GBPJPY', 'AUDNZD', 'EURCHF', 'CADJPY', 'AUDJPY'],
  'Exotic': ['USDMXN', 'USDZAR', 'USDTRY', 'USDBRL', 'USDSGD', 'USDHKD'],
}

const ETF_CATEGORIES: Record<string, string[]> = {
  'Sector': ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP', 'XLU', 'XLY', 'XLC', 'XLB', 'XLRE'],
  'Thematic': ['ARKK', 'TAN', 'LIT', 'HACK', 'ROBO', 'SKYY', 'DRIV', 'SMH', 'CIBR'],
  'Bond': ['TLT', 'IEF', 'SHY', 'HYG', 'LQD', 'BND', 'AGG', 'TIPS', 'BNDX'],
  'Commodity': ['GLD', 'SLV', 'USO', 'UNG', 'DBA', 'PDBC', 'COPX', 'WEAT'],
  'Leveraged': ['TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'SOXL', 'SOXS', 'UVXY', 'SVXY'],
}

const ASSET_FILTER_OPTIONS: Record<AssetClass, string[]> = {
  stocks: ['All', '$200+', '$100\u2013$200', '$50\u2013$100', '$10\u2013$50', 'Penny Stocks'],
  crypto: ['All', 'Top 20', 'DeFi', 'L1/L2', 'Meme'],
  forex: ['All', 'Majors', 'Crosses', 'Exotic'],
  etfs: ['All', 'Sector', 'Thematic', 'Bond', 'Commodity', 'Leveraged'],
}

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

// IPO date formatter
function formatIPODate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export default function MorningPage() {
  const [moversTab, setMoversTab] = useState<MoversTab>("gainers")
  const [priceTier, setPriceTier] = useState<PriceTier>(PRICE_TIERS[0]!) // Default to All
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [economicLoading, setEconomicLoading] = useState(true)
  const [ipos, setIpos] = useState<IPOEntry[]>([])
  const [briefContent, setBriefContent] = useState<string>('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [assetClass, setAssetClass] = useState<AssetClass>('stocks')
  const [activeFilter, setActiveFilter] = useState('All')
  const [cryptoMovers, setCryptoMovers] = useState<Mover[]>([])
  const [forexMovers, setForexMovers] = useState<Mover[]>([])
  const [etfMovers, setEtfMovers] = useState<Mover[]>([])
  const [assetLoading, setAssetLoading] = useState(false)

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

  // Fetch upcoming IPOs
  useEffect(() => {
    fetch('/api/ipos')
      .then(r => r.json())
      .then(data => setIpos(data.ipos || []))
      .catch(() => setIpos([]))
  }, [])

  // Reset filter when switching asset class
  useEffect(() => {
    setPriceTier(PRICE_TIERS[0]!)
    setActiveFilter('All')
  }, [assetClass])

  // Fetch non-stock movers when asset class changes
  useEffect(() => {
    if (assetClass === 'stocks') return

    const endpoint = assetClass === 'crypto' ? '/api/movers/crypto'
      : assetClass === 'forex' ? '/api/movers/forex'
      : '/api/movers/etfs'

    setAssetLoading(true)
    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        const tickers = data.tickers || []
        if (assetClass === 'crypto') setCryptoMovers(tickers)
        else if (assetClass === 'forex') setForexMovers(tickers)
        else setEtfMovers(tickers)
      })
      .catch(() => {})
      .finally(() => setAssetLoading(false))
  }, [assetClass])

  // Filter to only HIGH and MEDIUM impact events, sorted by date/time
  const macroEvents = useMemo(() => {
    return economicEvents
      .filter(e => e.impact === 'high' || e.impact === 'medium')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 6)
  }, [economicEvents])

  // Sort and filter movers by asset class, direction, and category
  const currentMovers = useMemo(() => {
    let data: Mover[] = []

    if (assetClass === 'stocks') {
      data = moversTab === 'gainers' ? [...movers.gainers] : [...movers.losers]
      data = data.filter(m => m.price >= priceTier.min && m.price < priceTier.max)
    } else {
      const source = assetClass === 'crypto' ? cryptoMovers
        : assetClass === 'forex' ? forexMovers
        : etfMovers
      data = [...source]

      // Apply category filter
      if (activeFilter !== 'All') {
        const categories = assetClass === 'crypto' ? CRYPTO_CATEGORIES
          : assetClass === 'forex' ? FOREX_CATEGORIES
          : ETF_CATEGORIES

        if (activeFilter === 'Top 20') {
          data = data.sort((a, b) => b.volume - a.volume).slice(0, 20)
        } else if (categories[activeFilter]) {
          data = data.filter(m => categories[activeFilter]!.includes(m.ticker))
        }
      }

      // For non-stock assets, filter by direction
      if (moversTab === 'gainers') {
        data = data.filter(m => m.changePercent >= 0)
      } else {
        data = data.filter(m => m.changePercent < 0)
      }
    }

    // Sort by change percent
    if (moversTab === 'gainers') {
      data.sort((a, b) => b.changePercent - a.changePercent)
    } else {
      data.sort((a, b) => a.changePercent - b.changePercent)
    }

    return data.slice(0, 10)
  }, [assetClass, moversTab, movers.gainers, movers.losers, cryptoMovers, forexMovers, etfMovers, priceTier, activeFilter])

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
      {/* Page Header */}
      <PageHeader
        title="Morning Brief"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 sm:px-3 py-1.5">
              <div className={`h-2 w-2 rounded-full ${isMarketOpen ? "bg-[var(--data-positive)]" : "bg-[var(--data-warning)]"}`} />
              <span className="text-xs text-[var(--text-secondary)]">{isMarketOpen ? "Market Open" : marketStatus.replace("-", " ")}</span>
            </div>
            <PelicanButton
              variant="secondary"
              size="sm"
              onClick={() => refetchMovers()}
              disabled={moversLoading}
              aria-label="Refresh movers"
            >
              <ArrowsClockwise className={`h-4 w-4 ${moversLoading ? "animate-spin" : ""}`} weight="bold" />
            </PelicanButton>
          </div>
        }
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2"
      >
        {/* Active Exposure */}
        <motion.div variants={staggerItem}>
          <PelicanCard accentGlow className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Active Exposure</h2>
              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">{openTrades.length} open</span>
            </div>
            {tradesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)]" />
              </div>
            ) : openTrades.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No open positions.</p>
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

                  return (
                    <button
                      key={trade.id}
                      onClick={() => handleAnalyzePosition(trade)}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-left transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] active:scale-[0.98] min-h-[44px]"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LogoImg symbol={trade.ticker} size={20} />
                          <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{trade.ticker}</span>
                        </div>
                        <span className={`text-xs font-medium uppercase ${trade.direction === "long" ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"}`}>
                          {trade.direction}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">
                          Entry <span className="font-mono tabular-nums">${trade.entry_price.toFixed(2)}</span> · Qty <span className="font-mono tabular-nums">{trade.quantity}</span>
                        </span>
                        {pnl === null ? (
                          <span className="font-mono tabular-nums text-[var(--text-disabled)]">—</span>
                        ) : (
                          <DataCell
                            value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                            sentiment={pnl >= 0 ? 'positive' : 'negative'}
                            size="sm"
                          />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </PelicanCard>
        </motion.div>

        {/* Macro Pulse */}
        <motion.div variants={staggerItem}>
          <PelicanCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <CalendarBlank className="h-4 w-4 text-[var(--accent-primary)]" weight="regular" />
                Macro Pulse
              </h2>
            </div>
            {economicLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)]" />
              </div>
            ) : macroEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No upcoming economic events this week
              </p>
            ) : (
              <div className="space-y-2">
                {macroEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{event.event}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {event.time ? ` · ${event.time} ET` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Estimate vs Prior */}
                      <div className="text-right">
                        {event.estimate != null && (
                          <span className="text-xs text-[var(--text-secondary)] block font-mono tabular-nums">Est: {event.estimate}{event.unit}</span>
                        )}
                        {event.prior != null && (
                          <span className="text-xs text-[var(--text-muted)] block font-mono tabular-nums">Prior: {event.prior}{event.unit}</span>
                        )}
                      </div>
                      {/* Impact badge */}
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        event.impact === 'high'
                          ? 'bg-red-500/15 text-[var(--data-negative)]'
                          : 'bg-amber-500/15 text-[var(--data-warning)]'
                      }`}>
                        {event.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PelicanCard>
        </motion.div>

        {/* Market Movers */}
        <motion.div variants={staggerItem}>
          <PelicanCard className="p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Market Movers</h2>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
                  <button
                    onClick={() => setMoversTab("gainers")}
                    className={`rounded px-2 py-1 text-xs transition-colors duration-150 ${
                      moversTab === "gainers"
                        ? "bg-green-500/20 text-[var(--data-positive)] border border-green-500/30"
                        : "text-[var(--text-muted)] border border-transparent"
                    }`}
                  >
                    Gainers
                  </button>
                  <button
                    onClick={() => setMoversTab("losers")}
                    className={`rounded px-2 py-1 text-xs transition-colors duration-150 ${
                      moversTab === "losers"
                        ? "bg-red-500/20 text-[var(--data-negative)] border border-red-500/30"
                        : "text-[var(--text-muted)] border border-transparent"
                    }`}
                  >
                    Losers
                  </button>
                </div>
              </div>

              {/* Asset Class Tabs */}
              <div className="flex gap-1 mb-3">
                {(['stocks', 'crypto', 'forex', 'etfs'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAssetClass(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      assetClass === tab
                        ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    {tab === 'etfs' ? 'ETFs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Dynamic Filters */}
              <div className="flex gap-1 flex-wrap">
                {assetClass === 'stocks' ? (
                  PRICE_TIERS.map(tier => (
                    <button
                      key={tier.label}
                      onClick={() => setPriceTier(tier)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors duration-150 ${
                        priceTier.label === tier.label
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))
                ) : (
                  ASSET_FILTER_OPTIONS[assetClass].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors duration-150 ${
                        activeFilter === filter
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Loading state for non-stock data */}
            {(assetClass !== 'stocks' && assetLoading) ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)]" />
              </div>
            ) : (
              <div className="space-y-2">
                {currentMovers.map((mover) => (
                  <button
                    key={`${assetClass}-${moversTab}-${mover.ticker}`}
                    onClick={() => {
                      const prompts: Record<AssetClass, string> = {
                        stocks: `Analyze ${mover.ticker} — it's ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}% today at $${mover.price.toFixed(2)}. What's driving this move? Is there follow-through potential or is this a fade?`,
                        crypto: `Analyze ${mover.ticker} — it's ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}% today. What's driving the move in crypto?`,
                        forex: `Analyze ${mover.ticker.slice(0, 3)}/${mover.ticker.slice(3)} — the pair is ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}%. What's the macro driver?`,
                        etfs: `Analyze ${mover.ticker} (${mover.name}) — the ETF is ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}%. What sectors or themes is this reflecting?`,
                      }
                      openWithPrompt(mover.ticker, prompts[assetClass], 'morning')
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] active:scale-[0.98] min-h-[44px]"
                  >
                    <div className="flex items-center gap-2 text-left">
                      {assetClass === 'stocks' ? (
                        <LogoImg symbol={mover.ticker} size={18} />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent-primary)]">
                          {assetClass === 'forex' ? mover.ticker.slice(0, 2) : mover.ticker.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                          {assetClass === 'forex' ? `${mover.ticker.slice(0, 3)}/${mover.ticker.slice(3)}` : mover.ticker}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                          {assetClass === 'forex'
                            ? mover.price.toFixed(4)
                            : mover.price < 1
                              ? `$${mover.price.toFixed(4)}`
                              : `$${mover.price.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                    <DataCell
                      value={`${mover.changePercent >= 0 ? "+" : ""}${mover.changePercent.toFixed(2)}`}
                      sentiment={mover.changePercent >= 0 ? 'positive' : 'negative'}
                      suffix="%"
                      size="sm"
                    />
                  </button>
                ))}
                {currentMovers.length === 0 && !moversLoading && !assetLoading && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    No {moversTab} in {assetClass === 'stocks' ? `the ${priceTier.label} range` : `${activeFilter}`} right now
                  </p>
                )}
              </div>
            )}
          </PelicanCard>
        </motion.div>

        {/* IPO Watch */}
        <motion.div variants={staggerItem}>
          <PelicanCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RocketLaunch className="h-4 w-4 text-[var(--accent-primary)]" weight="regular" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">IPO Watch</h3>
              </div>
              {ipos.length > 0 && (
                <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                  {ipos.length} upcoming
                </span>
              )}
            </div>

            {ipos.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No upcoming IPOs this week
              </p>
            ) : (
              <div className="space-y-2">
                {ipos.slice(0, 6).map((ipo, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors duration-150 min-h-[44px]"
                    onClick={() => {
                      const prompt = `Tell me about the ${ipo.company} IPO` +
                        (ipo.ticker ? ` (${ipo.ticker})` : '') +
                        (ipo.priceRangeLow && ipo.priceRangeHigh
                          ? ` pricing at $${ipo.priceRangeLow}-$${ipo.priceRangeHigh}`
                          : '')
                      openWithPrompt(ipo.ticker || ipo.company, prompt, 'morning')
                    }}
                  >
                    {/* Left: ticker/company + date */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ipo.ticker && (
                          <span className="text-sm font-semibold text-[var(--accent-primary)]">
                            {ipo.ticker}
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {ipo.company}
                        </span>
                      </div>
                      {ipo.listingDate && (
                        <span className="text-[10px] text-[var(--text-disabled)]">
                          {formatIPODate(ipo.listingDate)}
                        </span>
                      )}
                    </div>

                    {/* Right: price range */}
                    <div className="text-right flex-shrink-0 ml-3">
                      {ipo.finalPrice ? (
                        <DataCell
                          value={ipo.finalPrice}
                          sentiment="positive"
                          prefix="$"
                          size="sm"
                        />
                      ) : ipo.priceRangeLow && ipo.priceRangeHigh ? (
                        <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                          ${ipo.priceRangeLow}–${ipo.priceRangeHigh}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-disabled)]">
                          TBD
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PelicanCard>
        </motion.div>

        {/* Market Sessions */}
        <motion.div variants={staggerItem}>
          <MarketSessions />
        </motion.div>

        {/* Pelican Brief */}
        <motion.div variants={staggerItem} className="lg:col-span-2 mt-4">
          <PelicanCard accentGlow className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightning className="h-5 w-5 text-[var(--accent-primary)]" weight="bold" />
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">Pelican Brief</h3>
              </div>
              {briefContent && !briefLoading && (
                <PelicanButton
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateBrief}
                >
                  <ArrowsClockwise className="h-3 w-3" weight="regular" />
                  Regenerate
                </PelicanButton>
              )}
            </div>

            {/* Empty state */}
            {!briefContent && !briefLoading && !briefError && (
              <>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  AI-generated morning intelligence across your positions, movers, and macro setup.
                </p>
                <PelicanButton
                  variant="primary"
                  onClick={handleGenerateBrief}
                >
                  <Lightning className="h-4 w-4" weight="bold" />
                  Generate Brief
                </PelicanButton>
              </>
            )}

            {/* Loading state */}
            {briefLoading && (
              <div className="flex items-center gap-3 py-8">
                <div className="h-5 w-5 border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
                <span className="text-sm text-[var(--text-muted)]">
                  Generating your morning brief...
                </span>
              </div>
            )}

            {/* Streamed/completed content */}
            {briefContent && (
              <div className="text-[var(--text-secondary)] leading-relaxed">
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
                <p className="text-sm text-[var(--data-negative)] mb-3">{briefError}</p>
                <PelicanButton
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateBrief}
                >
                  Try again
                </PelicanButton>
              </div>
            )}
          </PelicanCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
