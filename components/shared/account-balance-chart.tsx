'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface BalancePoint {
  date: string
  balance: number
  pnl: number
}

interface AccountBalanceChartProps {
  data: BalancePoint[]
  startingBalance: number
  onStartingBalanceChange: (value: number) => void
}

function formatDate(value: string): string {
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDollarAxis(value: number): string {
  if (value >= 100000) return `$${(value / 1000).toFixed(0)}k`
  if (value >= 10000) return `$${(value / 1000).toFixed(1)}k`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value}`
}

function CustomTooltip({
  active,
  payload,
  startingBalance,
}: {
  active?: boolean
  payload?: Array<{ payload: BalancePoint }>
  startingBalance: number
}) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload
  const pnlFromStart = point.balance - startingBalance
  const pnlPercent = startingBalance > 0 ? (pnlFromStart / startingBalance) * 100 : 0
  const isPositive = pnlFromStart >= 0

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
      <div className="text-[var(--text-primary)] font-medium">
        Account Value: ${point.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={isPositive ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}>
        {isPositive ? '+' : ''}${pnlFromStart.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        {' '}from start ({isPositive ? '+' : ''}{pnlPercent.toFixed(1)}%)
      </div>
    </div>
  )
}

export function AccountBalanceChart({
  data,
  startingBalance,
  onStartingBalanceChange,
}: AccountBalanceChartProps) {
  return (
    <div>
      {/* Starting Balance Input */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[var(--text-secondary)]">Starting Balance:</span>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-mono">
            $
          </span>
          <input
            type="number"
            value={startingBalance}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val) && val >= 0) {
                onStartingBalanceChange(val)
              }
            }}
            className="font-mono tabular-nums text-sm text-[var(--text-primary)] rounded-md pl-5 pr-2 py-1 w-[110px] outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
            min={0}
            step={1000}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(258, 60%, 55%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(258, 60%, 55%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
            tickFormatter={formatDate}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
            tickFormatter={formatDollarAxis}
          />
          <Tooltip content={<CustomTooltip startingBalance={startingBalance} />} />
          <ReferenceLine
            y={startingBalance}
            stroke="var(--text-muted)"
            strokeDasharray="4 4"
            label={{
              value: 'Starting Balance',
              position: 'insideTopRight',
              fill: 'var(--text-muted)',
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="hsl(258, 60%, 55%)"
            strokeWidth={2}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
