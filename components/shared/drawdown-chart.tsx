'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { DrawdownPoint, DrawdownStats } from '@/lib/positions/drawdown-utils'

interface DrawdownChartProps {
  points: DrawdownPoint[]
  stats: DrawdownStats
  height?: number
}

function formatDate(value: string): string {
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DrawdownPoint }> }) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div className="text-[var(--text-secondary)] mb-1">
        {new Date(point.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
      <div className="text-[var(--data-negative)] font-medium">
        Drawdown: {point.drawdown.toFixed(1)}%
      </div>
      <div className="text-[var(--data-negative)]">
        From peak: -${Math.abs(point.drawdownDollar).toFixed(2)}
      </div>
    </div>
  )
}

export function DrawdownChart({ points, stats, height = 300 }: DrawdownChartProps) {
  const minDrawdown = Math.min(...points.map((p) => p.drawdown), 0)
  const domainMin = minDrawdown - 2

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0, 65%, 50%)" stopOpacity={0.05} />
              <stop offset="100%" stopColor="hsl(0, 65%, 50%)" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
            tickFormatter={formatDate}
          />
          <YAxis
            domain={[domainMin, 0]}
            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
            tickFormatter={(value: number) => `${value.toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="hsl(0, 65%, 50%)"
            strokeWidth={2}
            fill="url(#drawdownGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <StatMini
          label="Max Drawdown"
          value={`${stats.maxDrawdownPercent.toFixed(1)}%`}
          subValue={`-$${Math.abs(stats.maxDrawdownDollar).toFixed(2)}`}
          isNegative
        />
        <StatMini
          label="Current Drawdown"
          value={
            stats.currentDrawdownPercent === 0
              ? '0% (at peak)'
              : `${stats.currentDrawdownPercent.toFixed(1)}%`
          }
          isNegative={stats.currentDrawdownPercent < 0}
        />
        <StatMini
          label="Avg Drawdown"
          value={`${stats.avgDrawdownPercent.toFixed(1)}%`}
          isNegative={stats.avgDrawdownPercent < 0}
        />
        <StatMini
          label="Longest Drawdown"
          value={`${stats.longestDrawdownDays} days`}
          isNegative={stats.longestDrawdownDays > 0}
        />
      </div>
    </div>
  )
}

function StatMini({
  label,
  value,
  subValue,
  isNegative,
}: {
  label: string
  value: string
  subValue?: string
  isNegative: boolean
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="text-[var(--text-muted)] uppercase text-[10px] tracking-wider font-medium mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular-nums text-sm font-semibold ${
          isNegative ? 'text-[var(--data-negative)]' : 'text-[var(--data-positive)]'
        }`}
      >
        {value}
      </div>
      {subValue && (
        <div className="font-mono tabular-nums text-xs text-[var(--data-negative)] mt-0.5">
          {subValue}
        </div>
      )}
    </div>
  )
}
