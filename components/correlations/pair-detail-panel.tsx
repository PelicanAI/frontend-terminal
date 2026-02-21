"use client"

import { useState } from 'react'
import { X, TrendUp, TrendDown, Minus, CalendarBlank, ChatCircleDots, Briefcase } from '@phosphor-icons/react'
import { RollingChart } from './rolling-chart'
import { findSignalForPair } from '@/lib/correlation-signals'
import { useCorrelationPair } from '@/hooks/use-correlations'
import { usePelicanPanelContext } from '@/providers/pelican-panel-provider'
import { useTrades } from '@/hooks/use-trades'
import { interpretCorrelation, getStrengthLabel, getCorrelationTrend } from '@/lib/correlations/interpret'
import type { CorrelationAsset } from '@/types/correlations'

interface PairDetailPanelProps {
  assetA: string
  assetB: string
  assets: CorrelationAsset[]
  beginnerMode: boolean
  onClose: () => void
}

const regimeColors: Record<string, string> = {
  normal: 'var(--data-positive)',
  elevated: 'var(--data-warning)',
  breakdown: 'var(--data-negative)',
  inversion: 'var(--data-warning)',
}

const trendIcons = {
  strengthening: TrendUp,
  weakening: TrendDown,
  stable: Minus,
  unknown: Minus,
} as const

const trendColors: Record<string, string> = {
  strengthening: 'var(--data-positive)',
  weakening: 'var(--data-negative)',
  stable: 'var(--text-muted)',
  unknown: 'var(--text-muted)',
}

