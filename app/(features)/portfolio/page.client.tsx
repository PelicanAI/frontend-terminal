"use client"

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import dynamicImport from "next/dynamic"
import Image from "next/image"
import { m, AnimatePresence } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon as Plus,
  ArrowUpRight01Icon,
  Brain01Icon as Brain,
  Cancel01Icon as XIcon,
  Upload01Icon as UploadSimple,
} from "@hugeicons/core-free-icons"
import { usePortfolioSummary } from "@/hooks/use-portfolio-summary"
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights"
import { useTodaysWarnings } from "@/hooks/use-todays-warnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useTrades, type Trade } from "@/hooks/use-trades"
import { useTradeStats } from "@/hooks/use-trade-stats"
import { useTickerHistory } from "@/hooks/use-ticker-history"
import { useLiveQuotes, type Quote } from "@/hooks/use-live-quotes"
import { useWatchlist } from "@/hooks/use-watchlist"
import { usePlanCompliance } from "@/hooks/use-plan-compliance"
import { useBrokerConnections } from "@/hooks/use-broker-connections"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { EdgeSummary } from "@/components/insights/edge-summary"
import { PositionFilters } from "@/components/positions/position-filters"
import { PositionList } from "@/components/positions/position-list"
import { PositionsEmptyState } from "@/components/positions/positions-empty-state"
import { CloseTradeModal } from "@/components/journal/close-trade-modal"
import { LogTradeModal } from "@/components/journal/log-trade-modal"
import { CSVImportModal } from "@/components/journal/csv-import-modal"
import { TradesTable } from "@/components/journal/trades-table"
import { TradeDetailPanel } from "@/components/journal/trade-detail-panel"
import { ConnectBrokerButton } from "@/components/broker/connect-broker-button"
import { JournalEmptyState } from "@/components/journal/journal-empty-state"
import { FirstTradeCelebration, hasSeenFirstTradeCelebration } from "@/components/onboarding/first-trade-celebration"
import { PelicanButton, pageSections, sectionReveal, tabContent, backdrop } from "@/components/ui/pelican"
import { buildScanPrompt } from "@/lib/journal/build-scan-prompt"
import { buildReplayNarrationPrompt } from "@/lib/journal/build-replay-prompt"
import { trackEvent } from "@/lib/tracking"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { PortfolioPosition, PortfolioStats } from "@/types/portfolio"

const InsightsTab = dynamicImport(
  () => import("@/components/journal/insights-tab").then((module) => ({ default: module.InsightsTab })),
  { ssr: false }
)
const TradeReplay = dynamicImport(
  () => import("@/components/journal/trade-replay").then((module) => ({ default: module.TradeReplay })),
  { ssr: false }
)
const TradingPlanTab = dynamicImport(
  () => import("@/components/journal/trading-plan-tab").then((module) => ({ default: module.TradingPlanTab })),
  { ssr: false }
)
const TraderProfileTab = dynamicImport(
  () => import("@/components/journal/trader-profile-tab"),
  { ssr: false }
)

type SubTab = "active" | "history" | "insights"
type ActivePanel = "detail" | null

const TAB_ALIASES: Record<string, SubTab> = {
  trades: "history",
  performance: "insights",
  plan: "active",
  dashboard: "active",
}

