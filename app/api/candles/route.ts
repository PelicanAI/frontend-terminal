import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const candleLimiter = createUserRateLimiter('candles', 30, '1 m')
const POLYGON_API_KEY = process.env.POLYGON_API_KEY

type Timespan = 'minute' | 'hour' | 'day'

interface PolygonBar {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface PolygonAggsResponse {
  results?: PolygonBar[]
  status?: string
  resultsCount?: number
}

const VALID_TIMESPANS = new Set<Timespan>(['minute', 'hour', 'day'])
const VALID_MULTIPLIERS = new Set(['1', '5', '15'])

function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
}

function isValidTicker(ticker: string): boolean {
  // Allow stocks (AAPL), forex (C:EURUSD), crypto (X:BTCUSD)
  return /^[A-Z0-9.:]{1,20}$/.test(ticker)
}

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Rate limit
    const { success } = await candleLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // 3. Parse and validate params
    const { searchParams } = request.nextUrl
    const ticker = searchParams.get('ticker')?.toUpperCase()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const timespan = searchParams.get('timespan') as Timespan | null
    const multiplier = searchParams.get('multiplier') ?? '1'

    if (!ticker || !isValidTicker(ticker)) {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 })
    }
    if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
      return NextResponse.json({ error: "Invalid date range. Use YYYY-MM-DD format." }, { status: 400 })
    }
    if (!timespan || !VALID_TIMESPANS.has(timespan)) {
      return NextResponse.json({ error: "Invalid timespan. Use minute, hour, or day." }, { status: 400 })
    }
    if (!VALID_MULTIPLIERS.has(multiplier)) {
      return NextResponse.json({ error: "Invalid multiplier. Use 1, 5, or 15." }, { status: 400 })
    }

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ error: "Market data unavailable" }, { status: 503 })
    }

    // 4. Fetch from Polygon
    const encodedTicker = encodeURIComponent(ticker)
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodedTicker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`

    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json(
        { error: `Market data error (${res.status})` },
        { status: 502 }
      )
    }

    const data: PolygonAggsResponse = await res.json()

    // 5. Map results
    const candles = (data.results ?? []).map((bar) => ({
      t: bar.t,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
    }))

    // Historical data is immutable -- cache aggressively
    const isHistorical = new Date(to) < new Date(new Date().toISOString().slice(0, 10))
    const maxAge = isHistorical ? 86400 : 300

    return NextResponse.json(
      { candles, ticker, timespan, multiplier, from, to },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        },
      }
    )
  } catch (error) {
    console.error("Candles API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
