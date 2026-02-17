import type { SupabaseClient } from '@supabase/supabase-js'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY
const LOOKBACK_DAYS = 400
const ROLLING_WINDOWS: Record<string, number> = { '30d': 30, '90d': 90, '1y': 252 }

interface DailyBar { date: string; close: number }
interface DailyReturn { date: string; return: number }

export interface CalculationResult {
  success: boolean
  assets_fetched: number
  assets_failed: number
  pairs_calculated: number
  regime: string
  errors?: string[]
}

async function fetchDailyBars(polygonTicker: string): Promise<DailyBar[]> {
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const encodedTicker = encodeURIComponent(polygonTicker)
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodedTicker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Polygon ${res.status} for ${polygonTicker}`)

  const data = await res.json()
  if (!data.results?.length) throw new Error(`No data for ${polygonTicker}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.results.map((bar: any) => ({
    date: new Date(bar.t as number).toISOString().split('T')[0],
    close: bar.c as number,
  }))
}

function calculateReturns(bars: DailyBar[]): DailyReturn[] {
  const returns: DailyReturn[] = []
  for (let i = 1; i < bars.length; i++) {
    const curr = bars[i]!
    const prev = bars[i - 1]!
    returns.push({
      date: curr.date,
      return: (curr.close - prev.close) / prev.close,
    })
  }
  return returns
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length
  if (n < 10) return 0

  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n

  let covAB = 0, varA = 0, varB = 0
  for (let i = 0; i < n; i++) {
    const dA = (a[i] ?? 0) - meanA
    const dB = (b[i] ?? 0) - meanB
    covAB += dA * dB
    varA += dA * dA
    varB += dB * dB
  }

  const denom = Math.sqrt(varA * varB)
  if (denom === 0) return 0
  return covAB / denom
}

function rollingCorrelation(
  returnsA: DailyReturn[],
  returnsB: DailyReturn[],
  window: number,
): { date: string; value: number }[] {
  const mapA = new Map(returnsA.map(r => [r.date, r.return]))
  const mapB = new Map(returnsB.map(r => [r.date, r.return]))

  const commonDates = returnsA
    .map(r => r.date)
    .filter(d => mapB.has(d))
    .sort()

  if (commonDates.length < window + 10) return []

  const alignedA = commonDates.map(d => mapA.get(d)!)
  const alignedB = commonDates.map(d => mapB.get(d)!)

  const results: { date: string; value: number }[] = []
  for (let i = window; i < commonDates.length; i++) {
    const sliceA = alignedA.slice(i - window, i)
    const sliceB = alignedB.slice(i - window, i)
    results.push({
      date: commonDates[i]!,
      value: Math.round(pearsonCorrelation(sliceA, sliceB) * 1000) / 1000,
    })
  }

  return results
}

