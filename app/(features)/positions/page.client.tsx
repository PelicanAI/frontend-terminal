// DEPRECATED: Merged into /portfolio — see app/(features)/portfolio/page.client.tsx
// Redirects in middleware.ts handle inbound traffic. This file is kept for reference.
"use client"

import { useState, useCallback, useMemo, type ReactNode } from "react"
import { useWatchlist } from "@/hooks/use-watchlist"
import { useRouter } from "next/navigation"
import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { Brain01Icon as Brain } from "@hugeicons/core-free-icons"
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
import { PelicanButton, pageSections, sectionReveal } from "@/components/ui/pelican"
import { trackEvent } from "@/lib/tracking"
import { computePortfolioGrade } from "@/lib/portfolio-grade"
import type { PortfolioPosition } from "@/types/portfolio"

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

const PortfolioPnlChart = dynamicImport(
  () => import("@/components/positions/portfolio-pnl-chart").then(m => ({ default: m.PortfolioPnlChart })),
  { ssr: false, loading: () => <TerminalSectionFallback label="Loading P&L History" height="h-36" /> }
)
const PortfolioOverview = dynamicImport(
  () => import("@/components/positions/portfolio-overview").then(m => ({ default: m.PortfolioOverview })),
  { ssr: false, loading: () => <TerminalSectionFallback label="Loading Risk" height="h-40" /> }
)

function formatNum(n: number | null | undefined): string {
  if (n == null) return '?'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

/** Terminal-style section divider: mono label + hairline with line-draw animation */
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
        style={{ transformOrigin: 'left' }}
      />
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
      <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="animate-pulse motion-reduce:animate-none">
            <div className="border-b border-[var(--border-default)] pb-3">
              <div className="h-3 w-28 bg-[var(--bg-elevated)]" />
              <div className="mt-3 h-8 w-40 bg-[var(--bg-elevated)]" />
              <div className="mt-2 h-px w-full bg-[var(--border-subtle)] opacity-70" />
            </div>
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
              <TerminalSectionFallback label="Loading P&L History" height="h-32" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <TerminalSectionFallback label="Loading Actions" height="h-28" />
              </div>
              <div className="xl:col-span-4">
                <TerminalSectionFallback label="Loading Risk" height="h-28" />
              </div>
            </div>
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
    <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <m.div
        variants={pageSections}
        initial="hidden"
        animate="visible"
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3"
      >
        {/* ── Command Center: Hero + Warnings + Filters ─────────────── */}
        <m.div variants={sectionReveal} className="space-y-2">
          <PortfolioHeroStrip
            portfolio={portfolio.portfolio}
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
        </m.div>

      {/* ── Positions: core content ───────────────────────────────── */}
        <m.div variants={sectionReveal} className="mt-1">
          <SectionDivider label={`Positions · ${portfolio.positions.length}`} />
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

      {/* ── Analysis: Charts + Actions + Risk ─────────────────────── */}
        {portfolio.positions.length > 0 && (
          <m.div variants={sectionReveal} className="mt-4">
            <PortfolioPnlChart data={pnlHistory} isLoading={pnlHistoryLoading} />
          </m.div>
        )}

        <m.div variants={sectionReveal} className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <TodaysActions
              positions={portfolio.positions} insights={insights}
              warnings={warnings} earningsWarnings={earningsWarnings}
              portfolioStats={portfolio.portfolio} riskSummary={portfolio.risk}
              onAction={handleSendMessage} onEditPosition={handleEditPosition}
            />
          </div>
          <div className="xl:col-span-4">
            <PortfolioOverview
              portfolio={portfolio.portfolio} risk={portfolio.risk}
              planCompliance={portfolio.plan_compliance} positions={portfolio.positions}
              isLoading={portfolioLoading} onSendMessage={handleSendMessage}
            />
          </div>
        </m.div>

        {/* ── Intelligence: separated from dense data above ─────────── */}
        <m.div variants={sectionReveal} className="mt-4">
          <SectionDivider label="Intelligence" />
          <div className="mt-1">
            <PortfolioIntelligence
              positions={portfolio.positions} portfolio={portfolio.portfolio}
              risk={portfolio.risk} onSendMessage={handleSendMessage}
            />
          </div>
        </m.div>

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
            </m.div>
          </div>
        )}
      </m.div>
    </div>
  )
}
