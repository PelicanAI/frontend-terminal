/**
 * /api/candles — Polygon aggregates proxy for the /desk K-line chart.
 *
 * Required env: POLYGON_API_KEY (see .env.example for setup instructions).
 * Returns 503 with a hint when the key is missing.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const candleLimiter = createUserRateLimiter('candles', 30, '1 m')
const POLYGON_API_KEY = process.env.POLYGON_API_KEY

type Timespan = 'minute' | 'hour' | 'day' | 'week'

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

const VALID_TIMESPANS = new Set<Timespan>(['minute', 'hour', 'day', 'week'])
const VALID_MULTIPLIERS = new Set(['1', '4', '5', '15', '30'])

function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
}

function isValidTicker(ticker: string): boolean {
  // Allow stocks (AAPL), forex (C:EURUSD), crypto (X:BTCUSD)
  return /^[A-Z0-9.:]{1,20}$/.test(ticker)
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Compute a sensible default { from, to } window for a Polygon aggregate
 * request based on the requested timespan + multiplier. Used when the caller
 * (dataloader) omits explicit from/to. Windows are tuned wide enough to
 * survive weekends/holidays without going so far back that Polygon truncates
 * minute bars at the 50,000-row limit.
 */
function computeDateRange(timespan: Timespan, multiplier: string): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  const m = Number.parseInt(multiplier, 10) || 1

  if (timespan === 'minute') {
    if (m <= 1) from.setUTCDate(from.getUTCDate() - 5)
    else if (m <= 5) from.setUTCDate(from.getUTCDate() - 30)
    else if (m <= 15) from.setUTCDate(from.getUTCDate() - 90)
    else from.setUTCDate(from.getUTCDate() - 180)
  } else if (timespan === 'hour') {
    if (m <= 1) from.setUTCFullYear(from.getUTCFullYear() - 1)
    else from.setUTCFullYear(from.getUTCFullYear() - 2)
  } else if (timespan === 'day') {
    from.setUTCFullYear(from.getUTCFullYear() - 5)
  } else {
    // week
    from.setUTCFullYear(from.getUTCFullYear() - 20)
  }

  return { from: formatUtcDate(from), to: formatUtcDate(to) }
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
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const timespan = searchParams.get('timespan') as Timespan | null
    const multiplier = searchParams.get('multiplier') ?? '1'

    if (!ticker || !isValidTicker(ticker)) {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 })
    }
    if (!timespan || !VALID_TIMESPANS.has(timespan)) {
      return NextResponse.json({ error: "Invalid timespan. Use minute, hour, day, or week." }, { status: 400 })
    }
    if (!VALID_MULTIPLIERS.has(multiplier)) {
      return NextResponse.json(
        { error: "Invalid multiplier. Use 1, 4, 5, 15, or 30." },
        { status: 400 }
      )
    }
    // from/to are optional. When provided, both must be valid YYYY-MM-DD.
    // When omitted, the server computes a timespan-aware window.
    const explicitRange = fromParam !== null || toParam !== null
    if (explicitRange) {
      if (!fromParam || !toParam || !isValidDate(fromParam) || !isValidDate(toParam)) {
        return NextResponse.json(
          { error: "Invalid date range. Use YYYY-MM-DD format for both from and to, or omit both for defaults." },
          { status: 400 }
        )
      }
    }
    const { from, to } = explicitRange
      ? { from: fromParam as string, to: toParam as string }
      : computeDateRange(timespan, multiplier)

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        {
          error: "POLYGON_API_KEY not configured",
          hint: "Set POLYGON_API_KEY in .env.local (local) or Vercel env (prod). Restart dev server after setting.",
        },
        { status: 503 }
      )
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
    logger.error("Candles API error", error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
