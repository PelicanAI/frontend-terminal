import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

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

interface TickerWithType {
  ticker: string
  assetType: string
}

function parseTickersParam(tickersParam: string): TickerWithType[] {
  // Format: "AAPL:stock,BTCUSD:crypto,EURUSD:forex" or just "AAPL,MSFT" (default to stock)
  return tickersParam.split(',').map(item => {
    const parts = item.trim().split(':')
    const ticker = parts[0] || ''
    const assetType = parts[1] || 'stock'
    return { ticker: ticker.toUpperCase(), assetType }
  })
}

function getPolygonTicker(ticker: string, assetType: string): string {
  switch (assetType) {
    case 'crypto':
      return ticker.startsWith('X:') ? ticker : `X:${ticker}`
    case 'forex':
      return ticker.startsWith('C:') ? ticker : `C:${ticker}`
    default:
      return ticker
  }
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
    const tickersParam = searchParams.get('tickers')

    if (!tickersParam) {
      return NextResponse.json({ error: 'tickers parameter required' }, { status: 400 })
    }

    const tickersWithTypes = parseTickersParam(tickersParam).slice(0, 50)

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
    }

    try {
      const quotes: Record<string, Quote> = {}

      // Group tickers by asset type for efficient API calls
      const tickersByType: Record<string, string[]> = {}
      const tickerToOriginal: Record<string, string> = {}

      for (const { ticker, assetType } of tickersWithTypes) {
        if (!tickersByType[assetType]) {
          tickersByType[assetType] = []
        }
        const polygonTicker = getPolygonTicker(ticker, assetType)
        tickersByType[assetType].push(polygonTicker)
        tickerToOriginal[polygonTicker] = ticker
      }

      // Fetch stocks
      if (tickersByType['stock']?.length) {
        const stockTickers = tickersByType['stock']
        const response = await fetch(
          `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${stockTickers.join(',')}&apiKey=${POLYGON_API_KEY}`,
          { next: { revalidate: 30 } }
        )

        if (response.ok) {
          const data = await response.json()
          for (const ticker of data.tickers || []) {
            const day = ticker.day || {}
            const prevDay = ticker.prevDay || {}
            const lastTrade = ticker.lastTrade || {}
            const currentPrice = lastTrade.p || day.c || prevDay.c

            if (currentPrice) {
              const prevClose = prevDay.c || currentPrice
              const originalTicker = tickerToOriginal[ticker.ticker] || ticker.ticker
              quotes[originalTicker] = {
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
        }
      }

      // Fetch crypto
      if (tickersByType['crypto']?.length) {
        const cryptoTickers = tickersByType['crypto']
        const response = await fetch(
          `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers?tickers=${cryptoTickers.join(',')}&apiKey=${POLYGON_API_KEY}`,
          { next: { revalidate: 30 } }
        )

        if (response.ok) {
          const data = await response.json()
          for (const ticker of data.tickers || []) {
            const day = ticker.day || {}
            const prevDay = ticker.prevDay || {}
            const lastTrade = ticker.lastTrade || {}
            const currentPrice = lastTrade.p || day.c || prevDay.c

            if (currentPrice) {
              const prevClose = prevDay.c || currentPrice
              const originalTicker = tickerToOriginal[ticker.ticker] || ticker.ticker.replace('X:', '')
              quotes[originalTicker] = {
                price: currentPrice,
                change: currentPrice - prevClose,
                changePercent: prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
                dayHigh: day.h,
                dayLow: day.l,
                volume: day.v || 0,
                prevClose,
                updatedAt: new Date(ticker.updated / 1e6).toISOString(),
              }
            }
          }
        }
      }

      // Fetch forex
      if (tickersByType['forex']?.length) {
        const forexTickers = tickersByType['forex']
        const response = await fetch(
          `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?tickers=${forexTickers.join(',')}&apiKey=${POLYGON_API_KEY}`,
          { next: { revalidate: 30 } }
        )

        if (response.ok) {
          const data = await response.json()
          for (const ticker of data.tickers || []) {
            const day = ticker.day || {}
            const prevDay = ticker.prevDay || {}
            const lastTrade = ticker.lastTrade || {}
            const currentPrice = lastTrade.p || day.c || prevDay.c

            if (currentPrice) {
              const prevClose = prevDay.c || currentPrice
              const originalTicker = tickerToOriginal[ticker.ticker] || ticker.ticker.replace('C:', '')
              quotes[originalTicker] = {
                price: currentPrice,
                change: currentPrice - prevClose,
                changePercent: prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
                dayHigh: day.h,
                dayLow: day.l,
                volume: day.v || 0,
                prevClose,
                updatedAt: new Date(ticker.updated / 1e6).toISOString(),
              }
            }
          }
        }
      }

      return NextResponse.json({ quotes })
    } catch (error) {
      logger.error('Market quotes error', error instanceof Error ? error : undefined)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }
  } catch (error) {
    logger.error('Market quotes API error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
