"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useHeatmap, type HeatmapMarket, type HeatmapTimeframe } from "@/hooks/use-heatmap"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useTrades } from "@/hooks/use-trades"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useMarketPulse } from "@/hooks/use-market-pulse"
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import { Treemap } from "@/components/heatmap/treemap"
import { HeatmapGrid } from "@/components/heatmap/heatmap-grid"
import { SectorLegend } from "@/components/heatmap/sector-legend"
import { getSectors, type SP500Sector } from "@/lib/data/sp500-constituents"
import { getForexCategories } from "@/lib/data/forex-pairs"
import { getCryptoCategories } from "@/lib/data/crypto-tokens"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Bookmark01Icon as BookmarkSimple,
  DashboardSquare01Icon as SquaresFour,
  FlashIcon as Lightning,
  GridViewIcon as GridFour,
  Refresh01Icon as ArrowsClockwise,
  Target01Icon as Crosshair,
} from "@hugeicons/core-free-icons"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { getMarketStatus } from "@/hooks/use-market-data"
import { DataCell } from "@/components/ui/pelican"
import type { HeatmapStock } from "@/app/api/heatmap/route"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/tracking"

type ViewMode = "treemap" | "grid"

const TIMEFRAMES: { value: HeatmapTimeframe; label: string }[] = [
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "YTD", label: "YTD" },
  { value: "1Y", label: "1Y" },
]

const ALL_MARKETS: { id: HeatmapMarket; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "crypto", label: "Crypto" },
  { id: "forex", label: "Forex" },
]
const DEFAULT_MARKETS_TRADED = ["stocks"]

function getSectorsForMarket(market: HeatmapMarket): string[] {
  switch (market) {
    case "forex":
      return getForexCategories()
    case "crypto":
      return getCryptoCategories()
    default:
      return getSectors()
  }
}

function getPageTitle(market: HeatmapMarket): string {
  switch (market) {
    case "forex":
      return "Forex Heatmap"
    case "crypto":
      return "Crypto Heatmap"
    default:
      return "S&P 500 Heatmap"
  }
}

function getItemLabel(market: HeatmapMarket): string {
  switch (market) {
    case "forex":
      return "pairs"
    case "crypto":
      return "tokens"
    default:
      return "stocks"
  }
}

function getSectorLabel(market: HeatmapMarket): string {
  switch (market) {
    case "forex":
    case "crypto":
      return "Categories"
    default:
      return "Sectors"
  }
}

function getRefreshInterval(): number {
  const now = new Date()
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const hour = et.getHours()
  const minute = et.getMinutes()
  const day = et.getDay()

  if (day === 0 || day === 6) return 5 * 60 * 1000
  if (hour >= 4 && (hour < 9 || (hour === 9 && minute < 30))) return 2 * 60 * 1000
  if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 16)) return 30 * 1000
  if (hour >= 16 && hour < 20) return 2 * 60 * 1000
  return 5 * 60 * 1000
}

interface HeatmapContext {
  spxChange: number | null
  vixLevel: number | null
  sectorPerformance: Record<string, number>
  openTrades: { ticker: string; direction: string; entry_price: number; pnl_percent: number | null }[]
  watchlistTickers: string[]
}

