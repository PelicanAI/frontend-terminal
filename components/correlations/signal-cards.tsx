"use client"

import { useMemo } from 'react'
import { Warning, TrendUp, ArrowsClockwise, ArrowRight, Lightning } from '@phosphor-icons/react'
import { findSignalForPair } from '@/lib/correlation-signals'
import { detectDynamicSignals, type DynamicSignal } from '@/lib/correlations/dynamic-signals'
import { usePelicanPanelContext } from '@/providers/pelican-panel-provider'
import type { CorrelationPair, CorrelationAsset } from '@/types/correlations'

interface SignalCardsProps {
  correlations: CorrelationPair[]
  correlations90d?: CorrelationPair[]
  assets: CorrelationAsset[]
  beginnerMode: boolean
  onSelectPair: (assetA: string, assetB: string) => void
}

const severityStyles = {
  critical: { border: 'var(--data-negative)', bg: 'rgba(239, 68, 68, 0.04)', Icon: Warning },
  warning: { border: 'var(--data-warning)', bg: 'rgba(245, 158, 11, 0.04)', Icon: TrendUp },
  info: { border: 'var(--accent-indigo)', bg: 'transparent', Icon: ArrowsClockwise },
} as const

function buildStaticSignals(correlations: CorrelationPair[]): DynamicSignal[] {
  return correlations
    .filter(p => Math.abs(p.z_score) > 1.5 || p.regime === 'breakdown' || p.regime === 'inversion')
    .map(p => {
      const found = findSignalForPair(p.asset_a, p.asset_b)
      const severity = p.regime === 'breakdown' || p.regime === 'inversion'
        ? 'critical' as const
        : Math.abs(p.z_score) > 2 ? 'critical' as const : 'warning' as const
      return {
        type: 'anomaly' as const,
        pair: [p.asset_a, p.asset_b] as [string, string],
        period: '30d',
        correlation: p.correlation,
        z_score: p.z_score,
        regime: p.regime,
        severity,
        headline: found?.signal.name ?? `${p.asset_a} / ${p.asset_b}`,
        description: found?.signal.description ?? `Z-score ${p.z_score.toFixed(1)} indicates ${p.regime} regime.`,
      }
    })
    .sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score))
    .slice(0, 8)
}

export function SignalCards({ correlations, correlations90d, beginnerMode, onSelectPair }: SignalCardsProps) {
  const { openWithPrompt } = usePelicanPanelContext()

  const signals = useMemo(() => {
    if (correlations90d && correlations90d.length > 0) {
      const dynamic = detectDynamicSignals(correlations, correlations90d)
      // Merge: dynamic signals take priority; fill remaining with static
      const keys = new Set(dynamic.map(s => `${s.pair[0]}-${s.pair[1]}`))
      const staticOnly = buildStaticSignals(correlations).filter(s => !keys.has(`${s.pair[0]}-${s.pair[1]}`))
      return [...dynamic, ...staticOnly].slice(0, 10)
    }
    return buildStaticSignals(correlations)
  }, [correlations, correlations90d])

  const handleAskPelican = (sig: DynamicSignal) => {
    const visibleMessage = `Analyze the ${sig.pair[0]} / ${sig.pair[1]} correlation signal`
    const fullPrompt = `The ${sig.pair[0]}/${sig.pair[1]} correlation is showing a ${sig.type} signal. Current correlation: ${sig.correlation.toFixed(2)}, z-score: ${sig.z_score.toFixed(1)}σ, regime: ${sig.regime}. ${sig.description} What does this mean for current market conditions?`
    openWithPrompt(null, { visibleMessage, fullPrompt }, 'correlations', 'correlation_ask')
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Active Signals
      </h3>
      {signals.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          All correlations within normal ranges.
        </p>
      ) : (
        signals.map(sig => {
          const style = severityStyles[sig.severity]
          const SeverityIcon = style.Icon

          return (
            <div
              key={`${sig.pair[0]}-${sig.pair[1]}-${sig.type}`}
              className="pelican-card"
              style={{ borderLeft: `3px solid ${style.border}`, background: style.bg }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <SeverityIcon weight="bold" className="w-3.5 h-3.5" style={{ color: style.border }} />
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {sig.headline}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {sig.pair[0]}/{sig.pair[1]}
                </span>
                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  r = {sig.correlation.toFixed(2)}
                </span>
                <span className="text-xs font-mono tabular-nums" style={{ color: style.border }}>
                  {sig.z_score > 0 ? '+' : ''}{sig.z_score.toFixed(1)}σ
                </span>
              </div>

              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                {sig.description}
              </p>

              <div className="flex items-center gap-3">
                <button
                  className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent-indigo)' }}
                  onClick={() => onSelectPair(sig.pair[0], sig.pair[1])}
                >
                  View Details <ArrowRight weight="bold" className="w-3 h-3" />
                </button>
                <button
                  className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent-indigo)' }}
                  onClick={() => handleAskPelican(sig)}
                >
                  <Lightning weight="bold" className="w-3 h-3" /> Ask Pelican
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
