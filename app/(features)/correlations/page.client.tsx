"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsClockwise, Warning, TrendUp, TrendDown, Minus, Shuffle, ChartLineUp, Briefcase } from '@phosphor-icons/react'
import { useCorrelationMatrix } from '@/hooks/use-correlations'
import { CorrelationMatrix } from '@/components/correlations/correlation-matrix'
import { SignalCards } from '@/components/correlations/signal-cards'
import { RegimeBanner } from '@/components/correlations/regime-banner'
import { PairDetailPanel } from '@/components/correlations/pair-detail-panel'
import { PortfolioCorrelations } from '@/components/correlations/portfolio-correlations'
import { CorrelationListView } from '@/components/correlations/correlation-list-view'
import { DataFreshness } from '@/components/correlations/data-freshness'
import { BeginnerToggle, useBeginnerMode } from '@/components/correlations/beginner-toggle'

type ViewTab = 'market' | 'portfolio'

const NEUTRAL_REGIME = { color: 'var(--text-muted)', Icon: Minus, label: 'Neutral' } as const

const regimeConfig: Record<string, { color: string; Icon: typeof TrendUp; label: string }> = {
  risk_on: { color: 'var(--data-positive)', Icon: TrendUp, label: 'Risk On' },
  risk_off: { color: 'var(--data-negative)', Icon: TrendDown, label: 'Risk Off' },
  correlation_breakdown: { color: 'var(--data-warning)', Icon: Warning, label: 'Breakdown' },
  rotation: { color: 'var(--accent-indigo)', Icon: Shuffle, label: 'Rotation' },
  neutral: NEUTRAL_REGIME,
}

export default function CorrelationsPageClient() {
  const [activeTab, setActiveTab] = useState<ViewTab>('market')
  const [period, setPeriod] = useState<'30d' | '90d' | '1y'>('30d')
  const [selectedPair, setSelectedPair] = useState<{ assetA: string; assetB: string } | null>(null)
  const [beginnerMode, setBeginnerMode] = useBeginnerMode()
  const [calculating, setCalculating] = useState(false)

  const detailPanelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error, refetch } = useCorrelationMatrix(period)
  // Fetch 90d data for cross-period signal detection when viewing 30d
  const { data: data90d } = useCorrelationMatrix('90d')

  useEffect(() => {
    if (selectedPair && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [selectedPair])

  // Keyboard shortcut: 1/2/3 for period switching
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '1') setPeriod('30d')
      else if (e.key === '2') setPeriod('90d')
      else if (e.key === '3') setPeriod('1y')
      else if (e.key === 'Escape') setSelectedPair(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSelectPair = useCallback((a: string, b: string) => {
    setSelectedPair({ assetA: a, assetB: b })
  }, [])

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Correlations
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <DataFreshness calculatedAt={regime?.calculated_at ?? null} />
              {data && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  · {data.assets.length} assets
                </span>
              )}
            </div>
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

        {/* View tabs: Market Matrix | My Portfolio */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-base)' }}>
            <button
              onClick={() => { setActiveTab('market'); setSelectedPair(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{
                background: activeTab === 'market' ? 'var(--accent-indigo)' : 'transparent',
                color: activeTab === 'market' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <ChartLineUp weight={activeTab === 'market' ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
              Market Matrix
            </button>
            <button
              onClick={() => { setActiveTab('portfolio'); setSelectedPair(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{
                background: activeTab === 'portfolio' ? 'var(--accent-indigo)' : 'transparent',
                color: activeTab === 'portfolio' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <Briefcase weight={activeTab === 'portfolio' ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
              My Portfolio
            </button>
          </div>
        </div>

        {/* Controls — only for Market Matrix tab */}
        {activeTab === 'market' && (
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
        )}

        {/* Regime Banner */}
        {activeTab === 'market' && data && regime && (
          <RegimeBanner
            regime={regime}
            correlations={data.correlations}
            beginnerMode={beginnerMode}
          />
        )}

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
          <AnimatePresence mode="wait">
            {activeTab === 'market' ? (
              <motion.div
                key="market"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                  <div className="xl:col-span-3">
                    {/* Desktop: full matrix */}
                    <div className="pelican-card overflow-auto hidden md:block">
                      <CorrelationMatrix
                        assets={data.assets}
                        correlations={data.correlations}
                        period={period}
                        selectedPair={selectedPair}
                        onSelectPair={handleSelectPair}
                        beginnerMode={beginnerMode}
                      />
                    </div>
                    {/* Mobile: list view */}
                    <div className="md:hidden">
                      <CorrelationListView
                        correlations={data.correlations}
                        assets={data.assets}
                        period={period}
                        beginnerMode={beginnerMode}
                        onSelectPair={handleSelectPair}
                      />
                    </div>
                  </div>

                  <div className="xl:col-span-1">
                    <SignalCards
                      correlations={data.correlations}
                      correlations90d={period === '30d' ? data90d?.correlations : undefined}
                      assets={data.assets}
                      beginnerMode={beginnerMode}
                      onSelectPair={handleSelectPair}
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
              </motion.div>
            ) : (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <PortfolioCorrelations
                  correlations={data.correlations}
                  assets={data.assets}
                  period={period}
                  beginnerMode={beginnerMode}
                  onSelectPair={handleSelectPair}
                />

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
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
