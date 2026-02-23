"use client"

import { Card } from "@/components/ui/card"
import { TrendUp, TrendDown, Pulse, Star, CaretDown, CaretUp, CaretRight, GraduationCap, X, Plus, ChartLineUp, ChatCircle, Briefcase, Trash, MagnifyingGlass } from "@phosphor-icons/react"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { cn, normalizeTicker } from "@/lib/utils"
import { useState, useRef } from "react"
import type { Trade } from "@/hooks/use-trades"
import { motion, AnimatePresence } from "framer-motion"
import { useChart } from "@/providers/chart-provider"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { EducationChat } from "./EducationChat"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { useTrades } from "@/hooks/use-trades"
import { formatPercent } from "@/lib/formatters"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

// --- Market-adaptive panel configuration ---
interface MarketPanelConfig {
  indices: MarketIndex[]
  categories: SectorData[]
  categoryLabel: string
  /** Map sidebar category names → heatmap filter names (stocks only) */
  categoryHeatmapMap: Record<string, string>
  showVix: boolean
  volatilityLabel: string
  volatilitySubLabel: string
}

const MARKET_PANEL_CONFIGS: Record<string, MarketPanelConfig> = {
  stocks: {
    indices: [
      { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
      { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
      { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
    ],
    categories: [
      { name: "Technology", changePercent: null },
      { name: "Financials", changePercent: null },
      { name: "Healthcare", changePercent: null },
      { name: "Energy", changePercent: null },
    ],
    categoryLabel: "Sector Performance",
    categoryHeatmapMap: {
      Technology: "Information Technology",
      Financials: "Financials",
      Healthcare: "Health Care",
      Energy: "Energy",
    },
    showVix: true,
    volatilityLabel: "VIX",
    volatilitySubLabel: "Fear Index",
  },
  forex: {
    indices: [
      { symbol: "C:EURUSD", name: "EUR/USD", price: null, change: null, changePercent: null },
      { symbol: "C:GBPUSD", name: "GBP/USD", price: null, change: null, changePercent: null },
      { symbol: "C:USDJPY", name: "USD/JPY", price: null, change: null, changePercent: null },
      { symbol: "C:AUDUSD", name: "AUD/USD", price: null, change: null, changePercent: null },
    ],
    categories: [
      { name: "EUR/CHF", changePercent: null },
      { name: "GBP/JPY", changePercent: null },
      { name: "NZD/USD", changePercent: null },
      { name: "USD/CAD", changePercent: null },
    ],
    categoryLabel: "Minor Pairs",
    categoryHeatmapMap: {},
    showVix: false,
    volatilityLabel: "",
    volatilitySubLabel: "",
  },
  crypto: {
    indices: [
      { symbol: "X:BTCUSD", name: "Bitcoin", price: null, change: null, changePercent: null },
      { symbol: "X:ETHUSD", name: "Ethereum", price: null, change: null, changePercent: null },
      { symbol: "X:SOLUSD", name: "Solana", price: null, change: null, changePercent: null },
    ],
    categories: [
      { name: "Layer 1", changePercent: null },
      { name: "DeFi", changePercent: null },
      { name: "Meme", changePercent: null },
    ],
    categoryLabel: "Categories",
    categoryHeatmapMap: {},
    showVix: false,
    volatilityLabel: "",
    volatilitySubLabel: "",
  },
  // futures and options share stock indices + VIX since they reference equity markets
  futures: {
    indices: [
      { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
      { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
      { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
    ],
    categories: [
      { name: "Technology", changePercent: null },
      { name: "Financials", changePercent: null },
      { name: "Healthcare", changePercent: null },
      { name: "Energy", changePercent: null },
    ],
    categoryLabel: "Sector Performance",
    categoryHeatmapMap: {
      Technology: "Information Technology",
      Financials: "Financials",
      Healthcare: "Health Care",
      Energy: "Energy",
    },
    showVix: true,
    volatilityLabel: "VIX",
    volatilitySubLabel: "Fear Index",
  },
  options: {
    indices: [
      { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
      { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
      { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
    ],
    categories: [
      { name: "Technology", changePercent: null },
      { name: "Financials", changePercent: null },
      { name: "Healthcare", changePercent: null },
      { name: "Energy", changePercent: null },
    ],
    categoryLabel: "Sector Performance",
    categoryHeatmapMap: {
      Technology: "Information Technology",
      Financials: "Financials",
      Healthcare: "Health Care",
      Energy: "Energy",
    },
    showVix: true,
    volatilityLabel: "VIX",
    volatilitySubLabel: "Fear Index",
  },
}

function getMarketConfig(primaryMarket: string): MarketPanelConfig {
  return (MARKET_PANEL_CONFIGS[primaryMarket] ?? MARKET_PANEL_CONFIGS.stocks) as MarketPanelConfig
}

interface TradingContextPanelProps {
  indices?: MarketIndex[]
  vix?: number | null
  vixChange?: number | null
  sectors?: SectorData[]
  isLoading?: boolean
  onRefresh?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  onPrefillChat?: (message: string) => void
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
  isLoading = false,
  collapsed = false,
  onToggleCollapse,
  onPrefillChat,
  selectedTerm,
  onClearTerm,
  learnTabActive = false,
  onLearnTabClick,
  learningEnabled = false,
}: TradingContextPanelProps) {
  const { mode, selectedTicker, showChart, showCalendar, closeChart } = useChart()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [editingWatchlist, setEditingWatchlist] = useState(false)
  const [addTickerInput, setAddTickerInput] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  // Real watchlist from Supabase
  const { items: watchlistItems, addToWatchlist, removeFromWatchlist, loading: watchlistLoading } = useWatchlist()

  // Live quotes for watchlist tickers
  const watchlistSymbols = watchlistItems.map(item => item.ticker)
  const { quotes: watchlistQuotes } = useLiveQuotes(watchlistSymbols)

  // Merge watchlist items with live prices
  const watchlistTickers: WatchlistTicker[] = watchlistItems.map(item => ({
    symbol: item.ticker,
    price: watchlistQuotes[item.ticker]?.price ?? null,
    changePercent: watchlistQuotes[item.ticker]?.changePercent ?? null,
  }))

  // Open trades
  const { openTrades } = useTrades()
  const { completeMilestone } = useOnboardingProgress()
  const { primaryMarket } = useTraderProfile()

  // Market-adaptive config driven by trader profile
  const marketConfig = getMarketConfig(primaryMarket)

  const defaultIndices: MarketIndex[] = indices || marketConfig.indices
  const defaultVix = vix ?? null
  const defaultVixChange = vixChange ?? null
  const defaultSectors: SectorData[] = sectors || marketConfig.categories

  // Map sidebar category names → heatmap filter names (empty for non-stock markets)
  const sectorToSP500 = marketConfig.categoryHeatmapMap

  // Rich prompt builder for active position clicks
  const buildPositionReviewPrompt = (trade: Trade) => {
    return [
      `Review my ${trade.direction} position in ${trade.ticker}.`,
      `Entry: ${trade.entry_price}`,
      trade.stop_loss ? `Stop: ${trade.stop_loss}` : null,
      trade.take_profit ? `Target: ${trade.take_profit}` : null,
      trade.thesis ? `Thesis: ${trade.thesis}` : null,
      trade.pnl_percent != null
        ? `Current P&L: ${trade.pnl_percent >= 0 ? '+' : ''}${trade.pnl_percent.toFixed(1)}%`
        : null,
      trade.entry_date ? `Opened: ${new Date(trade.entry_date).toLocaleDateString()}` : null,
      trade.conviction ? `Conviction: ${trade.conviction}/10` : null,
      'Give me updated analysis: price action, key levels, news catalysts, and whether my thesis still holds.',
    ].filter(Boolean).join(' ')
  }

  const handleAddTicker = async () => {
    const ticker = normalizeTicker(addTickerInput)
    if (!ticker) return
    // Duplicate check with normalization
    if (watchlistItems.some(item => normalizeTicker(item.ticker) === ticker)) {
      setAddTickerInput("")
      return
    }
    await addToWatchlist(ticker)
    completeMilestone("first_watchlist")
    setAddTickerInput("")
    addInputRef.current?.focus()
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "---"
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
      <Card className="border-l-0 rounded-l-none bg-[var(--bg-surface)]/60 backdrop-blur-xl border-l border-[var(--border-subtle)] rounded-none border-y-0 border-r-0 overflow-hidden h-full flex flex-col max-h-full">
        {activeMode === "learn" && (
          <div className="flex items-center border-b border-border/20 shrink-0">
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
                      "flex-1 py-2.5 text-xs transition-colors duration-150 border-b-2 relative",
                      isActive
                        ? "text-foreground font-medium border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      {tab.label}
                      {tab.key === "learn" && selectedTerm && !learnTabActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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
      <div className="flex items-center border-b border-border/20">
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
                  "flex-1 py-2.5 text-xs transition-colors duration-150 border-b-2 relative",
                  isActive
                    ? "text-foreground font-medium border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tab.label}
                  {tab.key === "learn" && selectedTerm && !learnTabActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-0.5 px-1.5">
          <IconTooltip label={isCollapsed ? "Expand sections" : "Collapse sections"} side="left">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-0.5"
            >
              {isCollapsed ? <CaretUp size={14} weight="regular" /> : <CaretDown size={14} weight="regular" />}
            </button>
          </IconTooltip>
          {onToggleCollapse && (
            <IconTooltip label="Hide Market Overview" side="left">
              <button
                onClick={onToggleCollapse}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-0.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </IconTooltip>
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
              {/* Watchlist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Star size={12} weight="regular" />
                    Watchlist
                  </h4>
                  <button
                    onClick={() => setEditingWatchlist(!editingWatchlist)}
                    className="text-[10px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors duration-150 font-medium"
                  >
                    {editingWatchlist ? "Done" : "Edit"}
                  </button>
                </div>

                {/* Loading state */}
                {watchlistLoading && watchlistTickers.length === 0 && (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!watchlistLoading && watchlistTickers.length === 0 && !editingWatchlist && (
                  <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
                    <Star size={20} weight="thin" className="text-[var(--text-muted)] mx-auto mb-1.5" />
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      No tickers on your watchlist.<br />Use chat to add stocks or click Edit.
                    </p>
                  </div>
                )}

                {/* Ticker list */}
                <div className="space-y-1.5">
                  {watchlistTickers.map((ticker) => (
                    <div key={ticker.symbol} className="flex items-center gap-1">
                      {editingWatchlist ? (
                        <>
                          <div className="flex-1 flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{ticker.symbol}</span>
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-medium font-mono tabular-nums text-[var(--text-primary)]">{formatPrice(ticker.price)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromWatchlist(ticker.symbol)}
                            className="p-1.5 rounded-md text-[var(--data-negative)] hover:bg-[var(--data-negative)]/10 transition-colors duration-150"
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-all duration-150 text-left">
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
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => showChart(ticker.symbol)}>
                              <ChartLineUp size={14} weight="regular" className="mr-2" />
                              Open Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPrefillChat?.(`Analyze ${ticker.symbol}`)}>
                              <ChatCircle size={14} weight="regular" className="mr-2" />
                              Ask Pelican
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPrefillChat?.(`Deep dive on ${ticker.symbol} — technicals, fundamentals, and sentiment`)}>
                              <MagnifyingGlass size={14} weight="regular" className="mr-2" />
                              Deep Dive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => removeFromWatchlist(ticker.symbol)}
                              className="text-[var(--data-negative)] focus:text-[var(--data-negative)]"
                            >
                              <Trash size={14} weight="regular" className="mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add ticker input (edit mode) */}
                {editingWatchlist && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus-within:border-[var(--accent-primary)] transition-colors duration-150">
                      <Plus size={12} weight="regular" className="text-[var(--text-muted)] shrink-0" />
                      <input
                        ref={addInputRef}
                        type="text"
                        value={addTickerInput}
                        onChange={(e) => setAddTickerInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTicker()
                        }}
                        placeholder="Add symbol..."
                        className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                        maxLength={10}
                      />
                    </div>
                    <button
                      onClick={handleAddTicker}
                      disabled={!addTickerInput.trim()}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Active Positions */}
              {openTrades.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={12} weight="regular" />
                      Active Positions
                    </h4>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">{openTrades.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {openTrades.map((trade) => (
                      <div
                        key={trade.id}
                        onClick={() => onPrefillChat?.(buildPositionReviewPrompt(trade))}
                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-all duration-150"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase",
                            trade.direction === 'long'
                              ? "bg-[var(--data-positive)]/10 text-[var(--data-positive)]"
                              : "bg-[var(--data-negative)]/10 text-[var(--data-negative)]"
                          )}>
                            {trade.direction}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{trade.ticker}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
                          ${trade.entry_price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category / Sector Performance */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  {marketConfig.categoryLabel}
                </h4>
                <div className="space-y-1.5">
                  {defaultSectors.map((sector) => (
                    <button
                      key={sector.name}
                      onClick={() => {
                        const heatmapName = sectorToSP500[sector.name]
                        if (heatmapName) {
                          router.push(`/heatmap?sector=${encodeURIComponent(heatmapName)}`)
                        } else {
                          // Non-stock categories: ask Pelican about the category
                          onPrefillChat?.(`What's happening in ${sector.name} today?`)
                        }
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors duration-150 cursor-pointer group"
                    >
                      <span className="text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors duration-150">{sector.name}</span>
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
                        <CaretRight size={12} weight="regular" className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Volatility — only shown for markets that reference VIX */}
              {marketConfig.showVix && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Volatility</h4>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Pulse size={16} weight="regular" className="text-[var(--data-warning)]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{marketConfig.volatilityLabel}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{marketConfig.volatilitySubLabel}</span>
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
              )}

              {/* Indices */}
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