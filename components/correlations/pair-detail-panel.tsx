"use client"

import { useState } from 'react'
import { X, TrendUp, TrendDown, CalendarBlank, ChatCircleDots } from '@phosphor-icons/react'
import { RollingChart } from './rolling-chart'
import { findSignalForPair } from '@/lib/correlation-signals'
import { useCorrelationPair } from '@/hooks/use-correlations'
import { usePelicanPanelContext } from '@/providers/pelican-panel-provider'
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

function generateInterpretation(
  assetA: string,
  assetB: string,
  correlation: number,
  zScore: number,
  mean: number,
  regime: string,
  beginnerMode: boolean,
): string {
  const direction = correlation > 0 ? 'positive' : 'negative'
  const strength = Math.abs(correlation) > 0.7 ? 'strong'
    : Math.abs(correlation) > 0.3 ? 'moderate' : 'weak'
  const unusual = Math.abs(zScore) > 1.5

  if (beginnerMode) {
    let text = `${assetA} and ${assetB} have a ${strength} ${direction} relationship right now. `
    if (correlation > 0.5) {
      text += 'They tend to move in the same direction. When one goes up, the other usually follows. '
    } else if (correlation < -0.5) {
      text += 'They tend to move in opposite directions. When one goes up, the other usually goes down. '
    } else {
      text += 'Their movements are mostly independent of each other right now. '
    }
    if (unusual) {
      text += `This is unusual compared to historical norms (${zScore > 0 ? 'stronger' : 'weaker'} than normal by ${Math.abs(zScore).toFixed(1)} standard deviations). Worth monitoring.`
    } else {
      text += 'This is within the normal historical range.'
    }
    return text
  }

  let text = `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation at ${correlation.toFixed(3)}. `
  text += `Historical mean: ${mean > 0 ? '+' : ''}${mean.toFixed(3)}. `
  if (unusual) {
    text += `Currently ${Math.abs(zScore).toFixed(1)}σ ${zScore > 0 ? 'above' : 'below'} the mean — ${regime} regime. `
    if (regime === 'inversion') {
      text += 'The historical relationship has flipped sign. This typically signals a regime change.'
    } else if (regime === 'breakdown') {
      text += 'Significant deviation from normal behavior. Monitor for potential mean reversion or structural shift.'
    }
  } else {
    text += 'Within normal range. No actionable signal.'
  }
  return text
}

export function PairDetailPanel({
  assetA, assetB, assets, beginnerMode, onClose,
}: PairDetailPanelProps) {
  const [activePeriod, setActivePeriod] = useState<'30d' | '90d' | '1y'>('30d')
  const { openWithPrompt } = usePelicanPanelContext()

  const { data: pairData, isLoading } = useCorrelationPair(assetA, assetB)
  const correlations = pairData?.pair ?? []

  const currentData = correlations.find(c => c.period === activePeriod)
  const found = findSignalForPair(assetA, assetB)
  const signal = found?.signal ?? null

  const nameA = assets.find(a => a.ticker === assetA)?.display_name || assetA
  const nameB = assets.find(a => a.ticker === assetB)?.display_name || assetB

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

  const handleAskPelican = () => {
    const visibleMessage = `Analyze the ${nameA} / ${nameB} correlation`
    const fullPrompt = [
      `Analyze the current ${nameA} (${assetA}) / ${nameB} (${assetB}) correlation.`,
      `Period: ${activePeriod === '1y' ? '1 Year' : activePeriod === '90d' ? '90 Day' : '30 Day'}.`,
      `Current correlation: ${currentData.correlation.toFixed(3)}.`,
      `Historical mean: ${currentData.historical_mean.toFixed(3)}.`,
      `Z-Score: ${currentData.z_score.toFixed(1)}σ.`,
      `Regime: ${currentData.regime}.`,
      signal ? `Known signal: "${signal.name}" — ${signal.description}` : null,
      signal ? `Bullish when: ${signal.bullish_when}. Bearish when: ${signal.bearish_when}.` : null,
      `What does this tell us about current market conditions? Is this a normal relationship or an anomaly worth monitoring? Any actionable implications for traders?`,
    ].filter(Boolean).join(' ')

    openWithPrompt(null, { visibleMessage, fullPrompt }, 'correlations')
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
            {currentData.z_score > 0 ? '+' : ''}{currentData.z_score.toFixed(1)}σ
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

      {/* Chart + interpretation */}
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
                {generateInterpretation(
                  assetA, assetB,
                  currentData.correlation,
                  currentData.z_score,
                  currentData.historical_mean,
                  currentData.regime,
                  beginnerMode,
                )}
              </p>
            </div>
          )}

          {/* Ask Pelican button */}
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
        </div>
      </div>
    </div>
  )
}
