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

function gradeColor(letter: string): string {
  if (letter === "A" || letter === "B") return "text-emerald-400/80"
  if (letter === "C") return "text-amber-500/70"
  return "text-red-400/80"
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

  const pnlColorClass =
    !hasQuotes
      ? "text-[var(--text-muted)]"
      : unrealizedPnl >= 0
        ? "text-emerald-400/80"
        : "text-red-400/80"

  const pnlPctColorClass =
    !hasQuotes
      ? "text-[var(--text-muted)]"
      : unrealizedPnl >= 0
        ? "text-emerald-400/80"
        : "text-red-400/80"

  // Compute unrealized P&L percentage (relative to total exposure)
  const unrealizedPct =
    hasQuotes && portfolio.total_exposure > 0
      ? (unrealizedPnl / portfolio.total_exposure) * 100
      : null

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)]/40 rounded-lg px-5 py-4">
      <div className="flex flex-wrap items-start gap-6">
        {/* Left: P&L Hero */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] font-[var(--font-geist-mono)]">
            Unrealized P&L
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold font-[var(--font-geist-mono)] tracking-tight tabular-nums leading-none ${pnlColorClass}`}
            >
              {hasQuotes ? formatCompactDollar(unrealizedPnl) : "—"}
            </span>
            {unrealizedPct !== null && (
              <span
                className={`text-sm font-[var(--font-geist-mono)] tabular-nums opacity-60 ${pnlPctColorClass}`}
              >
                {unrealizedPnl >= 0 ? "+" : ""}
                {unrealizedPct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <SessionIndicator assetType={primaryMarket} />
            {marketsTraded.length > 1 && (
              <MarketSessionsStrip marketsTraded={marketsTraded} />
            )}
          </div>
        </div>

        {/* Right: Stat Cells */}
        <div className="flex flex-wrap items-start gap-6 ml-auto">
          {/* Exposure */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Exposure
            </p>
            <p className="text-sm font-[var(--font-geist-mono)] tabular-nums text-[var(--text-primary)]">
              {formatExposure(portfolio.total_exposure)}
            </p>
          </div>

          {/* Direction */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Direction
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {netDirection}
            </p>
          </div>

          {/* Open count */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Open
            </p>
            <p className="text-sm font-[var(--font-geist-mono)] tabular-nums text-[var(--text-primary)]">
              {portfolio.total_positions}
            </p>
          </div>

          {/* Grade */}
          {grade && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
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
                className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span
                  className={`text-xl font-bold font-[var(--font-geist-mono)] leading-none ${gradeColor(grade.letter)}`}
                >
                  {grade.letter}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-[var(--font-geist-mono)] tabular-nums">
                  {grade.score}
                </span>
              </button>
            </div>
          )}

          {/* Refresh */}
          <div className="flex flex-col justify-end self-center">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center rounded border border-[var(--border-subtle)]/40 p-1.5 transition-colors duration-150 hover:border-[var(--border-subtle)]/60 ${
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
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