export async function calculateCorrelations(
  serviceClient: SupabaseClient,
): Promise<CalculationResult> {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY not configured')
  }

  // 1. Get all active assets
  const { data: assets } = await serviceClient
    .from('correlation_assets')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (!assets?.length) {
    throw new Error('No assets configured')
  }

  // 2. Fetch daily bars for all assets
  const returnsByTicker: Record<string, DailyReturn[]> = {}
  const errors: string[] = []

  for (const asset of assets) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const bars = await fetchDailyBars(asset.polygon_ticker)
      returnsByTicker[asset.ticker] = calculateReturns(bars)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${asset.ticker} (${asset.polygon_ticker}): ${message}`)
    }
  }

  // 3. Calculate pairwise correlations
  const tickers = Object.keys(returnsByTicker)
  const cacheRows: Record<string, unknown>[] = []

  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const a = tickers[i]!
      const b = tickers[j]!

      for (const [periodLabel, window] of Object.entries(ROLLING_WINDOWS)) {
        const rolling = rollingCorrelation(returnsByTicker[a]!, returnsByTicker[b]!, window)
        if (rolling.length === 0) continue

        const currentCorr = rolling[rolling.length - 1]!.value
        const values = rolling.map(r => r.value)
        const mean = values.reduce((s, v) => s + v, 0) / values.length
        const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
        const zScore = std > 0 ? (currentCorr - mean) / std : 0

        let regime = 'normal'
        if (Math.abs(zScore) > 2.0) regime = 'breakdown'
        else if (Math.abs(zScore) > 1.5) regime = 'elevated'
        if (currentCorr * mean < 0 && Math.abs(currentCorr) > 0.3) regime = 'inversion'

        const downsampled = rolling.filter((_, idx) => idx % 5 === 0 || idx === rolling.length - 1)

        cacheRows.push({
          asset_a: a,
          asset_b: b,
          period: periodLabel,
          correlation: currentCorr,
          z_score: Math.round(zScore * 100) / 100,
          historical_mean: Math.round(mean * 1000) / 1000,
          historical_std: Math.round(std * 1000) / 1000,
          rolling_data: downsampled,
          regime,
          calculated_at: new Date().toISOString(),
        })
      }
    }
  }

  // 4. Write to cache
  if (cacheRows.length > 0) {
    await serviceClient.from('correlation_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    for (let i = 0; i < cacheRows.length; i += 50) {
      const batch = cacheRows.slice(i, i + 50)
      const { error } = await serviceClient.from('correlation_cache').insert(batch)
      if (error) errors.push(`Batch insert at ${i}: ${error.message}`)
    }
  }

  // 5. Calculate market regime
  const thirtyDayRows = cacheRows.filter(r => r.period === '30d')
  const breakdownCount = thirtyDayRows.filter(r => r.regime === 'breakdown' || r.regime === 'inversion').length
  const breakdownRatio = thirtyDayRows.length > 0 ? breakdownCount / thirtyDayRows.length : 0

  let regimeScore = 0
  const signals: { signal: string; detail: string }[] = []

  const findPair = (tickerA: string, tickerB: string) =>
    thirtyDayRows.find(r =>
      (r.asset_a === tickerA && r.asset_b === tickerB) ||
      (r.asset_a === tickerB && r.asset_b === tickerA),
    ) as Record<string, unknown> | undefined

  const spxGold = findPair('SPX', 'GOLD')
  if (spxGold && (spxGold.correlation as number) < -0.3) {
    regimeScore -= 0.3
    signals.push({ signal: 'SPX/Gold diverging', detail: 'Flight to safety active' })
  }

  const rutSpx = findPair('RUT', 'SPX')
  if (rutSpx && (rutSpx.correlation as number) > 0.9) {
    regimeScore += 0.2
    signals.push({ signal: 'Small caps tracking', detail: 'Broad participation' })
  } else if (rutSpx && (rutSpx.correlation as number) < 0.5) {
    regimeScore -= 0.2
    signals.push({ signal: 'Small cap divergence', detail: 'Narrow fragile rally' })
  }

  const hygLqd = findPair('HYG', 'LQD')
  if (hygLqd && (hygLqd.z_score as number) < -1.5) {
    regimeScore -= 0.3
    signals.push({ signal: 'Credit spreads widening', detail: 'Institutional stress detected' })
  }

  if (breakdownRatio > 0.3) {
    signals.push({
      signal: 'Widespread correlation breakdown',
      detail: `${breakdownCount}/${thirtyDayRows.length} pairs abnormal`,
    })
  }

  let overallRegime = 'neutral'
  if (breakdownRatio > 0.3) overallRegime = 'correlation_breakdown'
  else if (regimeScore > 0.3) overallRegime = 'risk_on'
  else if (regimeScore < -0.3) overallRegime = 'risk_off'

  await serviceClient.from('market_regimes').upsert(
    {
      regime_date: new Date().toISOString().split('T')[0],
      overall_regime: overallRegime,
      regime_score: Math.round(regimeScore * 100) / 100,
      signals,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: 'regime_date' },
  )

  return {
    success: true,
    assets_fetched: tickers.length,
    assets_failed: errors.filter(e => !e.includes('insufficient')).length,
    pairs_calculated: cacheRows.length,
    regime: overallRegime,
    errors: errors.length > 0 ? errors : undefined,
  }
}
