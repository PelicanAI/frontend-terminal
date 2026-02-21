import type { CorrelationPair } from '@/types/correlations'

export type DynamicSignalType =
  | 'anomaly'           // |z_score| > 1.5
  | 'breakdown'         // regime = 'breakdown' or 'inversion'
  | 'convergence'       // correlation weakening (moving toward 0)
  | 'divergence'        // correlation strengthening (moving away from 0)
  | 'cross_zero'        // correlation crossed from positive to negative or vice versa

export interface DynamicSignal {
  type: DynamicSignalType
  pair: [string, string]
  period: string
  correlation: number
  z_score: number
  regime: string
  severity: 'info' | 'warning' | 'critical'
  headline: string
  description: string
}

/**
 * Detect dynamic signals from correlation data.
 * Requires both 30d and 90d data for convergence/divergence/cross_zero detection.
 */
export function detectDynamicSignals(
  correlations30d: CorrelationPair[],
  correlations90d: CorrelationPair[],
): DynamicSignal[] {
  const signals: DynamicSignal[] = []

  // Build lookup for 90d data
  const lookup90d = new Map<string, CorrelationPair>()
  for (const pair of correlations90d) {
    lookup90d.set(`${pair.asset_a}-${pair.asset_b}`, pair)
  }

  for (const pair30d of correlations30d) {
    const key = `${pair30d.asset_a}-${pair30d.asset_b}`
    const pair90d = lookup90d.get(key)

    // Anomaly: |z_score| > 1.5
    if (Math.abs(pair30d.z_score) > 1.5) {
      signals.push({
        type: 'anomaly',
        pair: [pair30d.asset_a, pair30d.asset_b],
        period: '30d',
        correlation: pair30d.correlation,
        z_score: pair30d.z_score,
        regime: pair30d.regime,
        severity: Math.abs(pair30d.z_score) > 2 ? 'critical' : 'warning',
        headline: pair30d.z_score > 0
          ? `${pair30d.asset_a} / ${pair30d.asset_b}: Unusually Strong Link`
          : `${pair30d.asset_a} / ${pair30d.asset_b}: Relationship Weakening`,
        description: `Z-score of ${pair30d.z_score > 0 ? '+' : ''}${pair30d.z_score.toFixed(1)}σ indicates the ${pair30d.z_score > 0 ? 'correlation is significantly above' : 'correlation is significantly below'} its historical average of ${pair30d.historical_mean.toFixed(2)}.`,
      })
    }

    // Breakdown/Inversion
    if (pair30d.regime === 'breakdown' || pair30d.regime === 'inversion') {
      signals.push({
        type: 'breakdown',
        pair: [pair30d.asset_a, pair30d.asset_b],
        period: '30d',
        correlation: pair30d.correlation,
        z_score: pair30d.z_score,
        regime: pair30d.regime,
        severity: 'critical',
        headline: pair30d.regime === 'inversion'
          ? `${pair30d.asset_a} / ${pair30d.asset_b}: Relationship Has Flipped`
          : `${pair30d.asset_a} / ${pair30d.asset_b}: Historical Pattern Breaking Down`,
        description: pair30d.regime === 'inversion'
          ? 'The correlation has flipped sign from its historical norm. This is rare and signals a structural shift.'
          : 'Significant deviation from the normal relationship. The historical pattern may be changing.',
      })
    }

    if (!pair90d) continue

    // Convergence: 30d is closer to 0 than 90d by >0.2 (weakening)
    if (Math.abs(pair30d.correlation) < Math.abs(pair90d.correlation) - 0.2) {
      signals.push({
        type: 'convergence',
        pair: [pair30d.asset_a, pair30d.asset_b],
        period: '30d',
        correlation: pair30d.correlation,
        z_score: pair30d.z_score,
        regime: pair30d.regime,
        severity: 'info',
        headline: `${pair30d.asset_a} / ${pair30d.asset_b}: Decoupling in Progress`,
        description: `30-day correlation (${pair30d.correlation.toFixed(2)}) is weaker than 90-day (${pair90d.correlation.toFixed(2)}). These assets are becoming more independent.`,
      })
    }

    // Divergence: 30d is further from 0 than 90d by >0.2 (strengthening)
    if (Math.abs(pair30d.correlation) > Math.abs(pair90d.correlation) + 0.2) {
      signals.push({
        type: 'divergence',
        pair: [pair30d.asset_a, pair30d.asset_b],
        period: '30d',
        correlation: pair30d.correlation,
        z_score: pair30d.z_score,
        regime: pair30d.regime,
        severity: 'warning',
        headline: `${pair30d.asset_a} / ${pair30d.asset_b}: Correlation Tightening`,
        description: `30-day correlation (${pair30d.correlation.toFixed(2)}) is stronger than 90-day (${pair90d.correlation.toFixed(2)}). The link between these assets is intensifying.`,
      })
    }

    // Cross zero: sign changed between 30d and 90d, and 30d magnitude > 0.1
    if (Math.sign(pair30d.correlation) !== Math.sign(pair90d.correlation) && Math.abs(pair30d.correlation) > 0.1) {
      signals.push({
        type: 'cross_zero',
        pair: [pair30d.asset_a, pair30d.asset_b],
        period: '30d',
        correlation: pair30d.correlation,
        z_score: pair30d.z_score,
        regime: pair30d.regime,
        severity: 'critical',
        headline: pair30d.correlation > 0
          ? `${pair30d.asset_a} / ${pair30d.asset_b}: Turned Positive (Was Inverse)`
          : `${pair30d.asset_a} / ${pair30d.asset_b}: Turned Negative (Was Aligned)`,
        description: `The relationship has flipped direction. 30-day: ${pair30d.correlation.toFixed(2)}, 90-day: ${pair90d.correlation.toFixed(2)}. This kind of sign change often signals a regime shift.`,
      })
    }
  }

  // Deduplicate: if a pair appears as both anomaly and breakdown, keep only breakdown (more specific)
  const deduped = new Map<string, DynamicSignal>()
  for (const sig of signals) {
    const key = `${sig.pair[0]}-${sig.pair[1]}`
    const existing = deduped.get(key)
    if (!existing || severityRank(sig.severity) > severityRank(existing.severity)) {
      deduped.set(key, sig)
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || Math.abs(b.z_score) - Math.abs(a.z_score))
    .slice(0, 10)
}

function severityRank(s: 'info' | 'warning' | 'critical'): number {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1
}
