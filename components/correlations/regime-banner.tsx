"use client"

import { TrendUp, TrendDown, Warning, Shuffle, Minus } from '@phosphor-icons/react'
import type { MarketRegime, CorrelationPair } from '@/types/correlations'

interface RegimeBannerProps {
  regime: MarketRegime | null
  correlations: CorrelationPair[]
  beginnerMode: boolean
}

const FALLBACK = { border: 'var(--border-default)', bg: 'transparent', icon: Minus } as const

const bannerConfig: Record<string, { border: string; bg: string; icon: typeof TrendUp }> = {
  risk_on: { border: 'var(--data-positive)', bg: 'rgba(34, 197, 94, 0.04)', icon: TrendUp },
  risk_off: { border: 'var(--data-negative)', bg: 'rgba(239, 68, 68, 0.04)', icon: TrendDown },
  correlation_breakdown: { border: 'var(--data-warning)', bg: 'rgba(245, 158, 11, 0.04)', icon: Warning },
  rotation: { border: 'var(--accent-indigo)', bg: 'rgba(139, 92, 246, 0.04)', icon: Shuffle },
  neutral: { border: 'var(--border-default)', bg: 'transparent', icon: Minus },
}

const REGIME_LABELS: Record<string, string> = {
  risk_on: 'Risk On',
  risk_off: 'Risk Off',
  correlation_breakdown: 'Correlation Breakdown',
  rotation: 'Sector Rotation',
  neutral: 'Neutral',
}

function getRegimeNarrative(
  regime: MarketRegime,
  correlations: CorrelationPair[],
  beginnerMode: boolean,
): string {
  const findCorr = (a: string, b: string) =>
    correlations.find(c =>
      (c.asset_a === a && c.asset_b === b) || (c.asset_a === b && c.asset_b === a),
    )?.correlation

  const spxGold = findCorr('SPX', 'GOLD')
  const spxVix = findCorr('SPX', 'VIX')
  const spxBtc = findCorr('SPX', 'BTC')

  switch (regime.overall_regime) {
    case 'risk_on':
      return beginnerMode
        ? 'Markets are in "risk-on" mode. Stocks, crypto, and growth assets are moving together in the same direction. This is a normal environment where investors feel confident and are willing to take risks.'
        : `Risk-on regime. Equities and risk assets positively correlated${spxBtc !== undefined ? ` (SPX/BTC: ${spxBtc.toFixed(2)})` : ''}. Safe havens moving inversely${spxGold !== undefined ? ` (SPX/Gold: ${spxGold.toFixed(2)})` : ''}. Normal market environment.`
    case 'risk_off':
      return beginnerMode
        ? 'Markets are in "risk-off" mode. Investors are moving money to safer assets like gold and bonds. Stocks and crypto tend to fall together in this environment. Proceed with caution.'
        : `Risk-off regime detected. Safe havens appreciating while equities sell off${spxGold !== undefined ? ` (SPX/Gold: ${spxGold.toFixed(2)})` : ''}. VIX elevated${spxVix !== undefined ? ` (SPX/VIX: ${spxVix.toFixed(2)})` : ''}. Defensive positioning warranted.`
    case 'correlation_breakdown':
      return beginnerMode
        ? 'Correlations are breaking down. The normal relationships between assets aren\'t working as expected. This is unusual and often happens during major market transitions.'
        : `Correlation breakdown detected. Multiple pairs diverging from historical norms (${regime.signals.length} signals active). Historical relationships may not hold. Reduce position sizes.`
    case 'rotation':
      return beginnerMode
        ? 'Money is rotating between sectors. Some areas of the market are winning while others lose. This usually means investors are changing their views on which sectors will perform best.'
        : 'Sector rotation in progress. Leadership changing between asset classes. Monitor which correlations are strengthening vs. weakening for rotation direction.'
    default:
      return beginnerMode
        ? 'Markets are in a neutral state. No strong directional signal from correlation data.'
        : `Neutral regime. No dominant correlation pattern. Score: ${regime.regime_score.toFixed(1)}.`
  }
}

export function RegimeBanner({ regime, correlations, beginnerMode }: RegimeBannerProps) {
  if (!regime) return null

  const config = bannerConfig[regime.overall_regime] ?? FALLBACK
  const Icon = config.icon
  const label = REGIME_LABELS[regime.overall_regime] ?? 'Unknown'
  const narrative = getRegimeNarrative(regime, correlations, beginnerMode)

  return (
    <div
      className="pelican-card mb-4"
      style={{
        borderLeft: `3px solid ${config.border}`,
        background: config.bg,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon weight="bold" className="w-4 h-4" style={{ color: config.border }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Market Regime: {label}
          </span>
        </div>
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
          Score: {regime.regime_score > 0 ? '+' : ''}{regime.regime_score.toFixed(1)}
        </span>
      </div>
      <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
        {narrative}
      </p>
      <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {regime.signals.length} active signal{regime.signals.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
