import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const moversLimiter = createUserRateLimiter('movers', 30, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

export interface Mover {
  ticker: string
  name: string
  price: number
  changePercent: number
  volume: number
}

export interface MoversResponse {
  gainers: Mover[]
  losers: Mover[]
  active: Mover[]
}

function dedupeByTicker(movers: Mover[]): Mover[] {
  const seen = new Set<string>()
  return movers.filter(m => {
    if (seen.has(m.ticker)) return false
    seen.add(m.ticker)
    return true
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await moversLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    // Check cache first
    const { data: cachedData } = await supabase
      .from('cached_market_data')
      .select('data, fetched_at')
      .eq('data_type', 'top_movers')
      .is('user_id', null)
      .single()

    if (cachedData?.fetched_at) {
      const cacheAge = Date.now() - new Date(cachedData.fetched_at).getTime()
      if (cacheAge < 300_000) { // 5 minutes
        return NextResponse.json(cachedData.data, {
          headers: { "Cache-Control": "public, s-maxage=300" },
        })
      }
    }

    if (!POLYGON_API_KEY) {
      return NextResponse.json({
        gainers: [],
        losers: [],
        active: [],
      })
    }

    // Fetch gainers, losers, and most active from Polygon
    const [gainersRes, losersRes, activeRes] = await Promise.all([
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${POLYGON_API_KEY}`),
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apiKey=${POLYGON_API_KEY}`),
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?sort=volume&limit=10&apiKey=${POLYGON_API_KEY}`),
    ])

    if (!gainersRes.ok || !losersRes.ok || !activeRes.ok) {
      console.error("Polygon movers API error:", gainersRes.status, losersRes.status, activeRes.status)
      // Return stale cache if available
      if (cachedData?.data) {
        return NextResponse.json(cachedData.data)
      }
      // Fall through to S&P 500 cache below — don't 502 if we can build from heatmap data
    }

    // If Polygon calls succeeded, parse them; otherwise use empty arrays
    const polygonOk = gainersRes.ok && losersRes.ok && activeRes.ok

    interface PolygonTicker {
      ticker: string
      name?: string
      todaysChangePerc?: number
      day?: { c?: number; v?: number }
      lastTrade?: { p?: number }
    }

    const [gainersData, losersData, activeData]: Array<{ tickers?: PolygonTicker[] }> = polygonOk
      ? await Promise.all([
          gainersRes.json(),
          losersRes.json(),
          activeRes.json(),
        ])
      : [{ tickers: [] }, { tickers: [] }, { tickers: [] }]

    const mapMover = (ticker: PolygonTicker): Mover => ({
      ticker: ticker.ticker,
      name: ticker.name || ticker.ticker,
      price: ticker.lastTrade?.p ?? ticker.day?.c ?? 0,
      changePercent: ticker.todaysChangePerc ?? 0,
      volume: ticker.day?.v ?? 0,
    })

    const gainers = (gainersData?.tickers || []).map(mapMover)
    const losers = (losersData?.tickers || []).map(mapMover)

    // Supplement with S&P 500 data for large-cap price tiers
    const { data: sp500Cache } = await supabase
      .from('cached_market_data')
      .select('data, fetched_at')
      .eq('data_type', 'sp500_prices_1D')
      .is('user_id', null)
      .single()

    let sp500Movers: Mover[] = []
    if (sp500Cache?.data) {
      interface HeatmapStock {
        ticker: string
        name: string
        price: number | null
        changePercent: number | null
        volume: number | null
      }

      const heatmapData = sp500Cache.data as { stocks?: HeatmapStock[] }
      sp500Movers = (heatmapData.stocks || [])
        .filter((s) => s.price != null && s.price > 0 && s.changePercent != null && s.changePercent !== 0)
        .map((s) => ({
          ticker: s.ticker,
          name: s.name || s.ticker,
          price: s.price!,
          changePercent: s.changePercent!,
          volume: s.volume || 0,
        }))
    }

    // Merge: Polygon movers (small/mid cap) + S&P 500 (large cap)
    const allGainers = dedupeByTicker([
      ...sp500Movers.filter(m => m.changePercent > 0),
      ...gainers,
    ]).sort((a, b) => b.changePercent - a.changePercent)

    const allLosers = dedupeByTicker([
      ...sp500Movers.filter(m => m.changePercent < 0),
      ...losers,
    ]).sort((a, b) => a.changePercent - b.changePercent)

    const response: MoversResponse = {
      gainers: allGainers,
      losers: allLosers,
      active: (activeData?.tickers || []).slice(0, 10).map(mapMover),
    }

    // Cache the response
    await supabase
      .from('cached_market_data')
      .upsert({
        data_type: 'top_movers',
        data: response,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300_000).toISOString(),
        user_id: null,
        cache_key: 'daily_movers',
      }, {
        onConflict: 'data_type,cache_key',
      })

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    })
  } catch (error) {
    console.error("Movers API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
