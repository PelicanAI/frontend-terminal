"use client"

import React, { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert01Icon as Warning } from '@hugeicons/core-free-icons'
import type { CorrelationAsset, CorrelationPair } from '@/types/correlations'

interface CorrelationListViewProps {
  correlations: CorrelationPair[]
  assets: CorrelationAsset[]
  period: string
  beginnerMode: boolean
  onSelectPair: (assetA: string, assetB: string) => void
}

function CorrelationRow({ pair, onClick }: { pair: CorrelationPair; onClick: () => void }) {
  const barWidth = Math.abs(pair.correlation) * 100
  const barColor = pair.correlation >= 0 ? 'var(--data-positive)' : 'var(--data-negative)'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 hover:translate-y-[-1px]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {pair.asset_a} <span style={{ color: 'var(--text-muted)' }}>↔</span> {pair.asset_b}
          </span>
          <span
            className="text-sm font-mono font-bold tabular-nums"
            style={{ color: barColor }}
          >
            {pair.correlation > 0 ? '+' : ''}{pair.correlation.toFixed(2)}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${barWidth}%`, background: barColor }}
          />
        </div>
      </div>
    </button>
  )
}

function AnomalyRow({ pair, onClick }: { pair: CorrelationPair; onClick: () => void }) {
  const borderColor = Math.abs(pair.z_score) > 1.5 ? 'var(--data-negative)' : 'var(--data-warning)'
  const corrColor = pair.correlation > 0 ? 'var(--data-positive)' : 'var(--data-negative)'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 hover:translate-y-[-1px]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {pair.asset_a} ↔ {pair.asset_b}
          </span>
          <span
            className="text-sm font-mono font-bold tabular-nums"
            style={{ color: corrColor }}
          >
            {pair.correlation > 0 ? '+' : ''}{pair.correlation.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
            usually {pair.historical_mean > 0 ? '+' : ''}{pair.historical_mean.toFixed(2)}
          </span>
          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--data-warning)' }}>
            {pair.z_score > 0 ? '+' : ''}{pair.z_score.toFixed(1)}σ
          </span>
        </div>
      </div>
    </button>
  )
}

export const CorrelationListView = React.memo(function CorrelationListView({
  correlations,
  beginnerMode,
  onSelectPair,
}: CorrelationListViewProps) {
  const { positive, negative, anomalies } = useMemo(() => {
    const sorted = [...correlations].sort((a, b) => b.correlation - a.correlation)
    return {
      positive: sorted.filter(p => p.correlation > 0).slice(0, 8),
      negative: sorted.filter(p => p.correlation < 0).reverse().slice(0, 8),
      anomalies: correlations
        .filter(p => Math.abs(p.z_score) > 1.0)
        .sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score)),
    }
  }, [correlations])

  return (
    <div className="flex flex-col gap-6">
      {/* Strongest Positive */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Strongest Positive
        </h4>
        <div className="flex flex-col gap-1.5">
          {positive.map(pair => (
            <CorrelationRow
              key={pair.id}
              pair={pair}
              onClick={() => onSelectPair(pair.asset_a, pair.asset_b)}
            />
          ))}
        </div>
      </section>

      {/* Strongest Negative */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Strongest Negative
        </h4>
        <div className="flex flex-col gap-1.5">
          {negative.map(pair => (
            <CorrelationRow
              key={pair.id}
              pair={pair}
              onClick={() => onSelectPair(pair.asset_a, pair.asset_b)}
            />
          ))}
        </div>
      </section>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <HugeiconsIcon icon={Warning} size={14} style={{ color: 'var(--data-warning)' }} strokeWidth={2} color="currentColor" />
            Biggest Anomalies
          </h4>
          <div className="flex flex-col gap-1.5">
            {anomalies.map(pair => (
              <AnomalyRow
                key={pair.id}
                pair={pair}
                onClick={() => onSelectPair(pair.asset_a, pair.asset_b)}
              />
            ))}
          </div>
        </section>
      )}

      {beginnerMode && (
        <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
          Tap any pair to see how their prices move together over time.
        </p>
      )}
    </div>
  )
})
