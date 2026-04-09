'use client'

import { useMemo } from 'react'
import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ChampionIcon as Trophy, Comment01Icon as ChatTeardropText } from '@hugeicons/core-free-icons'
import { PelicanCard, PelicanButton, staggerContainer, staggerItem } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'
import type { BehavioralInsights } from '@/hooks/use-behavioral-insights'

// ============================================================================
// Types
// ============================================================================

interface EdgeSummaryProps {
  insights: BehavioralInsights
  onAskPelican?: (prompt: string) => void
  compact?: boolean
}

interface EdgeItem {
  label: string
  value: string
  detail: string
}

// ============================================================================
// Helpers
// ============================================================================

const MIN_TRADES = 3

const holdingPeriodLabels: Record<string, string> = {
  under_1h: '<1 hour',
  '1h_to_4h': '1-4 hours',
  '4h_to_1d': '4h-1 day',
  '1d_to_3d': '1-3 days',
  '3d_to_1w': '3d-1 week',
  over_1w: '>1 week',
}

const sessionLabels: Record<string, string> = {
  pre_market_early: 'Pre-market',
  first_hour: 'First hour',
  midday: 'Midday',
  afternoon: 'Afternoon',
  after_hours: 'After hours',
}

function formatPct(n: number): string {
  return `${n.toFixed(0)}%`
}

function computeEdges(insights: BehavioralInsights): EdgeItem[] {
  const edges: EdgeItem[] = []

  // Best setup
  const qualifiedSetups = insights.setup_performance.filter(
    (s) => s.total_trades >= MIN_TRADES,
  )
  if (qualifiedSetups.length > 0) {
    const best = qualifiedSetups.reduce((a, b) => (a.win_rate > b.win_rate ? a : b))
    edges.push({
      label: 'Best Setup',
      value: `${formatPct(best.win_rate)} WR`,
      detail: `${best.setup} (${best.total_trades} trades)`,
    })
  }

  // Best day
  const qualifiedDays = insights.day_of_week.filter(
    (d) => d.total_trades >= MIN_TRADES,
  )
  if (qualifiedDays.length > 0) {
    const best = qualifiedDays.reduce((a, b) => (a.win_rate > b.win_rate ? a : b))
    edges.push({
      label: 'Best Day',
      value: `${formatPct(best.win_rate)} WR`,
      detail: `${best.day_name} (${best.total_trades} trades)`,
    })
  }

  // Best session
  const qualifiedSessions = insights.time_of_day.filter(
    (s) => s.total_trades >= MIN_TRADES,
  )
  if (qualifiedSessions.length > 0) {
    const best = qualifiedSessions.reduce((a, b) => (a.win_rate > b.win_rate ? a : b))
    edges.push({
      label: 'Best Session',
      value: `${formatPct(best.win_rate)} WR`,
      detail: `${sessionLabels[best.session] ?? best.session} (${best.total_trades} trades)`,
    })
  }

  // Best holding period
  const qualifiedHolding = insights.holding_period.filter(
    (h) => h.total_trades >= MIN_TRADES,
  )
  if (qualifiedHolding.length > 0) {
    const best = qualifiedHolding.reduce((a, b) => (a.win_rate > b.win_rate ? a : b))
    edges.push({
      label: 'Best Hold',
      value: `${formatPct(best.win_rate)} WR`,
      detail: `${holdingPeriodLabels[best.period] ?? best.period} (${best.total_trades} trades)`,
    })
  }

  // Best ticker
  const qualifiedTickers = insights.ticker_performance.filter(
    (t) => t.total_trades >= MIN_TRADES,
  )
  if (qualifiedTickers.length > 0) {
    const best = qualifiedTickers.reduce((a, b) => (a.win_rate > b.win_rate ? a : b))
    edges.push({
      label: 'Best Ticker',
      value: `${formatPct(best.win_rate)} WR`,
      detail: `${best.ticker} (${best.total_trades} trades)`,
    })
  }

  return edges
}

function buildEdgeStatement(edges: EdgeItem[]): string {
  if (edges.length === 0) return 'Keep logging trades to discover your edge.'
  const parts = edges.slice(0, 3).map((e) => `${e.label.toLowerCase()}: ${e.detail}`)
  return `Your strongest edges are ${parts.join(', ')}.`
}

function buildPelicanPrompt(insights: BehavioralInsights, edges: EdgeItem[]): string {
  const lines = [
    'Analyze my trading edge in detail. Here are my strongest patterns:',
    '',
    ...edges.map((e) => `- ${e.label}: ${e.detail} (${e.value})`),
    '',
    `Total closed trades: ${insights.total_closed_trades}`,
    '',
    'What should I focus on to improve? Are there any blind spots?',
  ]
  return lines.join('\n')
}

// ============================================================================
// Component
// ============================================================================

export function EdgeSummary({ insights, onAskPelican, compact = false }: EdgeSummaryProps) {
  const edges = useMemo(() => computeEdges(insights), [insights])
  const edgeStatement = useMemo(() => buildEdgeStatement(edges), [edges])

  if (edges.length === 0) return null

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {edges.map((edge) => (
          <span
            key={edge.label}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'bg-[var(--data-positive)]/10 text-[var(--data-positive)]',
              'text-[10px] font-mono font-medium tabular-nums',
            )}
            title={edge.detail}
          >
            {edge.label}: {edge.value}
          </span>
        ))}
      </div>
    )
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <PelicanCard
        className="relative overflow-hidden"
        style={{ backgroundColor: 'rgba(34,197,94,0.03)' }}
      >
        {/* Green accent line */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--data-positive), transparent)',
            opacity: 0.3,
          }}
        />

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <HugeiconsIcon icon={Trophy} size={18} className="text-[var(--data-positive)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Your Edge</h3>
        </div>

        {/* Edge statement */}
        <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
          {edgeStatement}
        </p>

        {/* Edge pills */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2 mb-4"
        >
          {edges.map((edge) => (
            <m.div key={edge.label} variants={staggerItem}>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2',
                  'bg-[var(--data-positive)]/5 border border-[var(--data-positive)]/10',
                )}
              >
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    {edge.label}
                  </p>
                  <p className="text-sm font-mono tabular-nums font-semibold text-[var(--data-positive)]">
                    {edge.value}
                  </p>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] max-w-[120px] truncate">
                  {edge.detail}
                </p>
              </div>
            </m.div>
          ))}
        </m.div>

        {/* CTA */}
        {onAskPelican && (
          <PelicanButton
            variant="ghost"
            size="sm"
            onClick={() => onAskPelican(buildPelicanPrompt(insights, edges))}
          >
            <HugeiconsIcon icon={ChatTeardropText} size={14} strokeWidth={1.5} color="currentColor" />
            Deep Dive with Pelican
          </PelicanButton>
        )}
      </PelicanCard>
    </m.div>
  )
}
