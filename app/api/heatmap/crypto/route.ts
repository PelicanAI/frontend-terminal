import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { CRYPTO_TOKENS } from "@/lib/data/crypto-tokens"
import type { HeatmapStock, HeatmapResponse } from "@/app/api/heatmap/route"

export const dynamic = "force-dynamic"

const cryptoHeatmapLimiter = createUserRateLimiter('crypto-heatmap', 30, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

interface PolygonCryptoTicker {
  ticker?: string
  day?: { c?: number; v?: number }
  lastTrade?: { p?: number }
  todaysChangePerc?: number
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await cryptoHeatmapLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Check cache
    const cacheType = 'crypto_heatmap'
    const cacheKey = 'crypto_heatmap'
    const cacheTtl = 60_000 // 24/7 market, always 60s

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
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        })
      }
    }

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ stocks: [], lastUpdated: new Date().toISOString(), timeframe: '1D' } satisfies HeatmapResponse)
    }

    // Build lookup map from Polygon symbol to our token data
    const tokenMap = new Map(CRYPTO_TOKENS.map(t => [t.symbol, t]))

    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers?apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      console.error("Polygon crypto snapshot error:", res.status)
      if (cachedData?.data) {
        return NextResponse.json(cachedData.data, {
          headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", "X-Cache-Status": "stale" },
        })
      }
      return NextResponse.json({ stocks: [], lastUpdated: new Date().toISOString(), timeframe: '1D' } satisfies HeatmapResponse)
    }

    const data = await res.json()
    const stocks: HeatmapStock[] = []

    if (data.tickers && Array.isArray(data.tickers)) {
      for (const t of data.tickers as PolygonCryptoTicker[]) {
        if (!t.ticker) continue
        const token = tokenMap.get(t.ticker)
        if (!token) continue

        const price = t.day?.c || t.lastTrade?.p || null
        if (price === null || price <= 0) continue

        stocks.push({
          ticker: token.displayName,
          name: token.name,
          sector: token.category,
          price,
          changePercent: t.todaysChangePerc ?? null,
          volume: t.day?.v ?? null,
          marketCap: null, // Use volume for treemap sizing
        })
      }
    }

    const responseData: HeatmapResponse = {
      stocks,
      lastUpdated: new Date().toISOString(),
      timeframe: '1D',
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
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    })
  } catch (error) {
    console.error("Crypto heatmap API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
