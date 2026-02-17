"use client"

import { Card } from "@/components/ui/card"
import { TrendUp, TrendDown, Pulse, Star, CaretDown, CaretUp, GraduationCap, ChartBar, CalendarBlank, BookOpen } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useChart } from "@/providers/chart-provider"
import dynamic from "next/dynamic"
import { EducationChat } from "./EducationChat"

// Dynamic imports with SSR disabled to prevent build-time errors
const TradingViewChart = dynamic(
  () => import("./TradingViewChart").then(m => ({ default: m.TradingViewChart })),
  { ssr: false }
)

const EconomicCalendar = dynamic(
  () => import("./EconomicCalendar").then(m => ({ default: m.EconomicCalendar })),
  { ssr: false }
)

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
  learningEnabled?: boolean
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
  learningEnabled = false,
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
    if (value === null) return "text-[var(--text-muted)]"
    return value >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
  }

  const getChangeBg = (value: number | null) => {
    if (value === null) return "bg-[var(--bg-elevated)]"
    return value >= 0 ? "bg-[var(--data-positive)]/10" : "bg-[var(--data-negative)]/10"
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
      <Card className="border-l-0 rounded-l-none bg-[var(--bg-surface)]/60 backdrop-blur-xl border-l border-[var(--border-subtle)] rounded-none border-y-0 border-r-0 overflow-hidden h-full flex flex-col">
        {activeMode === "learn" && (
          <div className="flex items-center border-b border-[var(--border-subtle)] shrink-0">
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
                      "flex-1 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 relative",
                      isActive
                        ? "text-[var(--accent-primary)] border-[var(--accent-primary)]"
                        : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
                    )}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {tab.key === "market" && <ChartBar size={12} weight={isActive ? "fill" : "regular"} />}
                      {tab.key === "calendar" && <CalendarBlank size={12} weight={isActive ? "fill" : "regular"} />}
                      {tab.key === "learn" && <GraduationCap size={12} weight={isActive ? "fill" : "regular"} />}
                      {tab.label}
                      {tab.key === "learn" && selectedTerm && !learnTabActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
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
              learningEnabled ? (
                <EducationChat
                  selectedTerm={selectedTerm ?? null}
                  onClear={onClearTerm ?? (() => {})}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <GraduationCap size={40} weight="thin" className="text-[var(--accent-primary)]/40 mb-3" />
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Toggle on Learn mode to see trading terms highlighted in Pelican&apos;s responses and get the definitions.
                  </p>
                </div>
              )
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
    <Card className="border-l-0 rounded-l-none bg-[var(--bg-surface)]/60 backdrop-blur-xl border-l border-[var(--border-subtle)] rounded-none border-y-0 border-r-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--border-subtle)]">
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
                  "flex-1 py-2.5 text-xs font-medium transition-colors duration-150 border-b-2 relative",
                  isActive
                    ? "text-[var(--accent-primary)] border-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
                )}
              >
                <span className="flex items-center justify-center gap-1">
                  {tab.key === "market" && <ChartBar size={12} weight={isActive ? "fill" : "regular"} />}
                  {tab.key === "calendar" && <CalendarBlank size={12} weight={isActive ? "fill" : "regular"} />}
                  {tab.key === "learn" && <GraduationCap size={12} weight={isActive ? "fill" : "regular"} />}
                  {tab.label}
                  {tab.key === "learn" && selectedTerm && !learnTabActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 p-1 hover:bg-[var(--bg-elevated)] rounded"
            title={isCollapsed ? "Expand sections" : "Collapse sections"}
          >
            {isCollapsed ? <CaretUp size={16} weight="regular" /> : <CaretDown size={16} weight="regular" />}
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 p-1 hover:bg-[var(--bg-elevated)] rounded"
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
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Indices</h4>
                <div className="space-y-2">
                  {defaultIndices.map((index) => (
                    <div
                      key={index.symbol}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-all duration-150",
                        "border-l-2",
                        index.changePercent !== null && index.changePercent >= 0
                          ? "border-l-[var(--data-positive)]/40"
                          : index.changePercent !== null
                          ? "border-l-[var(--data-negative)]/40"
                          : "border-l-[var(--text-muted)]/20"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[var(--text-primary)]">{index.symbol}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{index.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold font-mono tabular-nums text-[var(--text-primary)]">
                          {formatPrice(index.price)}
                        </span>
                        <span className={cn("text-[10px] font-medium font-mono tabular-nums", getChangeColor(index.changePercent))}>
                          {formatPercent(index.changePercent)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VIX */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Volatility</h4>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Pulse size={16} weight="regular" className="text-[var(--data-warning)]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--text-primary)]">VIX</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Fear Index</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">{formatPrice(defaultVix)}</span>
                    <span className={cn("text-[10px] font-medium font-mono tabular-nums", getChangeColor(defaultVixChange))}>
                      {formatPercent(defaultVixChange)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sectors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Sector Performance
                </h4>
                <div className="space-y-1.5">
                  {defaultSectors.map((sector) => (
                    <div
                      key={sector.name}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors duration-150"
                    >
                      <span className="text-xs text-[var(--text-primary)]">{sector.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-medium font-mono tabular-nums", getChangeColor(sector.changePercent))}>
                          {formatPercent(sector.changePercent)}
                        </span>
                        {sector.changePercent !== null && (
                          <div
                            className={cn(
                              "p-0.5 rounded",
                              sector.changePercent >= 0 ? "bg-[var(--data-positive)]/10" : "bg-[var(--data-negative)]/10",
                            )}
                          >
                            {sector.changePercent >= 0 ? (
                              <TrendUp size={12} weight="regular" className="text-[var(--data-positive)]" />
                            ) : (
                              <TrendDown size={12} weight="regular" className="text-[var(--data-negative)]" />
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
                  <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Star size={12} weight="regular" />
                    Watchlist
                  </h4>
                  <button className="text-[10px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors duration-150 font-medium">
                    Edit
                  </button>
                </div>
                <div className="space-y-1.5">
                  {defaultWatchlist.map((ticker) => (
                    <div
                      key={ticker.symbol}
                      onClick={() => showChart(ticker.symbol)}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-all duration-150"
                    >
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{ticker.symbol}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-medium font-mono tabular-nums text-[var(--text-primary)]">{formatPrice(ticker.price)}</span>
                        <div
                          className={cn(
                            "text-[10px] font-medium font-mono tabular-nums px-1.5 py-0.5 rounded",
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent-primary)]"></div>
                </div>
              )}

              {/* Last updated */}
              <div className="text-center pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)]">
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