'use client'

import { m } from 'framer-motion'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon as ChevronDown,
  ChartLineData01Icon as ChartLineUp,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import type { PnlPoint } from '@/hooks/use-portfolio-pnl'

interface PortfolioPnlChartProps {
  data: PnlPoint[]
  isLoading: boolean
}

export function PortfolioPnlChart({ data, isLoading }: PortfolioPnlChartProps) {
  const latestPnl = data.length > 0 ? data[data.length - 1]!.total_pnl : null

  if (isLoading) {
    return (
      <div className="border-b border-[var(--border-default)] pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">P&amp;L History</h3>
          <HugeiconsIcon icon={ChevronDown} size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        </div>
        <div className="mt-4 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Portfolio P&amp;L History</div>
        <div className="mt-6 flex h-[180px] items-center justify-center">
          <p className="font-mono text-sm text-[var(--text-secondary)]">Loading portfolio P&amp;L feed…</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="border-b border-[var(--border-default)] pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">P&amp;L History</h3>
          <HugeiconsIcon icon={ChevronDown} size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
          <HugeiconsIcon icon={ChartLineUp} size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
          <span>Portfolio P&amp;L History</span>
        </div>
        <div className="mt-6 flex h-[180px] items-center justify-center">
          <p className="font-mono text-sm text-[var(--text-secondary)]">No P&amp;L history has printed yet.</p>
        </div>
      </div>
    )
  }

  return (
    <m.div
      className="border-b border-[var(--border-default)] pb-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">P&amp;L History</h3>
        <HugeiconsIcon icon={ChevronDown} size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Portfolio P&amp;L History</p>
          <div className="mt-1 flex items-center gap-2">
            <HugeiconsIcon icon={ChartLineUp} size={15} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
            <span
              className={cn(
                'font-mono tabular-nums text-lg',
                latestPnl !== null && latestPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {latestPnl !== null ? `${latestPnl >= 0 ? '+' : ''}$${latestPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="positionsPnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--data-positive)" stopOpacity={0.18} />
                <stop offset="55%" stopColor="var(--data-positive)" stopOpacity={0.03} />
                <stop offset="55%" stopColor="var(--data-negative)" stopOpacity={0.03} />
                <stop offset="100%" stopColor="var(--data-negative)" stopOpacity={0.18} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(value) => `$${value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString()}`}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
              labelFormatter={(value) =>
                new Date(value as string).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              }
              formatter={((value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Portfolio P&L']) as never}
            />
            <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="2 4" />
            <Area
              type="monotone"
              dataKey="total_pnl"
              stroke={latestPnl != null && latestPnl >= 0 ? 'var(--data-positive)' : 'var(--data-negative)'}
              strokeWidth={1.8}
              fill="url(#positionsPnlGradient)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </m.div>
  )
}
