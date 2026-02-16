import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const earningsLimiter = createUserRateLimiter('earnings', 20, '1 m')

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

export interface EarningsEvent {
  date: string
  symbol: string
  epsActual: number | null
  epsEstimate: number | null
  revenueActual: number | null
  revenueEstimate: number | null
  hour: 'bmo' | 'amc' | 'dmh' | null // before market open, after market close, during market hours
  quarter: number
  year: number
}

export interface EarningsResponse {
  events: EarningsEvent[]
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await earningsLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days

    // Check cache
    const cacheKey = `earnings_${from}_${to}`
    const { data: cachedData } = await supabase
      .from('cached_market_data')
      .select('data, fetched_at')
      .eq('data_type', 'earnings_calendar')
      .eq('cache_key', cacheKey)
      .is('user_id', null)
      .single()

    if (cachedData?.fetched_at) {
      const cacheAge = Date.now() - new Date(cachedData.fetched_at).getTime()
      if (cacheAge < 21600_000) { // 6 hours (was 1 hour)
        return NextResponse.json(cachedData.data, {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
          },
        })
      }
    }

    if (!FINNHUB_API_KEY) {
      return NextResponse.json({
        events: [],
        lastUpdated: new Date().toISOString(),
      })
    }

    // Fetch from Finnhub earnings calendar
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      console.error("Finnhub earnings API error:", response.status)
      // Return stale cache if available
      if (cachedData?.data) {
        return NextResponse.json(cachedData.data)
      }
      return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 502 })
    }

    interface FinnhubEarning {
      date: string
      symbol: string
      epsActual?: number | null
      epsEstimate?: number | null
      revenueActual?: number | null
      revenueEstimate?: number | null
      hour?: string | null
      quarter?: number
      year?: number
    }

    interface FinnhubResponse {
      earningsCalendar?: FinnhubEarning[]
    }

    const data: FinnhubResponse = await response.json()

    const events: EarningsEvent[] = (data.earningsCalendar || []).map((event) => ({
      date: event.date,
      symbol: event.symbol,
      epsActual: event.epsActual ?? null,
      epsEstimate: event.epsEstimate ?? null,
      revenueActual: event.revenueActual ?? null,
      revenueEstimate: event.revenueEstimate ?? null,
      hour: (event.hour?.toLowerCase() === 'bmo' ? 'bmo' :
             event.hour?.toLowerCase() === 'amc' ? 'amc' :
             event.hour?.toLowerCase() === 'dmh' ? 'dmh' : null) as 'bmo' | 'amc' | 'dmh' | null,
      quarter: event.quarter ?? 0,
      year: event.year ?? new Date().getFullYear(),
    }))

    const responseData: EarningsResponse = {
      events,
      lastUpdated: new Date().toISOString(),
    }

    // Cache the response (6 hours)
    await supabase
      .from('cached_market_data')
      .upsert({
        data_type: 'earnings_calendar',
        data: responseData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 21600_000).toISOString(), // 6 hours
        user_id: null,
        cache_key: cacheKey,
      }, {
        onConflict: 'data_type,cache_key',
      })

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
      },
    })
  } catch (error) {
    console.error("Earnings API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