function buildAnalysisPrompt(stock: HeatmapStock, ctx: HeatmapContext, market: HeatmapMarket): string {
  const change = stock.changePercent ?? 0

  if (market === "forex") {
    const parts = [
      `Analyze ${stock.ticker}.`,
      `It's ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}% today${stock.price != null ? ` at ${stock.price.toFixed(5)}` : ""}.`,
    ]
    const pos = ctx.openTrades.find((t) => t.ticker === stock.ticker)
    if (pos) {
      parts.push(`I have a ${pos.direction.toUpperCase()} position from ${pos.entry_price}.`)
      if (pos.pnl_percent != null) {
        parts.push(`Current P&L: ${pos.pnl_percent >= 0 ? "+" : ""}${pos.pnl_percent.toFixed(1)}%.`)
      }
      parts.push("Should I hold, add, or exit?")
    } else {
      parts.push("I have no position. Is this move tradeable?")
    }
    parts.push("Give me key levels, session context, and a trade plan with invalidation.")
    return parts.join(" ")
  }

  if (market === "crypto") {
    const parts = [
      `Analyze ${stock.ticker} (${stock.name}, ${stock.sector}).`,
      `It's ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}% today${stock.price != null ? ` at $${stock.price.toFixed(2)}` : ""}.`,
    ]
    const categoryChange = ctx.sectorPerformance[stock.sector]
    if (categoryChange != null) {
      const rel = change - categoryChange
      if (Math.abs(rel) > 0.5) {
        parts.push(
          `Its category (${stock.sector}) is ${categoryChange >= 0 ? "up" : "down"} ${Math.abs(categoryChange).toFixed(2)}%, so ${stock.ticker} is ${rel > 0 ? "outperforming" : "underperforming"} by ${Math.abs(rel).toFixed(2)}%.`
        )
      }
    }
    const pos = ctx.openTrades.find((t) => t.ticker === stock.ticker)
    if (pos) {
      parts.push(`I have a ${pos.direction.toUpperCase()} position from $${pos.entry_price}.`)
      if (pos.pnl_percent != null) {
        parts.push(`Current P&L: ${pos.pnl_percent >= 0 ? "+" : ""}${pos.pnl_percent.toFixed(1)}%.`)
      }
      parts.push("Should I hold, add, or exit?")
    } else if (ctx.watchlistTickers.includes(stock.ticker)) {
      parts.push("This is on my watchlist. Is now a good entry?")
    } else {
      parts.push("I have no position. Is this relative strength/weakness worth a trade?")
    }
    parts.push("Give me key levels, the catalyst, and a trade plan with invalidation.")
    return parts.join(" ")
  }

  const parts = [
    `Analyze ${stock.ticker} (${stock.name}, ${stock.sector}).`,
    `It's ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}% today${stock.price != null ? ` at $${stock.price.toFixed(2)}` : ""}.`,
  ]

  const sectorChange = ctx.sectorPerformance[stock.sector]
  if (sectorChange != null) {
    const rel = change - sectorChange
    if (Math.abs(rel) > 0.5) {
      parts.push(
        `Its sector (${stock.sector}) is ${sectorChange >= 0 ? "up" : "down"} ${Math.abs(sectorChange).toFixed(2)}%, so ${stock.ticker} is ${rel > 0 ? "outperforming" : "underperforming"} its sector by ${Math.abs(rel).toFixed(2)}%.`
      )
    }
  }

  if (ctx.spxChange != null) {
    parts.push(`S&P 500 is ${ctx.spxChange >= 0 ? "up" : "down"} ${Math.abs(ctx.spxChange).toFixed(2)}% today.`)
  }
  if (ctx.vixLevel != null) {
    parts.push(`VIX is at ${ctx.vixLevel.toFixed(1)}.`)
  }

  const pos = ctx.openTrades.find((t) => t.ticker === stock.ticker)
  if (pos) {
    parts.push(`I have a ${pos.direction.toUpperCase()} position from $${pos.entry_price}.`)
    if (pos.pnl_percent != null) {
      parts.push(`Current P&L: ${pos.pnl_percent >= 0 ? "+" : ""}${pos.pnl_percent.toFixed(1)}%.`)
    }
    parts.push("Should I hold, add, or exit?")
  } else if (ctx.watchlistTickers.includes(stock.ticker)) {
    parts.push("This is on my watchlist. Is now a good entry?")
  } else {
    parts.push("I have no position. Is this relative strength/weakness worth a trade?")
  }

  parts.push("Give me key levels, the catalyst, and a trade plan with invalidation.")
  return parts.join(" ")
}

function MarketBreadthStrip({ stocks }: { stocks: HeatmapStock[] }) {
  if (stocks.length === 0) return null

  const advancing = stocks.filter((s) => (s.changePercent ?? 0) > 0.05).length
  const declining = stocks.filter((s) => (s.changePercent ?? 0) < -0.05).length
  const unchanged = stocks.length - advancing - declining
  const advPct = ((advancing / stocks.length) * 100).toFixed(0)

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
      <span>
        <span className="font-semibold text-[var(--data-positive)]">{advancing}</span> advancing
      </span>
      <span>
        <span className="font-semibold text-[var(--data-negative)]">{declining}</span> declining
      </span>
      <span>
        <span className="font-semibold text-[var(--text-secondary)]">{unchanged}</span> flat
      </span>

      <div className="flex h-1.5 max-w-[200px] flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full bg-[var(--data-positive)] transition-all duration-300" style={{ width: `${advPct}%` }} />
        <div className="h-full flex-1 bg-[var(--data-negative)]" />
      </div>

      <span className="font-medium text-[var(--text-secondary)]">{advPct}% green</span>
    </div>
  )
}

