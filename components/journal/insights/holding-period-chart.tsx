"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { PelicanCard } from "@/components/ui/pelican"
import { Timer } from "@phosphor-icons/react"
import type { HoldingPeriodInsight } from "@/hooks/use-behavioral-insights"

const PERIOD_LABELS: Record<string, string> = {
  under_1h: "<1h",
  "1h_to_4h": "1-4h",
  "4h_to_1d": "4h-1d",
  "1d_to_3d": "1-3d",
  "3d_to_1w": "3d-1w",
  over_1w: ">1w",
}

function getBarColor(winRate: number): string {
  if (winRate > 50) return "var(--data-positive)"
  if (winRate >= 30) return "var(--data-warning)"
  return "var(--data-negative)"
}

const tooltipFormatter = (value: number | undefined, name: string | undefined) => {
  if (name === "winRate") return [`${value ?? 0}%`, "Win Rate"]
  return [value ?? 0, name ?? ""]
}

interface HoldingPeriodChartProps {
  data: HoldingPeriodInsight[]
  onAskPelican?: (prompt: string) => void
}

export function HoldingPeriodChart({ data, onAskPelican }: HoldingPeriodChartProps) {
  const chartData = data.map((d) => ({
    name: PERIOD_LABELS[d.period] ?? d.period,
    winRate: Number(d.win_rate.toFixed(1)),
    trades: d.total_trades,
    pnl: d.total_pnl,
  }))

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-4">
        <Timer size={18} weight="regular" className="text-[var(--text-muted)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Win Rate by Holding Period</h3>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-primary)",
              }}
              labelStyle={{ color: "var(--text-primary)" }}
              itemStyle={{ color: "var(--text-secondary)" }}
              cursor={{ fill: "rgba(139, 92, 246, 0.08)" }}
              formatter={tooltipFormatter as never}
            />
            <Bar dataKey="winRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.winRate)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          {chartData.map((d) => (
            <span key={d.name}>
              {d.name}: <span className="font-mono tabular-nums">{d.trades}</span> trades
            </span>
          ))}
        </div>
        {onAskPelican && (
          <button
            onClick={() => {
              const summary = chartData.map(d => `${d.name}: ${d.winRate}% WR (${d.trades} trades)`).join(', ')
              onAskPelican(`Analyze my holding period patterns: ${summary}. What's my optimal holding period? Am I holding too long or cutting too early?`)
            }}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors whitespace-nowrap"
          >
            Ask Pelican &rarr;
          </button>
        )}
      </div>
    </PelicanCard>
  )
}
