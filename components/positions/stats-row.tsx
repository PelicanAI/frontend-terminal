'use client'

import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Wallet01Icon as Wallet,
  ChartLineData01Icon as ChartLineUp,
  Target01Icon as Target,
  AnalyticsUpIcon as TrendUp,
  AnalyticsDownIcon as TrendDown,
} from '@hugeicons/core-free-icons'
import { PelicanCard, staggerContainer, staggerItem } from '@/components/ui/pelican'
import {
  QuickStats,
  formatDollar,
  formatDollarSigned,
  formatPercent,
} from '@/lib/positions/dashboard-utils'

interface StatsRowProps {
  stats: QuickStats
}

export function StatsRow({ stats }: StatsRowProps) {
  const pnlColor =
    stats.openPnl > 0
      ? 'var(--data-positive)'
      : stats.openPnl < 0
        ? 'var(--data-negative)'
        : 'var(--text-primary)'

  const cards = [
    {
      label: 'Total Exposure',
      value: formatDollar(stats.totalExposure),
      color: 'var(--text-primary)',
      icon: Wallet,
    },
    {
      label: 'Open P&L',
      value: formatDollarSigned(stats.openPnl, true),
      sub: formatPercent(stats.openPnlPercent),
      color: pnlColor,
      icon: stats.openPnl >= 0 ? TrendUp : TrendDown,
    },
    {
      label: 'Win Rate',
      value:
        stats.totalClosedTrades === 0
          ? '\u2014'
          : `${stats.winRate.toFixed(1)}%`,
      color: 'var(--text-primary)',
      icon: Target,
      sub:
        stats.totalClosedTrades > 0
          ? `${stats.totalClosedTrades} closed`
          : 'No closed trades',
    },
    {
      label: 'Best / Worst',
      icon: ChartLineUp,
    },
  ]

  return (
    <m.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <m.div key={card.label} variants={staggerItem}>
            <PelicanCard>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium">
                  {card.label}
                </span>
                {Icon && <HugeiconsIcon icon={Icon} size={18} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />}
              </div>

              {card.label === 'Best / Worst' ? (
                <div className="space-y-1">
                  <div
                    className="text-lg font-bold font-mono tabular-nums"
                    style={{ color: 'var(--data-positive)' }}
                  >
                    {stats.bestTradePnl === 0 && stats.totalClosedTrades === 0
                      ? '\u2014'
                      : formatDollarSigned(stats.bestTradePnl, true)}
                  </div>
                  <div
                    className="text-lg font-bold font-mono tabular-nums"
                    style={{ color: 'var(--data-negative)' }}
                  >
                    {stats.worstTradePnl === 0 && stats.totalClosedTrades === 0
                      ? '\u2014'
                      : formatDollarSigned(stats.worstTradePnl, true)}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="text-2xl font-bold font-mono tabular-nums"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </div>
                  {card.sub && (
                    <p
                      className="text-xs font-mono tabular-nums mt-0.5"
                      style={{ color: card.label === 'Open P&L' ? pnlColor : 'var(--text-muted)' }}
                    >
                      {card.sub}
                    </p>
                  )}
                </>
              )}
            </PelicanCard>
          </m.div>
        )
      })}
    </m.div>
  )
}
