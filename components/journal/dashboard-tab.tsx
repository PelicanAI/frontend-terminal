"use client"

import { TradeStats, EquityCurvePoint } from "@/hooks/use-trade-stats"
import { TrendUp, TrendDown, Target, Trophy, ChartBar } from "@phosphor-icons/react"
import { motion } from "framer-motion"
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { PelicanCard, staggerContainer, staggerItem } from "@/components/ui/pelican"

interface DashboardTabProps {
  stats: TradeStats | null
  equityCurve: EquityCurvePoint[]
  isLoading: boolean
}

export function DashboardTab({ stats, equityCurve, isLoading }: DashboardTabProps) {
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

      {/* Equity Curve */}
      {equityCurve.length > 0 && (
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Equity Curve</h3>
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
          </PelicanCard>
        </motion.div>
      )}
    </motion.div>
  )
}
