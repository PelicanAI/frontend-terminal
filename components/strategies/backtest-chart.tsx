"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import type { StrategyBacktestResult } from "@/types/trading"

interface BacktestChartProps {
  backtests: StrategyBacktestResult[]
}

export function BacktestChart({ backtests }: BacktestChartProps) {
  const latest = backtests[0]
  if (!latest?.equity_curve || !Array.isArray(latest.equity_curve) || latest.equity_curve.length === 0) {
    return null
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Backtest Equity Curve</h3>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>{latest.universe}</span>
          <span>{latest.lookback_period}</span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={latest.equity_curve}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5a5a6e' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#5a5a6e' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#9898a6' }}
              itemStyle={{ color: '#8b5cf6' }}
            />
            <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
