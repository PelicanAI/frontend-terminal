"use client"

export const dynamic = "force-dynamic"

import { useState, useCallback, useMemo, useRef } from "react"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowsClockwise, Brain } from "@phosphor-icons/react"
import { usePortfolioSummary } from "@/hooks/use-portfolio-summary"
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights"
import { useTodaysWarnings } from "@/hooks/use-todays-warnings"
import { usePositionEarnings } from "@/hooks/use-position-earnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useTrades } from "@/hooks/use-trades"
import { useTickerHistory } from "@/hooks/use-ticker-history"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { usePortfolioPnl } from "@/hooks/use-portfolio-pnl"
import { PortfolioPnlChart } from "@/components/positions/portfolio-pnl-chart"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import { WarningBanner } from "@/components/insights/warning-banner"
import { TodaysActions } from "@/components/positions/todays-actions"
import { PortfolioOverview } from "@/components/positions/portfolio-overview"
import { PositionFilters } from "@/components/positions/position-filters"
import { PositionList } from "@/components/positions/position-list"
import { PortfolioIntelligence } from "@/components/positions/portfolio-intelligence"
import { PositionsEmptyState } from "@/components/positions/positions-empty-state"
import { CloseTradeModal } from "@/components/journal/close-trade-modal"
import { LogTradeModal } from "@/components/journal/log-trade-modal"
import { SessionIndicator } from "@/components/positions/session-indicator"
import { MarketSessionsStrip } from "@/components/positions/market-sessions-strip"
import Link from "next/link"
import { PelicanButton, pageEnter } from "@/components/ui/pelican"
import { trackEvent } from "@/lib/tracking"
import { computePortfolioGrade } from "@/lib/portfolio-grade"
import { useBrokerConnections } from "@/hooks/use-broker-connections"
import type { PortfolioPosition } from "@/types/portfolio"

// ============================================================================
// Helpers
// ============================================================================

