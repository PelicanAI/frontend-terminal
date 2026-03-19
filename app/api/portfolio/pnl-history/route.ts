import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const pnlHistoryLimiter = createUserRateLimiter('portfolio-pnl-history', 10, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

const VALID_ASSET_TYPES = ['stock', 'etf', 'option', 'crypto', 'forex', 'future', 'other'] as const
const VALID_DIRECTIONS = ['long', 'short'] as const
const TICKER_REGEX = /^[A-Z.:]{1,20}$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/

interface PositionInput {
  ticker: string
  asset_type: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  entry_date: string
}

interface PolygonBar {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

function validatePosition(pos: unknown, index: number): string | null {
  if (!pos || typeof pos !== 'object') return `Position ${index}: must be an object`
  const p = pos as Record<string, unknown>

  if (typeof p.ticker !== 'string' || !TICKER_REGEX.test(p.ticker))
    return `Position ${index}: ticker must match ${TICKER_REGEX}`

  // Coerce numeric strings (Supabase numeric columns may return strings)
  const qty = typeof p.quantity === 'string' ? Number(p.quantity) : p.quantity
  if (typeof qty !== 'number' || qty <= 0 || !isFinite(qty))
    return `Position ${index}: quantity must be a positive number`
  p.quantity = qty

  const price = typeof p.entry_price === 'string' ? Number(p.entry_price) : p.entry_price
  if (typeof price !== 'number' || price <= 0 || !isFinite(price))
    return `Position ${index}: entry_price must be a positive number`
  p.entry_price = price

  if (typeof p.entry_date !== 'string' || !DATE_REGEX.test(p.entry_date))
    return `Position ${index}: entry_date must match YYYY-MM-DD`
  if (typeof p.asset_type !== 'string' || !VALID_ASSET_TYPES.includes(p.asset_type as typeof VALID_ASSET_TYPES[number]))
    return `Position ${index}: asset_type must be one of ${VALID_ASSET_TYPES.join(', ')}`
  if (typeof p.direction !== 'string' || !VALID_DIRECTIONS.includes(p.direction as typeof VALID_DIRECTIONS[number]))
    return `Position ${index}: direction must be 'long' or 'short'`

  return null
}

function getPolygonTicker(ticker: string, assetType: string): string {
  switch (assetType) {
    case 'crypto': return ticker.startsWith('X:') ? ticker : `X:${ticker}`
    case 'forex':  return ticker.startsWith('C:') ? ticker : `C:${ticker}`
    default:       return ticker
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await pnlHistoryLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
    }

    const { positions }: { positions: unknown[] } = await request.json()

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json({ error: 'No positions provided' }, { status: 400 })
    }

    if (positions.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 positions' }, { status: 400 })
    }

    // Validate each position
    for (let i = 0; i < positions.length; i++) {
      const validationError = validatePosition(positions[i], i)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
    }

    const validatedPositions = positions as PositionInput[]

    // Date range: earliest entry date to today
    const today = new Date().toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const earliestEntry = validatedPositions.reduce((min, p) => {
      const d = p.entry_date.slice(0, 10)
      return d < min ? d : min
    }, today)
    const fromDate = earliestEntry > thirtyDaysAgo ? thirtyDaysAgo : earliestEntry

    // Fetch daily candles for each ticker in parallel
    const candlePromises = validatedPositions.map(async (pos) => {
      const polygonTicker = getPolygonTicker(pos.ticker, pos.asset_type)
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(polygonTicker)}/range/1/day/${fromDate}/${today}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`

      try {
        const res = await fetch(url)
        if (!res.ok) return { ticker: pos.ticker, bars: [] as PolygonBar[] }
        const data = await res.json()
        return { ticker: pos.ticker, bars: (data.results ?? []) as PolygonBar[] }
      } catch {
        return { ticker: pos.ticker, bars: [] as PolygonBar[] }
      }
    })

    const candleResults = await Promise.all(candlePromises)

    // Build a map: ticker → date → close price
    const priceMap = new Map<string, Map<string, number>>()
    for (const { ticker, bars } of candleResults) {
      const dateMap = new Map<string, number>()
      for (const bar of bars) {
        const date = new Date(bar.t).toISOString().slice(0, 10)
        dateMap.set(date, bar.c)
      }
      priceMap.set(ticker, dateMap)
    }

    // Collect all unique dates across all tickers, sorted
    const allDates = new Set<string>()
    for (const dateMap of priceMap.values()) {
      for (const date of dateMap.keys()) {
        allDates.add(date)
      }
    }
    const sortedDates = Array.from(allDates).sort()

    // For each date, compute combined unrealized P&L
    const pnlHistory: Array<{ date: string; total_pnl: number; positions: Record<string, number> }> = []
    for (const date of sortedDates) {
      let totalPnl = 0
      const positionPnls: Record<string, number> = {}

      for (const pos of validatedPositions) {
        const entryDate = pos.entry_date.slice(0, 10)
        if (date < entryDate) continue

        const closePrice = priceMap.get(pos.ticker)?.get(date)
        if (closePrice == null) continue

        const dirMultiplier = pos.direction === 'long' ? 1 : -1
        const unrealized = (closePrice - pos.entry_price) * pos.quantity * dirMultiplier
        totalPnl += unrealized
        positionPnls[pos.ticker] = unrealized
      }

      if (Object.keys(positionPnls).length > 0) {
        pnlHistory.push({
          date,
          total_pnl: Math.round(totalPnl * 100) / 100,
          positions: positionPnls,
        })
      }
    }

    return NextResponse.json(
      { pnl_history: pnlHistory },
      { headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('[portfolio-pnl-history] error:', error)
    const message = process.env.NODE_ENV === 'production'
      ? 'Failed to compute P&L history'
      : `Error: ${error instanceof Error ? error.message : String(error)}`
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
