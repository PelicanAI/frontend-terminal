'use client'

import { useMemo } from 'react'
import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnalyticsUpIcon as TrendUp, Add01Icon as Plus } from '@hugeicons/core-free-icons'
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Trade } from '@/hooks/use-trades'
import { TradeStats, EquityCurvePoint } from '@/hooks/use-trade-stats'
import { Quote } from '@/hooks/use-live-quotes'
import { PelicanCard, PelicanButton, staggerContainer, staggerItem } from '@/components/ui/pelican'
import { DrawdownChart } from '@/components/shared/drawdown-chart'
import { AccountBalanceChart } from '@/components/shared/account-balance-chart'
import { calculateDrawdown, calculateAccountBalance } from '@/lib/positions/drawdown-utils'
import { StatsRow } from './stats-row'
import { AllocationChart } from './allocation-chart'
import { ExposureBar } from './exposure-bar'
import { PnlBars } from './pnl-bars'
import { RiskCheck } from './risk-check'
import {
  calculateQuickStats,
  calculateExposure,
  calculatePnlBars,
  generateRiskInsights,
} from '@/lib/positions/dashboard-utils'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTiltDetection } from '@/hooks/use-tilt-detection'
import { TiltAlertBanner } from '@/components/tilt/tilt-alert-banner'
import { GradeOverview } from '@/components/grading/grade-overview'

const STORAGE_KEY = 'pelican-starting-balance'

interface PositionsDashboardTabProps {
  trades: Trade[]
  quotes: Record<string, Quote>
  stats: TradeStats | null
  equityCurve: EquityCurvePoint[]
  isLoading: boolean
  onOpenLogTrade?: () => void
  onSelectTrade?: (tradeId: string) => void
}

export function PositionsDashboardTab({
  trades,
  quotes,
  stats,
  equityCurve,
  isLoading,
  onOpenLogTrade,
  onSelectTrade,
}: PositionsDashboardTabProps) {
  const [equityView, setEquityView] = useState<'equity' | 'drawdown' | 'balance'>('equity')
  const [startingBalance, setStartingBalance] = useState(10000)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseFloat(stored)
        if (!isNaN(parsed) && parsed >= 0) setStartingBalance(parsed)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

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

  const openTrades = useMemo(
    () => trades.filter((t) => t.status === 'open'),
    [trades],
  )

  const quickStats = useMemo(
    () => calculateQuickStats(openTrades, quotes, stats),
    [openTrades, quotes, stats],
  )

  const exposure = useMemo(
    () => calculateExposure(openTrades),
    [openTrades],
  )

  const pnlBars = useMemo(
    () => calculatePnlBars(openTrades, quotes),
    [openTrades, quotes],
  )

  const riskInsights = useMemo(
    () => generateRiskInsights(openTrades),
    [openTrades],
  )

  const { alerts: tiltAlerts } = useTiltDetection()

  const drawdownData = useMemo(
    () => calculateDrawdown(equityCurve, startingBalance),
    [equityCurve, startingBalance],
  )

  const balanceData = useMemo(
    () => calculateAccountBalance(equityCurve, startingBalance),
    [equityCurve, startingBalance],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin motion-reduce:animate-none mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Empty state: no trades at all
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <HugeiconsIcon icon={TrendUp} size={40} className="text-[var(--text-muted)] mb-3" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          No positions yet
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1 text-center max-w-sm">
          Log your first trade to see your portfolio dashboard
        </p>
        {onOpenLogTrade && (
          <PelicanButton
            variant="primary"
            size="lg"
            className="mt-4"
            onClick={onOpenLogTrade}
          >
            <HugeiconsIcon icon={Plus} size={16} strokeWidth={2} color="currentColor" />
            Log Trade
          </PelicanButton>
        )}
      </div>
    )
  }

  return (
    <m.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Tilt Alerts */}
      {tiltAlerts.length > 0 && (
        <m.div variants={staggerItem}>
          <TiltAlertBanner alerts={tiltAlerts} />
        </m.div>
      )}

      {/* Grade Overview */}
      <m.div variants={staggerItem}>
        <GradeOverview trades={trades} />
      </m.div>

      {/* Row 1: Quick Stats */}
      <m.div variants={staggerItem}>
        <StatsRow stats={quickStats} />
      </m.div>

      {/* Row 2: Allocation + Exposure */}
      {openTrades.length > 0 && (
        <m.div
          variants={staggerItem}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <AllocationChart
            openTrades={openTrades}
            onSelectTrade={onSelectTrade}
          />
          <ExposureBar exposure={exposure} />
        </m.div>
      )}

      {/* Row 3: P&L Bars + Risk Check */}
      {openTrades.length > 0 && (
        <m.div
          variants={staggerItem}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <PnlBars bars={pnlBars} onSelectTrade={onSelectTrade} />
          <RiskCheck insights={riskInsights} />
        </m.div>
      )}

      {/* Row 4: Equity Curve / Drawdown / Balance */}
      {equityCurve.length > 0 ? (
        <m.div variants={staggerItem}>
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
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
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
        </m.div>
      ) : (
        <m.div variants={staggerItem}>
          <PelicanCard>
            <div className="flex flex-col items-center justify-center py-12">
              <HugeiconsIcon icon={TrendUp} size={32} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
              <p className="text-sm mt-3 text-[var(--text-secondary)]">
                Close your first trade to see your equity curve
              </p>
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                The curve builds as you close positions and lock in P&L
              </p>
            </div>
          </PelicanCard>
        </m.div>
      )}
    </m.div>
  )
}
