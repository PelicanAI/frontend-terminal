'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TradeStats, EquityCurvePoint } from '@/hooks/use-trade-stats'
import { TrendUp, TrendDown, Target, Trophy, ChartBar } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PelicanCard, staggerContainer, staggerItem } from '@/components/ui/pelican'
import { DrawdownChart } from '@/components/shared/drawdown-chart'
import { AccountBalanceChart } from '@/components/shared/account-balance-chart'
import { calculateDrawdown, calculateAccountBalance } from '@/lib/positions/drawdown-utils'

const STORAGE_KEY = 'pelican-starting-balance'

interface DashboardTabProps {
  stats: TradeStats | null
  equityCurve: EquityCurvePoint[]
  isLoading: boolean
}

export function DashboardTab({ stats, equityCurve, isLoading }: DashboardTabProps) {
  const [equityView, setEquityView] = useState<'equity' | 'drawdown' | 'balance'>('equity')
  const [startingBalance, setStartingBalance] = useState(10000)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Read starting balance from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseFloat(stored)
        if (!isNaN(parsed) && parsed >= 0) {
          setStartingBalance(parsed)
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  // Debounced save to localStorage
  const handleStartingBalanceChange = useCallback((value: number) => {
    setStartingBalance(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, value.toString())
      } catch {
        // localStorage unavailable
      }
    }, 300)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">Loading stats...</p>
        </div>
      </div>
    )
  }

  if (!stats || stats.total_trades === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--text-muted)] text-sm">No trade data yet. Log your first trade to see stats!</p>
      </div>
    )
  }

  const drawdownData = calculateDrawdown(equityCurve, startingBalance)
  const balanceData = calculateAccountBalance(equityCurve, startingBalance)

  const statCards = [
    {
      label: 'Total P&L',
      value: `${stats.total_pnl >= 0 ? '+' : ''}$${stats.total_pnl.toFixed(2)}`,
      color: stats.total_pnl >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]',
      icon: stats.total_pnl >= 0 ? TrendUp : TrendDown,
    },
    {
      label: 'Win Rate',
      value: `${stats.win_rate.toFixed(1)}%`,
      color: stats.win_rate >= 50 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]',
      icon: Target,
    },
    {
      label: 'Total Trades',
      value: stats.total_trades.toString(),
      color: 'text-[var(--text-primary)]',
      icon: Trophy,
    },
    {
      label: 'Profit Factor',
      value: stats.profit_factor.toFixed(2),
      color: stats.profit_factor >= 1 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]',
      icon: ChartBar,
    },
  ]

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <motion.div key={card.label} variants={staggerItem}>
              <PelicanCard>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium">
                    {card.label}
                  </span>
                  <Icon size={18} className="text-[var(--text-muted)]" />
                </div>
                <div className={`text-2xl font-bold font-mono tabular-nums ${card.color}`}>
                  {card.value}
                </div>
              </PelicanCard>
            </motion.div>
          )
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <div className="text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium mb-2">
              Avg Win
            </div>
            <div className="text-xl font-mono font-semibold tabular-nums text-[var(--data-positive)]">
              +${stats.avg_win.toFixed(2)}
            </div>
          </PelicanCard>
        </motion.div>
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <div className="text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium mb-2">
              Avg Loss
            </div>
            <div className="text-xl font-mono font-semibold tabular-nums text-[var(--data-negative)]">
              -${Math.abs(stats.avg_loss).toFixed(2)}
            </div>
          </PelicanCard>
        </motion.div>
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <div className="text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium mb-2">
              Avg R-Multiple
            </div>
            <div className={`text-xl font-mono font-semibold tabular-nums ${
              stats.avg_r_multiple >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
            }`}>
              {stats.avg_r_multiple.toFixed(2)}R
            </div>
          </PelicanCard>
        </motion.div>
      </div>

      {/* Performance Charts — Tabbed */}
      {equityCurve.length > 0 ? (
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Performance</h3>
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                {(['equity', 'drawdown', 'balance'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setEquityView(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      equityView === tab
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab === 'equity' ? 'Equity Curve' : tab === 'drawdown' ? 'Drawdown' : 'Balance'}
                  </button>
                ))}
              </div>
            </div>

            {equityView === 'equity' && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={equityCurve}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'P&L']}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative_pnl"
                    stroke="var(--accent-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {equityView === 'drawdown' && (
              <DrawdownChart points={drawdownData.points} stats={drawdownData.stats} />
            )}

            {equityView === 'balance' && (
              <AccountBalanceChart
                data={balanceData}
                startingBalance={startingBalance}
                onStartingBalanceChange={handleStartingBalanceChange}
              />
            )}
          </PelicanCard>
        </motion.div>
      ) : null}

      {/* Empty state for charts when trades exist but no equity curve */}
      {equityCurve.length === 0 && !isLoading && stats && stats.total_trades > 0 && (
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <div className="flex flex-col items-center justify-center py-16">
              <TrendUp size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm mt-3 text-[var(--text-secondary)]">
                Close your first trade to see performance charts
              </p>
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                Equity curve, drawdown, and balance charts build as you close positions
              </p>
            </div>
          </PelicanCard>
        </motion.div>
      )}
    </motion.div>
  )
}