export default function HeatmapTab() {
  return (
    <Suspense fallback={null}>
      <HeatmapTabInner />
    </Suspense>
  )
}

function HeatmapTabInner() {
  const searchParams = useSearchParams()
  const { survey } = useTraderProfile()
  const marketsTraded = survey?.markets_traded ?? DEFAULT_MARKETS_TRADED

  const marketTabs = useMemo((): { id: HeatmapMarket; label: string }[] => {
    const primary = (marketsTraded[0] as HeatmapMarket) || "stocks"
    const primaryTab = ALL_MARKETS.find((tab) => tab.id === primary) ?? ALL_MARKETS[0]!
    const rest = ALL_MARKETS.filter((tab) => tab.id !== primaryTab.id).sort((a, b) => a.label.localeCompare(b.label))
    return [primaryTab, ...rest]
  }, [marketsTraded])

  const defaultMarket: HeatmapMarket = (marketsTraded[0] as HeatmapMarket) || "stocks"

  const [viewMode, setViewMode] = useState<ViewMode>("treemap")
  const [activeMarket, setActiveMarket] = useState<HeatmapMarket>(defaultMarket)
  const [selectedSectors, setSelectedSectors] = useState<string[]>(getSectorsForMarket(defaultMarket))
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [timeframe, setTimeframe] = useState<HeatmapTimeframe>("1D")
  const [showMyStocks, setShowMyStocks] = useState(false)
  const [highlightedSector, setHighlightedSector] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  const handleMarketChange = useCallback((market: HeatmapMarket) => {
    trackEvent({ eventType: "heatmap_view_changed", feature: "heatmap", data: { market } })
    setActiveMarket(market)
    setSelectedSectors(getSectorsForMarket(market))
    setHighlightedSector(null)
    if (market !== "stocks") {
      setTimeframe("1D")
    }
  }, [])

  const { completeMilestone } = useOnboardingProgress()
  const heatmapMilestoneRef = useRef(false)

  useEffect(() => {
    const sectorParam = searchParams.get("sector")
    if (sectorParam && activeMarket === "stocks") {
      const allSectors = getSectors()
      const match = allSectors.find((sector) => sector === sectorParam)
      if (match) setSelectedSectors([match])
    }
  }, [searchParams, activeMarket])

  const { stocks, isLoading, error, lastUpdated, refetch } = useHeatmap({
    autoRefresh,
    refreshInterval: getRefreshInterval(),
    timeframe,
    market: activeMarket,
  })
  const { openWithPrompt } = usePelicanPanelContext()
  const { openTrades } = useTrades({ status: "open" })
  const { items: watchlistItems, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { data: marketPulse } = useMarketPulse()
  const { data: behavioralInsights } = useBehavioralInsights()

  const emptyEarnings = useMemo(() => new Set<string>(), [])
  const positionTickers = useMemo(() => new Set(openTrades.map((trade) => trade.ticker)), [openTrades])
  const watchlistTickers = useMemo(
    () => new Set((watchlistItems ?? []).map((item: { ticker: string }) => item.ticker)),
    [watchlistItems]
  )
  const positionPnl = useMemo(() => {
    const map = new Map<string, number>()
    openTrades.forEach((trade) => {
      if (trade.pnl_percent != null) map.set(trade.ticker, trade.pnl_percent)
    })
    return map
  }, [openTrades])

  const tickerWinRates = useMemo(() => {
    const map = new Map<string, number>()
    if (behavioralInsights?.ticker_performance) {
      behavioralInsights.ticker_performance.forEach((ticker) => {
        if (ticker.total_trades >= 3) {
          map.set(ticker.ticker, ticker.win_rate)
        }
      })
    }
    return map
  }, [behavioralInsights])

  const sectorPerformance = useMemo(() => {
    const performance: Record<string, number> = {}
    const sectors = getSectorsForMarket(activeMarket)
    for (const sector of sectors) {
      const sectorStocks = stocks.filter((stock) => stock.sector === sector)
      if (sectorStocks.length > 0) {
        performance[sector] =
          sectorStocks.reduce((sum, stock) => sum + (stock.changePercent ?? 0), 0) / sectorStocks.length
      }
    }
    return performance
  }, [stocks, activeMarket])

  const heatmapContext: HeatmapContext = useMemo(() => {
    const spxItem = marketPulse?.items?.find((item: { symbol: string }) => item.symbol === "SPX")
    const vixItem = marketPulse?.items?.find((item: { symbol: string }) => item.symbol === "VIX")
    return {
      spxChange: spxItem?.changePercent ?? null,
      vixLevel: vixItem?.price ?? null,
      sectorPerformance,
      openTrades: openTrades.map((trade) => ({
        ticker: trade.ticker,
        direction: trade.direction,
        entry_price: trade.entry_price,
        pnl_percent: trade.pnl_percent,
      })),
      watchlistTickers: Array.from(watchlistTickers),
    }
  }, [marketPulse, sectorPerformance, openTrades, watchlistTickers])

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(width - 32, 600),
          height: Math.max(height - 100, 400),
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [viewMode])

  useEffect(() => {
    if (!autoRefresh) return
    let timeoutId: NodeJS.Timeout

    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        refetch()
        scheduleNext()
      }, getRefreshInterval())
    }

    scheduleNext()
    return () => clearTimeout(timeoutId)
  }, [autoRefresh, refetch])

  const handleStockClick = useCallback((ticker: string, name: string) => {
    if (!heatmapMilestoneRef.current) {
      heatmapMilestoneRef.current = true
      completeMilestone("visited_heatmap")
    }

    const stock = stocks.find((item) => item.ticker === ticker)
    trackEvent({
      eventType: "heatmap_ticker_clicked",
      feature: "heatmap",
      ticker,
      data: { market: activeMarket, changePercent: stock?.changePercent ?? null },
    })

    if (stock) {
      openWithPrompt(ticker, buildAnalysisPrompt(stock, heatmapContext, activeMarket), "heatmap", "heatmap_click")
    } else {
      openWithPrompt(
        ticker,
        `Analyze ${ticker} (${name}) — is there a trade here for me? Consider my current portfolio exposure, my best-performing setups, and my risk rules.`,
        "heatmap",
        "heatmap_click"
      )
    }
  }, [completeMilestone, stocks, heatmapContext, activeMarket, openWithPrompt])

  const handleToggleSector = useCallback((sector: string) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sector)) {
        if (prev.length === 1) return prev
        return prev.filter((selected) => selected !== sector)
      }
      return [...prev, sector]
    })
  }, [])

  const handleSectorHighlight = useCallback((sector: string) => {
    trackEvent({ eventType: "heatmap_sector_drilled", feature: "heatmap", data: { sector } })
    setHighlightedSector((prev) => (prev === sector ? null : sector))
  }, [])

  const filteredStocks = useMemo(
    () => stocks.filter((stock) => selectedSectors.includes(stock.sector)),
    [stocks, selectedSectors]
  )

  const currentSectors = useMemo(() => getSectorsForMarket(activeMarket), [activeMarket])
  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === "open"
  const itemLabel = getItemLabel(activeMarket)

  const subtitleParts = [
    getPageTitle(activeMarket),
    `${filteredStocks.length} ${itemLabel}`,
    `${selectedSectors.length} ${activeMarket === "stocks" ? "sectors" : "categories"}`,
  ]
  if (activeMarket === "stocks" && timeframe !== "1D") {
    subtitleParts.push(`${timeframe} performance`)
  } else if (lastUpdated) {
    subtitleParts.push(`Updated ${new Date(lastUpdated).toLocaleTimeString()}`)
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)] bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-4">
        <div className="mb-3 flex w-fit items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-0.5">
          {marketTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleMarketChange(tab.id)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                activeMarket === tab.id
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">{subtitleParts.join(" · ")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeMarket === "stocks" && (
              <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-0.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => setTimeframe(tf.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      timeframe === tf.value
                        ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMyStocks(!showMyStocks)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                showMyStocks
                  ? "border-[var(--accent-primary)]/30 bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              <HugeiconsIcon icon={Crosshair} className="h-3.5 w-3.5" strokeWidth={1.5} color="currentColor" />
              My {activeMarket === "forex" ? "Pairs" : activeMarket === "crypto" ? "Tokens" : "Stocks"}
            </button>

            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                autoRefresh
                  ? "border-[var(--accent-primary)]/30 bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              <HugeiconsIcon icon={Lightning} className="h-3 w-3" strokeWidth={1.5} color="currentColor" />
              Auto
            </button>

            <IconTooltip label="Refresh data" side="bottom">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isLoading}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 transition-all duration-150 hover:border-[var(--border-hover)] disabled:opacity-50"
              >
                <HugeiconsIcon
                  icon={ArrowsClockwise}
                  className={cn("h-4 w-4 text-[var(--text-secondary)]", isLoading && "animate-spin")}
                  strokeWidth={1.5}
                  color="currentColor"
                />
              </button>
            </IconTooltip>

            <div className="hidden items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 sm:flex">
              <IconTooltip label="Treemap view" side="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode("treemap")}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition-all duration-150",
                    viewMode === "treemap"
                      ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <HugeiconsIcon icon={SquaresFour} className="h-4 w-4" strokeWidth={1.5} color="currentColor" />
                </button>
              </IconTooltip>
              <IconTooltip label="Grid view" side="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition-all duration-150",
                    viewMode === "grid"
                      ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <HugeiconsIcon icon={GridFour} className="h-4 w-4" strokeWidth={1.5} color="currentColor" />
                </button>
              </IconTooltip>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {activeMarket === "stocks" && (
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", isMarketOpen ? "bg-[var(--data-positive)]" : "bg-[var(--data-warning)]")} />
              <span className="text-xs text-[var(--text-muted)]">Market {isMarketOpen ? "Open" : marketStatus.replace("-", " ")}</span>
            </div>
          )}
          {activeMarket === "crypto" && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--data-positive)]" />
              <span className="text-xs text-[var(--text-muted)]">24/7 Market</span>
            </div>
          )}
          {activeMarket === "forex" && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--data-positive)]" />
              <span className="text-xs text-[var(--text-muted)]">Forex Market</span>
            </div>
          )}
          <MarketBreadthStrip stocks={filteredStocks} />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
        <div className="flex-shrink-0 overflow-y-auto border-b border-[var(--border-subtle)] sm:w-64 sm:border-b-0 sm:border-r">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto p-3 pb-2 sm:hidden">
            {currentSectors.map((sector) => {
              const sectorStocks = stocks.filter((stock) => stock.sector === sector)
              const avgChange =
                sectorStocks.length > 0
                  ? sectorStocks.reduce((sum, stock) => sum + (stock.changePercent ?? 0), 0) / sectorStocks.length
                  : 0
              const isSelected = selectedSectors.includes(sector)

              return (
                <button
                  key={sector}
                  type="button"
                  onClick={() => handleToggleSector(sector)}
                  className={cn(
                    "flex-shrink-0 rounded-full border px-3 py-1.5 text-[10px] whitespace-nowrap transition-all duration-150",
                    isSelected
                      ? "border-[var(--accent-primary)]/30 bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
                  )}
                >
                  {sector}
                  <span className="ml-1">
                    <DataCell
                      value={avgChange.toFixed(2)}
                      sentiment={avgChange >= 0 ? "positive" : "negative"}
                      prefix={avgChange >= 0 ? "+" : ""}
                      suffix="%"
                      size="sm"
                      className="text-[10px]"
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hidden p-4 sm:block">
            <SectorLegend
              stocks={stocks}
              selectedSectors={selectedSectors as SP500Sector[]}
              onToggleSector={handleToggleSector as (sector: SP500Sector) => void}
              onHighlightSector={handleSectorHighlight as (sector: SP500Sector) => void}
              highlightedSector={highlightedSector}
              sectorLabel={getSectorLabel(activeMarket)}
              customSectors={activeMarket !== "stocks" ? currentSectors : undefined}
            />
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto p-4">
          {error && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-sm text-[var(--data-negative)]">Failed to load heatmap data</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-xs text-[var(--accent-primary)] transition-colors duration-150 hover:text-[var(--accent-hover)]"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {isLoading && stocks.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <HugeiconsIcon
                  icon={ArrowsClockwise}
                  className="mx-auto mb-2 h-8 w-8 animate-spin text-[var(--accent-primary)]"
                  strokeWidth={1.5}
                  color="currentColor"
                />
                <p className="text-sm text-[var(--text-muted)]">Loading heatmap data...</p>
              </div>
            </div>
          )}

          {!error && !isLoading && filteredStocks.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-[var(--text-muted)]">No {itemLabel} to display</p>
            </div>
          )}

          {!error && filteredStocks.length > 0 && (
            <>
              {viewMode === "treemap" && (
                <div className="hidden items-center justify-center sm:flex">
                  <Treemap
                    stocks={filteredStocks}
                    width={dimensions.width}
                    height={dimensions.height}
                    onStockClick={handleStockClick}
                    highlightedSector={highlightedSector}
                    showMyStocks={showMyStocks}
                    positionTickers={positionTickers}
                    watchlistTickers={watchlistTickers}
                    positionPnl={positionPnl}
                    earningsToday={emptyEarnings}
                    tickerWinRates={tickerWinRates}
                    market={activeMarket}
                  />
                </div>
              )}

              {viewMode === "grid" && (
                <div className="hidden sm:block">
                  <HeatmapGrid
                    stocks={filteredStocks}
                    onStockClick={handleStockClick}
                    market={activeMarket}
                    watchlistTickers={watchlistTickers}
                    addToWatchlist={addToWatchlist}
                    removeFromWatchlist={removeFromWatchlist}
                  />
                </div>
              )}

              <div className="space-y-1 p-3 sm:hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {selectedSectors.length === currentSectors.length
                      ? `All ${itemLabel}`
                      : `${selectedSectors.join(", ")}`}{" "}
                    — Sorted by Change
                  </h3>
                  <span className="font-[var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">
                    {filteredStocks.length} {itemLabel}
                  </span>
                </div>

                {[...filteredStocks]
                  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
                  .map((stock) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      onClick={() => handleStockClick(stock.ticker, stock.name)}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors duration-150 hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-12 text-left font-[var(--font-geist-mono)] text-xs font-bold tabular-nums text-[var(--accent-primary)]">
                          {stock.ticker}
                        </span>
                        <span className="truncate text-[10px] text-[var(--text-muted)]">{stock.name}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="font-[var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-secondary)]">
                          {activeMarket === "forex" ? stock.price?.toFixed(5) ?? "\u2014" : `$${stock.price?.toFixed(2) ?? "\u2014"}`}
                        </span>
                        <DataCell
                          value={stock.changePercent?.toFixed(2) ?? "0.00"}
                          sentiment={(stock.changePercent ?? 0) >= 0 ? "positive" : "negative"}
                          prefix={(stock.changePercent ?? 0) >= 0 ? "+" : ""}
                          suffix="%"
                          size="sm"
                          className="w-16 text-right font-semibold"
                        />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            const isWatched = watchlistTickers.has(stock.ticker.toUpperCase())
                            if (isWatched) {
                              removeFromWatchlist(stock.ticker)
                            } else {
                              addToWatchlist(stock.ticker, { added_from: "manual" })
                            }
                          }}
                          className="m-0 cursor-pointer appearance-none rounded border-none bg-transparent p-1 transition-colors hover:bg-white/10"
                          aria-label={watchlistTickers.has(stock.ticker.toUpperCase()) ? "Remove from Watchlist" : "Add to Watchlist"}
                        >
                          <HugeiconsIcon
                            icon={BookmarkSimple}
                            size={14}
                            className={
                              watchlistTickers.has(stock.ticker.toUpperCase())
                                ? "text-[var(--accent-primary)]"
                                : "text-white/40 hover:text-white/60"
                            }
                            strokeWidth={1.5}
                            color="currentColor"
                          />
                        </button>
                      </div>
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
