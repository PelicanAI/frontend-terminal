import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const sparklineLimiter = createUserRateLimiter('market-sparklines', 30, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY
const MAX_TICKERS = 10

interface PolygonAggResult {
  c: number // close
}

interface PolygonAggResponse {
  results?: PolygonAggResult[]
  resultsCount?: number
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDateRange(): { from: string; to: string } {
  const now = new Date()
  const to = formatDate(now)

  // Go back ~9 calendar days to ensure 5 business days of data
  const from = new Date(now)
  from.setDate(from.getDate() - 9)

  return { from: formatDate(from), to }
}

async function fetchTickerSparkline(
  ticker: string,
  from: string,
  to: string
): Promise<number[]> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Polygon API error for ${ticker}: ${response.status}`)
  }

  const data: PolygonAggResponse = await response.json()

  if (!data.results || data.results.length === 0) {
    return []
  }

  return data.results.map((r) => r.c)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await sparklineLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const tickersParam = request.nextUrl.searchParams.get('tickers')
    if (!tickersParam) {
      return NextResponse.json(
        { error: 'Missing tickers parameter' },
        { status: 400 }
      )
    }

    const tickers = tickersParam
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_TICKERS)

    if (tickers.length === 0) {
      return NextResponse.json({ sparklines: {} })
    }

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ sparklines: {} })
    }

    const { from, to } = getDateRange()

    const results = await Promise.allSettled(
      tickers.map((ticker) => fetchTickerSparkline(ticker, from, to))
    )

    const sparklines: Record<string, number[]> = {}

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const ticker = tickers[i]
      if (result && ticker && result.status === 'fulfilled' && result.value.length > 0) {
        sparklines[ticker] = result.value
      }
    }

    return NextResponse.json(
      { sparklines },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    logger.error('Sparklines API error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
