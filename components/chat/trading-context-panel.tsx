"use client"

import { Card } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AnalyticsUpIcon as TrendUp,
  AnalyticsDownIcon as TrendDown,
  Pulse01Icon as Pulse,
  StarIcon as Star,
  ArrowDown01Icon as CaretDown,
  ArrowUp01Icon as CaretUp,
  ArrowRight01Icon as CaretRight,
  Mortarboard01Icon as GraduationCap,
  Cancel01Icon as X,
  Add01Icon as Plus,
  ChartLineData01Icon as ChartLineUp,
  Chat01Icon as ChatCircle,
  Briefcase01Icon as Briefcase,
  Delete01Icon as Trash,
  Search01Icon as MagnifyingGlass,
  Notification01Icon as Bell,
  Notification03Icon as BellRinging,
  Notification01Icon as BellSimple,
} from "@hugeicons/core-free-icons"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { cn, normalizeTicker } from "@/lib/utils"
import { useState, useRef } from "react"
import type { Trade } from "@/hooks/use-trades"
import { m, AnimatePresence } from "framer-motion"
import { useChart } from "@/providers/chart-provider"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { EducationChat } from "./EducationChat"
import { ActionsTab } from "./actions-tab"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { KNOWN_FOREX_PAIRS } from "@/lib/ticker-blocklist"
import { useTrades } from "@/hooks/use-trades"
import { formatPercent } from "@/lib/formatters"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
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
  id: string
  symbol: string
  price: number | null
  changePercent: number | null
  customPrompt: string | null
  notes: string | null
  alertPriceAbove: number | null
  alertPriceBelow: number | null
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
  onToggleLearning?: () => void
  onFocusInput?: () => void
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
  onToggleLearning,
  onFocusInput,
}: TradingContextPanelProps) {
  const { mode, selectedTicker, showChart, showCalendar, closeChart } = useChart()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [editingWatchlist, setEditingWatchlist] = useState(false)
  const [addTickerInput, setAddTickerInput] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  // Real watchlist from Supabase
  const { items: watchlistItems, addToWatchlist, removeFromWatchlist, updateCustomPrompt, updateWatchlistItem, loading: watchlistLoading } = useWatchlist()
  const { openWithPrompt } = usePelicanPanelContext()
  const [alertEditTicker, setAlertEditTicker] = useState<string | null>(null)
  const [alertInput, setAlertInput] = useState("")
  const alertInputRef = useRef<HTMLInputElement>(null)
  const [priceAlertEditId, setPriceAlertEditId] = useState<string | null>(null)
  const [priceAboveInput, setPriceAboveInput] = useState("")
  const [priceBelowInput, setPriceBelowInput] = useState("")

  // Live quotes for watchlist tickers
  const watchlistSymbols = watchlistItems.map(item => item.ticker)
  const { quotes: watchlistQuotes } = useLiveQuotes(watchlistSymbols)

  // Merge watchlist items with live prices
  const watchlistTickers: WatchlistTicker[] = watchlistItems.map(item => ({
    id: item.id,
    symbol: item.ticker,
    price: watchlistQuotes[item.ticker]?.price ?? null,
    changePercent: watchlistQuotes[item.ticker]?.changePercent ?? null,
    customPrompt: item.custom_prompt ?? null,
    notes: item.notes ?? null,
    alertPriceAbove: item.alert_price_above ?? null,
    alertPriceBelow: item.alert_price_below ?? null,
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
    await addToWatchlist(ticker, { added_from: 'manual' })
    completeMilestone("first_watchlist")
    setAddTickerInput("")
    addInputRef.current?.focus()
  }

  const formatPrice = (price: number | null, symbol?: string) => {
    if (price === null) return "---"
    // Forex pairs need 4-5 decimal places; JPY pairs use 2-3
    if (symbol && KNOWN_FOREX_PAIRS.has(symbol.toUpperCase())) {
      const isJpyPair = symbol.toUpperCase().includes('JPY')
      const decimals = isJpyPair ? 3 : 5
      return price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    }
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

  const [actionsTabActive, setActionsTabActive] = useState(false)

  const tabs = [
    { key: "market" as const, label: "Market" },
    { key: "actions" as const, label: "Actions" },
    { key: "learn" as const, label: "Learn" },
  ]

  const activeMode = learnTabActive ? "learn" : actionsTabActive ? "actions" : mode === "chart" && selectedTicker ? "chart" : mode === "calendar" ? "calendar" : "overview"

  // Chart, calendar, and learn modes get a full-height card
  if (activeMode === "chart" || activeMode === "calendar" || activeMode === "learn" || activeMode === "actions") {
    return (
      <Card className="border-l-0 rounded-l-none bg-[var(--bg-surface)]/60 backdrop-blur-xl border-l border-[var(--border-subtle)] rounded-none border-y-0 border-r-0 overflow-hidden h-full flex flex-col max-h-full">
        {(activeMode === "learn" || activeMode === "actions") && (
          <div className="flex items-center border-b border-border/20 shrink-0">
            <div className="flex flex-1">
              {tabs.map((tab) => {
                const isActive =
                  tab.key === "learn" ? learnTabActive :
                  tab.key === "actions" ? actionsTabActive :
                  false

                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      if (tab.key === "learn") {
                        if (actionsTabActive) setActionsTabActive(false)
                        onLearnTabClick?.()
                      } else if (tab.key === "actions") {
                        if (learnTabActive && onLearnTabClick) onLearnTabClick()
                        setActionsTabActive(!actionsTabActive)
                      } else {
                        if (learnTabActive && onLearnTabClick) onLearnTabClick()
                        if (actionsTabActive) setActionsTabActive(false)
                        closeChart()
                      }
                    }}
                    className={cn(
                      "flex-1 py-2.5 text-xs transition-colors duration-150 border-b-2 relative cursor-pointer",
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
          <m.div
            key={activeMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full min-h-0 flex-1"
          >
            {activeMode === "actions" ? (
              <ActionsTab
                onSend={(msg) => onPrefillChat?.(msg)}
                onFocusInput={onFocusInput}
                openTrades={openTrades}
              />
            ) : activeMode === "learn" ? (
              learningEnabled ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--text-muted)]">Learn mode active</span>
                    <button
                      onClick={() => onToggleLearning?.()}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--data-negative)] transition-colors"
                    >
                      Disable
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <EducationChat
                      selectedTerm={selectedTerm ?? null}
                      onClear={onClearTerm ?? (() => {})}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <HugeiconsIcon icon={GraduationCap} size={40} className="text-[var(--accent-primary)]/40 mb-3" strokeWidth={1} color="currentColor" />
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                    Learn mode highlights trading terms in Pelican&apos;s responses. Click any term to get the definition.
                  </p>
                  <button
                    onClick={() => onToggleLearning?.()}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-150"
                  >
                    Enable Learn Mode
                  </button>
                </div>
              )
            ) : activeMode === "chart" && selectedTicker ? (
              <TradingViewChart symbol={selectedTicker} onClose={closeChart} />
            ) : (
              <EconomicCalendar onClose={closeChart} />
            )}
          </m.div>
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
                : tab.key === "actions"
                  ? actionsTabActive && !learnTabActive
                  : tab.key === "market"
                    ? !learnTabActive && !actionsTabActive && mode === "overview"
                    : false

            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === "learn") {
                    if (actionsTabActive) setActionsTabActive(false)
                    onLearnTabClick?.()
                  } else if (tab.key === "actions") {
                    if (learnTabActive && onLearnTabClick) onLearnTabClick()
                    setActionsTabActive(!actionsTabActive)
                  } else {
                    if (tab.key === "market") closeChart()
                    if (learnTabActive && onLearnTabClick) onLearnTabClick()
                    if (actionsTabActive) setActionsTabActive(false)
                  }
                }}
                className={cn(
                  "flex-1 py-2.5 text-xs transition-colors duration-150 border-b-2 relative cursor-pointer",
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
              {isCollapsed ? <HugeiconsIcon icon={CaretUp} size={14} strokeWidth={1.5} color="currentColor" /> : <HugeiconsIcon icon={CaretDown} size={14} strokeWidth={1.5} color="currentColor" />}
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
      {!learnTabActive && !actionsTabActive && (
      <AnimatePresence>
        {!isCollapsed && (
          <m.div
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
                    <HugeiconsIcon icon={Star} size={12} strokeWidth={1.5} color="currentColor" />
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
                    <HugeiconsIcon icon={Star} size={20} className="text-[var(--text-muted)] mx-auto mb-1.5" strokeWidth={1} color="currentColor" />
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
                              <span className="text-xs font-medium font-mono tabular-nums text-[var(--text-primary)]">{formatPrice(ticker.price, ticker.symbol)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromWatchlist(ticker.symbol)}
                            className="p-1.5 rounded-md text-[var(--data-negative)] hover:bg-[var(--data-negative)]/10 transition-colors duration-150"
                          >
                            <HugeiconsIcon icon={X} size={14} strokeWidth={2} color="currentColor" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full">
                          <div className="flex items-center gap-1">
                            {/* Clickable ticker row — opens chat */}
                            <button
                              className="flex-1 flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-white/5 cursor-pointer transition-all duration-150 text-left"
                              onClick={() => {
                                const prompt = `Analyze ${ticker.symbol} — it's on my watchlist. ${ticker.notes ? `Notes: ${ticker.notes}` : ''} ${ticker.customPrompt || 'Give me a technical and fundamental update.'}`
                                openWithPrompt(
                                  ticker.symbol,
                                  prompt,
                                  null
                                )
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-[var(--text-primary)]">{ticker.symbol}</span>
                                {ticker.customPrompt && (
                                  <HugeiconsIcon icon={BellRinging} size={10} className="text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
                                )}
                                {(ticker.alertPriceAbove != null || ticker.alertPriceBelow != null) && (
                                  <HugeiconsIcon icon={BellSimple} size={10} className="text-[var(--data-warning)]" strokeWidth={1.5} color="currentColor" />
                                )}
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-medium font-mono tabular-nums text-[var(--text-primary)]">{formatPrice(ticker.price, ticker.symbol)}</span>
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
                            {/* Action menu button — stops propagation */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <HugeiconsIcon icon={CaretDown} size={12} strokeWidth={1.5} color="currentColor" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => showChart(ticker.symbol)}>
                                  <HugeiconsIcon icon={ChartLineUp} size={14} className="mr-2" strokeWidth={1.5} color="currentColor" />
                                  Open Chart
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onPrefillChat?.(`Analyze ${ticker.symbol}`)}>
                                  <HugeiconsIcon icon={ChatCircle} size={14} className="mr-2" strokeWidth={1.5} color="currentColor" />
                                  Ask Pelican
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onPrefillChat?.(`Deep dive on ${ticker.symbol} — technicals, fundamentals, and sentiment`)}>
                                  <HugeiconsIcon icon={MagnifyingGlass} size={14} className="mr-2" strokeWidth={1.5} color="currentColor" />
                                  Deep Dive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPriceAlertEditId(ticker.id)
                                    setPriceAboveInput(ticker.alertPriceAbove != null ? String(ticker.alertPriceAbove) : "")
                                    setPriceBelowInput(ticker.alertPriceBelow != null ? String(ticker.alertPriceBelow) : "")
                                  }}
                                >
                                  <HugeiconsIcon icon={BellSimple} size={14} className="mr-2" strokeWidth={1.5} color="currentColor" />
                                  {(ticker.alertPriceAbove != null || ticker.alertPriceBelow != null) ? 'Edit Price Alerts...' : 'Set Price Alerts...'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAlertEditTicker(ticker.symbol)
                                    setAlertInput(ticker.customPrompt || "")
                                    setTimeout(() => alertInputRef.current?.focus(), 50)
                                  }}
                                >
                                  <HugeiconsIcon icon={Bell} size={14} className="mr-2" strokeWidth={1.5} color="currentColor" />
                                  {ticker.customPrompt ? 'Edit Custom Alert...' : 'Set Custom Alert...'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => removeFromWatchlist(ticker.symbol)}
                                  className="text-[var(--data-negative)] focus:text-[var(--data-negative)]"
                                >
                                  <HugeiconsIcon icon={Trash} size={14} className="mr-2" strokeWidth={1.5} color="currentColor" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Price Alerts Inline Editor */}
                          {priceAlertEditId === ticker.id && (
                            <div className="mt-1.5 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--accent-primary)]/30">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <HugeiconsIcon icon={BellSimple} size={12} className="text-[var(--accent-primary)]" strokeWidth={2} color="currentColor" />
                                <span className="text-[10px] font-medium text-[var(--accent-primary)]">Price Alerts</span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] text-[var(--text-muted)] w-14 shrink-0">Above</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={priceAboveInput}
                                    onChange={(e) => setPriceAboveInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") setPriceAlertEditId(null)
                                    }}
                                    placeholder="Price..."
                                    className="flex-1 bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-2 py-1.5 rounded border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)] transition-colors font-mono tabular-nums"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] text-[var(--text-muted)] w-14 shrink-0">Below</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={priceBelowInput}
                                    onChange={(e) => setPriceBelowInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") setPriceAlertEditId(null)
                                    }}
                                    placeholder="Price..."
                                    className="flex-1 bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-2 py-1.5 rounded border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)] transition-colors font-mono tabular-nums"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <button
                                  onClick={() => {
                                    const above = priceAboveInput.trim() ? parseFloat(priceAboveInput) : null
                                    const below = priceBelowInput.trim() ? parseFloat(priceBelowInput) : null
                                    updateWatchlistItem(ticker.id, {
                                      alert_price_above: above != null && !isNaN(above) ? above : null,
                                      alert_price_below: below != null && !isNaN(below) ? below : null,
                                    })
                                    setPriceAlertEditId(null)
                                  }}
                                  className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setPriceAlertEditId(null)}
                                  className="px-2 py-1 rounded text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                                >
                                  Cancel
                                </button>
                                {(ticker.alertPriceAbove != null || ticker.alertPriceBelow != null) && (
                                  <button
                                    onClick={() => {
                                      updateWatchlistItem(ticker.id, { alert_price_above: null, alert_price_below: null })
                                      setPriceAlertEditId(null)
                                    }}
                                    className="px-2 py-1 rounded text-[10px] font-medium text-[var(--data-negative)] hover:bg-[var(--data-negative)]/10 transition-colors ml-auto"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Custom Alert Inline Editor */}
                          {alertEditTicker === ticker.symbol && (
                            <div className="mt-1.5 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--accent-primary)]/30">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <HugeiconsIcon icon={BellRinging} size={12} className="text-[var(--accent-primary)]" strokeWidth={2} color="currentColor" />
                                <span className="text-[10px] font-medium text-[var(--accent-primary)]">Custom Alert</span>
                              </div>
                              <input
                                ref={alertInputRef}
                                type="text"
                                value={alertInput}
                                onChange={(e) => setAlertInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateCustomPrompt(ticker.symbol, alertInput.trim() || null)
                                    setAlertEditTicker(null)
                                  }
                                  if (e.key === "Escape") {
                                    setAlertEditTicker(null)
                                  }
                                }}
                                placeholder="e.g., Alert when NVDA breaks above 950"
                                className="w-full bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-2 py-1.5 rounded border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                                maxLength={200}
                              />
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <button
                                  onClick={() => {
                                    updateCustomPrompt(ticker.symbol, alertInput.trim() || null)
                                    setAlertEditTicker(null)
                                  }}
                                  className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setAlertEditTicker(null)}
                                  className="px-2 py-1 rounded text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                                >
                                  Cancel
                                </button>
                                {ticker.customPrompt && (
                                  <button
                                    onClick={() => {
                                      updateCustomPrompt(ticker.symbol, null)
                                      setAlertEditTicker(null)
                                    }}
                                    className="px-2 py-1 rounded text-[10px] font-medium text-[var(--data-negative)] hover:bg-[var(--data-negative)]/10 transition-colors ml-auto"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add ticker input (edit mode) */}
                {editingWatchlist && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus-within:border-[var(--accent-primary)] transition-colors duration-150">
                      <HugeiconsIcon icon={Plus} size={12} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.5} color="currentColor" />
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
                      <HugeiconsIcon icon={Briefcase} size={12} strokeWidth={1.5} color="currentColor" />
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
                              <HugeiconsIcon icon={TrendUp} size={12} className="text-[var(--data-positive)]" strokeWidth={1.5} color="currentColor" />
                            ) : (
                              <HugeiconsIcon icon={TrendDown} size={12} className="text-[var(--data-negative)]" strokeWidth={1.5} color="currentColor" />
                            )}
                          </div>
                        )}
                        <HugeiconsIcon icon={CaretRight} size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150" strokeWidth={1.5} color="currentColor" />
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
                    <HugeiconsIcon icon={Pulse} size={16} className="text-[var(--data-warning)]" strokeWidth={1.5} color="currentColor" />
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
          </m.div>
        )}
      </AnimatePresence>
      )}
    </Card>
  )
}