function formatNum(n: number | null | undefined): string {
  if (n == null) return '?'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

// ============================================================================
// Page
// ============================================================================

export default function PositionsPage() {
  const router = useRouter()
  const { data: portfolio, isLoading: portfolioLoading, refresh: refreshPortfolio } = usePortfolioSummary()
  const { data: insights } = useBehavioralInsights()
  const { warnings } = useTodaysWarnings()
  const { warnings: earningsWarnings } = usePositionEarnings()
  const { openWithPrompt } = usePelicanPanelContext()
  const { closeTrade, refetch: refetchTrades, logTrade } = useTrades()
  const { survey } = useTraderProfile()
  const { activeConnections } = useBrokerConnections()
  const { items: watchlistItems } = useWatchlist()
  const watchlistTickers = useMemo(
    () => new Set(watchlistItems.map(w => w.ticker.toUpperCase())),
    [watchlistItems]
  )
  const marketsTraded = survey?.markets_traded || ['stocks']
  const primaryMarket = marketsTraded[0] || 'stocks'

  // Ticker history for position cards
  const openTickers = useMemo(
    () => portfolio?.positions?.map(p => p.ticker) ?? [],
    [portfolio?.positions]
  )
  const { data: tickerHistory } = useTickerHistory(openTickers)
  const { quotes } = useLiveQuotes(openTickers)
  const { data: pnlHistory, isLoading: pnlHistoryLoading } = usePortfolioPnl(portfolio?.positions ?? [])

  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('size_desc')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [closingTrade, setClosingTrade] = useState<PortfolioPosition | null>(null)
  const [showLogTradeModal, setShowLogTradeModal] = useState(false)

  // Post-close review loop
  const [showPostCloseReview, setShowPostCloseReview] = useState<PortfolioPosition | null>(null)

  // Portfolio grade tooltip
  const [showGradeTooltip, setShowGradeTooltip] = useState(false)
  const gradeRef = useRef<HTMLButtonElement>(null)

  // Compute portfolio grade
  const portfolioGrade = useMemo(() => {
    if (!portfolio) return null
    return computePortfolioGrade(
      portfolio.portfolio,
      portfolio.risk,
      portfolio.plan_compliance,
      portfolio.positions,
    )
  }, [portfolio])

  // Chat integration — send rich prompt to Pelican panel
  const handleSendMessage = useCallback(async (message: string) => {
    await openWithPrompt(null, message, "journal", 'position_fix')
  }, [openWithPrompt])

  const handleScanPosition = useCallback(async (position: PortfolioPosition) => {
    const parts = [
      `Scan my ${position.ticker} ${position.direction.toUpperCase()} position.`,
      `Entry: $${position.entry_price}.`,
      `Size: $${position.position_size_usd?.toLocaleString()}.`,
      position.stop_loss ? `Stop: $${position.stop_loss} (${position.distance_to_stop_pct}% away).` : 'No stop loss set.',
      position.take_profit ? `Target: $${position.take_profit} (${position.distance_to_target_pct}% away).` : 'No target set.',
      position.risk_reward_ratio ? `R:R ratio: ${position.risk_reward_ratio}:1.` : '',
      position.thesis ? `My thesis: "${position.thesis}".` : '',
      `Conviction: ${position.conviction || '?'}/10. Held for ${position.days_held} days.`,
      '',
      'Give me: current technicals, whether my thesis is still valid, key levels to watch, and your honest recommendation — hold, add, trim, or exit. Be specific.',
    ].filter(Boolean).join(' ')

    trackEvent({ eventType: 'position_monitored', feature: 'positions', ticker: position.ticker })
    await openWithPrompt(position.ticker, parts, "journal", 'position_scan')
  }, [openWithPrompt])

  // Edit: navigate to journal with highlight
  const handleEditPosition = useCallback((position: PortfolioPosition) => {
    router.push(`/journal?highlight=${position.id}`)
  }, [router])

  // Close trade modal
  const handleClosePosition = useCallback((position: PortfolioPosition) => {
    setClosingTrade(position)
  }, [])

  const handleCloseTradeSubmit = useCallback(async (data: { exit_price: number; exit_date: string; notes?: string | null; mistakes?: string | null }) => {
    if (!closingTrade) return
    const result = await closeTrade(closingTrade.id, data)

    if (!result.success) {
      throw new Error(result.error || 'Failed to close trade')
    }

    refetchTrades()
    refreshPortfolio()
    // Show post-close review prompt
    setShowPostCloseReview(closingTrade)
    setClosingTrade(null)
  }, [closingTrade, closeTrade, refetchTrades, refreshPortfolio])

  const handleLogTrade = useCallback(async (data: Parameters<typeof logTrade>[0]) => {
    await logTrade(data)
    refetchTrades()
    refreshPortfolio()
  }, [logTrade, refetchTrades, refreshPortfolio])

  // Loading state
  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!portfolio || portfolio.positions.length === 0) {
    return (
      <>
        <PositionsEmptyState
          onLogTrade={() => setShowLogTradeModal(true)}
          onAskPelican={() => handleSendMessage('Based on my current portfolio exposure and open positions, suggest what I should be looking at next. Consider my sector concentration, directional bias, and which setups have been working for me.')}
        />
        <LogTradeModal
          open={showLogTradeModal}
          onOpenChange={setShowLogTradeModal}
          onSubmit={handleLogTrade}
        />
      </>
    )
  }

  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">Positions</h1>
              <SessionIndicator assetType={primaryMarket} />
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-[var(--text-muted)]">
                <span className="font-mono tabular-nums">{portfolio.portfolio.total_positions}</span> open
                {portfolio.portfolio.avg_conviction > 0 && (
                  <> · <span className="font-mono tabular-nums">{portfolio.portfolio.avg_conviction.toFixed(1)}</span> avg conviction</>
                )}
              </p>
              {marketsTraded.length > 1 && (
                <MarketSessionsStrip marketsTraded={marketsTraded} />
              )}
            </div>
          </div>
          {portfolioGrade && (
            <div className="relative">
              <button
                ref={gradeRef}
                onMouseEnter={() => setShowGradeTooltip(true)}
                onMouseLeave={() => setShowGradeTooltip(false)}
                onClick={() => handleSendMessage(
                  `My portfolio grade is ${portfolioGrade.letter} (${portfolioGrade.score}/100). ` +
                  `Breakdown: ${portfolioGrade.factors.map(f => `${f.name}: ${f.score}/100 (${f.detail})`).join('. ')}. ` +
                  `${portfolioGrade.summary}. What should I prioritize to improve my grade?`
                )}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-hover)] bg-[var(--bg-surface)] transition-all duration-150 hover:translate-y-[-1px] cursor-pointer"
              >
                <span
                  className="text-lg font-bold font-mono"
                  style={{ color: portfolioGrade.color }}
                >
                  {portfolioGrade.letter}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                  {portfolioGrade.score}
                </span>
              </button>
              {showGradeTooltip && (
                <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-lg">
                  <p className="text-xs font-medium text-[var(--text-primary)] mb-2">{portfolioGrade.summary}</p>
                  <div className="space-y-1.5">
                    {portfolioGrade.factors.map((f) => (
                      <div key={f.name} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{f.name}</span>
                        <span className="font-mono tabular-nums text-[var(--text-muted)]">{f.score}/100</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2">Click to discuss with Pelican</p>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => refreshPortfolio()}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
          aria-label="Refresh portfolio"
        >
          <ArrowsClockwise size={14} weight="regular" />
          Refresh
        </button>
      </div>

      {/* Warning banner */}
      {warnings.length > 0 && (
        <WarningBanner
          warnings={warnings}
          onAction={(w) => {
            trackEvent({ eventType: 'alert_acted', feature: 'positions', data: { alertType: w.title } })
            handleSendMessage(`I have a trading warning: ${w.title}. ${w.message} What should I do?`)
          }}
        />
      )}

      {/* Filters + Sort */}
      <PositionFilters
        positions={portfolio.positions}
        activeFilter={activeFilter}
        sortBy={sortBy}
        searchQuery={searchQuery}
        onFilterChange={setActiveFilter}
        onSortChange={setSortBy}
        onSearchChange={setSearchQuery}
        onLogTrade={() => setShowLogTradeModal(true)}
        showConnectBroker={activeConnections.length === 0}
      />

      {/* Position cards */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">Open positions</span>
        <Link
          href="/journal?tab=trades"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          Review closed trades in Journal &rarr;
        </Link>
      </div>
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

      {/* Portfolio P&L History */}
      {portfolio.positions.length > 0 && (
        <PortfolioPnlChart data={pnlHistory} isLoading={pnlHistoryLoading} />
      )}

      {/* Exposure Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Exposure</p>
          <p className="text-lg font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {formatNum(portfolio.portfolio.total_exposure)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Long Exposure</p>
          <p className="text-lg font-mono tabular-nums font-semibold text-[var(--data-positive)]">
            {formatNum(portfolio.portfolio.long_exposure)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {portfolio.portfolio.direction_breakdown.long.count} position{portfolio.portfolio.direction_breakdown.long.count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Short Exposure</p>
          <p className="text-lg font-mono tabular-nums font-semibold text-[var(--data-negative)]">
            {formatNum(portfolio.portfolio.short_exposure)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {portfolio.portfolio.direction_breakdown.short.count} position{portfolio.portfolio.direction_breakdown.short.count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Today's Actions */}
      <TodaysActions
        positions={portfolio.positions}
        insights={insights}
        warnings={warnings}
        earningsWarnings={earningsWarnings}
        portfolioStats={portfolio.portfolio}
        riskSummary={portfolio.risk}
        onAction={handleSendMessage}
        onEditPosition={handleEditPosition}
      />

      {/* Portfolio overview */}
      <PortfolioOverview
        portfolio={portfolio.portfolio}
        risk={portfolio.risk}
        planCompliance={portfolio.plan_compliance}
        positions={portfolio.positions}
        isLoading={portfolioLoading}
        onSendMessage={handleSendMessage}
      />

      {/* Portfolio intelligence */}
      <PortfolioIntelligence
        positions={portfolio.positions}
        portfolio={portfolio.portfolio}
        risk={portfolio.risk}
        onSendMessage={handleSendMessage}
      />

      {/* Close trade modal */}
      {closingTrade && (
        <CloseTradeModal
          open={!!closingTrade}
          onOpenChange={(open) => { if (!open) setClosingTrade(null) }}
          trade={{
            id: closingTrade.id,
            ticker: closingTrade.ticker,
            asset_type: closingTrade.asset_type,
            direction: closingTrade.direction,
            quantity: closingTrade.quantity,
            entry_price: closingTrade.entry_price,
            stop_loss: closingTrade.stop_loss,
            take_profit: closingTrade.take_profit,
            status: 'open' as const,
            exit_price: null,
            pnl_amount: null,
            pnl_percent: null,
            r_multiple: null,
            entry_date: closingTrade.entry_date,
            exit_date: null,
            thesis: closingTrade.thesis,
            notes: closingTrade.notes,
            setup_tags: closingTrade.setup_tags,
            conviction: closingTrade.conviction,
            ai_grade: null,
            plan_rules_followed: null,
            plan_rules_violated: null,
            plan_checklist_completed: null,
            playbook_id: closingTrade.playbook_id ?? null,
            is_paper: closingTrade.is_paper,
            user_id: '',
            created_at: '',
            updated_at: '',
          }}
          onSubmit={handleCloseTradeSubmit}
        />
      )}

      {/* Log trade modal */}
      <LogTradeModal
        open={showLogTradeModal}
        onOpenChange={setShowLogTradeModal}
        onSubmit={handleLogTrade}
      />

      {/* Post-close review modal */}
      {showPostCloseReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-[var(--accent-muted)] flex items-center justify-center mx-auto mb-4">
                <Brain size={24} weight="bold" className="text-[var(--accent-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Trade closed</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Want Pelican to grade your {showPostCloseReview.ticker} {showPostCloseReview.direction} trade?
              </p>
              <div className="flex gap-3">
                <PelicanButton
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={() => setShowPostCloseReview(null)}
                >
                  Skip
                </PelicanButton>
                <PelicanButton
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    const p = showPostCloseReview
                    trackEvent({ eventType: 'trade_graded', feature: 'positions', ticker: p.ticker })
                    handleSendMessage(
                      `I just closed my ${p.ticker} ${p.direction.toUpperCase()} position. ` +
                      `Entry: $${p.entry_price}. Size: ${formatNum(p.position_size_usd)}. ` +
                      `Held for ${p.days_held} days. ` +
                      (p.thesis ? `My thesis was: "${p.thesis}". ` : '') +
                      `Conviction was ${p.conviction || '?'}/10. ` +
                      (p.risk_reward_ratio ? `R:R ratio was ${p.risk_reward_ratio}:1. ` : '') +
                      `Grade this trade A through F. What did I do right? What should I improve? Be specific and honest.`
                    )
                    setShowPostCloseReview(null)
                  }}
                >
                  Grade this trade
                </PelicanButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
