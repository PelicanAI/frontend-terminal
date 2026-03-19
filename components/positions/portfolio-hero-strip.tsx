"use client"

import { useMemo } from "react"
import { ArrowsClockwise } from "@phosphor-icons/react"
import { SessionIndicator } from "@/components/positions/session-indicator"
import { MarketSessionsStrip } from "@/components/positions/market-sessions-strip"
import type { PortfolioStats, RiskSummary, PortfolioPosition } from "@/types/portfolio"
import type { PortfolioGrade } from "@/lib/portfolio-grade"
import type { Quote } from "@/hooks/use-live-quotes"

// ============================================================================
// Types
// ============================================================================

interface PortfolioHeroStripProps {
  portfolio: PortfolioStats
  risk: RiskSummary
  positions: PortfolioPosition[]
  quotes: Record<string, Quote>
  grade: PortfolioGrade | null
  primaryMarket: string
  marketsTraded: string[]
  isRefreshing: boolean
  onRefresh: () => void
  onGradeClick: (message: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

function computeTotalUnrealizedPnl(
  positions: PortfolioPosition[],
  quotes: Record<string, Quote>,
): { total: number; hasQuotes: boolean } {
  let total = 0
  let hasQuotes = false

  for (const p of positions) {
    const q = quotes[p.ticker.toUpperCase()]
    if (!q) continue
    hasQuotes = true
    const currentPrice = q.price
    const pnlPerUnit =
      p.direction === "long"
        ? currentPrice - p.entry_price
        : p.entry_price - currentPrice
    total += pnlPerUnit * p.quantity
  }

  return { total, hasQuotes }
}

function formatCompactDollar(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? "-" : "+"}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${n < 0 ? "-" : "+"}$${(abs / 1_000).toFixed(1)}K`
  return `${n < 0 ? "-" : "+"}$${abs.toFixed(2)}`
}

function formatExposure(n: number | null | undefined): string {
  if (n == null) return "?"
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

// ============================================================================
// Component
// ============================================================================

export function PortfolioHeroStrip({
  portfolio,
  risk,
  positions,
  quotes,
  grade,
  primaryMarket,
  marketsTraded,
  isRefreshing,
  onRefresh,
  onGradeClick,
}: PortfolioHeroStripProps) {
  const { total: unrealizedPnl, hasQuotes } = useMemo(
    () => computeTotalUnrealizedPnl(positions, quotes),
    [positions, quotes],
  )

  const netDirection =
    portfolio.long_exposure > portfolio.short_exposure ? "Net Long" : "Net Short"

  const pnlColor =
    !hasQuotes
      ? "var(--text-muted)"
      : unrealizedPnl >= 0
        ? "var(--data-positive)"
        : "var(--data-negative)"

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
      {/* Top row: title + session + refresh */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
            Positions
          </h1>
          <SessionIndicator assetType={primaryMarket} />
          {marketsTraded.length > 1 && (
            <MarketSessionsStrip marketsTraded={marketsTraded} />
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-1.5 text-xs transition-colors duration-150 ${
            isRefreshing
              ? "text-[var(--text-muted)] opacity-50 cursor-not-allowed"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
          }`}
          aria-label="Refresh portfolio"
        >
          <ArrowsClockwise
            size={14}
            weight="regular"
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        {/* Hero: Unrealized P&L */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Unrealized P&L
          </p>
          <p
            className="text-2xl sm:text-3xl font-bold font-mono tabular-nums leading-none"
            style={{ color: pnlColor }}
          >
            {hasQuotes ? formatCompactDollar(unrealizedPnl) : "—"}
          </p>
        </div>

        {/* Exposure */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Exposure
          </p>
          <p className="text-base font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {formatExposure(portfolio.total_exposure)}
          </p>
        </div>

        {/* Net Direction */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Direction
          </p>
          <p className="text-base font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {netDirection}
          </p>
        </div>

        {/* Positions count */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Open
          </p>
          <p className="text-base font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {portfolio.total_positions}
          </p>
        </div>

        {/* Grade */}
        {grade && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
              Grade
            </p>
            <button
              onClick={() =>
                onGradeClick(
                  `My portfolio grade is ${grade.letter} (${grade.score}/100). ` +
                    `Breakdown: ${grade.factors.map((f) => `${f.name}: ${f.score}/100 (${f.detail})`).join(". ")}. ` +
                    `${grade.summary}. What should I prioritize to improve my grade?`,
                )
              }
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span
                className="text-lg font-bold font-mono leading-none"
                style={{ color: grade.color }}
              >
                {grade.letter}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                {grade.score}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
