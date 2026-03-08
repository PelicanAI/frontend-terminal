'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'
import { ChartLineUp } from '@phosphor-icons/react'
import type { PnlPoint } from '@/hooks/use-portfolio-pnl'

interface PortfolioPnlChartProps {
  data: PnlPoint[]
  isLoading: boolean
}

export function PortfolioPnlChart({ data, isLoading }: PortfolioPnlChartProps) {
  const latestPnl = data.length > 0 ? data[data.length - 1]!.total_pnl : null

  if (isLoading) {
    return (
      <PelicanCard className="p-5" noPadding>
        <div className="flex items-center gap-2 mb-4">
          <ChartLineUp size={18} weight="regular" className="text-[var(--text-muted)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Portfolio P&L History</h3>
        </div>
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
        </div>
      </PelicanCard>
    )
  }

  if (data.length === 0) {
    return (
      <PelicanCard className="p-5" noPadding>
        <div className="flex items-center gap-2 mb-4">
          <ChartLineUp size={18} weight="regular" className="text-[var(--text-muted)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Portfolio P&L History</h3>
        </div>
        <div className="h-[200px] flex flex-col items-center justify-center">
          <ChartLineUp size={24} className="text-[var(--text-muted)] mb-2" />
          <p className="text-xs text-[var(--text-muted)]">P&L history will appear after market close</p>
        </div>
      </PelicanCard>
    )
  }

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartLineUp size={18} weight="regular" className="text-[var(--text-muted)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Portfolio P&L History</h3>
        </div>
        {latestPnl !== null && (
          <span className={cn(
            "text-sm font-mono tabular-nums font-semibold",
            latestPnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
          )}>
            {latestPnl >= 0 ? '+' : ''}${latestPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--data-positive)" stopOpacity={0.3} />
                <stop offset="50%" stopColor="var(--data-positive)" stopOpacity={0.05} />
                <stop offset="50%" stopColor="var(--data-negative)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="var(--data-negative)" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(v) => `$${v >= 0 ? '' : '-'}${Math.abs(v).toLocaleString()}`}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
              labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Portfolio P&L']) as any}
            />
            <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="total_pnl"
              stroke={latestPnl != null && latestPnl >= 0 ? 'var(--data-positive)' : 'var(--data-negative)'}
              strokeWidth={2}
              fill="url(#pnlGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </PelicanCard>
  )
}
