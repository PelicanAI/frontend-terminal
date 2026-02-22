import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { FOREX_PAIRS } from "@/lib/data/forex-pairs"
import type { HeatmapStock, HeatmapResponse } from "@/app/api/heatmap/route"

export const dynamic = "force-dynamic"

const forexHeatmapLimiter = createUserRateLimiter('forex-heatmap', 30, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

interface PolygonForexTicker {
  ticker?: string
  day?: { c?: number; v?: number }
  lastTrade?: { p?: number }
  todaysChangePerc?: number
  min?: { c?: number }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await forexHeatmapLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Check cache
    const cacheType = 'forex_heatmap'
    const cacheKey = 'forex_heatmap'
    const cacheTtl = 60_000

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

    // Build lookup map from Polygon symbol to our pair data
    const pairMap = new Map(FOREX_PAIRS.map(p => [p.symbol, p]))

    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      console.error("Polygon forex snapshot error:", res.status)
      // Return stale cache if available
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
      for (const t of data.tickers as PolygonForexTicker[]) {
        if (!t.ticker) continue
        const pair = pairMap.get(t.ticker)
        if (!pair) continue

        const price = t.day?.c || t.lastTrade?.p || t.min?.c || null
        if (price === null || price <= 0) continue

        stocks.push({
          ticker: pair.displayName,
          name: pair.displayName,
          sector: pair.category,
          price,
          changePercent: t.todaysChangePerc ?? null,
          volume: t.day?.v ?? null,
          marketCap: null, // Forex has no market cap; treemap uses volume for sizing
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
    console.error("Forex heatmap API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
