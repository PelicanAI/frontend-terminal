"use client"

import { useState, useCallback, useMemo } from "react"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Brain } from "@phosphor-icons/react"
import { usePortfolioSummary } from "@/hooks/use-portfolio-summary"
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights"
import { useTodaysWarnings } from "@/hooks/use-todays-warnings"
import { usePositionEarnings } from "@/hooks/use-position-earnings"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useTrades } from "@/hooks/use-trades"
import { useTickerHistory } from "@/hooks/use-ticker-history"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { usePortfolioPnl } from "@/hooks/use-portfolio-pnl"
import dynamicImport from "next/dynamic"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import { WarningBanner } from "@/components/insights/warning-banner"
import { TodaysActions } from "@/components/positions/todays-actions"
import { PositionFilters } from "@/components/positions/position-filters"
import { PositionList } from "@/components/positions/position-list"
import { PortfolioIntelligence } from "@/components/positions/portfolio-intelligence"
import { PositionsEmptyState } from "@/components/positions/positions-empty-state"
import { CloseTradeModal } from "@/components/journal/close-trade-modal"
import { LogTradeModal } from "@/components/journal/log-trade-modal"
import { PortfolioHeroStrip } from "@/components/positions/portfolio-hero-strip"
import Link from "next/link"
import { PelicanButton, pageEnter } from "@/components/ui/pelican"
import { trackEvent } from "@/lib/tracking"
import { computePortfolioGrade } from "@/lib/portfolio-grade"
import type { PortfolioPosition } from "@/types/portfolio"

const PortfolioPnlChart = dynamicImport(
  () => import("@/components/positions/portfolio-pnl-chart").then(m => ({ default: m.PortfolioPnlChart })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-[var(--bg-surface)] rounded-lg" /> }
)
const PortfolioOverview = dynamicImport(
  () => import("@/components/positions/portfolio-overview").then(m => ({ default: m.PortfolioOverview })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-[var(--bg-surface)] rounded-lg" /> }
)

function formatNum(n: number | null | undefined): string {
  if (n == null) return '?'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

/** Terminal-style section divider: mono label + hairline */
function SectionDivider({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1 pb-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)] font-[var(--font-geist-mono)] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]/40" />
      {right}
    </div>
  )
}

