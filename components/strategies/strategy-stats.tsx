"use client"

import { ChartBar } from "@phosphor-icons/react"
import type { Playbook } from "@/types/trading"

interface StrategyStatsProps {
  strategy: Playbook
}

export function StrategyStats({ strategy }: StrategyStatsProps) {
  const hasStats = strategy.stats_trade_count > 0

  if (!hasStats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ChartBar size={32} weight="thin" className="text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-muted)]">
          No verified trade stats available yet.
        </p>
      </div>
    )
  }

  const stats = [
    { label: "Trades", value: String(strategy.stats_trade_count) },
    { label: "Win Rate", value: strategy.win_rate != null ? `${strategy.win_rate.toFixed(0)}%` : "--", color: (strategy.win_rate ?? 0) >= 50 ? "var(--data-positive)" : "var(--data-negative)" },
    { label: "Avg R", value: strategy.avg_r_multiple != null ? `${strategy.avg_r_multiple >= 0 ? "+" : ""}${strategy.avg_r_multiple.toFixed(1)}` : "--" },
    { label: "Profit Factor", value: strategy.profit_factor != null ? strategy.profit_factor.toFixed(2) : "--" },
    { label: "Expectancy", value: strategy.expectancy != null ? `$${strategy.expectancy.toFixed(2)}` : "--" },
    { label: "Adoptions", value: String(strategy.adoption_count) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
          <div className="text-lg font-mono tabular-nums font-semibold" style={color ? { color } : { color: "var(--text-primary)" }}>
            {value}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}
