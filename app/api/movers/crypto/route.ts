import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const cryptoLimiter = createUserRateLimiter('crypto-movers', 30, '1 m')
const POLYGON_API_KEY = process.env.POLYGON_API_KEY

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await cryptoLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ tickers: [] })
    }

    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers?apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      console.error('Polygon crypto API error:', res.status)
      return NextResponse.json({ tickers: [] }, { status: 502 })
    }

    const data = await res.json()

    interface PolygonCryptoTicker {
      ticker?: string
      day?: { c?: number; v?: number }
      lastTrade?: { p?: number }
      todaysChangePerc?: number
    }

    const tickers = (data.tickers || [])
      .filter((t: PolygonCryptoTicker) => t.ticker?.startsWith('X:') && t.ticker?.endsWith('USD'))
      .map((t: PolygonCryptoTicker) => ({
        ticker: (t.ticker || '').replace('X:', '').replace('USD', ''),
        name: (t.ticker || '').replace('X:', '').replace('USD', ''),
        price: t.day?.c || t.lastTrade?.p || 0,
        changePercent: t.todaysChangePerc || 0,
        volume: t.day?.v || 0,
      }))
      .filter((t: { price: number }) => t.price > 0)
      .sort((a: { changePercent: number }, b: { changePercent: number }) =>
        Math.abs(b.changePercent) - Math.abs(a.changePercent)
      )

    return NextResponse.json({ tickers }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Crypto movers error:', error)
    return NextResponse.json({ error: 'Internal server error', tickers: [] }, { status: 500 })
  }
}