export default function PositionsPage() {
  const router = useRouter()
  const { data: portfolio, isLoading: portfolioLoading, refresh: refreshPortfolio } = usePortfolioSummary()
  const { data: insights } = useBehavioralInsights()
  const { warnings } = useTodaysWarnings()
  const { warnings: earningsWarnings } = usePositionEarnings()
  const { openWithPrompt } = usePelicanPanelContext()
  const { closeTrade, refetch: refetchTrades, logTrade } = useTrades()
  const { survey } = useTraderProfile()
  const { items: watchlistItems } = useWatchlist()
  const watchlistTickers = useMemo(
    () => new Set(watchlistItems.map(w => w.ticker.toUpperCase())),
    [watchlistItems]
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const marketsTraded = survey?.markets_traded || ['stocks']
  const primaryMarket = marketsTraded[0] || 'stocks'

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

  const [closingTrade, setClosingTrade] = useState<PortfolioPosition | null>(null)
  const [showLogTradeModal, setShowLogTradeModal] = useState(false)
  const [showPostCloseReview, setShowPostCloseReview] = useState<PortfolioPosition | null>(null)

  const portfolioGrade = useMemo(() => {
    if (!portfolio) return null
    return computePortfolioGrade(
      portfolio.portfolio,
      portfolio.risk,
      portfolio.plan_compliance,
      portfolio.positions,
    )
  }, [portfolio])

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

  const handleEditPosition = useCallback((position: PortfolioPosition) => {
    router.push(`/journal?highlight=${position.id}`)
  }, [router])

  const handleClosePosition = useCallback((position: PortfolioPosition) => {
    setClosingTrade(position)
  }, [])

  const handleCloseTradeSubmit = useCallback(async (data: { exit_price: number; exit_date: string; notes?: string | null; mistakes?: string | null }) => {
    if (!closingTrade) return
    const result = await closeTrade(closingTrade.id, data)
    if (!result.success) throw new Error(result.error || 'Failed to close trade')
    refetchTrades()
    refreshPortfolio()
    setShowPostCloseReview(closingTrade)
    setClosingTrade(null)
  }, [closingTrade, closeTrade, refetchTrades, refreshPortfolio])

  const handleLogTrade = useCallback(async (data: Parameters<typeof logTrade>[0]) => {
    await logTrade(data)
    refetchTrades()
    refreshPortfolio()
  }, [logTrade, refetchTrades, refreshPortfolio])

  if (portfolioLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="animate-pulse space-y-3">
          <div className="h-[88px] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
          <div className="h-9 rounded bg-[var(--bg-surface)]/50" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[60px] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
            ))}
          </div>
          <div className="h-44 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            <div className="xl:col-span-8 h-40 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
            <div className="xl:col-span-4 h-40 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]/20" />
          </div>
        </div>
      </div>
    )
  }

  if (!portfolio || portfolio.positions.length === 0) {
    return (
      <>
        <PositionsEmptyState
          onLogTrade={() => setShowLogTradeModal(true)}
          onAskPelican={() => handleSendMessage('Based on my current portfolio exposure and open positions, suggest what I should be looking at next. Consider my sector concentration, directional bias, and which setups have been working for me.')}
        />
        <LogTradeModal open={showLogTradeModal} onOpenChange={setShowLogTradeModal} onSubmit={handleLogTrade} />
      </>
    )
  }

  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4"
    >
      <PortfolioHeroStrip
        portfolio={portfolio.portfolio}
        risk={portfolio.risk}
        positions={portfolio.positions}
        quotes={quotes}
        grade={portfolioGrade}
        primaryMarket={primaryMarket}
        marketsTraded={marketsTraded}
        isRefreshing={isRefreshing}
        onRefresh={async () => {
          if (isRefreshing) return
          setIsRefreshing(true)
          try { await refreshPortfolio() } catch (e) { console.error('Refresh failed:', e) }
          finally { setTimeout(() => setIsRefreshing(false), 800) }
        }}
        onGradeClick={handleSendMessage}
      />

      {warnings.length > 0 && (
        <WarningBanner
          warnings={warnings}
          onAction={(w) => {
            trackEvent({ eventType: 'alert_acted', feature: 'positions', data: { alertType: w.title } })
            handleSendMessage(`I have a trading warning: ${w.title}. ${w.message} What should I do?`)
          }}
        />
      )}

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

      <SectionDivider
        label={`Positions · ${portfolio.positions.length}`}
        right={
          <Link href="/journal?tab=trades"
            className="text-[10px] font-[var(--font-geist-mono)] uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">
            Closed →
          </Link>
        }
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

      {portfolio.positions.length > 0 && (
        <>
          <SectionDivider label="P&L History" />
          <PortfolioPnlChart data={pnlHistory} isLoading={pnlHistoryLoading} />
        </>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <SectionDivider label="Actions" />
          <TodaysActions
            positions={portfolio.positions} insights={insights}
            warnings={warnings} earningsWarnings={earningsWarnings}
            portfolioStats={portfolio.portfolio} riskSummary={portfolio.risk}
            onAction={handleSendMessage} onEditPosition={handleEditPosition}
          />
        </div>
        <div className="xl:col-span-4">
          <SectionDivider label="Risk" />
          <PortfolioOverview
            portfolio={portfolio.portfolio} risk={portfolio.risk}
            planCompliance={portfolio.plan_compliance} positions={portfolio.positions}
            isLoading={portfolioLoading} onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      <SectionDivider label="Intelligence" />
      <PortfolioIntelligence
        positions={portfolio.positions} portfolio={portfolio.portfolio}
        risk={portfolio.risk} onSendMessage={handleSendMessage}
      />

      {closingTrade && (
        <CloseTradeModal
          open={!!closingTrade}
          onOpenChange={(open) => { if (!open) setClosingTrade(null) }}
          trade={{
            id: closingTrade.id, ticker: closingTrade.ticker,
            asset_type: closingTrade.asset_type, direction: closingTrade.direction,
            quantity: closingTrade.quantity, entry_price: closingTrade.entry_price,
            stop_loss: closingTrade.stop_loss, take_profit: closingTrade.take_profit,
            status: 'open' as const, exit_price: null, pnl_amount: null,
            pnl_percent: null, r_multiple: null, entry_date: closingTrade.entry_date,
            exit_date: null, thesis: closingTrade.thesis, notes: closingTrade.notes,
            setup_tags: closingTrade.setup_tags, conviction: closingTrade.conviction,
            ai_grade: null, plan_rules_followed: null, plan_rules_violated: null,
            plan_checklist_completed: null, playbook_id: closingTrade.playbook_id ?? null,
            is_paper: closingTrade.is_paper, user_id: '', created_at: '', updated_at: '',
          }}
          onSubmit={handleCloseTradeSubmit}
        />
      )}

      <LogTradeModal open={showLogTradeModal} onOpenChange={setShowLogTradeModal} onSubmit={handleLogTrade} />

      {showPostCloseReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6 max-w-sm mx-4 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain size={20} weight="bold" className="text-[var(--accent-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Grade {showPostCloseReview.ticker} {showPostCloseReview.direction}?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Pelican will grade entry, management, and exit A-F with specific feedback.
                </p>
                <div className="flex gap-2 mt-4">
                  <PelicanButton variant="secondary" size="sm" onClick={() => setShowPostCloseReview(null)}>Skip</PelicanButton>
                  <PelicanButton variant="primary" size="sm" onClick={() => {
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
                  }}>Grade trade</PelicanButton>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
