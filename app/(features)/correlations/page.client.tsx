"use client"

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowsClockwise, Warning, TrendUp, TrendDown, Minus, Shuffle } from '@phosphor-icons/react'
import { useCorrelationMatrix } from '@/hooks/use-correlations'
import { CorrelationMatrix } from '@/components/correlations/correlation-matrix'
import { SignalCards } from '@/components/correlations/signal-cards'
import { PairDetailPanel } from '@/components/correlations/pair-detail-panel'
import { BeginnerToggle, useBeginnerMode } from '@/components/correlations/beginner-toggle'

const NEUTRAL_REGIME = { color: 'var(--text-muted)', Icon: Minus, label: 'Neutral' } as const

const regimeConfig: Record<string, { color: string; Icon: typeof TrendUp; label: string }> = {
  risk_on: { color: 'var(--data-positive)', Icon: TrendUp, label: 'Risk On' },
  risk_off: { color: 'var(--data-negative)', Icon: TrendDown, label: 'Risk Off' },
  correlation_breakdown: { color: 'var(--data-warning)', Icon: Warning, label: 'Breakdown' },
  rotation: { color: 'var(--accent-indigo)', Icon: Shuffle, label: 'Rotation' },
  neutral: NEUTRAL_REGIME,
}

export default function CorrelationsPageClient() {
  const [period, setPeriod] = useState<'30d' | '90d' | '1y'>('30d')
  const [selectedPair, setSelectedPair] = useState<{ assetA: string; assetB: string } | null>(null)
  const [beginnerMode, setBeginnerMode] = useBeginnerMode()
  const [calculating, setCalculating] = useState(false)

  const detailPanelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error, refetch } = useCorrelationMatrix(period)

  useEffect(() => {
    if (selectedPair && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [selectedPair])

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const res = await fetch('/api/correlations/calculate', { method: 'POST' })
      const json = await res.json()
      if (json.success) refetch()
    } catch { /* noop */ } finally {
      setCalculating(false)
    }
  }

  const regime = data?.regime
  const rs = regime ? regimeConfig[regime.overall_regime] : undefined
  const regimeStyle = rs ?? NEUTRAL_REGIME
  const RegimeIcon = regimeStyle.Icon

  // Empty state
  if (!isLoading && data && data.correlations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Warning weight="light" className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Correlation Data Yet
        </h2>
        <p className="text-sm mb-6 text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
          Correlations are calculated daily after market close.
          Admin users can trigger the first calculation manually.
        </p>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--accent-indigo)' }}
        >
          <ArrowsClockwise weight="bold" className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Calculating...' : 'Calculate Now'}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <motion.div
        className="max-w-[1600px] mx-auto"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Market Correlations
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {data?.assets.length || 0} assets
              {regime && ` \u00B7 Updated ${new Date(regime.calculated_at).toLocaleString()}`}
            </p>
          </div>

          {regime && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <RegimeIcon weight="bold" className="w-4 h-4" style={{ color: regimeStyle.color }} />
              <span className="text-sm font-semibold" style={{ color: regimeStyle.color }}>
                {regimeStyle.label}
              </span>
              <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {regime.regime_score > 0 ? '+' : ''}{regime.regime_score.toFixed(1)}
                {regime.signals.length > 0 && ` \u00B7 ${regime.signals.length} signal${regime.signals.length > 1 ? 's' : ''}`}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-base)' }}>
            {(['30d', '90d', '1y'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  background: period === p ? 'var(--accent-indigo)' : 'transparent',
                  color: period === p ? 'white' : 'var(--text-secondary)',
                }}
              >
                {p === '1y' ? '1 Year' : p === '90d' ? '90 Day' : '30 Day'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <BeginnerToggle value={beginnerMode} onChange={setBeginnerMode} />
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}
              title="Recalculate correlations (admin)"
            >
              <ArrowsClockwise weight="bold" className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <ArrowsClockwise weight="bold" className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-indigo)' }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="pelican-card p-4 text-center">
            <p className="text-sm" style={{ color: 'var(--data-negative)' }}>
              Failed to load correlations: {error.message ?? String(error)}
            </p>
            <button onClick={() => refetch()} className="text-sm mt-2" style={{ color: 'var(--accent-indigo)' }}>
              Retry
            </button>
          </div>
        )}

        {/* Main content */}
        {data && data.correlations.length > 0 && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              <div className="xl:col-span-3">
                <div className="pelican-card overflow-x-auto">
                  <CorrelationMatrix
                    assets={data.assets}
                    correlations={data.correlations}
                    period={period}
                    selectedPair={selectedPair}
                    onSelectPair={(a, b) => setSelectedPair({ assetA: a, assetB: b })}
                    beginnerMode={beginnerMode}
                  />
                </div>
              </div>

              <div className="xl:col-span-1">
                <SignalCards
                  correlations={data.correlations}
                  assets={data.assets}
                  beginnerMode={beginnerMode}
                  onSelectPair={(a, b) => setSelectedPair({ assetA: a, assetB: b })}
                />
              </div>
            </div>

            {selectedPair && (
              <div ref={detailPanelRef}>
                <PairDetailPanel
                  assetA={selectedPair.assetA}
                  assetB={selectedPair.assetB}
                  assets={data.assets}
                  beginnerMode={beginnerMode}
                  onClose={() => setSelectedPair(null)}
                />
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