function TerminalSectionFallback({ label, height = "h-32" }: { label: string; height?: string }) {
  return (
    <div className="border-b border-[var(--border-default)] py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <div className={`mt-4 ${height} flex items-center`}>
        <div className="h-px w-full bg-[var(--border-subtle)] opacity-70" />
      </div>
    </div>
  )
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return "?"
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function formatTerminalMoney(value: number | null | undefined, signed = false): string {
  if (value == null || Number.isNaN(value)) return "—"
  const sign = signed && value > 0 ? "+" : value < 0 ? "-" : ""
  const abs = Math.abs(value)
  return `${sign}${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getPositionQuote(position: PortfolioPosition, quotes: Record<string, Quote>): Quote | null {
  return quotes[position.ticker] ?? quotes[position.ticker.toUpperCase()] ?? null
}

function computeTerminalUnrealized(positions: PortfolioPosition[], quotes: Record<string, Quote>) {
  let total = 0
  let quotedExposure = 0
  let hasQuotes = false

  for (const position of positions) {
    const quote = getPositionQuote(position, quotes)
    if (!quote) continue
    hasQuotes = true
    const direction = position.direction === "long" ? 1 : -1
    const move = (quote.price - position.entry_price) * direction
    total += move * position.quantity
    quotedExposure += quote.price * position.quantity
  }

  return {
    total,
    hasQuotes,
    pct: quotedExposure > 0 ? (total / quotedExposure) * 100 : null,
  }
}

function AccountStrip({
  positions,
  portfolio,
  quotes,
  brokerName,
  isRefreshing,
  onRefresh,
  onLogTrade,
  onProfile,
}: {
  positions: PortfolioPosition[]
  portfolio: PortfolioStats | null | undefined
  quotes: Record<string, Quote>
  brokerName: string
  isRefreshing: boolean
  onRefresh: () => void
  onLogTrade: () => void
  onProfile: () => void
}) {
  const unrealized = useMemo(() => computeTerminalUnrealized(positions, quotes), [positions, quotes])
  const statTone =
    !unrealized.hasQuotes
      ? "text-[var(--text-muted)]"
      : unrealized.total >= 0
        ? "text-[var(--data-positive)]"
        : "text-[var(--data-negative)]"
  const totalRisk = portfolio?.positions_without_stop === 0 ? "Defined" : `${portfolio?.positions_without_stop ?? 0} missing`

  return (
    <div className="border-b border-[var(--border-default)] py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <Image src="/pelican-logo-transparent.webp" alt="Pelican" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text-primary)]">Pelican</div>
            <button
              type="button"
              onClick={onProfile}
              className="mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <span>ACCT</span>
              <span>{brokerName} · USD</span>
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4 xl:ml-auto xl:max-w-4xl">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Open exposure</div>
            <div className="mt-1 font-mono text-sm tabular-nums text-[var(--text-primary)]">{formatTerminalMoney(portfolio?.total_exposure)}</div>
            <div className="font-mono text-[10px] text-[var(--text-ghost)]">USD</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Unrealized P/L</div>
            <div className={`mt-1 font-mono text-sm tabular-nums ${statTone}`}>{unrealized.hasQuotes ? formatTerminalMoney(unrealized.total, true) : "—"}</div>
            <div className="font-mono text-[10px] text-[var(--text-ghost)]">{unrealized.pct == null ? "Waiting for quotes" : `${unrealized.pct > 0 ? "+" : ""}${unrealized.pct.toFixed(2)}% on exposure`}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Risk coverage</div>
            <div className="mt-1 font-mono text-sm tabular-nums text-[var(--text-primary)]">{totalRisk}</div>
            <div className="font-mono text-[10px] text-[var(--text-ghost)]">{portfolio?.total_positions ?? positions.length} positions</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Buying power</div>
            <div className="mt-1 font-mono text-sm tabular-nums text-[var(--text-muted)]">—</div>
            <div className="font-mono text-[10px] text-[var(--text-ghost)]">Not in current data</div>
          </div>
        </div>

        <div className="flex items-center gap-2 xl:ml-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 border border-[var(--border-default)] px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-50"
          >
            {isRefreshing ? "Syncing" : "Sync"}
          </button>
          <button
            type="button"
            onClick={onLogTrade}
            className="h-9 border border-[var(--border-active)] bg-[var(--accent-glow)] px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)]"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  )
}

function TerminalTabs({
  activeTab,
  positionsCount,
  tradesCount,
  warningsCount,
  insightsCount,
  onNavigate,
  onProfile,
}: {
  activeTab: SubTab
  positionsCount: number
  tradesCount: number
  warningsCount: number
  insightsCount: number
  onNavigate: (tab: SubTab) => void
  onProfile: () => void
}) {
  const tabs = [
    { label: "Positions", count: positionsCount, active: activeTab === "active", onClick: () => onNavigate("active") },
    { label: "Orders", count: 0, active: false, onClick: undefined },
    { label: "History", count: tradesCount, active: activeTab === "history", onClick: () => onNavigate("history") },
    { label: "Profile", active: false, onClick: onProfile, opensDialog: true },
    { label: "Notifications", count: warningsCount, active: false, onClick: undefined },
  ]

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-default)] py-2 lg:flex-row lg:items-center">
      <div className="flex flex-nowrap items-center gap-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={tab.onClick}
            disabled={!tab.onClick}
            aria-haspopup={tab.opensDialog ? "dialog" : undefined}
            aria-label={tab.opensDialog ? "Trader profile, opens in modal" : undefined}
            title={tab.opensDialog ? "Opens trader profile" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center border-b px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] transition-colors",
              tab.active
                ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              !tab.onClick && "cursor-not-allowed opacity-40 hover:text-[var(--text-muted)]",
            )}
          >
            {tab.label}
            {tab.opensDialog && (
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                className="ml-1 h-3 w-3 opacity-60"
                strokeWidth={1.5}
                color="currentColor"
                aria-hidden
              />
            )}
            {tab.count != null && <span className="ml-1 font-mono text-[10px] text-[var(--text-ghost)]">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="flex w-fit border border-[var(--border-default)] lg:ml-auto">
        <button
          type="button"
          onClick={() => onNavigate("active")}
          className={cn(
            "border-r border-[var(--border-default)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
            activeTab === "active" ? "bg-[var(--accent-glow)] text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
        >
          Positions
        </button>
        <button
          type="button"
          onClick={() => onNavigate("insights")}
          className={cn(
            "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
            activeTab === "insights" ? "bg-[var(--accent-glow)] text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
        >
          Insights
          {insightsCount > 0 && <span className="ml-1 text-[var(--text-ghost)]">{insightsCount}</span>}
        </button>
      </div>
    </div>
  )
}

function DataSourceBar({
  activeConnectionName,
  positionsCount,
  onSync,
  onImport,
}: {
  activeConnectionName: string
  positionsCount: number
  onSync: () => void
  onImport: () => void
}) {
  return (
    <div className="grid gap-2 border-b border-[var(--border-default)] py-3 lg:grid-cols-3">
      <div className="border border-[var(--border-active)] bg-[var(--accent-glow)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--data-positive)]" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--text-primary)]">Live · {activeConnectionName}</div>
            <div className="font-mono text-[10px] text-[var(--text-muted)]">Current session · {positionsCount} pos · SnapTrade/manual</div>
          </div>
          <button type="button" onClick={onSync} className="ml-auto border border-[var(--border-default)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]">
            Sync
          </button>
        </div>
      </div>
      <div className="border border-[var(--border-subtle)] px-3 py-2 opacity-45">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-ghost)]" />
          <div>
            <div className="text-xs font-medium text-[var(--text-primary)]">Paper · Polygon</div>
            <div className="font-mono text-[10px] text-[var(--text-muted)]">Deferred · simulator not wired</div>
          </div>
          <span className="ml-auto border border-[var(--border-default)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">SIM</span>
        </div>
      </div>
      <div className="border border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-ghost)]" />
          <div>
            <div className="text-xs font-medium text-[var(--text-primary)]">CSV · Import</div>
            <div className="font-mono text-[10px] text-[var(--text-muted)]">Journal backfill path</div>
          </div>
          <button type="button" onClick={onImport} className="ml-auto border border-[var(--border-default)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]">
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionDivider({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-1 w-1 rounded-full bg-[var(--accent-primary)] opacity-40 flex-none" />
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap">
        {label}
      </span>
      <m.div
        className="flex-1 h-px bg-[var(--border-default)]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
        style={{ transformOrigin: "left" }}
      />
      {right}
    </div>
  )
}

function resolveSubTab(tabParam: string | null): SubTab {
  if (!tabParam) return "active"
  if (tabParam === "active" || tabParam === "history" || tabParam === "insights") return tabParam
  return TAB_ALIASES[tabParam] ?? "active"
}

function toCloseableTrade(position: PortfolioPosition): Trade {
  return {
    id: position.id,
    ticker: position.ticker,
    asset_type: position.asset_type,
    direction: position.direction,
    quantity: position.quantity,
    entry_price: position.entry_price,
    stop_loss: position.stop_loss,
    take_profit: position.take_profit,
    status: "open",
    exit_price: null,
    pnl_amount: null,
    pnl_percent: null,
    r_multiple: null,
    entry_date: position.entry_date,
    exit_date: null,
    thesis: position.thesis,
    notes: position.notes,
    setup_tags: position.setup_tags,
    conviction: position.conviction,
    ai_grade: null,
    plan_rules_followed: null,
    plan_rules_violated: null,
    plan_checklist_completed: null,
    playbook_id: position.playbook_id ?? null,
    is_paper: position.is_paper,
    user_id: "",
    created_at: "",
    updated_at: "",
  }
}

export default function PortfolioPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<SubTab>(() => resolveSubTab(tabParam))
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("size_desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [tradeTypeFilter, setTradeTypeFilter] = useState<"all" | "real" | "paper">("all")
  const [tradeSearchQuery, setTradeSearchQuery] = useState("")
  const [closingPosition, setClosingPosition] = useState<PortfolioPosition | null>(null)
  const [showLogTradeModal, setShowLogTradeModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCloseTradeModal, setShowCloseTradeModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [replayTrade, setReplayTrade] = useState<Trade | null>(null)
  const [editTrade, setEditTrade] = useState<Trade | null>(null)
  const [showPostCloseReview, setShowPostCloseReview] = useState<PortfolioPosition | null>(null)
  const [showFirstTradeCelebration, setShowFirstTradeCelebration] = useState(false)
  const [celebrationTicker, setCelebrationTicker] = useState<string | undefined>()

  const { data: portfolio, isLoading: portfolioLoading, refresh: refreshPortfolio } = usePortfolioSummary()
  const { data: insights } = useBehavioralInsights()
  const { warnings } = useTodaysWarnings()
  const { openWithPrompt } = usePelicanPanelContext()
  const { trades, openTrades, isLoading: tradesLoading, logTrade, closeTrade, refetch, updateTrade } = useTrades()
  const { stats, isLoading: statsLoading } = useTradeStats()
  const { stats: complianceStats } = usePlanCompliance()
  const { items: watchlistItems } = useWatchlist()
  const { activeConnections } = useBrokerConnections()
  const { completeMilestone } = useOnboardingProgress()
  const activeConnectionName = activeConnections[0]?.brokerage_name || "Manual"

  const watchlistTickers = useMemo(
    () => new Set(watchlistItems.map((item) => item.ticker.toUpperCase())),
    [watchlistItems]
  )

  const openTickers = useMemo(
    () => portfolio?.positions?.map((position) => position.ticker) ?? [],
    [portfolio?.positions]
  )
  const quoteTickers = useMemo(() => {
    const fromPortfolio = portfolio?.positions?.map((position) => `${position.ticker}:${position.asset_type}`) ?? []
    const fromTrades = openTrades.map((trade) => `${trade.ticker}:${trade.asset_type}`)
    return Array.from(new Set([...fromPortfolio, ...fromTrades]))
  }, [portfolio?.positions, openTrades])

  const { data: tickerHistory } = useTickerHistory(openTickers)
  const { quotes } = useLiveQuotes(quoteTickers)
  const insightsBadgeCount = useMemo(() => {
    if (!insights?.has_enough_data) return 0
    const sections = [
      insights.setup_performance,
      insights.day_of_week,
      insights.time_of_day,
      insights.holding_period,
      insights.ticker_performance,
    ]
    const qualifiedCount = sections.reduce(
      (count, section) => count + (section.some((item) => item.total_trades >= 3) ? 1 : 0),
      0,
    )
    return qualifiedCount || 1
  }, [insights])

  const filteredTrades = useMemo(() => {
    const normalizedQuery = tradeSearchQuery.trim().toLowerCase()
    return trades.filter((trade) => {
      if (tradeTypeFilter === "real" && trade.is_paper) return false
      if (tradeTypeFilter === "paper" && !trade.is_paper) return false
      if (!normalizedQuery) return true

      return [
        trade.ticker,
        trade.thesis ?? "",
        trade.notes ?? "",
        ...(trade.setup_tags ?? []),
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [tradeSearchQuery, tradeTypeFilter, trades])

  const navigateToTab = useCallback((tab: SubTab, focus?: { highlight?: string; ticker?: string }) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("tab", tab)
    nextParams.delete("highlight")
    nextParams.delete("ticker")
    if (focus?.highlight) nextParams.set("highlight", focus.highlight)
    if (focus?.ticker) nextParams.set("ticker", focus.ticker)

    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `/portfolio?${nextQuery}` : "/portfolio", { scroll: false })
    setActiveTab(tab)
    setShowPlanModal(false)
    setShowProfileModal(false)

    if (tab !== "history") {
      setActivePanel(null)
      setSelectedTrade(null)
    }
  }, [router, searchParams])

  useEffect(() => {
    const nextTab = resolveSubTab(tabParam)
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab))
  }, [tabParam])

  useEffect(() => {
    if (tabParam === "plan") setShowPlanModal(true)
    if (tabParam === "profile") setShowProfileModal(true)
  }, [tabParam])

  const tickerParam = searchParams.get("ticker")
  useEffect(() => {
    if (!tickerParam || tradesLoading) return
    const trade = trades.find((item) => item.ticker.toLowerCase() === tickerParam.toLowerCase())
    if (!trade) return

    setSelectedTrade(trade)
    setActivePanel("detail")
    setActiveTab("history")
  }, [tickerParam, trades, tradesLoading])

  const highlightTradeId = searchParams.get("highlight")
  useEffect(() => {
    if (!highlightTradeId || tradesLoading) return

    const trade = trades.find((item) => item.id === highlightTradeId)
    if (trade) {
      setSelectedTrade(trade)
      setActivePanel("detail")
      setActiveTab("history")
    }

    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-trade-id="${highlightTradeId}"]`)
      if (!row) return
      row.scrollIntoView({ behavior: "smooth", block: "center" })
      row.classList.add("highlight-pulse")
      setTimeout(() => row.classList.remove("highlight-pulse"), 2500)
    }, 300)

    return () => clearTimeout(timer)
  }, [highlightTradeId, trades, tradesLoading])

  const handleSendMessage = useCallback(async (message: string) => {
    await openWithPrompt(null, message, "journal", "position_fix")
  }, [openWithPrompt])

  const handleAskPelican = useCallback(async (prompt: string) => {
    await openWithPrompt(null, prompt, "journal", "journal_review")
  }, [openWithPrompt])

  const handleSelectTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade)
    setActivePanel("detail")
  }, [])

  const handleCloseDetailPanel = useCallback(() => {
    setActivePanel(null)
    setSelectedTrade(null)
  }, [])

  const handleOpenCloseTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade)
    setShowCloseTradeModal(true)
  }, [])

  const handleScanPosition = useCallback(async (position: PortfolioPosition) => {
    const parts = [
      `Scan my ${position.ticker} ${position.direction.toUpperCase()} position.`,
      `Entry: $${position.entry_price}.`,
      `Size: $${position.position_size_usd?.toLocaleString()}.`,
      position.stop_loss ? `Stop: $${position.stop_loss} (${position.distance_to_stop_pct}% away).` : "No stop loss set.",
      position.take_profit ? `Target: $${position.take_profit} (${position.distance_to_target_pct}% away).` : "No target set.",
      position.risk_reward_ratio ? `R:R ratio: ${position.risk_reward_ratio}:1.` : "",
      position.thesis ? `My thesis: "${position.thesis}".` : "",
      `Conviction: ${position.conviction || "?"}/10. Held for ${position.days_held} days.`,
      "",
      "Give me: current technicals, whether my thesis is still valid, key levels to watch, and your honest recommendation — hold, add, trim, or exit. Be specific.",
    ].filter(Boolean).join(" ")

    trackEvent({ eventType: "position_monitored", feature: "positions", ticker: position.ticker })
    await openWithPrompt(position.ticker, parts, "journal", "position_scan")
  }, [openWithPrompt])

  const handleEditPosition = useCallback((position: PortfolioPosition) => {
    const trade = trades.find((item) => item.id === position.id)
    if (trade) {
      setSelectedTrade(trade)
      setActivePanel("detail")
    }
    navigateToTab("history", { highlight: position.id })
  }, [navigateToTab, trades])

  const handleClosePosition = useCallback((position: PortfolioPosition) => {
    setClosingPosition(position)
  }, [])

  const handleCloseTradeSubmit = useCallback(async (data: { exit_price: number; exit_date: string; notes?: string | null; mistakes?: string | null }) => {
    if (!closingPosition) return

    const result = await closeTrade(closingPosition.id, data)
    if (!result.success) throw new Error(result.error || "Failed to close trade")

    refetch()
    refreshPortfolio()
    setShowPostCloseReview(closingPosition)
    setClosingPosition(null)
  }, [closeTrade, closingPosition, refetch, refreshPortfolio])

  const handleLogTrade = useCallback(async (data: Parameters<typeof logTrade>[0]) => {
    const isFirstTrade = trades.length === 0 && !hasSeenFirstTradeCelebration()

    await logTrade(data)
    refetch()
    refreshPortfolio()

    toast({ title: "Trade logged", description: `${data.ticker} ${data.direction} position recorded.` })

    completeMilestone("first_trade")
    const totalTrades = trades.length + 1
    if (totalTrades >= 5) completeMilestone("five_trades")

    if (isFirstTrade) {
      setCelebrationTicker(data.ticker)
      setTimeout(() => setShowFirstTradeCelebration(true), 300)
    }
  }, [completeMilestone, logTrade, refreshPortfolio, refetch, trades.length])

  const handleCloseTrade = useCallback(async (data: Parameters<typeof closeTrade>[1]) => {
    if (!selectedTrade) return

    const result = await closeTrade(selectedTrade.id, data)
    if (!result.success) {
      throw new Error(result.error || "Failed to close trade")
    }

    refetch()
    refreshPortfolio()

    const pnlDisplay = result.pnl_amount != null
      ? `${result.pnl_amount >= 0 ? "+" : ""}$${result.pnl_amount.toFixed(2)} (${result.pnl_percent?.toFixed(1)}%)`
      : "Success"

    toast({
      title: "Trade closed",
      description: `${selectedTrade.ticker} ${pnlDisplay}`,
    })

    setShowCloseTradeModal(false)
    handleCloseDetailPanel()
  }, [closeTrade, handleCloseDetailPanel, refetch, refreshPortfolio, selectedTrade])

  const handleScanTrade = useCallback(async (trade: Trade) => {
    trackEvent({ eventType: "trade_scanned", feature: "journal", ticker: trade.ticker })

    const quote = quotes[trade.ticker]
    const currentPrice = quote?.price
    const entryDate = new Date(trade.entry_date)
    const endDate = trade.exit_date ? new Date(trade.exit_date) : new Date()
    const holdingDays = Math.max(1, Math.round((endDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)))

    let unrealizedPnL: { amount: number; percent: number; rMultiple: number | null } | undefined
    if (trade.status === "open" && currentPrice) {
      const direction = trade.direction === "long" ? 1 : -1
      const pnlAmount = (currentPrice - trade.entry_price) * trade.quantity * direction
      const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100 * direction

      let rMultiple: number | null = null
      if (trade.stop_loss) {
        const riskPerShare = Math.abs(trade.entry_price - trade.stop_loss)
        if (riskPerShare > 0) {
          rMultiple = ((currentPrice - trade.entry_price) * direction) / riskPerShare
        }
      }

      unrealizedPnL = { amount: pnlAmount, percent: pnlPercent, rMultiple }
    }

    let distanceToStop: number | undefined
    let distanceToTarget: number | undefined
    if (trade.status === "open" && currentPrice) {
      if (trade.stop_loss) {
        distanceToStop = Math.abs(((currentPrice - trade.stop_loss) / trade.stop_loss) * 100)
      }
      if (trade.take_profit) {
        distanceToTarget = Math.abs(((trade.take_profit - currentPrice) / currentPrice) * 100)
      }
    }

    const scanCount = (trade.ai_grade as { pelican_scan_count?: number } | null)?.pelican_scan_count || 0
    const prompt = buildScanPrompt({
      trade,
      currentPrice,
      holdingDays,
      unrealizedPnL,
      distanceToStop,
      distanceToTarget,
      scanCount,
    })

    await updateTrade(trade.id, {
      ai_grade: {
        ...((trade.ai_grade as object | null) || {}),
        pelican_scan_count: scanCount + 1,
        last_pelican_scan_at: new Date().toISOString(),
      },
    })

    await openWithPrompt(trade.ticker, prompt, "journal", "journal_scan")
  }, [openWithPrompt, quotes, updateTrade])

  const handleEditTrade = useCallback((trade: Trade) => {
    trackEvent({ eventType: "trade_scanned", feature: "journal", ticker: trade.ticker, data: { action: "edit" } })
    setEditTrade(trade)
    setShowLogTradeModal(true)
  }, [])

  const handleEditComplete = useCallback(() => {
    toast({ title: "Trade updated", description: editTrade ? `${editTrade.ticker} position updated.` : undefined })
    setEditTrade(null)
    setShowLogTradeModal(false)
    refetch()

    if (selectedTrade && editTrade && selectedTrade.id === editTrade.id) {
      const updatedTrade = trades.find((trade) => trade.id === editTrade.id)
      if (updatedTrade) setSelectedTrade(updatedTrade)
    }
  }, [editTrade, refetch, selectedTrade, trades])

  const handleReplayTrade = useCallback((trade: Trade) => {
    setReplayTrade(trade)
  }, [])

  const handleNarrateTrade = useCallback(async (trade: Trade) => {
    const prompt = buildReplayNarrationPrompt(trade)
    await openWithPrompt(trade.ticker, prompt, "journal", "journal_replay")
  }, [openWithPrompt])

  const showDetailPanel = activeTab === "history" && activePanel === "detail" && selectedTrade !== null
  const filterButtons = ["all", "real", "paper"] as const
  const filterLabels = { all: "All", real: "Real", paper: "Simulated" }
  return (
    <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <AccountStrip
          positions={portfolio?.positions ?? []}
          portfolio={portfolio?.portfolio}
          quotes={quotes}
          brokerName={activeConnectionName}
          isRefreshing={isRefreshing}
          onRefresh={async () => {
            if (isRefreshing) return
            setIsRefreshing(true)
            try {
              await refreshPortfolio()
            } finally {
              setTimeout(() => setIsRefreshing(false), 800)
            }
          }}
          onLogTrade={() => setShowLogTradeModal(true)}
          onProfile={() => setShowProfileModal(true)}
        />

        <TerminalTabs
          activeTab={activeTab}
          positionsCount={portfolio?.positions.length ?? 0}
          tradesCount={trades.length}
          warningsCount={warnings.length}
          insightsCount={insightsBadgeCount}
          onNavigate={navigateToTab}
          onProfile={() => setShowProfileModal(true)}
        />

        <AnimatePresence mode="wait">
          {activeTab === "active" && (
            <m.div key="active" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              {portfolioLoading ? (
                <div className="animate-pulse motion-reduce:animate-none">
                  <div className="border-b border-[var(--border-default)] py-3">
                    <div className="h-11 w-full bg-[var(--bg-elevated)] opacity-70" />
                  </div>
                  <div className="border-b border-[var(--border-default)] py-2.5">
                    <div className="h-3 w-24 bg-[var(--bg-elevated)]" />
                  </div>
                  <div>
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="border-b border-[var(--border-subtle)] py-3">
                        <div className="h-5 w-full bg-[var(--bg-elevated)] opacity-60" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <TerminalSectionFallback label="Loading P&L history" height="h-36" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <div className="xl:col-span-8">
                      <TerminalSectionFallback label="Loading actions" height="h-28" />
                    </div>
                    <div className="xl:col-span-4">
                      <TerminalSectionFallback label="Loading risk" height="h-28" />
                    </div>
                  </div>
                </div>
              ) : !portfolio || portfolio.positions.length === 0 ? (
                <PositionsEmptyState
                  onLogTrade={() => setShowLogTradeModal(true)}
                  onAskPelican={() => handleSendMessage("Based on my current portfolio exposure and open positions, suggest what I should be looking at next. Consider my sector concentration, directional bias, and which setups have been working for me.")}
                />
              ) : (
                <m.div
                  variants={pageSections}
                  initial="hidden"
                  animate="visible"
                  className="pt-3"
                >
                  <m.div variants={sectionReveal} className="space-y-2">
                    <DataSourceBar
                      activeConnectionName={activeConnectionName}
                      positionsCount={portfolio.positions.length}
                      onSync={async () => {
                        if (isRefreshing) return
                        setIsRefreshing(true)
                        try {
                          await refreshPortfolio()
                        } finally {
                          setTimeout(() => setIsRefreshing(false), 800)
                        }
                      }}
                      onImport={() => setShowImportModal(true)}
                    />

                    <PositionFilters
                      positions={portfolio.positions}
                      activeFilter={activeFilter}
                      sortBy={sortBy}
                      searchQuery={searchQuery}
                      onFilterChange={setActiveFilter}
                      onSortChange={setSortBy}
                      onSearchChange={setSearchQuery}
                      onLogTrade={() => setShowLogTradeModal(true)}
                      showConnectBroker
                    />
                  </m.div>

                  <m.div variants={sectionReveal} className="mt-1">
                    <SectionDivider
                      label={`Positions · ${portfolio.positions.length}`}
                      right={(
                        <button
                          onClick={() => navigateToTab("history")}
                          className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
                        >
                          Closed →
                        </button>
                      )}
                    />
                    <PositionList
                      positions={portfolio.positions}
                      portfolioStats={portfolio.portfolio}
                      insights={insights}
                      tickerHistory={tickerHistory}
                      quotes={quotes}
                      watchlistTickers={watchlistTickers}
                      activeFilter={activeFilter}
                      sortBy={sortBy}
                      searchQuery={searchQuery}
                      onScanWithPelican={handleScanPosition}
                      onEdit={handleEditPosition}
                      onClose={handleClosePosition}
                      onLogTrade={() => setShowLogTradeModal(true)}
                    />
                  </m.div>

                  {(warnings.length > 0 || insights?.has_enough_data) && (
                    <m.div variants={sectionReveal} className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {warnings.length > 0 && (
                        <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Notifications</div>
                          <div className="mt-3 space-y-3">
                            {warnings.slice(0, 3).map((warning) => (
                              <button
                                key={warning.title}
                                type="button"
                                onClick={() => {
                                  trackEvent({ eventType: "alert_acted", feature: "positions", data: { alertType: warning.title } })
                                  handleSendMessage(`I have a trading warning: ${warning.title}. ${warning.message} What should I do?`)
                                }}
                                className="block w-full text-left text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                              >
                                <span className="font-medium text-[var(--text-primary)]">{warning.title}</span>
                                <span className="ml-2">{warning.message}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {insights?.has_enough_data && (
                        <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Edge summary</div>
                          <div className="mt-3">
                            <EdgeSummary insights={insights} compact onAskPelican={handleSendMessage} />
                          </div>
                        </div>
                      )}
                    </m.div>
                  )}
                </m.div>
              )}
            </m.div>
          )}

          {activeTab === "history" && (
            <m.div key="history" variants={tabContent} initial="hidden" animate="visible" exit="exit" className="py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5 w-fit">
                    {filterButtons.map((type) => (
                      <button
                        key={type}
                        onClick={() => setTradeTypeFilter(type)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                          tradeTypeFilter === type
                            ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                            : "bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                        )}
                      >
                        {filterLabels[type]}
                      </button>
                    ))}
                  </div>

                  <input
                    value={tradeSearchQuery}
                    onChange={(event) => setTradeSearchQuery(event.target.value)}
                    placeholder="Search ticker, setup, thesis, or notes"
                    className="w-full md:w-80 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--border-hover)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {activeConnections.length === 0 && (
                    <ConnectBrokerButton variant="secondary" size="sm" className="whitespace-nowrap flex-shrink-0" />
                  )}
                  <PelicanButton variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
                    <HugeiconsIcon icon={UploadSimple} size={16} strokeWidth={1.5} color="currentColor" />
                    Import CSV
                  </PelicanButton>
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <div className="min-w-0 flex-1">
                  {!tradesLoading && trades.length === 0 ? (
                    <JournalEmptyState
                      onLogTrade={() => setShowLogTradeModal(true)}
                      onAskPelican={() => openWithPrompt(null, "Suggest a trade idea that fits my edge. Look at my best-performing setups, strongest tickers, and current portfolio exposure. Give me: ticker, direction, entry, stop loss, take profit, R:R, thesis, and which of my playbooks it matches. Avoid tickers I historically lose on.", "journal", "journal_review")}
                    />
                  ) : (
                    <TradesTable
                      trades={filteredTrades}
                      onSelectTrade={handleSelectTrade}
                      onScanTrade={handleScanTrade}
                      selectedTradeId={selectedTrade?.id}
                      onAskPelican={handleAskPelican}
                      onReplayTrade={handleReplayTrade}
                      onEditTrade={handleEditTrade}
                    />
                  )}

                  {tradesLoading && trades.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-[var(--text-muted)] text-sm">Loading trades...</p>
                      </div>
                    </div>
                  )}
                </div>

                {showDetailPanel && selectedTrade && (
                  <div className="hidden md:flex flex-shrink-0 w-[min(420px,30%)]">
                    <TradeDetailPanel
                      trade={selectedTrade}
                      onClose={handleCloseDetailPanel}
                      onEdit={handleEditTrade}
                      onCloseTrade={handleOpenCloseTrade}
                      onReplay={handleReplayTrade}
                    />
                  </div>
                )}
              </div>
            </m.div>
          )}

          {activeTab === "insights" && (
            <m.div
              key="insights"
              variants={tabContent}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="py-4"
              onAnimationComplete={() => trackEvent({ eventType: "insight_viewed", feature: "journal" })}
            >
              <InsightsTab
                onAskPelican={handleAskPelican}
                onLogTrade={() => setShowLogTradeModal(true)}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setShowLogTradeModal(true)}
        className="sm:hidden fixed right-6 z-40 w-14 h-14 bg-[var(--accent-primary)] rounded-full shadow-lg shadow-[var(--accent-primary)]/25 flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Log Trade"
      >
        <HugeiconsIcon icon={Plus} size={24} className="text-white" strokeWidth={2} color="currentColor" />
      </button>

      <LogTradeModal
        open={showLogTradeModal}
        onOpenChange={(open) => {
          setShowLogTradeModal(open)
          if (!open) setEditTrade(null)
        }}
        onSubmit={handleLogTrade}
        editTrade={editTrade}
        onEditComplete={handleEditComplete}
      />

      <CSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={() => refetch()}
      />

      {closingPosition && (
        <CloseTradeModal
          open={!!closingPosition}
          onOpenChange={(open) => {
            if (!open) setClosingPosition(null)
          }}
          trade={toCloseableTrade(closingPosition)}
          onSubmit={handleCloseTradeSubmit}
        />
      )}

      {selectedTrade && (
        <CloseTradeModal
          open={showCloseTradeModal}
          onOpenChange={setShowCloseTradeModal}
          trade={selectedTrade}
          onSubmit={handleCloseTrade}
        />
      )}

      {showPostCloseReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] backdrop-blur-sm">
          <m.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-4 max-w-sm border border-[var(--border-subtle)] bg-[var(--bg-base)] px-6 py-5"
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--border-active)] bg-[var(--accent-glow)]">
                <HugeiconsIcon icon={Brain} size={20} className="text-[var(--accent-primary)]" strokeWidth={2} color="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Grade {showPostCloseReview.ticker} {showPostCloseReview.direction}?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Pelican will grade entry, management, and exit A-F with specific feedback.
                </p>
                <div className="flex gap-2 mt-4">
                  <PelicanButton variant="secondary" size="sm" onClick={() => setShowPostCloseReview(null)}>
                    Skip
                  </PelicanButton>
                  <PelicanButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const position = showPostCloseReview
                      trackEvent({ eventType: "trade_graded", feature: "positions", ticker: position.ticker })
                      handleSendMessage(
                        `I just closed my ${position.ticker} ${position.direction.toUpperCase()} position. ` +
                          `Entry: $${position.entry_price}. Size: ${formatNum(position.position_size_usd)}. ` +
                          `Held for ${position.days_held} days. ` +
                          (position.thesis ? `My thesis was: "${position.thesis}". ` : "") +
                          `Conviction was ${position.conviction || "?"}/10. ` +
                          (position.risk_reward_ratio ? `R:R ratio was ${position.risk_reward_ratio}:1. ` : "") +
                          "Grade this trade A through F. What did I do right? What should I improve? Be specific and honest."
                      )
                      setShowPostCloseReview(null)
                    }}
                  >
                    Grade trade
                  </PelicanButton>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      )}

      <AnimatePresence>
        {replayTrade && (
          <m.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-[var(--bg-overlay)] backdrop-blur-sm cursor-pointer"
            onClick={() => setReplayTrade(null)}
          >
            <m.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(800px,90vw)] sm:max-h-[85vh] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Trade Replay</h2>
                  <span className="font-[var(--font-geist-mono)] tabular-nums text-sm text-[var(--accent-primary)]">{replayTrade.ticker}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium uppercase",
                    replayTrade.direction === "long"
                      ? "bg-[var(--data-positive)]/20 text-[var(--data-positive)]"
                      : "bg-[var(--data-negative)]/20 text-[var(--data-negative)]"
                  )}>
                    {replayTrade.direction}
                  </span>
                </div>
                <button
                  onClick={() => setReplayTrade(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <HugeiconsIcon icon={XIcon} size={16} strokeWidth={2} color="currentColor" />
                </button>
              </div>
              <div className="p-4">
                <TradeReplay
                  trade={replayTrade}
                  onNarrate={handleNarrateTrade}
                />
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlanModal && (
          <m.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-[var(--bg-overlay)] backdrop-blur-sm cursor-pointer"
            onClick={() => {
              setShowPlanModal(false)
              if (tabParam === "plan") navigateToTab("active")
            }}
          >
            <m.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(720px,90vw)] sm:max-h-[85vh] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Trading plan</h2>
                <button
                  onClick={() => {
                    setShowPlanModal(false)
                    if (tabParam === "plan") navigateToTab("active")
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <HugeiconsIcon icon={XIcon} size={16} strokeWidth={2} color="currentColor" />
                </button>
              </div>
              <div className="p-5">
                <TradingPlanTab
                  trades={trades}
                  onAskPelican={handleAskPelican}
                  complianceStats={complianceStats}
                  tradeStats={stats}
                />
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && (
          <m.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-[var(--bg-overlay)] cursor-pointer"
            onClick={() => {
              setShowProfileModal(false)
              if (tabParam === "profile") navigateToTab("active")
            }}
          >
            <m.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(640px,90vw)] sm:max-h-[80vh] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Trader Profile</h2>
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    if (tabParam === "profile") navigateToTab("active")
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <HugeiconsIcon icon={XIcon} size={16} strokeWidth={2} color="currentColor" />
                </button>
              </div>
              <div className="p-5">
                <TraderProfileTab
                  trades={trades}
                  stats={stats}
                  isLoading={tradesLoading || statsLoading}
                  onAskPelican={handleAskPelican}
                />
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <FirstTradeCelebration
        isOpen={showFirstTradeCelebration}
        onClose={() => setShowFirstTradeCelebration(false)}
        onViewPosition={() => {
          setShowFirstTradeCelebration(false)
          router.push("/portfolio")
        }}
        ticker={celebrationTicker}
      />

      <AnimatePresence>
        {showDetailPanel && selectedTrade && (
          <m.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden fixed inset-0 z-50 bg-[var(--bg-overlay)] cursor-pointer"
            onClick={handleCloseDetailPanel}
          >
            <m.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute bottom-0 left-0 right-0 h-[80vh] bg-[var(--bg-base)] rounded-t-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="w-12 h-1 bg-[var(--border-default)] rounded-full mx-auto mt-3 mb-2" />
              <TradeDetailPanel
                trade={selectedTrade}
                onClose={handleCloseDetailPanel}
                onEdit={handleEditTrade}
                onCloseTrade={handleOpenCloseTrade}
                onReplay={handleReplayTrade}
              />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
