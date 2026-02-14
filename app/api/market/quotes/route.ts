import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const quotesLimiter = createUserRateLimiter('market-quotes', 60, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

export interface Quote {
  price: number
  change: number
  changePercent: number
  dayHigh?: number
  dayLow?: number
  volume?: number
  prevClose?: number
  updatedAt?: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await quotesLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const { searchParams } = request.nextUrl
    const tickers = searchParams.get('tickers')

    if (!tickers) {
      return NextResponse.json({ error: 'tickers parameter required' }, { status: 400 })
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).slice(0, 50)

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
    }

    try {
      // Use Polygon's snapshot endpoint for multiple tickers
      // This is 1 API call regardless of how many tickers
      const response = await fetch(
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerList.join(',')}&apiKey=${POLYGON_API_KEY}`,
        { next: { revalidate: 30 } } // Cache for 30 seconds
      )

      if (!response.ok) {
        // Fallback: try individual previous close endpoints
        const quotes: Record<string, Quote> = {}

        for (const ticker of tickerList.slice(0, 10)) {
          try {
            const prevClose = await fetch(
              `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`,
              { next: { revalidate: 60 } }
            )
            if (prevClose.ok) {
              const data = await prevClose.json()
              const result = data.results?.[0]
              if (result) {
                quotes[ticker] = {
                  price: result.c, // close price
                  change: result.c - result.o,
                  changePercent: ((result.c - result.o) / result.o) * 100,
                }
              }
            }
          } catch {
            // Skip failed tickers
          }
        }

        return NextResponse.json({ quotes })
      }

      const data = await response.json()
      const quotes: Record<string, Quote> = {}

      for (const ticker of data.tickers || []) {
        const day = ticker.day || {}
        const prevDay = ticker.prevDay || {}
        const lastTrade = ticker.lastTrade || {}
        const currentPrice = lastTrade.p || day.c || prevDay.c

        if (currentPrice) {
          const prevClose = prevDay.c || currentPrice
          quotes[ticker.ticker] = {
            price: currentPrice,
            change: currentPrice - prevClose,
            changePercent: prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
            dayHigh: day.h || currentPrice,
            dayLow: day.l || currentPrice,
            volume: day.v || 0,
            prevClose,
            updatedAt: new Date(ticker.updated / 1e6).toISOString(),
          }
        }
      }

      return NextResponse.json({ quotes })
    } catch (error) {
      console.error('Market quotes error:', error)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }
  } catch (error) {
    console.error('Market quotes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
