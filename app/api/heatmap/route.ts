import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { getAllTickers } from "@/lib/data/sp500-constituents"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const heatmapLimiter = createUserRateLimiter('heatmap', 30, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

export type HeatmapTimeframe = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y'

export interface HeatmapStock {
  ticker: string
  name: string
  sector: string
  price: number | null
  changePercent: number | null
  volume: number | null
  marketCap: number | null
}

export interface HeatmapResponse {
  stocks: HeatmapStock[]
  lastUpdated: string
  timeframe: HeatmapTimeframe
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function getDateRange(tf: HeatmapTimeframe): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)

  switch (tf) {
    case '1W': return { from: daysAgo(7), to }
    case '1M': return { from: daysAgo(30), to }
    case '3M': return { from: daysAgo(90), to }
    case 'YTD': return { from: `${now.getFullYear()}-01-01`, to }
    case '1Y': return { from: daysAgo(365), to }
    default: return { from: to, to }
  }
}

const VALID_TIMEFRAMES = new Set<HeatmapTimeframe>(['1D', '1W', '1M', '3M', 'YTD', '1Y'])

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await heatmapLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const tfParam = request.nextUrl.searchParams.get('timeframe') ?? '1D'
    const timeframe: HeatmapTimeframe = VALID_TIMEFRAMES.has(tfParam as HeatmapTimeframe) ? tfParam as HeatmapTimeframe : '1D'

    // Cache key includes timeframe
    const cacheKey = `sp500_heatmap_${timeframe}`
    const cacheType = `sp500_prices_${timeframe}`
    // Non-1D data changes slowly — cache longer
    const cacheTtl = timeframe === '1D' ? 60_000 : 300_000

    // Check cached data first
    const { data: cachedData } = await supabase
      .from('cached_market_data')
      .select('data, fetched_at')
      .eq('data_type', cacheType)
      .is('user_id', null)
      .single()

    if (cachedData?.fetched_at) {
      const cacheAge = Date.now() - new Date(cachedData.fetched_at).getTime()
      if (cacheAge < cacheTtl) {
        return NextResponse.json(cachedData.data, {
          headers: {
            "Cache-Control": `public, s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl / 500)}`,
          },
        })
      }
    }

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ stocks: [], lastUpdated: new Date().toISOString(), timeframe } satisfies HeatmapResponse)
    }

    const tickers = getAllTickers()
    const { SP500_CONSTITUENTS } = await import('@/lib/data/sp500-constituents')

    let stocks: HeatmapStock[]

    if (timeframe === '1D') {
      stocks = await fetch1DSnapshot(tickers, SP500_CONSTITUENTS)
    } else {
      stocks = await fetchPeriodChange(tickers, SP500_CONSTITUENTS, timeframe)
    }

    // If Polygon failed, try returning stale cache
    if (stocks.length === 0 && cachedData?.data) {
      return NextResponse.json(cachedData.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Cache-Status": "stale",
        },
      })
    }

    const responseData: HeatmapResponse = {
      stocks,
      lastUpdated: new Date().toISOString(),
      timeframe,
    }

    // Cache the response
    await supabase
      .from('cached_market_data')
      .upsert({
        data_type: cacheType,
        data: responseData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + cacheTtl * 5).toISOString(),
        user_id: null,
        cache_key: cacheKey,
      }, {
        onConflict: 'data_type,cache_key',
      })

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": `public, s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl / 500)}`,
      },
    })
  } catch (error) {
    logger.error("Heatmap API error", error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ── 1D: Existing snapshot approach ──────────────────────────────────────────

interface PolygonTickerSnapshot {
  ticker: string
  lastTrade?: { p?: number }
  day?: { c?: number; v?: number }
  todaysChangePerc?: number
  marketCap?: number
}

interface PolygonSnapshotResponse {
  tickers?: PolygonTickerSnapshot[]
  status?: string
}

interface Constituent {
  ticker: string
  name: string
  sector: string
}

async function fetch1DSnapshot(tickers: string[], constituents: Constituent[]): Promise<HeatmapStock[]> {
  const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${POLYGON_API_KEY}`
  const response = await fetch(url)

  if (!response.ok) {
    logger.error("Polygon snapshot error", undefined, { status: response.status })
    return []
  }

  const data: PolygonSnapshotResponse = await response.json()
  const stocks: HeatmapStock[] = []

  if (data.tickers && Array.isArray(data.tickers)) {
    data.tickers.forEach((ticker) => {
      const constituent = constituents.find((c) => c.ticker === ticker.ticker)
      if (!constituent) return

      stocks.push({
        ticker: ticker.ticker,
        name: constituent.name,
        sector: constituent.sector,
        price: ticker.lastTrade?.p ?? ticker.day?.c ?? null,
        changePercent: ticker.todaysChangePerc ?? null,
        volume: ticker.day?.v ?? null,
        marketCap: ticker.marketCap ?? null,
      })
    })
  }

  return stocks
}

// ── Multi-day: Fetch grouped daily bars for start/end dates ─────────────────

interface PolygonGroupedResult {
  T: string  // ticker
  c: number  // close
  v: number  // volume
}

interface PolygonGroupedResponse {
  results?: PolygonGroupedResult[]
}

async function fetchGroupedDaily(date: string): Promise<Map<string, { close: number; volume: number }>> {
  const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`
  const response = await fetch(url)

  if (!response.ok) {
    logger.error("Polygon grouped daily error", undefined, { date, status: response.status })
    return new Map()
  }

  const data: PolygonGroupedResponse = await response.json()
  const map = new Map<string, { close: number; volume: number }>()

  if (data.results) {
    for (const r of data.results) {
      map.set(r.T, { close: r.c, volume: r.v })
    }
  }

  return map
}

async function fetchPeriodChange(tickers: string[], constituents: Constituent[], timeframe: HeatmapTimeframe): Promise<HeatmapStock[]> {
  const { from, to } = getDateRange(timeframe)
  const tickerSet = new Set(tickers)

  // Fetch start and end grouped daily bars (2 API calls total)
  const [startData, endData] = await Promise.all([
    fetchGroupedDaily(from),
    fetchGroupedDaily(to),
  ])

  // If end date has no data (weekend/holiday), walk back up to 3 days
  let endMap = endData
  if (endMap.size === 0) {
    for (let i = 1; i <= 3; i++) {
      endMap = await fetchGroupedDaily(daysAgo(i))
      if (endMap.size > 0) break
    }
  }

  // Same for start date
  let startMap = startData
  if (startMap.size === 0) {
    const fromDate = new Date(from)
    for (let i = 1; i <= 3; i++) {
      const d = new Date(fromDate)
      d.setDate(d.getDate() + i)
      startMap = await fetchGroupedDaily(d.toISOString().slice(0, 10))
      if (startMap.size > 0) break
    }
  }

  const stocks: HeatmapStock[] = []

  for (const constituent of constituents) {
    if (!tickerSet.has(constituent.ticker)) continue

    const start = startMap.get(constituent.ticker)
    const end = endMap.get(constituent.ticker)

    if (!start || !end || start.close === 0) continue

    const changePercent = ((end.close - start.close) / start.close) * 100

    stocks.push({
      ticker: constituent.ticker,
      name: constituent.name,
      sector: constituent.sector,
      price: end.close,
      changePercent,
      volume: end.volume,
      marketCap: null, // Not available from grouped daily
    })
  }

  return stocks
}