export function PairDetailPanel({
  assetA, assetB, assets, beginnerMode, onClose,
}: PairDetailPanelProps) {
  const [activePeriod, setActivePeriod] = useState<'30d' | '90d' | '1y'>('30d')
  const { openWithPrompt } = usePelicanPanelContext()
  const { openTrades } = useTrades({ status: 'open' })

  const { data: pairData, isLoading } = useCorrelationPair(assetA, assetB)
  const correlations = pairData?.pair ?? []

  const currentData = correlations.find(c => c.period === activePeriod)
  const data30d = correlations.find(c => c.period === '30d')
  const data90d = correlations.find(c => c.period === '90d')
  const data1y = correlations.find(c => c.period === '1y')
  const found = findSignalForPair(assetA, assetB)
  const signal = found?.signal ?? null

  const assetInfoA = assets.find(a => a.ticker === assetA)
  const assetInfoB = assets.find(a => a.ticker === assetB)
  const nameA = assetInfoA?.display_name || assetA
  const nameB = assetInfoB?.display_name || assetB

  const trend = getCorrelationTrend(data30d?.correlation, data90d?.correlation, data1y?.correlation)
  const TrendIcon = trendIcons[trend]

  const userHoldsAsset = openTrades.some(t =>
    t.ticker === assetA || t.ticker === assetB
  )

  if (isLoading) {
    return (
      <div className="pelican-card mt-4 flex items-center justify-center py-12" style={{ borderTop: '2px solid var(--accent-indigo)' }}>
        <div className="animate-pulse text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading pair data...
        </div>
      </div>
    )
  }

  if (!currentData) return null

  const interpretation = assetInfoA && assetInfoB ? interpretCorrelation({
    assetA: assetInfoA,
    assetB: assetInfoB,
    current: currentData.correlation,
    mean: currentData.historical_mean,
    std: currentData.historical_std,
    zScore: currentData.z_score,
    regime: currentData.regime,
    corr30d: data30d?.correlation,
    corr90d: data90d?.correlation,
    corr1y: data1y?.correlation,
  }, beginnerMode) : ''

  const handleAskPelican = () => {
    const visibleMessage = `Analyze the ${nameA} / ${nameB} correlation`
    const fullPrompt = [
      `Analyze the current ${nameA} (${assetA}) / ${nameB} (${assetB}) correlation.`,
      `Period: ${activePeriod === '1y' ? '1 Year' : activePeriod === '90d' ? '90 Day' : '30 Day'}.`,
      `Current correlation: ${currentData.correlation.toFixed(3)}.`,
      `Historical mean: ${currentData.historical_mean.toFixed(3)}.`,
      `Z-Score: ${currentData.z_score.toFixed(1)}σ.`,
      `Regime: ${currentData.regime}.`,
      signal ? `Known signal: "${signal.name}" \u2014 ${signal.description}` : null,
      signal ? `Bullish when: ${signal.bullish_when}. Bearish when: ${signal.bearish_when}.` : null,
      `What does this tell us about current market conditions? Is this a normal relationship or an anomaly worth monitoring? Any actionable implications for traders?`,
    ].filter(Boolean).join(' ')

    openWithPrompt(null, { visibleMessage, fullPrompt }, 'correlations', 'correlation_ask')
  }

  return (
    <div className="pelican-card mt-4" style={{ borderTop: '2px solid var(--accent-indigo)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {nameA} / {nameB}
          </h3>
          {trend !== 'unknown' && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--bg-base)', color: trendColors[trend] }}>
              <TrendIcon weight="bold" className="w-3 h-3" />
              {trend === 'strengthening' ? 'Strengthening' : trend === 'weakening' ? 'Weakening' : 'Stable'}
            </div>
          )}
        </div>

        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-base)' }}>
          {(['30d', '90d', '1y'] as const).map(period => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
              style={{
                background: activePeriod === period ? 'var(--accent-indigo)' : 'transparent',
                color: activePeriod === period ? 'white' : 'var(--text-secondary)',
              }}
            >
              {period === '1y' ? '1 Year' : period === '90d' ? '90 Day' : '30 Day'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row + period comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
        <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current</p>
            <p
              className="text-lg font-mono font-bold tabular-nums"
              style={{ color: currentData.correlation > 0 ? 'var(--data-positive)' : 'var(--data-negative)' }}
            >
              {currentData.correlation > 0 ? '+' : ''}{currentData.correlation.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Historical Mean</p>
            <p className="text-lg font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {currentData.historical_mean > 0 ? '+' : ''}{currentData.historical_mean.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Z-Score</p>
            <p
              className="text-lg font-mono font-bold tabular-nums"
              style={{ color: Math.abs(currentData.z_score) > 1.5 ? 'var(--data-negative)' : 'var(--text-primary)' }}
            >
              {currentData.z_score > 0 ? '+' : ''}{currentData.z_score.toFixed(1)}{beginnerMode ? ' SD' : 'σ'}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Regime</p>
            <p
              className="text-sm font-semibold capitalize"
              style={{ color: regimeColors[currentData.regime] }}
            >
              {currentData.regime}
            </p>
          </div>
        </div>

        {/* Period Comparison Mini-Bars */}
        <div className="sm:col-span-2">
          <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Period Comparison
          </h4>
          <div className="space-y-1.5">
            {[
              { label: '30d', data: data30d },
              { label: '90d', data: data90d },
              { label: '1y', data: data1y },
            ].map(({ label, data: d }) => d && (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono w-6 shrink-0"
                  style={{ color: activePeriod === d.period ? 'var(--accent-indigo)' : 'var(--text-muted)' }}
                >
                  {label}
                </span>
                <div className="flex-1 h-3 rounded-sm overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
                  <div
                    className="h-full rounded-sm transition-all duration-300 absolute top-0"
                    style={{
                      width: `${Math.abs(d.correlation) * 50}%`,
                      left: d.correlation >= 0 ? '50%' : `${50 - Math.abs(d.correlation) * 50}%`,
                      background: d.correlation >= 0 ? 'var(--data-positive)' : 'var(--data-negative)',
                      opacity: activePeriod === d.period ? 1 : 0.5,
                    }}
                  />
                  {/* Center line */}
                  <div className="absolute top-0 left-1/2 w-px h-full" style={{ background: 'var(--border-default)' }} />
                </div>
                <span
                  className="text-[10px] font-mono tabular-nums w-10 text-right"
                  style={{ color: activePeriod === d.period ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {d.correlation > 0 ? '+' : ''}{d.correlation.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart + interpretation + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RollingChart
            data={currentData.rolling_data}
            mean={currentData.historical_mean}
            std={currentData.historical_std}
          />
        </div>

        <div className="lg:col-span-2 space-y-3">
          {signal ? (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {signal.name}
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {beginnerMode ? signal.beginner_explanation : signal.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-base)' }}>
                  <div className="flex items-center gap-1 mb-1">
                    <TrendUp weight="bold" className="w-3 h-3" style={{ color: 'var(--data-positive)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--data-positive)' }}>
                      Bullish When
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {signal.bullish_when}
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-base)' }}>
                  <div className="flex items-center gap-1 mb-1">
                    <TrendDown weight="bold" className="w-3 h-3" style={{ color: 'var(--data-negative)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--data-negative)' }}>
                      Bearish When
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {signal.bearish_when}
                  </p>
                </div>
              </div>

              {signal.historical_events.length > 0 && (
                <div>
                  <h4
                    className="text-xs font-semibold mb-1.5 flex items-center gap-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <CalendarBlank weight="bold" className="w-3 h-3" />
                    Historical Precedents
                  </h4>
                  <div className="space-y-1.5">
                    {signal.historical_events.map((event, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="font-mono shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {event.date}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {event.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Correlation Summary
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {interpretation}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={handleAskPelican}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <ChatCircleDots weight="bold" className="w-3.5 h-3.5" style={{ color: 'var(--accent-indigo)' }} />
              Ask Pelican About This
            </button>
            {userHoldsAsset && (
              <a
                href="/positions"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Briefcase weight="bold" className="w-3.5 h-3.5" style={{ color: 'var(--data-positive)' }} />
                View on Positions
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
