"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { Refresh01Icon as ArrowsClockwise } from "@hugeicons/core-free-icons"
import { MARKETS, formatCountdown, getMarketStatus, type MarketDefinition } from "@/lib/market-hours"
import type { PortfolioStats, PortfolioPosition } from "@/types/portfolio"
import type { PortfolioGrade } from "@/lib/portfolio-grade"
import type { Quote } from "@/hooks/use-live-quotes"

interface PortfolioHeroStripProps {
  portfolio: PortfolioStats
  positions: PortfolioPosition[]
  quotes: Record<string, Quote>
  grade: PortfolioGrade | null
  primaryMarket: string
  marketsTraded: string[]
  isRefreshing: boolean
  onRefresh: () => void
  onGradeClick: (message: string) => void
}

function computeTotalUnrealizedPnl(
  positions: PortfolioPosition[],
  quotes: Record<string, Quote>,
): { total: number; hasQuotes: boolean } {
  let total = 0
  let hasQuotes = false

  for (const position of positions) {
    const quote = quotes[position.ticker.toUpperCase()]
    if (!quote) continue
    hasQuotes = true
    const currentPrice = quote.price
    const pnlPerUnit =
      position.direction === "long"
        ? currentPrice - position.entry_price
        : position.entry_price - currentPrice
    total += pnlPerUnit * position.quantity
  }

  return { total, hasQuotes }
}

