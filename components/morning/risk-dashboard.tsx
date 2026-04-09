'use client'

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  SecurityCheckIcon as ShieldCheck,
  Alert01Icon as Warning,
  ArrowRight01Icon as CaretRight,
} from '@hugeicons/core-free-icons'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'

interface TradeData {
  id: string
  ticker: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price: number | null
  pnl_amount: number | null
  pnl_percent: number | null
  status: string
  entry_date: string
  exit_date: string | null
}

interface RiskDashboardProps {
  openTrades: TradeData[]
  closedTrades: TradeData[]
  quotes: Record<string, { price: number; change?: number; changePercent?: number }>
  onAnalyze: (ticker: string | null, prompt: string) => void
}

export function RiskDashboard({ openTrades, closedTrades, quotes, onAnalyze }: RiskDashboardProps) {
  const todayStr = new Date().toISOString().split('T')[0] ?? ''

  const metrics = useMemo(() => {
    // Filter to today's closed trades
    const todaysTrades = closedTrades.filter(t =>
      t.exit_date && t.exit_date.startsWith(todayStr)
    )

    const tradesToday = todaysTrades.length
    const winsToday = todaysTrades.filter(t => (t.pnl_amount || 0) > 0).length
    const dailyPnl = todaysTrades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0)
    const winRateToday = tradesToday > 0 ? (winsToday / tradesToday) * 100 : null

    // Calculate open exposure (total position value)
    let openExposure = 0
    for (const trade of openTrades) {
      const quote = quotes[trade.ticker]
      const currentPrice = quote?.price || trade.entry_price
      openExposure += currentPrice * trade.quantity
    }

    // Find largest position
    let largestPosition: { ticker: string; value: number } | null = null
    for (const trade of openTrades) {
      const quote = quotes[trade.ticker]
      const currentPrice = quote?.price || trade.entry_price
      const value = currentPrice * trade.quantity
      if (!largestPosition || value > largestPosition.value) {
        largestPosition = { ticker: trade.ticker, value }
      }
    }

    // Calculate streak (look at recent closed trades, chronologically)
    let streakType: 'winning' | 'losing' | 'none' = 'none'
    let streakCount = 0
    const sortedClosed = [...closedTrades]
      .filter(t => t.exit_date)
      .sort((a, b) => (b.exit_date || '').localeCompare(a.exit_date || ''))

    if (sortedClosed.length > 0) {
      const firstPnl = sortedClosed[0]?.pnl_amount || 0
      streakType = firstPnl >= 0 ? 'winning' : 'losing'
      for (const trade of sortedClosed) {
        const pnl = trade.pnl_amount || 0
        if ((streakType === 'winning' && pnl >= 0) || (streakType === 'losing' && pnl < 0)) {
          streakCount++
        } else {
          break
        }
      }
    }

    return {
      dailyPnl,
      tradesToday,
      winsToday,
      winRateToday,
      openExposure,
      largestPosition,
      streakType,
      streakCount,
    }
  }, [closedTrades, openTrades, quotes, todayStr])

  // Warning conditions
  const warnings = useMemo(() => {
    const warns: { message: string; severity: 'amber' | 'red' }[] = []

    if (metrics.streakType === 'losing' && metrics.streakCount >= 3) {
      warns.push({
        message: `You're on a ${metrics.streakCount}-trade losing streak. Consider pausing to review.`,
        severity: 'red',
      })
    }

    if (metrics.dailyPnl < 0 && Math.abs(metrics.dailyPnl) > 500) {
      warns.push({
        message: `Daily loss of $${Math.abs(metrics.dailyPnl).toFixed(0)}. Review your risk rules.`,
        severity: 'red',
      })
    }

    if (metrics.winRateToday != null && metrics.winRateToday < 30 && metrics.tradesToday >= 3) {
      warns.push({
        message: `Win rate today is ${metrics.winRateToday.toFixed(0)}%. Slow down and review setups.`,
        severity: 'amber',
      })
    }

    return warns
  }, [metrics])

  const hasTodaysData = metrics.tradesToday > 0

  return (
    <PelicanCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ShieldCheck} className="h-4 w-4 text-[var(--accent-primary)]" strokeWidth={1.5} color="currentColor" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Risk Dashboard</h2>
        </div>
      </div>

      {/* Warning alerts */}
      {warnings.length > 0 && (
        <div className="space-y-2 mb-4">
          {warnings.map((warn, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
                warn.severity === 'red'
                  ? 'bg-[var(--data-negative)]/10 border border-[var(--data-negative)]/20'
                  : 'bg-[var(--data-warning)]/10 border border-[var(--data-warning)]/20'
              )}
            >
              <HugeiconsIcon icon={Warning} className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  warn.severity === 'red' ? 'text-[var(--data-negative)]' : 'text-[var(--data-warning)]'
                )} strokeWidth={2} color="currentColor" />
              <span className={cn(
                "text-xs",
                warn.severity === 'red' ? 'text-[var(--data-negative)]' : 'text-[var(--data-warning)]'
              )}>
                {warn.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Daily P&L */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Daily P&L</p>
          <p className={cn(
            "text-lg font-mono tabular-nums font-semibold",
            !hasTodaysData ? 'text-[var(--text-disabled)]' :
            metrics.dailyPnl >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
          )}>
            {hasTodaysData
              ? `${metrics.dailyPnl >= 0 ? '+' : ''}$${metrics.dailyPnl.toFixed(2)}`
              : '$0.00'
            }
          </p>
          {hasTodaysData && (
            <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden mt-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  metrics.dailyPnl >= 0 ? 'bg-[var(--data-positive)]' : 'bg-[var(--data-negative)]'
                )}
                style={{ width: `${Math.min(100, Math.abs(metrics.dailyPnl) / 10)}%` }}
              />
            </div>
          )}
        </div>

        {/* Trades Today */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Trades Today</p>
          <p className="text-lg font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {metrics.tradesToday}
          </p>
        </div>

        {/* Win Rate Today */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate Today</p>
          <p className={cn(
            "text-lg font-mono tabular-nums font-semibold",
            !hasTodaysData ? 'text-[var(--text-disabled)]' :
            (metrics.winRateToday ?? 0) >= 50 ? 'text-[var(--data-positive)]' :
            (metrics.winRateToday ?? 0) >= 30 ? 'text-[var(--data-warning)]' :
            'text-[var(--data-negative)]'
          )}>
            {hasTodaysData ? `${metrics.winRateToday?.toFixed(0)}%` : '---'}
          </p>
          {hasTodaysData && (
            <p className="text-xs text-[var(--text-muted)]">
              {metrics.winsToday}/{metrics.tradesToday} wins
            </p>
          )}
        </div>

        {/* Open Exposure */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Open Exposure</p>
          <p className="text-lg font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {openTrades.length > 0
              ? `$${metrics.openExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : '$0'
            }
          </p>
          {metrics.largestPosition && (
            <p className="text-xs text-[var(--text-muted)]">
              Largest: {metrics.largestPosition.ticker}
            </p>
          )}
        </div>
      </div>

      {/* Streak indicator */}
      {metrics.streakCount > 0 && (
        <div className={cn(
          "mt-4 flex items-center justify-between rounded-lg px-3 py-2",
          metrics.streakType === 'winning'
            ? 'bg-[var(--data-positive)]/5'
            : 'bg-[var(--data-negative)]/5'
        )}>
          <span className="text-xs text-[var(--text-secondary)]">
            Current streak
          </span>
          <span className={cn(
            "text-xs font-mono font-semibold",
            metrics.streakType === 'winning' ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
          )}>
            {metrics.streakCount} {metrics.streakType === 'winning' ? 'wins' : 'losses'}
          </span>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => {
          const prompt = `Review my trading risk today. I've taken ${metrics.tradesToday} trade${metrics.tradesToday !== 1 ? 's' : ''} with ${metrics.winRateToday?.toFixed(0) ?? 0}% win rate and $${metrics.dailyPnl.toFixed(2)} daily P&L. I have ${openTrades.length} open positions worth $${metrics.openExposure.toFixed(0)}. Am I within my risk parameters? What should I adjust?`
          onAnalyze(null, prompt)
        }}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
      >
        Check My Trading Plan
        <HugeiconsIcon icon={CaretRight} className="h-3 w-3" strokeWidth={2} color="currentColor" />
      </button>
    </PelicanCard>
  )
}
