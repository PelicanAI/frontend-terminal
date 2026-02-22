import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const calendarLimiter = createUserRateLimiter('economic_calendar', 20, '1 m')

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

export interface EconomicEvent {
  event: string
  country: string
  date: string       // "2026-02-13"
  time: string       // "08:30" or ""
  impact: "low" | "medium" | "high"
  actual: number | null
  estimate: number | null
  prior: number | null
  unit: string       // "%" or ""
}

export interface EconomicCalendarResponse {
  events: EconomicEvent[]
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await calendarLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0]
    const to = searchParams.get('to') || (() => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      return d.toISOString().split('T')[0]
    })()

    // Check cache
    const cacheKey = `economic_${from}_${to}`
    const { data: cachedData } = await supabase
      .from('cached_market_data')
      .select('data, fetched_at')
      .eq('data_type', 'economic_calendar')
      .eq('cache_key', cacheKey)
      .is('user_id', null)
      .single()

    if (cachedData?.fetched_at) {
      const cacheAge = Date.now() - new Date(cachedData.fetched_at).getTime()
      if (cacheAge < 3600_000) {
        return NextResponse.json(cachedData.data, {
          headers: { "Cache-Control": "public, s-maxage=3600" },
        })
      }
    }

    if (!FINNHUB_API_KEY) {
      return NextResponse.json({ events: [], lastUpdated: new Date().toISOString() })
    }

    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      console.error("Finnhub economic error:", response.status, response.statusText)
      if (cachedData?.data) return NextResponse.json(cachedData.data)
      return NextResponse.json({ events: [], lastUpdated: new Date().toISOString() })
    }

    interface FinnhubEconomicEvent {
      event?: string
      indicator?: string
      country?: string
      date?: string
      time?: string
      impact?: number | string
      actual?: number | null
      estimate?: number | null
      prior?: number | null
      prev?: number | null
      unit?: string
    }

    interface FinnhubEconomicResponse {
      economicCalendar?: FinnhubEconomicEvent[] | { result?: FinnhubEconomicEvent[] }
      result?: FinnhubEconomicEvent[]
    }

    const data: FinnhubEconomicResponse = await response.json()

    // Handle nested response structure - Finnhub may return:
    // { economicCalendar: [...] } OR
    // { economicCalendar: { result: [...] } } OR
    // { result: [...] }
    let rawEvents: FinnhubEconomicEvent[] = []
    if (data.economicCalendar) {
      if (Array.isArray(data.economicCalendar)) {
        rawEvents = data.economicCalendar
      } else if (data.economicCalendar && typeof data.economicCalendar === 'object' && 'result' in data.economicCalendar) {
        rawEvents = (data.economicCalendar as { result?: FinnhubEconomicEvent[] }).result || []
      }
    } else if (data.result && Array.isArray(data.result)) {
      rawEvents = data.result
    }

    const RELEVANT_COUNTRIES = ['US', 'UNITED STATES', 'EU', 'GB', 'UNITED KINGDOM', 'JP', 'JAPAN', 'AU', 'AUSTRALIA', 'CA', 'CANADA', 'NZ', 'NEW ZEALAND', 'CH', 'SWITZERLAND', 'DE', 'GERMANY', 'FR', 'FRANCE']
    const COUNTRY_NORMALIZE: Record<string, string> = {
      'UNITED STATES': 'US', 'UNITED KINGDOM': 'GB', 'JAPAN': 'JP',
      'AUSTRALIA': 'AU', 'CANADA': 'CA', 'NEW ZEALAND': 'NZ',
      'SWITZERLAND': 'CH', 'GERMANY': 'DE', 'FRANCE': 'FR',
    }

    const mappedEvents = rawEvents
      .filter((e) => {
        const country = (e.country || '').toUpperCase()
        if (!RELEVANT_COUNTRIES.includes(country)) return false
        // Filter out low impact events to reduce noise
        const impact = typeof e.impact === 'number'
          ? (e.impact === 3 ? 'high' : e.impact === 2 ? 'medium' : 'low')
          : ((e.impact || 'low').toLowerCase())
        return impact !== 'low'
      })
      .map((e) => {
        const rawCountry = (e.country || '').toUpperCase()
        const country = COUNTRY_NORMALIZE[rawCountry] || rawCountry

        return {
          event: e.event || e.indicator || '',
          country,
          date: e.date || from || new Date().toISOString().split('T')[0],
          time: e.time || '',
          impact: (typeof e.impact === 'number'
            ? (e.impact === 3 ? 'high' : e.impact === 2 ? 'medium' : 'low')
            : ((e.impact || 'low').toLowerCase())) as 'low' | 'medium' | 'high',
          actual: e.actual ?? null,
          estimate: e.estimate ?? null,
          prior: e.prior ?? e.prev ?? null,
          unit: e.unit || '',
        }
      })

    const events: EconomicEvent[] = mappedEvents as EconomicEvent[]

    const responseData: EconomicCalendarResponse = {
      events,
      lastUpdated: new Date().toISOString(),
    }

    // Cache
    await supabase
      .from('cached_market_data')
      .upsert({
        data_type: 'economic_calendar',
        data: responseData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        user_id: null,
        cache_key: cacheKey,
      }, { onConflict: 'data_type,cache_key' })

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    })
  } catch (error) {
    console.error("Economic calendar error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
