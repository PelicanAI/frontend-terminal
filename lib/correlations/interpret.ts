import type { CorrelationAsset } from '@/types/correlations'

export interface InterpretationContext {
  assetA: CorrelationAsset
  assetB: CorrelationAsset
  current: number
  mean: number
  std: number
  zScore: number
  regime: string
  corr30d?: number
  corr90d?: number
  corr1y?: number
}

export function getStrengthLabel(corr: number): string {
  const abs = Math.abs(corr)
  if (abs > 0.7) return 'strong'
  if (abs > 0.4) return 'moderate'
  if (abs > 0.2) return 'weak'
  return 'negligible'
}

export function getCorrelationTrend(
  corr30d?: number,
  corr90d?: number,
  corr1y?: number,
): 'strengthening' | 'weakening' | 'stable' | 'unknown' {
  if (corr30d === undefined || corr1y === undefined) return 'unknown'
  const diff = Math.abs(corr30d) - Math.abs(corr1y)
  if (diff > 0.15) return 'strengthening'
  if (diff < -0.15) return 'weakening'
  return 'stable'
}

function plainMeaning(corr: number, beginner: boolean): string {
  if (corr > 0.7) {
    return 'These assets tend to move together. When one rises, the other usually follows.'
  }
  if (corr > 0.3) {
    return 'These assets show some tendency to move together, but with meaningful independence.'
  }
  if (corr > -0.3) {
    return 'These assets move largely independently of each other.'
  }
  if (corr > -0.7) {
    return beginner
      ? 'These assets tend to move in opposite directions — when one goes up, the other often goes down.'
      : 'These assets tend to move in opposite directions — when one rises, the other often falls.'
  }
  return 'Strong inverse relationship. These assets reliably move in opposite directions.'
}

function zScoreContext(zScore: number, mean: number, beginner: boolean): string {
  const unusual = Math.abs(zScore) > 1.5
  if (!unusual) {
    const meanStr = mean > 0 ? `+${mean.toFixed(3)}` : mean.toFixed(3)
    return `This is within the normal historical range (mean: ${meanStr}).`
  }

  const direction = zScore > 0 ? 'higher' : 'lower'
  const meanStr = mean > 0 ? `+${mean.toFixed(3)}` : mean.toFixed(3)
  const zAbs = Math.abs(zScore).toFixed(1)

  if (beginner) {
    return `The current correlation is ${zAbs} standard deviations ${direction} than its historical average of ${meanStr}. This is unusual and may signal a shift in how markets behave.`
  }
  return `The current correlation is ${zAbs}σ ${direction} than its historical average of ${meanStr}. This is unusual and may signal a regime change.`
}

function assetClassInsight(a: CorrelationAsset, b: CorrelationAsset, corr: number, beginner: boolean): string {
  const hasSafeHaven = a.category === 'safe_haven' || b.category === 'safe_haven'
  const hasVolGauge = a.category === 'volatility_gauge' || b.category === 'volatility_gauge'
  const bothBroadMarket = a.category === 'broad_market' && b.category === 'broad_market'

  if (hasSafeHaven) {
    if (corr < -0.2) {
      return beginner
        ? 'The safe-haven relationship looks healthy — these assets are moving apart as expected during uncertainty.'
        : 'The safe-haven relationship appears intact with negative correlation.'
    }
    if (corr > 0.3) {
      return beginner
        ? 'Caution: the safe-haven asset is moving with the risk asset, which means it may not protect your portfolio right now.'
        : 'The safe-haven relationship has weakened — positive correlation suggests reduced diversification benefit.'
    }
  }

  if (hasVolGauge) {
    if (corr < -0.3) {
      return beginner
        ? 'The fear gauge is working normally — it rises when markets fall.'
        : 'Volatility gauge is functioning as expected with inverse correlation to equities.'
    }
    if (corr > 0) {
      return beginner
        ? 'Unusual: the fear gauge is rising alongside markets, which can signal hidden stress.'
        : 'Atypical positive correlation with volatility gauge may indicate underlying market stress.'
    }
  }

  if (bothBroadMarket) {
    if (corr > 0.8) {
      return beginner
        ? 'These broad market indices are moving almost in lockstep, which is typical during strong trends.'
        : 'High broad-market correlation suggests unified market direction — low dispersion environment.'
    }
    if (corr < 0.5) {
      return beginner
        ? 'These major indices are diverging, which can mean different parts of the market are telling different stories.'
        : 'Below-average broad-market correlation signals sector rotation or divergent market internals.'
    }
  }

  return ''
}

function regimeContext(regime: string, beginner: boolean): string {
  if (regime === 'breakdown') {
    return beginner
      ? 'Warning: the historical relationship between these assets has broken down. Past patterns may not hold.'
      : 'Warning: correlation breakdown detected. The historical relationship has deviated significantly.'
  }
  if (regime === 'inversion') {
    return beginner
      ? 'Warning: these assets have flipped their usual relationship — they\'re doing the opposite of what history suggests.'
      : 'Warning: correlation inversion detected. The relationship has flipped sign relative to historical norms.'
  }
  return ''
}

function trendContext(
  corr30d?: number,
  corr90d?: number,
  corr1y?: number,
  beginner?: boolean,
): string {
  const trend = getCorrelationTrend(corr30d, corr90d, corr1y)
  if (trend === 'unknown' || trend === 'stable') return ''

  const c30 = corr30d! > 0 ? `+${corr30d!.toFixed(2)}` : corr30d!.toFixed(2)
  const c1y = corr1y! > 0 ? `+${corr1y!.toFixed(2)}` : corr1y!.toFixed(2)

  if (trend === 'strengthening') {
    return beginner
      ? `The relationship is getting stronger recently — the 30-day reading (${c30}) is more intense than the 1-year average (${c1y}).`
      : `The relationship is intensifying — 30-day correlation (${c30}) is stronger than the 1-year average (${c1y}).`
  }
  return beginner
    ? `The relationship is fading — recent correlation is weaker than longer-term averages.`
    : `The relationship is fading — recent correlation is weaker than longer-term averages.`
}

export function interpretCorrelation(ctx: InterpretationContext, beginnerMode: boolean): string {
  const { assetA, assetB, current, mean, std, zScore, regime } = ctx
  const strength = getStrengthLabel(current)
  const direction = current >= 0 ? 'positive' : 'negative'

  const parts: string[] = []

  // 1. Strength description
  parts.push(
    `${assetA.display_name} and ${assetB.display_name} have a ${strength} ${direction} correlation at ${current > 0 ? '+' : ''}${current.toFixed(3)}.`,
  )

  // 2. Plain English meaning
  parts.push(plainMeaning(current, beginnerMode))

  // 3. Z-score context
  parts.push(zScoreContext(zScore, mean, beginnerMode))

  // 4. Asset-class insights
  const classInsight = assetClassInsight(assetA, assetB, current, beginnerMode)
  if (classInsight) parts.push(classInsight)

  // 5. Regime context
  const regimeText = regimeContext(regime, beginnerMode)
  if (regimeText) parts.push(regimeText)

  // 6. Trend context
  const trend = trendContext(ctx.corr30d, ctx.corr90d, ctx.corr1y, beginnerMode)
  if (trend) parts.push(trend)

  return parts.join(' ')
}
