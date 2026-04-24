"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { Refresh01Icon as ArrowsClockwise } from "@hugeicons/core-free-icons"
import { useBehavioralInsights, type BehavioralInsights, type ConvictionInsight, type SetupInsight, type TickerInsight, type TimeOfDayInsight } from "@/hooks/use-behavioral-insights"
import { useTradePatterns, type TradePattern } from "@/hooks/use-trade-patterns"
import { useDetectPatterns } from "@/hooks/use-detect-patterns"
import { useToast } from "@/hooks/use-toast"
import { NotEnoughData } from "@/components/insights/not-enough-data"
import { staggerContainer, staggerItem } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import { usePlanCompliance } from "@/hooks/use-plan-compliance"
import { useTradingPlan } from "@/hooks/use-trading-plan"
import { useTradeStats, type EquityCurvePoint, type TradeStats } from "@/hooks/use-trade-stats"
import { buildPlanReviewPrompt } from "@/lib/trading/plan-check"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { trackEvent } from "@/lib/tracking"

interface InsightsTabProps {
  onAskPelican: (prompt: string) => void
  onLogTrade: () => void
}

function fmtNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtMoney(value: number | null | undefined, options?: { signed?: boolean; compact?: boolean; digits?: number }): string {
  if (value == null || Number.isNaN(value)) return "—"
  const sign = options?.signed && value > 0 ? "+" : value < 0 ? "-" : ""
  const abs = Math.abs(value)
  if (options?.compact) {
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}${fmtNumber(abs, options?.digits ?? 0)}`
}

function fmtPct(value: number | null | undefined, digits = 1, signed = false): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(digits)}%`
}

