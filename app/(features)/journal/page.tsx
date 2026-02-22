"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import dynamicImport from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { useTrades, Trade } from "@/hooks/use-trades"
import { useTradeStats } from "@/hooks/use-trade-stats"
import { usePlanCompliance } from "@/hooks/use-plan-compliance"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { LogTradeModal } from "@/components/journal/log-trade-modal"
import { CloseTradeModal } from "@/components/journal/close-trade-modal"
import { TradesTable } from "@/components/journal/trades-table"
import { TradeDetailPanel } from "@/components/journal/trade-detail-panel"
import { buildScanPrompt } from "@/lib/journal/build-scan-prompt"
import { buildReplayNarrationPrompt } from "@/lib/journal/build-replay-prompt"
import { PelicanButton, pageEnter, tabContent, backdrop } from "@/components/ui/pelican"
import { Plus, ChartBar, Funnel, ClipboardText, Brain, UserCircle, X as XIcon } from "@phosphor-icons/react"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"

const PerformanceTab = dynamicImport(
  () => import("@/components/journal/performance-tab").then((m) => ({ default: m.PerformanceTab })),
  { ssr: false }
)

const TraderProfileTab = dynamicImport(
  () => import("@/components/journal/trader-profile-tab"),
  { ssr: false }
)

const TradingPlanTab = dynamicImport(
  () => import("@/components/journal/trading-plan-tab").then((m) => ({ default: m.TradingPlanTab })),
  { ssr: false }
)

const InsightsTab = dynamicImport(
  () => import("@/components/journal/insights-tab").then((m) => ({ default: m.InsightsTab })),
  { ssr: false }
)

const TradeReplay = dynamicImport(
  () => import("@/components/journal/trade-replay").then((m) => ({ default: m.TradeReplay })),
  { ssr: false }
)

type TabKey = 'performance' | 'trades' | 'plan' | 'insights'
type ActivePanel = 'detail' | 'pelican' | null

// Backward-compat: old tab names → new tab names
const TAB_ALIASES: Record<string, TabKey> = {
  dashboard: 'performance',
  calendar: 'performance',
  profile: 'performance', // profile moved to header modal
}

