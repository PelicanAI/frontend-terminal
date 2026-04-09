'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { PelicanCard } from "@/components/ui/pelican"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon as CalendarBlank } from "@hugeicons/core-free-icons"
import type { DayOfWeekStats } from "@/hooks/use-trade-stats"

const SHORT_DAYS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
}

function getBarColor(pnl: number): string {
  return pnl >= 0 ? "var(--data-positive)" : "var(--data-negative)"
}

const tooltipFormatter = (value: number | undefined, name: string | undefined) => {
  if (name === "pnl") return [`$${(value ?? 0).toFixed(0)}`, "Total P&L"]
  return [value ?? 0, name ?? ""]
}

interface DayOfWeekChartProps {
  data: DayOfWeekStats[]
  onAskPelican?: (prompt: string) => void
}

export function DayOfWeekChart({ data, onAskPelican }: DayOfWeekChartProps) {
  if (data.length === 0) {
    return (
      <PelicanCard className="p-5" noPadding>
        <div className="flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={CalendarBlank} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">P&L by Day of Week</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)] text-center py-8">Not enough data</p>
      </PelicanCard>
    )
  }

  const chartData = data.map((d) => ({
    name: SHORT_DAYS[d.day_of_week] ?? d.day_of_week,
    pnl: d.total_pnl,
    trades: d.trade_count,
    winRate: d.trade_count > 0 ? (d.win_count / d.trade_count) * 100 : 0,
    avgPnl: d.avg_pnl,
  }))

  const bestDay = data.reduce((best, d) => d.total_pnl > best.total_pnl ? d : best, data[0]!)
  const worstDay = data.reduce((worst, d) => d.total_pnl < worst.total_pnl ? d : worst, data[0]!)

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={CalendarBlank} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">P&L by Day of Week</h3>
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
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v >= 0 ? '' : '-'}${Math.abs(v)}`}
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
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.pnl)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-[var(--text-muted)]">
          Best: <span className="text-[var(--data-positive)] font-mono">{SHORT_DAYS[bestDay.day_of_week] ?? bestDay.day_of_week}</span> &middot;
          Worst: <span className="text-[var(--data-negative)] font-mono">{SHORT_DAYS[worstDay.day_of_week] ?? worstDay.day_of_week}</span>
        </p>
        {onAskPelican && (
          <button
            onClick={() => {
              const summary = chartData.map(d => `${d.name}: $${d.pnl.toFixed(0)} (${d.trades} trades, ${d.winRate.toFixed(0)}% WR)`).join(', ')
              onAskPelican(`Analyze my day-of-week trading patterns: ${summary}. Which days should I trade more or less? Any day-specific biases?`)
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