function formatCompactDollar(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? "-" : "+"}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${value < 0 ? "-" : "+"}$${(abs / 1_000).toFixed(1)}K`
  return `${value < 0 ? "-" : "+"}$${abs.toFixed(2)}`
}

function formatExposure(value: number | null | undefined): string {
  if (value == null) return "?"
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

/** Animated P&L counter — counts from previous value to current with ease-out quart */
function AnimatedPnl({ value, hasQuotes, className }: { value: number; hasQuotes: boolean; className: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prevValue = useRef(0)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!hasQuotes || !ref.current) return
    const el = ref.current
    const from = prevValue.current
    const to = value
    prevValue.current = to

    if (from === to || prefersReducedMotion.current) {
      el.textContent = formatCompactDollar(to)
      return
    }

    const duration = 600
    const start = performance.now()
    let rafId: number

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = from + (to - from) * eased
      el.textContent = formatCompactDollar(current)
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [value, hasQuotes])

  return (
    <span ref={ref} className={className}>
      {hasQuotes ? formatCompactDollar(value) : "—"}
    </span>
  )
}

const statsStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
}

const statItem = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

function gradeColor(letter: string): string {
  if (letter === "A" || letter === "B") return "text-emerald-500"
  if (letter === "C") return "text-amber-500"
  return "text-red-500"
}

function getMarketForAsset(assetType: string): MarketDefinition {
  switch (assetType) {
    case "forex":
      return MARKETS.find((market) => market.id === "forex")!
    case "crypto":
      return MARKETS.find((market) => market.id === "crypto")!
    case "future":
    case "futures":
      return MARKETS.find((market) => market.id === "us-futures")!
    default:
      return MARKETS.find((market) => market.id === "us-equities")!
  }
}

function getTrackedMarketNames(marketsTraded: string[], fallbackMarket: string): string[] {
  const labelMap: Record<string, string> = {
    stocks: "US Equities",
    options: "US Equities",
    crypto: "Crypto",
    forex: "Forex",
    futures: "US Futures",
  }

  const labels = marketsTraded
    .map((market) => labelMap[market])
    .filter((label): label is string => Boolean(label))

  if (labels.length > 0) {
    return Array.from(new Set(labels))
  }

  return [getMarketForAsset(fallbackMarket).name]
}

export function PortfolioHeroStrip({
  portfolio,
  positions,
  quotes,
  grade,
  primaryMarket,
  marketsTraded,
  isRefreshing,
  onRefresh,
  onGradeClick,
}: PortfolioHeroStripProps) {
  const [now, setNow] = useState(() => new Date())
  const { total: unrealizedPnl, hasQuotes } = useMemo(
    () => computeTotalUnrealizedPnl(positions, quotes),
    [positions, quotes],
  )

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const primaryTrackedMarket = useMemo(
    () => getMarketForAsset(primaryMarket),
    [primaryMarket],
  )
  const trackedMarkets = useMemo(
    () => getTrackedMarketNames(marketsTraded, primaryMarket),
    [marketsTraded, primaryMarket],
  )
  const { marketStatusLine, marketDotColor } = useMemo(() => {
    const status = getMarketStatus(primaryTrackedMarket, now)
    const statusLabel =
      status.status === "open"
        ? "Open"
        : status.status === "pre-market"
          ? "Pre-Market"
          : status.status === "after-hours"
            ? "After-Hours"
            : "Closed"
    const dotColor =
      status.status === "open"
        ? "bg-emerald-500"
        : status.status === "pre-market" || status.status === "after-hours"
          ? "bg-amber-500"
          : "bg-[var(--text-muted)]"
    const countdown = status.nextChangeLabel
      ? `${status.nextChangeLabel} ${formatCountdown(status.nextChange, now)}`
      : ""

    return {
      marketStatusLine: [statusLabel, countdown, ...trackedMarkets].filter(Boolean).join(" · "),
      marketDotColor: dotColor,
    }
  }, [now, primaryTrackedMarket, trackedMarkets])

  const netDirection =
    portfolio.long_exposure >= portfolio.short_exposure ? "NET LONG" : "NET SHORT"

  const pnlColorClass =
    !hasQuotes
      ? "text-[var(--text-secondary)]"
      : unrealizedPnl >= 0
        ? "text-emerald-400"
        : "text-red-400"

  const unrealizedPct =
    hasQuotes && portfolio.total_exposure > 0
      ? (unrealizedPnl / portfolio.total_exposure) * 100
      : null

  return (
    <div className="border-b border-[var(--border-default)] pb-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Unrealized P&amp;L
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <AnimatedPnl
                  value={unrealizedPnl}
                  hasQuotes={hasQuotes}
                  className={`font-mono tabular-nums text-4xl lg:text-5xl font-bold leading-none tracking-tighter ${pnlColorClass}`}
                />
                <span
                  className={unrealizedPct === null
                    ? "text-lg text-[var(--text-secondary)]"
                    : `font-mono tabular-nums text-lg ${pnlColorClass} opacity-60`
                  }
                >
                  {unrealizedPct === null
                    ? "Waiting for live quotes"
                    : `${unrealizedPnl >= 0 ? "+" : ""}${unrealizedPct.toFixed(2)}%`}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className={`h-1.5 w-1.5 rounded-full ${marketDotColor}`} />
                {marketStatusLine}
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`hidden h-11 min-w-11 items-center justify-center px-2 text-[var(--text-secondary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] lg:flex ${
                isRefreshing
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:text-[var(--text-primary)]"
              }`}
              aria-label="Refresh portfolio"
            >
              <HugeiconsIcon
                icon={ArrowsClockwise}
                size={16}
                className={isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}
                strokeWidth={1.5}
                color="currentColor"
              />
            </button>
          </div>
        </div>

        <m.div
          className="grid flex-none grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:min-w-[420px]"
          variants={statsStagger}
          initial="hidden"
          animate="visible"
        >
          <m.div variants={statItem}>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Exposure
            </p>
            <p className="mt-1 font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
              {formatExposure(portfolio.total_exposure)}
            </p>
          </m.div>

          <m.div variants={statItem}>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Direction
            </p>
            <p className="mt-1 font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
              {netDirection}
            </p>
          </m.div>

          <m.div variants={statItem}>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Open
            </p>
            <p className="mt-1 font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
              {portfolio.total_positions}
            </p>
          </m.div>

          <m.div variants={statItem} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Grade
              </p>
              {grade ? (
                <button
                  type="button"
                  onClick={() =>
                    onGradeClick(
                      `My portfolio grade is ${grade.letter} (${grade.score}/100). ` +
                        `Breakdown: ${grade.factors.map((factor) => `${factor.name}: ${factor.score}/100 (${factor.detail})`).join(". ")}. ` +
                        `${grade.summary}. What should I prioritize to improve my grade?`,
                    )
                  }
                  className="mt-1 inline-flex min-h-11 items-center gap-2 cursor-pointer transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
                >
                  <span className={`font-mono tabular-nums text-2xl font-bold leading-none ${gradeColor(grade.letter)}`}>
                    {grade.letter}
                  </span>
                  <span className="font-mono tabular-nums text-xs text-[var(--text-muted)]">
                    {grade.score}
                  </span>
                </button>
              ) : (
                <p className="mt-1 font-mono tabular-nums text-base text-[var(--text-secondary)]">--</p>
              )}
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex h-11 min-w-11 items-center justify-center px-2 text-[var(--text-secondary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] lg:hidden ${
                isRefreshing
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:text-[var(--text-primary)]"
              }`}
              aria-label="Refresh portfolio"
            >
              <HugeiconsIcon
                icon={ArrowsClockwise}
                size={16}
                className={isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}
                strokeWidth={1.5}
                color="currentColor"
              />
            </button>
          </m.div>
        </m.div>
      </div>

    </div>
  )
}
