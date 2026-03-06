import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const tickerSearchLimiter = createUserRateLimiter('ticker-search', 60, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

// Static fallback for common tickers when Polygon API is unavailable
const COMMON_TICKERS: TickerSearchResult[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'CS', market: 'stocks', active: true },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', type: 'CS', market: 'stocks', active: true },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'CS', market: 'stocks', active: true },
  { ticker: 'META', name: 'Meta Platforms Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'TSLA', name: 'Tesla Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'AMD', name: 'Advanced Micro Devices Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'NFLX', name: 'Netflix Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF', market: 'stocks', active: true },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', market: 'stocks', active: true },
  { ticker: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', type: 'ETF', market: 'stocks', active: true },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', type: 'ETF', market: 'stocks', active: true },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'ETF', market: 'stocks', active: true },
  { ticker: 'GOOG', name: 'Alphabet Inc. Class C', type: 'CS', market: 'stocks', active: true },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', type: 'CS', market: 'stocks', active: true },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'V', name: 'Visa Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'JNJ', name: 'Johnson & Johnson', type: 'CS', market: 'stocks', active: true },
  { ticker: 'WMT', name: 'Walmart Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'PG', name: 'Procter & Gamble Co.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'MA', name: 'Mastercard Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'HD', name: 'The Home Depot Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'BAC', name: 'Bank of America Corp.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'DIS', name: 'The Walt Disney Company', type: 'CS', market: 'stocks', active: true },
  { ticker: 'INTC', name: 'Intel Corporation', type: 'CS', market: 'stocks', active: true },
  { ticker: 'CSCO', name: 'Cisco Systems Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc.', type: 'CS', market: 'stocks', active: true },
  { ticker: 'ORCL', name: 'Oracle Corporation', type: 'CS', market: 'stocks', active: true },
  // Crypto
  { ticker: 'BTC', name: 'Bitcoin', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'ETH', name: 'Ethereum', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'SOL', name: 'Solana', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'XRP', name: 'Ripple', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'DOGE', name: 'Dogecoin', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'ADA', name: 'Cardano', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'AVAX', name: 'Avalanche', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'LINK', name: 'Chainlink', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'DOT', name: 'Polkadot', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'MATIC', name: 'Polygon', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'ARB', name: 'Arbitrum', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'OP', name: 'Optimism', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'SUI', name: 'Sui', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'APT', name: 'Aptos', type: 'CRYPTO', market: 'crypto', active: true },
  { ticker: 'PEPE', name: 'Pepe', type: 'CRYPTO', market: 'crypto', active: true },
  // Forex
  { ticker: 'EUR/USD', name: 'Euro / US Dollar', type: 'FX', market: 'fx', active: true },
  { ticker: 'GBP/USD', name: 'British Pound / US Dollar', type: 'FX', market: 'fx', active: true },
  { ticker: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'FX', market: 'fx', active: true },
  { ticker: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'FX', market: 'fx', active: true },
  { ticker: 'AUD/USD', name: 'Australian Dollar / US Dollar', type: 'FX', market: 'fx', active: true },
  { ticker: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'FX', market: 'fx', active: true },
  { ticker: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', type: 'FX', market: 'fx', active: true },
  { ticker: 'EUR/GBP', name: 'Euro / British Pound', type: 'FX', market: 'fx', active: true },
  { ticker: 'EUR/JPY', name: 'Euro / Japanese Yen', type: 'FX', market: 'fx', active: true },
  { ticker: 'GBP/JPY', name: 'British Pound / Japanese Yen', type: 'FX', market: 'fx', active: true },
]

export interface TickerSearchResult {
  ticker: string
  name: string
  type: string
  market: string
  active: boolean
}

export interface TickerSearchResponse {
  results: TickerSearchResult[]
  count: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await tickerSearchLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    if (!query || query.length < 1) {
      return NextResponse.json({
        results: [],
        count: 0,
      })
    }

    // No Polygon API key - use static fallback
    if (!POLYGON_API_KEY) {
      const upperQuery = query.toUpperCase()
      const filtered = COMMON_TICKERS.filter(
        t => t.ticker.includes(upperQuery) || t.name.toUpperCase().includes(upperQuery)
      )

      // Sort: exact match first
      filtered.sort((a, b) => {
        const aExact = a.ticker === upperQuery ? 0 : a.ticker.startsWith(upperQuery) ? 1 : 2
        const bExact = b.ticker === upperQuery ? 0 : b.ticker.startsWith(upperQuery) ? 1 : 2
        return aExact - bExact
      })

      const sliced = filtered.slice(0, limit)

      // Allow any 1-5 character uppercase string as a valid ticker
      if (sliced.length === 0 && /^[A-Z]{1,5}$/.test(upperQuery)) {
        sliced.push({
          ticker: upperQuery,
          name: `${upperQuery} (Custom)`,
          type: 'CS',
          market: 'stocks',
          active: true,
        })
      }

      return NextResponse.json({
        results: sliced,
        count: sliced.length,
      })
    }

    // Search using Polygon.io reference tickers endpoint (all markets)
    const url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=${limit}&apiKey=${POLYGON_API_KEY}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error("Polygon.io ticker search error:", response.status)
      // Fallback to static list on API failure
      const upperQuery = query.toUpperCase()
      const filtered = COMMON_TICKERS.filter(
        t => t.ticker.includes(upperQuery) || t.name.toUpperCase().includes(upperQuery)
      )

      // Sort: exact match first
      filtered.sort((a, b) => {
        const aExact = a.ticker === upperQuery ? 0 : a.ticker.startsWith(upperQuery) ? 1 : 2
        const bExact = b.ticker === upperQuery ? 0 : b.ticker.startsWith(upperQuery) ? 1 : 2
        return aExact - bExact
      })

      const sliced = filtered.slice(0, limit)

      // Allow any 1-5 character uppercase string as a valid ticker
      if (sliced.length === 0 && /^[A-Z]{1,5}$/.test(upperQuery)) {
        sliced.push({
          ticker: upperQuery,
          name: `${upperQuery} (Custom)`,
          type: 'CS',
          market: 'stocks',
          active: true,
        })
      }

      return NextResponse.json({
        results: sliced,
        count: sliced.length,
      })
    }

    interface PolygonTickerResult {
      ticker: string
      name: string
      type: string
      market: string
      active: boolean
    }

    interface PolygonTickersResponse {
      results?: PolygonTickerResult[]
      count?: number
      status?: string
    }

    const data: PolygonTickersResponse = await response.json()

    const results: TickerSearchResult[] = (data.results || []).map((ticker) => ({
      ticker: ticker.ticker,
      name: ticker.name,
      type: ticker.type,
      market: ticker.market,
      active: ticker.active,
    }))

    // Merge: static crypto/fx/etf come first, then sort by match quality
    const upperQuery = query.toUpperCase()
    const staticMatches = COMMON_TICKERS.filter(
      t => t.ticker.includes(upperQuery) || t.name.toUpperCase().includes(upperQuery)
    )

    // Static crypto/forex/etf entries always take priority over Polygon stock results
    // because Polygon doesn't serve these markets well
    const priorityStatic = staticMatches.filter(
      s => s.market === 'crypto' || s.market === 'fx'
    )
    const otherStatic = staticMatches.filter(
      s => s.market !== 'crypto' && s.market !== 'fx'
    )

    // Dedup: static priority entries always win, then Polygon results, then other static
    const seen = new Set<string>()
    const merged: TickerSearchResult[] = []

    // 1. Priority static (crypto, forex) — always first
    for (const s of priorityStatic) {
      if (!seen.has(s.ticker)) {
        seen.add(s.ticker)
        merged.push(s)
      }
    }

    // 2. Polygon results — skip if already added from static priority
    for (const r of results) {
      if (!seen.has(r.ticker)) {
        seen.add(r.ticker)
        merged.push(r)
      }
    }

    // 3. Other static matches (stock fallbacks) — fill remaining
    for (const s of otherStatic) {
      if (!seen.has(s.ticker)) {
        seen.add(s.ticker)
        merged.push(s)
      }
    }

    // Sort: exact ticker match first, then starts-with, then contains
    merged.sort((a, b) => {
      const aExact = a.ticker === upperQuery ? 0 : a.ticker.startsWith(upperQuery) ? 1 : 2
      const bExact = b.ticker === upperQuery ? 0 : b.ticker.startsWith(upperQuery) ? 1 : 2
      return aExact - bExact
    })

    const finalResults = merged.slice(0, limit)

    return NextResponse.json(
      {
        results: finalResults,
        count: finalResults.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("Ticker search API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
