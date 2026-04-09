"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import type { PlaybookStats } from "@/hooks/use-playbooks"
import { HugeiconsIcon } from "@hugeicons/react"
import { BarChartIcon as ChartBar, TestTubeIcon as Flask } from "@hugeicons/core-free-icons"

interface PlaybookStatsTabProps {
  stats: PlaybookStats | null
  isLoading: boolean
}

export function PlaybookStatsTab({ stats, isLoading }: PlaybookStatsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-[var(--bg-surface)] rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!stats || stats.totalTrades === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <HugeiconsIcon icon={ChartBar} size={32} className="text-[var(--text-muted)] mb-3" strokeWidth={1} color="currentColor" />
        <p className="text-sm text-[var(--text-muted)]">
          No closed trades tagged with this playbook yet.
        </p>
      </div>
    )
  }

  const summaryStats = [
    { label: "Trades", value: String(stats.totalTrades) },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      color:
        stats.winRate >= 50 ? "var(--data-positive)" : "var(--data-negative)",
    },
    {
      label: "Avg R",
      value: stats.avgR != null ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(2)}` : "--",
      color:
        stats.avgR != null
          ? stats.avgR >= 0
            ? "var(--data-positive)"
            : "var(--data-negative)"
          : undefined,
    },
    {
      label: "Profit Factor",
      value: stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "--",
      color:
        stats.profitFactor != null
          ? stats.profitFactor >= 1
            ? "var(--data-positive)"
            : "var(--data-negative)"
          : undefined,
    },
    {
      label: "Expectancy",
      value:
        stats.expectancy != null
          ? `$${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}`
          : "--",
      color:
        stats.expectancy != null
          ? stats.expectancy >= 0
            ? "var(--data-positive)"
            : "var(--data-negative)"
          : undefined,
    },
    {
      label: "Total P&L",
      value: `$${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`,
      color:
        stats.totalPnl >= 0 ? "var(--data-positive)" : "var(--data-negative)",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {summaryStats.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center"
          >
            <div
              className="text-base font-mono tabular-nums font-semibold"
              style={s.color ? { color: s.color } : { color: "var(--text-primary)" }}
            >
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      {stats.equityCurve.length > 1 && (
        <div
          className={cn(
            "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4",
            "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
          )}
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Equity Curve
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurve}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" hide />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickFormatter={(v: number) => `$${v}`}
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-muted)" }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cumulative P&L"]}
                />
                <Area
                  type="monotone"
                  dataKey="cumPnl"
                  stroke="var(--accent-primary)"
                  fill="url(#equityGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* R-Distribution */}
      {stats.rDistribution.length > 0 && (
        <div
          className={cn(
            "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4",
            "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
          )}
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            R-Multiple Distribution
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.rDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  width={30}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [value, "Trades"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.rDistribution.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.range.startsWith("-")
                          ? "var(--data-negative)"
                          : "var(--accent-primary)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent results strip */}
      {stats.recentTrades.length > 0 && (
        <div
          className={cn(
            "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4",
            "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
          )}
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Recent Results
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {stats.recentTrades.map((r) => {
              const isWin = (r.pnl_amount ?? 0) > 0
              return (
                <div
                  key={r.id}
                  title={`${r.ticker}: ${isWin ? '+' : ''}${(r.pnl_amount ?? 0).toFixed(0)}`}
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono",
                    isWin
                      ? "bg-[var(--data-positive)]/15 text-[var(--data-positive)]"
                      : "bg-[var(--data-negative)]/15 text-[var(--data-negative)]"
                  )}
                >
                  {isWin ? "W" : "L"}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pelican Backtest Placeholder */}
      <div className="mt-8 border border-[var(--border-subtle)] rounded-xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <HugeiconsIcon icon={Flask} size={20} className="text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pelican Backtest</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Test this strategy against historical data. Pelican will scan for setups matching your rules
          and simulate trades.
        </p>
        <button
          disabled
          className="px-4 py-2 bg-[var(--accent-primary)]/30 text-[var(--text-disabled)] rounded-lg cursor-not-allowed text-sm"
        >
          Coming Soon — Backtest with Pelican
        </button>
        <p className="text-xs text-[var(--text-muted)] mt-2 font-mono tabular-nums">Uses 1 credit - Results saved permanently</p>
      </div>
    </div>
  )
}
