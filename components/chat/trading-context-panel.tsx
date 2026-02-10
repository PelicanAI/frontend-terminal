"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity, Star, ChevronDown, ChevronUp, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useChart } from "@/providers/chart-provider"
import { TradingViewChart } from "./TradingViewChart"
import { EconomicCalendar } from "./EconomicCalendar"
import { EducationChat } from "./EducationChat"

interface MarketIndex {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
}

interface SectorData {
  name: string
  changePercent: number | null
}

interface WatchlistTicker {
  symbol: string
  price: number | null
  changePercent: number | null
}

interface TradingContextPanelProps {
  // Future props for real data
  indices?: MarketIndex[]
  vix?: number | null
  vixChange?: number | null
  sectors?: SectorData[]
  watchlist?: WatchlistTicker[]
  isLoading?: boolean
  onRefresh?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  // Learning mode props
  selectedTerm?: { term: string; fullName: string; shortDef: string; category: string } | null
  onClearTerm?: () => void
  learnTabActive?: boolean
  onLearnTabClick?: () => void
}

export function TradingContextPanel({
  indices,
  vix,
  vixChange,
  sectors,
  watchlist,
  isLoading = false,
  collapsed = false,
  onToggleCollapse,
  selectedTerm,
  onClearTerm,
  learnTabActive = false,
  onLearnTabClick,
}: TradingContextPanelProps) {
  const { mode, selectedTicker, showChart, showCalendar, closeChart } = useChart()
  const [isCollapsed, setIsCollapsed] = useState(collapsed)

  // Placeholder data - will be replaced with real data from props
  const defaultIndices: MarketIndex[] = indices || [
    { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
    { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
    { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
  ]

  const defaultVix = vix ?? null
  const defaultVixChange = vixChange ?? null

  const defaultSectors: SectorData[] = sectors || [
    { name: "Technology", changePercent: null },
    { name: "Financials", changePercent: null },
    { name: "Healthcare", changePercent: null },
    { name: "Energy", changePercent: null },
  ]

  const defaultWatchlist: WatchlistTicker[] = watchlist || [
    { symbol: "AAPL", price: null, changePercent: null },
    { symbol: "TSLA", price: null, changePercent: null },
    { symbol: "NVDA", price: null, changePercent: null },
    { symbol: "SPY", price: null, changePercent: null },
  ]

  const formatPrice = (price: number | null) => {
    if (price === null) return "---"
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatPercent = (percent: number | null) => {
    if (percent === null) return "---%"
    const sign = percent >= 0 ? "+" : ""
    return `${sign}${percent.toFixed(2)}%`
  }

  const getChangeColor = (value: number | null) => {
    if (value === null) return "text-muted-foreground"
    return value >= 0 ? "text-green-500" : "text-red-500"
  }

  const getChangeBg = (value: number | null) => {
    if (value === null) return "bg-muted/30"
    return value >= 0 ? "bg-green-500/10" : "bg-red-500/10"
  }

  const tabs = [
    { key: "market" as const, label: "Market" },
    { key: "calendar" as const, label: "Calendar" },
    { key: "learn" as const, label: "Learn" },
  ]

  const activeMode = learnTabActive ? "learn" : mode === "chart" && selectedTicker ? "chart" : mode === "calendar" ? "calendar" : "overview"

  // Chart, calendar, and learn modes get a full-height card
  if (activeMode === "chart" || activeMode === "calendar" || activeMode === "learn") {
    return (
      <Card className="border-l-0 rounded-l-none bg-[var(--surface-1)]/40 backdrop-blur border-white/5 overflow-hidden h-full flex flex-col">
        {activeMode === "learn" && (
          <div className="flex items-center border-b border-white/5 shrink-0">
            <div className="flex flex-1">
              {tabs.map((tab) => {
                const isActive = tab.key === "learn"
                  ? true
                  : false

                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      if (tab.key === "learn") {
                        onLearnTabClick?.()
                      } else {
                        if (tab.key === "calendar") showCalendar()
                        else if (tab.key === "market") closeChart()
                        if (learnTabActive && onLearnTabClick) onLearnTabClick()
                      }
                    }}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 relative",
                      isActive
                        ? tab.key === "learn"
                          ? "text-purple-500 border-purple-500"
                          : "text-teal-500 border-teal-500"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/10"
                    )}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {tab.key === "learn" && <BookOpen className="h-3 w-3" />}
                      {tab.label}
                      {tab.key === "learn" && selectedTerm && !learnTabActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full min-h-0 flex-1"
          >
            {activeMode === "learn" ? (
              <EducationChat
                selectedTerm={selectedTerm ?? null}
                onClear={onClearTerm ?? (() => {})}
              />
            ) : activeMode === "chart" && selectedTicker ? (
              <TradingViewChart symbol={selectedTicker} onClose={closeChart} />
            ) : (
              <EconomicCalendar onClose={closeChart} />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    )
  }

  return (
    <Card className="border-l-0 rounded-l-none bg-[var(--surface-1)]/40 backdrop-blur border-white/5 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/5">
        <div className="flex flex-1">
          {tabs.map((tab) => {
            const isActive =
              tab.key === "learn"
                ? learnTabActive
                : !learnTabActive &&
                  ((mode === "overview" && tab.key === "market") || mode === tab.key)

            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === "learn") {
                    onLearnTabClick?.()
                  } else {
                    if (tab.key === "calendar") showCalendar()
                    else if (tab.key === "market") closeChart()
                    // Deactivate learn tab when switching to market/calendar
                    if (learnTabActive && onLearnTabClick) onLearnTabClick()
                  }
                }}
                className={cn(
                  "flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 relative",
                  isActive
                    ? tab.key === "learn"
                      ? "text-purple-500 border-purple-500"
                      : "text-teal-500 border-teal-500"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/10"
                )}
              >
                <span className="flex items-center justify-center gap-1">
                  {tab.key === "learn" && <BookOpen className="h-3 w-3" />}
                  {tab.label}
                  {tab.key === "learn" && selectedTerm && !learnTabActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/50 rounded"
            title={isCollapsed ? "Expand sections" : "Collapse sections"}
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/50 rounded"
              title="Hide Market Overview"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Learn tab content */}
      {learnTabActive && (
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100% - 42px)' }}>
          <EducationChat
            selectedTerm={selectedTerm ?? null}
            onClear={onClearTerm ?? (() => {})}
          />
        </div>
      )}

      {/* Market tab content */}
      {!learnTabActive && (
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Major Indices */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Indices</h4>
                <div className="space-y-2">
                  {defaultIndices.map((index) => (
                    <div
                      key={index.symbol}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)] border border-white/5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{index.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">{index.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-foreground">
                          {formatPrice(index.price)}
                        </span>
                        <span className={cn("text-[10px] font-medium", getChangeColor(index.changePercent))}>
                          {formatPercent(index.changePercent)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VIX */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volatility</h4>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] border border-white/5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">VIX</span>
                      <span className="text-[10px] text-muted-foreground">Fear Index</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-foreground">{formatPrice(defaultVix)}</span>
                    <span className={cn("text-[10px] font-medium", getChangeColor(defaultVixChange))}>
                      {formatPercent(defaultVixChange)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sectors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sector Performance
                </h4>
                <div className="space-y-1.5">
                  {defaultSectors.map((sector) => (
                    <div
                      key={sector.name}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs text-foreground">{sector.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-medium", getChangeColor(sector.changePercent))}>
                          {formatPercent(sector.changePercent)}
                        </span>
                        {sector.changePercent !== null && (
                          <div
                            className={cn(
                              "p-0.5 rounded",
                              sector.changePercent >= 0 ? "bg-green-500/10" : "bg-red-500/10",
                            )}
                          >
                            {sector.changePercent >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Watchlist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="h-3 w-3" />
                    Watchlist
                  </h4>
                  <button className="text-[10px] text-purple-500 hover:text-purple-400 transition-colors font-medium">
                    Edit
                  </button>
                </div>
                <div className="space-y-1.5">
                  {defaultWatchlist.map((ticker) => (
                    <div
                      key={ticker.symbol}
                      onClick={() => showChart(ticker.symbol)}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)] border border-white/5 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-foreground">{ticker.symbol}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-foreground">{formatPrice(ticker.price)}</span>
                        <div
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            getChangeBg(ticker.changePercent),
                            getChangeColor(ticker.changePercent),
                          )}
                        >
                          {formatPercent(ticker.changePercent)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refresh indicator */}
              {isLoading && (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                </div>
              )}

              {/* Last updated */}
              <div className="text-center pt-2 border-t border-white/5">
                <span className="text-[10px] text-muted-foreground">
                  {isLoading ? "Updating..." : "Market data delayed"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}
    </Card>
  )
}