export default function JournalPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>('trades')
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [showLogTradeModal, setShowLogTradeModal] = useState(false)
  const [showCloseTradeModal, setShowCloseTradeModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | 'real' | 'paper'>('all')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [replayTrade, setReplayTrade] = useState<Trade | null>(null)

  const { trades, isLoading: tradesLoading, logTrade, closeTrade, refetch, updateTrade } = useTrades()

  // Handle ?tab= from settings modal links (with backward compat)
  const tabParam = searchParams.get('tab')
  useEffect(() => {
    if (!tabParam) return
    // Check if it's a valid new tab
    if (['performance', 'trades', 'plan', 'insights'].includes(tabParam)) {
      setActiveTab(tabParam as TabKey)
    }
    // Check backward-compat aliases
    else if (tabParam in TAB_ALIASES) {
      setActiveTab(TAB_ALIASES[tabParam]!)
      // If old "profile" tab was requested, open the profile modal
      if (tabParam === 'profile') {
        setShowProfileModal(true)
      }
    }
  }, [tabParam])

  // Handle ?ticker= param — switch to trades tab and highlight
  const tickerParam = searchParams.get('ticker')
  useEffect(() => {
    if (!tickerParam || tradesLoading) return
    const trade = trades.find(t => t.ticker.toLowerCase() === tickerParam.toLowerCase())
    if (trade) {
      setSelectedTrade(trade)
      setActivePanel('detail')
      setActiveTab('trades')
    }
  }, [tickerParam, trades, tradesLoading])

  // Handle ?highlight=tradeId from chat action buttons
  const highlightTradeId = searchParams.get('highlight')
  useEffect(() => {
    if (!highlightTradeId || tradesLoading) return

    const trade = trades.find(t => t.id === highlightTradeId)
    if (trade) {
      setSelectedTrade(trade)
      setActivePanel('detail')
      setActiveTab('trades')
    }

    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-trade-id="${highlightTradeId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        row.classList.add('highlight-pulse')
        setTimeout(() => row.classList.remove('highlight-pulse'), 2500)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [highlightTradeId, trades, tradesLoading])
  const { stats, equityCurve, isLoading: statsLoading } = useTradeStats()
  const { stats: complianceStats } = usePlanCompliance()
  const { openWithPrompt } = usePelicanPanelContext()

  // Get live quotes for all open positions (ticker:asset_type format for Polygon routing)
  const openTickersWithTypes = trades
    .filter(t => t.status === 'open')
    .map(t => `${t.ticker}:${t.asset_type}`)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
  const { quotes } = useLiveQuotes(openTickersWithTypes)

  const handleScanTrade = async (trade: Trade) => {
    const quote = quotes[trade.ticker]
    const currentPrice = quote?.price

    // Calculate holding days
    const entryDate = new Date(trade.entry_date)
    const endDate = trade.exit_date ? new Date(trade.exit_date) : new Date()
    const holdingDays = Math.max(1, Math.round((endDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate unrealized P&L for open trades
    let unrealizedPnL: { amount: number; percent: number; rMultiple: number | null } | undefined
    if (trade.status === 'open' && currentPrice) {
      const direction = trade.direction === 'long' ? 1 : -1
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

    // Calculate distances to stop/target for open trades
    let distanceToStop: number | undefined
    let distanceToTarget: number | undefined
    if (trade.status === 'open' && currentPrice) {
      if (trade.stop_loss) {
        distanceToStop = Math.abs((currentPrice - trade.stop_loss) / trade.stop_loss * 100)
      }
      if (trade.take_profit) {
        distanceToTarget = Math.abs((trade.take_profit - currentPrice) / currentPrice * 100)
      }
    }

    // Get current scan count
    const scanCount = ((trade.ai_grade as { pelican_scan_count?: number })?.pelican_scan_count || 0)

    // Build comprehensive prompt
    const prompt = buildScanPrompt({
      trade,
      currentPrice,
      holdingDays,
      unrealizedPnL,
      distanceToStop,
      distanceToTarget,
      scanCount,
    })

    // Update scan count in database
    await updateTrade(trade.id, {
      ai_grade: {
        ...(trade.ai_grade as object || {}),
        pelican_scan_count: ((trade.ai_grade as { pelican_scan_count?: number })?.pelican_scan_count || 0) + 1,
        last_pelican_scan_at: new Date().toISOString(),
      }
    })

    // Send to Pelican chat (panel managed by layout)
    await openWithPrompt(trade.ticker, prompt, "journal", 'journal_scan')
  }


  // Filter trades based on type
  const filteredTrades = trades.filter((trade) => {
    if (tradeTypeFilter === 'real') return !trade.is_paper
    if (tradeTypeFilter === 'paper') return trade.is_paper
    return true
  })

  const handleSelectTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setActivePanel('detail')
  }

  const handleCloseDetailPanel = () => {
    setActivePanel(null)
    setSelectedTrade(null)
  }

  const handleOpenCloseTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setShowCloseTradeModal(true)
  }

  const { completeMilestone } = useOnboardingProgress()

  const handleLogTrade = async (data: Parameters<typeof logTrade>[0]) => {
    // Let errors propagate to the modal's error handler
    await logTrade(data)
    refetch()

    // Onboarding milestones
    completeMilestone("first_trade")
    const totalTrades = trades.length + 1
    if (totalTrades >= 5) completeMilestone("five_trades")
  }

  const handleCloseTrade = async (data: Parameters<typeof closeTrade>[1]) => {
    if (!selectedTrade) return
    // Let errors propagate to the modal's error handler
    await closeTrade(selectedTrade.id, data)
    refetch()
    setShowCloseTradeModal(false)
    handleCloseDetailPanel()
  }

  const handleAskPelican = async (prompt: string) => {
    await openWithPrompt(null, prompt, "journal", 'journal_review')
  }

  const handleReplayTrade = (trade: Trade) => {
    setReplayTrade(trade)
  }

  const handleNarrateTrade = async (trade: Trade) => {
    const prompt = buildReplayNarrationPrompt(trade)
    await openWithPrompt(trade.ticker, prompt, "journal", 'journal_replay')
  }

  const showDetailPanel = activePanel === 'detail' && selectedTrade !== null

  const filterButtons = ['all', 'real', 'paper'] as const
  const filterLabels = { all: 'All', real: 'Real', paper: 'Simulated' }

  const tabs: { key: TabKey; label: string; icon: typeof ChartBar }[] = [
    { key: 'performance', label: 'Performance', icon: ChartBar },
    { key: 'trades', label: 'Trades', icon: Funnel },
    { key: 'plan', label: 'Plan', icon: ClipboardText },
    { key: 'insights', label: 'Insights', icon: Brain },
  ]

  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold text-[var(--text-primary)]">Journal</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              <span className="font-mono tabular-nums">{trades.length}</span> total trades
              {stats?.win_rate != null && <> · <span className="font-mono tabular-nums">{stats.win_rate.toFixed(1)}%</span> win rate</>}
              <span className="mx-1.5">·</span>
              <Link href="/positions" className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors">
                View live positions
              </Link>
            </p>
          </div>

          {/* Actions - Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Profile link */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Trader Profile"
            >
              <UserCircle size={20} weight="regular" />
            </button>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5">
              {filterButtons.map((type) => (
                <button
                  key={type}
                  onClick={() => setTradeTypeFilter(type)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                    ${
                      tradeTypeFilter === type
                        ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                        : 'bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }
                  `}
                >
                  {filterLabels[type]}
                </button>
              ))}
            </div>

            <PelicanButton
              variant="primary"
              size="lg"
              onClick={() => setShowLogTradeModal(true)}
            >
              <Plus size={16} weight="bold" />
              Log Trade
            </PelicanButton>
          </div>
        </div>

        {/* Tabs — 4 tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0 active:scale-[0.98] min-h-[44px] flex items-center gap-1.5
                ${
                  activeTab === key
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }
              `}
            >
              <Icon size={16} weight={activeTab === key ? 'fill' : 'regular'} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area with Detail Panel Support */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'performance' && (
              <motion.div
                key="performance"
                variants={tabContent}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PerformanceTab
                  trades={filteredTrades}
                  quotes={quotes}
                  stats={stats}
                  equityCurve={equityCurve}
                  isLoading={statsLoading || tradesLoading}
                  onOpenLogTrade={() => setShowLogTradeModal(true)}
                  onSelectTrade={(tradeId) => {
                    setActiveTab('trades')
                    const trade = trades.find(t => t.id === tradeId)
                    if (trade) {
                      setSelectedTrade(trade)
                      setActivePanel('detail')
                    }
                  }}
                  onAskPelican={handleAskPelican}
                />
              </motion.div>
            )}

            {activeTab === 'trades' && (
              <motion.div
                key="trades"
                variants={tabContent}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TradesTable
                  trades={filteredTrades}
                  onSelectTrade={handleSelectTrade}
                  onScanTrade={handleScanTrade}
                  selectedTradeId={selectedTrade?.id}
                  onAskPelican={handleAskPelican}
                  onReplayTrade={handleReplayTrade}
                />
              </motion.div>
            )}

            {activeTab === 'plan' && (
              <motion.div
                key="plan"
                variants={tabContent}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TradingPlanTab
                  trades={trades}
                  onAskPelican={handleAskPelican}
                  complianceStats={complianceStats}
                  tradeStats={stats}
                />
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                variants={tabContent}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <InsightsTab
                  onAskPelican={handleAskPelican}
                  onLogTrade={() => setShowLogTradeModal(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {tradesLoading && trades.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[var(--text-muted)] text-sm">Loading trades...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Trade Detail */}
        {showDetailPanel && (
          <div className="hidden md:flex flex-shrink-0 w-[min(420px,30%)] h-full">
            <TradeDetailPanel
              trade={selectedTrade}
              onClose={handleCloseDetailPanel}
              onCloseTrade={handleOpenCloseTrade}
              onReplay={handleReplayTrade}
            />
          </div>
        )}
      </div>

      {/* Mobile FAB: Log Trade */}
      <button
        onClick={() => setShowLogTradeModal(true)}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-[var(--accent-primary)] rounded-full shadow-lg shadow-[var(--accent-primary)]/25 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Log Trade"
      >
        <Plus size={24} weight="bold" className="text-white" />
      </button>

      {/* Modals */}
      <LogTradeModal
        open={showLogTradeModal}
        onOpenChange={setShowLogTradeModal}
        onSubmit={handleLogTrade}
      />

      {selectedTrade && (
        <CloseTradeModal
          open={showCloseTradeModal}
          onOpenChange={setShowCloseTradeModal}
          trade={selectedTrade}
          onSubmit={handleCloseTrade}
        />
      )}

      {/* Trade Replay Modal */}
      <AnimatePresence>
        {replayTrade && (
          <motion.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-[var(--bg-overlay)] backdrop-blur-sm"
            onClick={() => setReplayTrade(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(800px,90vw)] sm:max-h-[85vh] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Trade Replay</h2>
                  <span className="font-mono tabular-nums text-sm text-[var(--accent-primary)]">{replayTrade.ticker}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${
                    replayTrade.direction === 'long'
                      ? 'bg-[var(--data-positive)]/20 text-[var(--data-positive)]'
                      : 'bg-[var(--data-negative)]/20 text-[var(--data-negative)]'
                  }`}>
                    {replayTrade.direction}
                  </span>
                </div>
                <button
                  onClick={() => setReplayTrade(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <XIcon size={16} weight="bold" />
                </button>
              </div>
              <div className="p-4">
                <TradeReplay
                  trade={replayTrade}
                  onNarrate={handleNarrateTrade}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-[var(--bg-overlay)]"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(640px,90vw)] sm:max-h-[80vh] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Trader Profile</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <Plus size={16} weight="bold" className="rotate-45" />
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: Trade Detail Bottom Sheet */}
      <AnimatePresence>
        {showDetailPanel && selectedTrade && (
          <motion.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden fixed inset-0 z-50 bg-[var(--bg-overlay)]"
            onClick={handleCloseDetailPanel}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute bottom-0 left-0 right-0 h-[80vh] bg-[var(--bg-base)] rounded-t-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-[var(--border-default)] rounded-full mx-auto mt-3 mb-2" />
              <TradeDetailPanel
                trade={selectedTrade}
                onClose={handleCloseDetailPanel}
                onCloseTrade={handleOpenCloseTrade}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