function fmtR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}R`
}

function toneClass(value: number | null | undefined, positiveClass = "text-[var(--data-positive)]", negativeClass = "text-[var(--data-negative)]") {
  if (value == null || Number.isNaN(value)) return "text-[var(--text-muted)]"
  if (value > 0) return positiveClass
  if (value < 0) return negativeClass
  return "text-[var(--text-primary)]"
}

function SectionHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline gap-3 border-t border-[var(--border-default)] pt-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-primary)]">{title}</div>
      {meta && <div className="ml-auto font-mono text-[10px] tracking-[0.02em] text-[var(--text-ghost)]">{meta}</div>}
    </div>
  )
}

function Kpi({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: ReactNode
  detail: ReactNode
  tone?: "positive" | "negative" | "muted"
}) {
  return (
    <div className="min-w-0 py-2">
      <div className="mb-2 truncate font-mono text-[10px] text-[var(--text-muted)]">{label}</div>
      <div
        className={cn(
          "truncate font-mono text-[22px] leading-none tabular-nums text-[var(--text-primary)]",
          tone === "positive" && "text-[var(--data-positive)]",
          tone === "negative" && "text-[var(--data-negative)]",
          tone === "muted" && "text-[var(--text-muted)]",
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 truncate font-mono text-[10px] text-[var(--text-ghost)]">{detail}</div>
    </div>
  )
}

function InsightsKpis({ stats, insights, patterns }: { stats: TradeStats | null; insights: BehavioralInsights; patterns: TradePattern[] }) {
  const leakCount = patterns.length
  const leakCost = patterns.reduce((sum, pattern) => {
    const metrics = pattern.metrics ?? {}
    const raw = metrics.cost ?? metrics.leak_cost ?? metrics.pnl_impact ?? metrics.total_pnl
    return sum + (typeof raw === "number" ? raw : 0)
  }, 0)

  return (
    <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
      <Kpi label="Net P&L · all" value={fmtMoney(stats?.total_pnl, { signed: true })} detail="closed trades · USD" tone={(stats?.total_pnl ?? 0) >= 0 ? "positive" : "negative"} />
      <Kpi label="Trades" value={stats?.total_trades ?? insights.total_closed_trades} detail={`${insights.total_closed_trades} closed · ${stats?.open_trades ?? 0} open`} />
      <Kpi label="Win rate" value={fmtPct(stats?.win_rate ?? null)} detail={`${Math.round(((stats?.closed_trades ?? insights.total_closed_trades) * (stats?.win_rate ?? 0)) / 100)}W / ${Math.max(0, (stats?.closed_trades ?? insights.total_closed_trades) - Math.round(((stats?.closed_trades ?? insights.total_closed_trades) * (stats?.win_rate ?? 0)) / 100))}L`} />
      <Kpi label="Avg R" value={fmtR(stats?.avg_r_multiple)} detail={`win ${fmtMoney(stats?.avg_win, { signed: true, compact: true })} · loss ${fmtMoney(stats?.avg_loss, { signed: true, compact: true })}`} tone={(stats?.avg_r_multiple ?? 0) >= 0 ? "positive" : "negative"} />
      <Kpi label="Expectancy" value={fmtMoney(stats?.expectancy, { signed: true })} detail="per trade · USD" tone={(stats?.expectancy ?? 0) >= 0 ? "positive" : "negative"} />
      <Kpi label="Profit factor" value={stats?.profit_factor ? stats.profit_factor.toFixed(2) : "—"} detail="gross W / gross L" />
      <Kpi label="Sharpe · trade" value={stats?.sharpe_ratio ? stats.sharpe_ratio.toFixed(2) : "—"} detail="pnl mean / std" />
      <Kpi label="Largest loss" value={fmtMoney(stats?.largest_loss, { signed: true, compact: true })} detail="closed trades" tone="negative" />
      <Kpi label="Leak cost" value={leakCost ? fmtMoney(leakCost, { signed: true, compact: true }) : "—"} detail={`${leakCount} patterns · live`} tone={leakCost < 0 ? "negative" : "muted"} />
    </div>
  )
}

function HeatmapTable({ insights }: { insights: BehavioralInsights }) {
  const setups = insights.setup_performance.slice(0, 6)
  const sessions = insights.time_of_day

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse font-mono text-xs tabular-nums">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <th className="py-2 pr-3 text-left">Session</th>
            {setups.map((setup) => (
              <th key={setup.setup} className="px-3 py-2 text-right">{setup.setup}</th>
            ))}
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.session} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
              <th className="py-2 pr-3 text-left font-sans text-[10px] uppercase tracking-[0.08em] text-[var(--text-primary)]">
                {sessionLabel(session.session)}
                <span className="mt-0.5 block font-mono text-[9px] normal-case tracking-[0.02em] text-[var(--text-ghost)]">{session.total_trades} trades</span>
              </th>
              {setups.map((setup) => (
                <td key={`${session.session}-${setup.setup}`} className="border-l border-[var(--border-subtle)] px-3 py-2 text-right text-[var(--text-muted)]">
                  <div>—</div>
                  <div className="mt-0.5 text-[9px] text-[var(--text-ghost)]">cross-tab unavailable</div>
                </td>
              ))}
              <td className="border-l border-[var(--border-subtle)] px-3 py-2 text-right">
                <div className={cn("text-sm", toneClass(session.avg_pnl))}>{fmtPct(session.win_rate, 0)}</div>
                <div className="mt-0.5 text-[9px] text-[var(--text-ghost)]">{session.total_trades} · {session.wins}W/{Math.max(0, session.total_trades - session.wins)}L</div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--border-default)] text-[11px] text-[var(--text-primary)]">
            <th className="py-2 pr-3 text-left font-sans text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Setup total</th>
            {setups.map((setup) => (
              <td key={setup.setup} className="px-3 py-2 text-right">
                {fmtPct(setup.win_rate, 0)}
                <br />
                <span className="text-[9px] text-[var(--text-ghost)]">{setup.total_trades}</span>
              </td>
            ))}
            <td className="px-3 py-2 text-right">{insights.total_closed_trades}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function PatternLedger({
  patterns,
  onDismiss,
  onAskPelican,
}: {
  patterns: TradePattern[]
  onDismiss: (id: string) => void
  onAskPelican: (prompt: string) => void
}) {
  const visiblePatterns = patterns.slice(0, 6)
  const totalCost = visiblePatterns.reduce((sum, pattern) => sum + getPatternCost(pattern), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse font-mono text-[11px] tabular-nums">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <th className="w-2 py-1.5 text-left" />
            <th className="px-2 py-1.5 text-left">Pattern</th>
            <th className="px-2 py-1.5 text-right">n</th>
            <th className="px-2 py-1.5 text-right">WR</th>
            <th className="px-2 py-1.5 text-right">Cost</th>
            <th className="px-2 py-1.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {visiblePatterns.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">No live pattern ledger rows yet.</td>
            </tr>
          ) : visiblePatterns.map((pattern) => {
            const cost = getPatternCost(pattern)
            const count = getPatternCount(pattern)
            const winRate = getPatternWinRate(pattern)
            return (
              <tr key={pattern.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
                <td className="py-2 text-left">
                  <span className={cn("block h-3 w-1", pattern.severity === "critical" ? "bg-[var(--data-negative)]" : pattern.severity === "warning" ? "bg-[var(--data-warning)]" : "bg-[var(--accent-primary)]")} />
                </td>
                <td className="px-2 py-2 text-left">
                  <div className="font-sans text-xs font-medium text-[var(--text-primary)]">{pattern.title}</div>
                  <div className="mt-0.5 max-w-[260px] truncate text-[10px] text-[var(--text-muted)]">{pattern.description}</div>
                </td>
                <td className="px-2 py-2 text-right">{count ?? "—"}</td>
                <td className={cn("px-2 py-2 text-right", toneClass((winRate ?? 50) - 50))}>{winRate == null ? "—" : fmtPct(winRate, 1)}</td>
                <td className={cn("px-2 py-2 text-right", toneClass(cost))}>{cost ? fmtMoney(cost, { signed: true, compact: true }) : "—"}</td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent({ eventType: "alert_acted", feature: "journal", data: { patternType: pattern.pattern_type } })
                      onAskPelican(`Pelican, I have a detected trading pattern: "${pattern.title}" — ${pattern.description}. Analyze this pattern and tell me specifically what I should change.`)
                    }}
                    className="mr-3 text-[10px] uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                  >
                    Ask
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(pattern.id)}
                    className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Dismiss
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        {visiblePatterns.length > 0 && (
          <tfoot>
            <tr className="border-t border-[var(--border-default)]">
              <td />
              <td className="px-2 pt-2 text-left font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Total leak</td>
              <td className="px-2 pt-2 text-right">{visiblePatterns.reduce((sum, pattern) => sum + (getPatternCount(pattern) ?? 0), 0) || "—"}</td>
              <td className="px-2 pt-2 text-right text-[var(--text-muted)]">—</td>
              <td className={cn("px-2 pt-2 text-right", toneClass(totalCost))}>{totalCost ? fmtMoney(totalCost, { signed: true, compact: true }) : "—"}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function RuleBacktest({ stats, onAskPelican }: { stats: TradeStats | null; onAskPelican: (prompt: string) => void }) {
  const rows = [
    { label: "Skip trades after weak sessions", status: "available", n: "—", pnl: "—" },
    { label: "Block re-entry after loss", status: "pattern required", n: "—", pnl: "—" },
    { label: "Conviction ≥ 6 only", status: "needs per-trade conviction", n: "—", pnl: "—" },
    { label: "Hard cap trades / day", status: "plan comparison", n: "—", pnl: "—" },
  ]

  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Rule backtest</div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => onAskPelican(`Review this trading rule against my journal: ${row.label}. Use my current trade stats and patterns. Be specific about whether it is worth adopting.`)}
            className="flex w-full items-center gap-3 py-2 text-left hover:bg-[var(--surface-hover)]"
          >
            <span className="ml-2 h-3 w-3 border border-[var(--text-muted)]" />
            <span className="min-w-0 flex-1 text-xs font-medium text-[var(--text-primary)]">{row.label}</span>
            <span className="w-24 text-right font-mono text-[10px] text-[var(--text-muted)]">{row.status}</span>
            <span className="w-16 text-right font-mono text-[11px] text-[var(--data-positive)]">{row.pnl}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-5 gap-y-2 border-t border-[var(--border-default)] pt-3 font-mono tabular-nums">
        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Actual</span>
        <span className="text-[10px] text-[var(--text-ghost)]">→</span>
        <span className={cn("text-right text-lg", toneClass(stats?.total_pnl))}>{fmtMoney(stats?.total_pnl, { signed: true, compact: true })}</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Counterfactual</span>
        <span className="text-[10px] text-[var(--text-ghost)]">pending</span>
        <span className="text-right text-lg text-[var(--text-muted)]">—</span>
        <div className="col-span-3 text-[10px] leading-relaxed text-[var(--text-muted)]">
          Counterfactual engine is not in the current data contract. This panel is wired for prompts, not invented P&L.
        </div>
      </div>
    </div>
  )
}

function ConvictionCalibration({ conviction }: { conviction: ConvictionInsight[] }) {
  const rows = [
    { label: "Low", insight: conviction.find((item) => item.conviction_level === "low"), expected: 30 },
    { label: "Medium", insight: conviction.find((item) => item.conviction_level === "medium"), expected: 55 },
    { label: "High", insight: conviction.find((item) => item.conviction_level === "high"), expected: 75 },
    { label: "Unset", insight: conviction.find((item) => item.conviction_level === "unset"), expected: null },
  ]

  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Conviction vs realized WR</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
        <div>
          <svg viewBox="0 0 600 180" className="h-[180px] w-full">
            {[0, 1, 2, 3, 4].map((index) => (
              <line key={`h-${index}`} x1="34" x2="592" y1={8 + index * 37.5} y2={8 + index * 37.5} stroke="var(--border-subtle)" strokeDasharray="2 3" />
            ))}
            <polyline points="34,127 220,83 406,45 592,8" fill="none" stroke="var(--text-ghost)" strokeDasharray="3 4" />
            {rows.slice(0, 3).map((row, index) => {
              const wr = row.insight?.win_rate ?? 0
              const x = 34 + index * 186
              const y = 8 + (1 - wr / 100) * 150
              const delta = row.expected == null ? 0 : wr - row.expected
              return (
                <g key={row.label}>
                  <circle cx={x} cy={y} r="5" fill={delta >= 0 ? "var(--data-positive)" : "var(--data-negative)"} />
                  <text x={x} y="174" fill="var(--text-ghost)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">{row.label}</text>
                </g>
              )
            })}
          </svg>
          <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 font-mono text-[10px] leading-relaxed text-[var(--text-muted)]">
            Calibration uses the current low / medium / high buckets. Per-score 1-10 calibration is not in the current insights contract.
          </div>
        </div>
        <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
          <thead>
            <tr className="border-b border-[var(--border-default)] text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <th className="py-1.5 text-left">Bucket</th>
              <th className="py-1.5 text-right">WR</th>
              <th className="py-1.5 text-right">Exp</th>
              <th className="py-1.5 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delta = row.expected == null || !row.insight ? null : row.insight.win_rate - row.expected
              return (
                <tr key={row.label} className="border-b border-[var(--border-subtle)]">
                  <td className="py-1.5 text-left">{row.label}</td>
                  <td className="py-1.5 text-right">{row.insight ? fmtPct(row.insight.win_rate, 0) : "—"}</td>
                  <td className="py-1.5 text-right text-[var(--text-ghost)]">{row.expected == null ? "—" : row.expected}</td>
                  <td className={cn("py-1.5 text-right", toneClass(delta))}>{delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TradeSequence({ equityCurve }: { equityCurve: EquityCurvePoint[] }) {
  const points = equityCurve.slice(-30)
  const values = points.map((point, index) => {
    const prev = index === 0 ? (equityCurve[equityCurve.length - points.length - 1]?.cumulative_pnl ?? 0) : points[index - 1]?.cumulative_pnl ?? 0
    return point.cumulative_pnl - prev
  })
  const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value)))
  const last5 = values.slice(-5).reduce((sum, value) => sum + value, 0)

  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Trade sequence · last 30</div>
      <div className="mb-3 flex flex-wrap gap-x-7 gap-y-2 border-b border-[var(--border-subtle)] pb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Last 5 · P&L <span className={cn("text-xs normal-case tracking-normal", toneClass(last5))}>{fmtMoney(last5, { signed: true, compact: true })}</span>
        Trades <span className="text-xs normal-case tracking-normal text-[var(--text-primary)]">{points.length}</span>
      </div>
      <svg viewBox="0 0 600 90" className="h-[90px] w-full">
        <line x1="0" x2="600" y1="45" y2="45" stroke="var(--border-default)" />
        {values.map((value, index) => {
          const slot = 600 / Math.max(1, values.length)
          const width = slot * 0.72
          const height = Math.abs(value) / maxAbs * 38
          const x = index * slot + slot * 0.14
          const y = value >= 0 ? 45 - height : 45
          return <rect key={`${index}-${value}`} x={x} y={y} width={width} height={Math.max(1, height)} fill={value >= 0 ? "var(--data-positive)" : "var(--data-negative)"} opacity="0.85" />
        })}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-[var(--text-ghost)]">
        <span>{points[0]?.date ? new Date(points[0].date).toLocaleDateString("en-US", { month: "short", day: "2-digit" }) : "—"}</span>
        <span>{points.at(-1)?.date ? new Date(points.at(-1)!.date).toLocaleDateString("en-US", { month: "short", day: "2-digit" }) : "—"}</span>
      </div>
    </div>
  )
}

function PlanAdherence({ onReviewPlan }: { onReviewPlan: () => void }) {
  const cells = "pppypoppnpppypppwypppynoppppypppyopppypnypopwppyyypppyypoppnpppyppyppypoppyw".split("").slice(0, 70)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const glyph = (value: string) => value === "p" ? "█" : value === "y" ? "■" : value === "w" ? "▪" : value === "n" ? "x" : "·"

  return (
    <>
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <div className="font-mono text-[9px] text-[var(--text-muted)]">
          {days.map((day) => <div key={day} className="h-5 pr-1 text-right leading-5">{day}</div>)}
        </div>
        <div className="grid grid-cols-14">
          {days.flatMap((_, dayIndex) => Array.from({ length: 14 }, (_week, weekIndex) => {
            const value = cells[weekIndex * 5 + dayIndex] ?? "o"
            return (
              <div
                key={`${dayIndex}-${weekIndex}`}
                className={cn(
                  "h-5 border-b border-r border-[var(--border-subtle)] text-center font-mono text-[10px] leading-5 text-[var(--text-ghost)]",
                  value === "p" && "font-medium text-[var(--data-positive)]",
                  value === "y" && "text-[var(--data-positive)] opacity-60",
                  value === "w" && "text-[var(--data-warning)]",
                  value === "n" && "font-semibold text-[var(--data-negative)]",
                )}
              >
                {glyph(value)}
              </div>
            )
          }))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-5 font-mono text-[9px] tracking-[0.04em] text-[var(--text-muted)]">
        <span><span className="text-[var(--data-positive)]">█</span> Perfect</span>
        <span><span className="text-[var(--data-warning)]">▪</span> Partial</span>
        <span><span className="text-[var(--data-negative)]">x</span> Breach</span>
        <button type="button" onClick={onReviewPlan} className="ml-auto uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:text-[var(--accent-hover)]">
          Review plan
        </button>
      </div>
    </>
  )
}

function SymbolBreakdown({ tickers }: { tickers: TickerInsight[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse font-mono text-[11px] tabular-nums">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <th className="px-2 py-1.5 text-left">Symbol</th>
            <th className="px-2 py-1.5 text-right">n</th>
            <th className="px-2 py-1.5 text-right">WR</th>
            <th className="px-2 py-1.5 text-right">Avg R</th>
            <th className="px-2 py-1.5 text-right">Exp</th>
            <th className="px-2 py-1.5 text-right">Avg hold</th>
            <th className="px-2 py-1.5 text-right">Net P&L</th>
          </tr>
        </thead>
        <tbody>
          {tickers.slice(0, 10).map((ticker) => (
            <tr key={ticker.ticker} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
              <td className="px-2 py-2 text-left font-sans text-xs font-semibold text-[var(--text-primary)]">{ticker.ticker}</td>
              <td className="px-2 py-2 text-right">{ticker.total_trades}</td>
              <td className={cn("px-2 py-2 text-right", toneClass(ticker.win_rate - 50))}>{fmtPct(ticker.win_rate, 1)}</td>
              <td className={cn("px-2 py-2 text-right", toneClass(ticker.avg_r))}>{fmtR(ticker.avg_r)}</td>
              <td className={cn("px-2 py-2 text-right", toneClass(ticker.avg_pnl))}>{fmtMoney(ticker.avg_pnl, { signed: true })}</td>
              <td className="px-2 py-2 text-right">{ticker.avg_hold_hours ? `${ticker.avg_hold_hours.toFixed(1)}h` : "—"}</td>
              <td className={cn("px-2 py-2 text-right font-semibold", toneClass(ticker.total_pnl))}>{fmtMoney(ticker.total_pnl, { signed: true, compact: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getPatternCount(pattern: TradePattern): number | null {
  const value = pattern.metrics?.count ?? pattern.metrics?.total ?? pattern.metrics?.n ?? pattern.metrics?.trade_count
  return typeof value === "number" ? value : null
}

function getPatternWinRate(pattern: TradePattern): number | null {
  const value = pattern.metrics?.win_rate ?? pattern.metrics?.wr
  return typeof value === "number" ? value : null
}

function getPatternCost(pattern: TradePattern): number {
  const value = pattern.metrics?.cost ?? pattern.metrics?.leak_cost ?? pattern.metrics?.pnl_impact ?? pattern.metrics?.total_pnl
  return typeof value === "number" ? value : 0
}

function sessionLabel(session: TimeOfDayInsight["session"]): string {
  const labels: Record<TimeOfDayInsight["session"], string> = {
    pre_market_early: "Pre-mkt",
    first_hour: "First hour",
    midday: "Midday",
    afternoon: "Afternoon",
    after_hours: "After-hours",
  }
  return labels[session] ?? session
}

export function InsightsTab({ onAskPelican, onLogTrade }: InsightsTabProps) {
  const { data: insights, isLoading: insightsLoading, refresh } = useBehavioralInsights()
  const { patterns, dismissPattern, refreshPatterns } = useTradePatterns()
  const { detect, isDetecting } = useDetectPatterns()
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { completeMilestone } = useOnboardingProgress()
  const { stats: complianceStats } = usePlanCompliance()
  const { plan } = useTradingPlan()
  const { stats: tradeStats, equityCurve } = useTradeStats()

  const handleComplianceAskPelican = useCallback(() => {
    if (plan) {
      onAskPelican(buildPlanReviewPrompt(plan, complianceStats, tradeStats))
      return
    }
    onAskPelican("Review my current trading plan compliance and tell me the highest-leverage rule to tighten next.")
  }, [plan, complianceStats, tradeStats, onAskPelican])

  const insightMilestoneRef = useRef(false)
  useEffect(() => {
    if (insights?.has_enough_data && !insightMilestoneRef.current) {
      insightMilestoneRef.current = true
      completeMilestone("first_insight")
    }
  }, [insights?.has_enough_data, completeMilestone])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await detect()
      refresh()
      refreshPatterns()
      toast({
        title: `Found ${result.patterns_found} new pattern${result.patterns_found !== 1 ? "s" : ""}`,
        description: "Your insights have been updated.",
      })
    } catch {
      toast({
        title: "Failed to refresh patterns",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [detect, refresh, refreshPatterns, toast])

  const refreshing = isDetecting || isRefreshing

  const setupMeta = useMemo(() => {
    if (!insights) return null
    const total = insights.setup_performance.reduce((sum: number, setup: SetupInsight) => sum + setup.total_trades, 0)
    return `${total || insights.total_closed_trades} trades · setup marginal totals`
  }, [insights])

  if (insightsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Analyzing your trades...</p>
        </div>
      </div>
    )
  }

  if (!insights || !insights.has_enough_data) {
    return (
      <NotEnoughData
        totalTrades={insights?.total_closed_trades ?? 0}
        minNeeded={insights?.min_trades_needed ?? 5}
        onLogTrade={onLogTrade}
      />
    )
  }

  return (
    <m.div variants={staggerContainer} initial="hidden" animate="visible" className="font-sans">
      <m.div variants={staggerItem} className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Insights</div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Trading DNA</h2>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-ghost)]">
            {insights.total_closed_trades} closed trades
            {insights.generated_at && <> · computed {new Date(insights.generated_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex h-9 items-center gap-2 border border-[var(--border-default)] px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-50"
        >
          <HugeiconsIcon icon={ArrowsClockwise} size={14} className={cn(refreshing && "animate-spin")} strokeWidth={2} color="currentColor" />
          {refreshing ? "Analyzing" : "Refresh"}
        </button>
      </m.div>

      <m.div variants={staggerItem}>
        <InsightsKpis stats={tradeStats} insights={insights} patterns={patterns} />
      </m.div>

      <m.div variants={staggerItem} className="mt-5">
        <SectionHeader title="Win rate · session × setup" meta={setupMeta} />
        <HeatmapTable insights={insights} />
      </m.div>

      <m.div variants={staggerItem} className="mt-6">
        <SectionHeader title="Pattern ledger · counterfactual" meta={`${patterns.length} live patterns · rule prompts`} />
        <div className="grid gap-8 xl:grid-cols-2">
          <PatternLedger patterns={patterns} onDismiss={dismissPattern} onAskPelican={onAskPelican} />
          <RuleBacktest stats={tradeStats} onAskPelican={onAskPelican} />
        </div>
      </m.div>

      <m.div variants={staggerItem} className="mt-6">
        <SectionHeader title="Conviction calibration · trade sequence" meta="self-rated vs realized · live journal" />
        <div className="grid gap-8 xl:grid-cols-2">
          <ConvictionCalibration conviction={insights.conviction} />
          <TradeSequence equityCurve={equityCurve} />
        </div>
      </m.div>

      <m.div variants={staggerItem} className="mt-6">
        <SectionHeader title="Plan adherence · 14 weeks" meta="visual placeholder · review uses live plan stats" />
        <PlanAdherence onReviewPlan={handleComplianceAskPelican} />
      </m.div>

      <m.div variants={staggerItem} className="mt-6">
        <SectionHeader title="Symbol breakdown" meta="top 10 by volume · sorted by expectancy" />
        <SymbolBreakdown tickers={insights.ticker_performance} />
      </m.div>

      <m.div variants={staggerItem} className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border-default)] pt-3 font-mono text-[10px] tracking-[0.04em] text-[var(--text-ghost)]">
        <span>Last computed {insights.generated_at ? new Date(insights.generated_at).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
        <span>·</span>
        <span>Source: {insights.total_closed_trades} closed trades</span>
        <span>·</span>
        <span>Pattern engine live</span>
        <span className="ml-auto">
          <button type="button" onClick={() => onAskPelican("Summarize my current insights tab. Give me the top 3 edge improvements and the one rule I should follow tomorrow.")} className="uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:text-[var(--accent-hover)]">
            Ask Pelican
          </button>
        </span>
      </m.div>
    </m.div>
  )
}
