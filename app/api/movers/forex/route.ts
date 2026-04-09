import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const forexLimiter = createUserRateLimiter('forex-movers', 30, '1 m')
const POLYGON_API_KEY = process.env.POLYGON_API_KEY

// Major currencies to keep — filter out obscure pairs
const KNOWN_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
  'MXN', 'ZAR', 'TRY', 'BRL', 'SGD', 'HKD', 'SEK', 'NOK',
  'DKK', 'PLN', 'CZK', 'HUF', 'INR', 'CNH', 'KRW',
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await forexLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ tickers: [] })
    }

    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      logger.error('Polygon forex API error', undefined, { status: res.status })
      return NextResponse.json({ tickers: [] }, { status: 502 })
    }

    const data = await res.json()

    interface PolygonForexTicker {
      ticker?: string
      day?: { c?: number; v?: number }
      lastTrade?: { p?: number }
      todaysChangePerc?: number
      min?: { c?: number }
    }

    const tickers = (data.tickers || [])
      .filter((t: PolygonForexTicker) => {
        if (!t.ticker?.startsWith('C:')) return false
        const pair = t.ticker.replace('C:', '')
        const base = pair.slice(0, 3)
        const quote = pair.slice(3)
        return KNOWN_CURRENCIES.includes(base) && KNOWN_CURRENCIES.includes(quote)
      })
      .map((t: PolygonForexTicker) => {
        const pair = (t.ticker || '').replace('C:', '')
        const base = pair.slice(0, 3)
        const quote = pair.slice(3)
        // Forex uses bid/ask midpoint; day close or last trade price
        const price = t.day?.c || t.lastTrade?.p || t.min?.c || 0
        return {
          ticker: pair,
          name: `${base}/${quote}`,
          price,
          changePercent: t.todaysChangePerc || 0,
          volume: t.day?.v || 0,
        }
      })
      .filter((t: { price: number }) => t.price > 0)
      .sort((a: { changePercent: number }, b: { changePercent: number }) =>
        Math.abs(b.changePercent) - Math.abs(a.changePercent)
      )

    return NextResponse.json({ tickers }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    logger.error('Forex movers error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error', tickers: [] }, { status: 500 })
  }
}
