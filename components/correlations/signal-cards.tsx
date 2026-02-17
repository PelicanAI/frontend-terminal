"use client"

import { useMemo } from 'react'
import { Warning, ArrowsClockwise, TrendUp, CheckCircle, ArrowRight } from '@phosphor-icons/react'
import { findSignalForPair } from '@/lib/correlation-signals'
import type { CorrelationPair, CorrelationAsset } from '@/types/correlations'

interface SignalCardsProps {
  correlations: CorrelationPair[]
  assets: CorrelationAsset[]
  beginnerMode: boolean
  onSelectPair: (assetA: string, assetB: string) => void
}

const regimeConfig = {
  breakdown: { color: 'var(--data-negative)', Icon: Warning },
  inversion: { color: 'var(--data-warning)', Icon: ArrowsClockwise },
  elevated: { color: 'var(--data-warning)', Icon: TrendUp },
  normal: { color: 'var(--data-positive)', Icon: CheckCircle },
} as const

export function SignalCards({ correlations, beginnerMode, onSelectPair }: SignalCardsProps) {
  const anomalies = useMemo(() => {
    return correlations
      .filter(pair =>
        Math.abs(pair.z_score) > 1.5 ||
        pair.regime === 'breakdown' ||
        pair.regime === 'inversion',
      )
      .sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score))
      .slice(0, 8)
  }, [correlations])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Active Signals
      </h3>
      {anomalies.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          All correlations within normal ranges.
        </p>
      ) : (
        anomalies.map(pair => {
          const found = findSignalForPair(pair.asset_a, pair.asset_b)
          const config = regimeConfig[pair.regime]
          const { Icon } = config

          return (
            <button
              key={pair.id}
              className="pelican-card w-full text-left cursor-pointer"
              style={{ borderLeft: `3px solid ${config.color}` }}
              onClick={() => onSelectPair(pair.asset_a, pair.asset_b)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon weight="bold" className="w-3.5 h-3.5" style={{ color: config.color }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {found?.signal.name || `${pair.asset_a} / ${pair.asset_b}`}
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase" style={{ color: config.color }}>
                  {pair.regime}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {pair.asset_a}/{pair.asset_b}
                </span>
                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  r = {pair.correlation.toFixed(2)}
                </span>
                <span className="text-xs font-mono tabular-nums" style={{ color: config.color }}>
                  {pair.z_score > 0 ? '+' : ''}{pair.z_score.toFixed(1)}σ
                </span>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {beginnerMode && found
                  ? found.signal.beginner_explanation
                  : found?.signal.description || `Z-score ${pair.z_score.toFixed(1)} indicates ${pair.regime} regime.`}
              </p>

              <span
                className="text-xs mt-2 flex items-center gap-1"
                style={{ color: 'var(--accent-indigo)' }}
              >
                View in Matrix <ArrowRight weight="bold" className="w-3 h-3" />
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}
