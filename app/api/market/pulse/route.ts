import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const pulseLimiter = createUserRateLimiter('market-pulse', 60, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

interface PolygonIndexSnapshot {
  ticker: string
  value?: number
  session?: {
    change?: number
    change_percent?: number
  }
}

export interface PulseItem {
  symbol: string
  label: string
  price: number | null
  change: number | null
  changePercent: number | null
}

export interface MarketPulseResponse {
  items: PulseItem[]
  lastUpdated: string
}

const INDEX_MAP: Record<string, { symbol: string; label: string }> = {
  "I:SPX": { symbol: "SPX", label: "S&P 500" },
  "I:COMP": { symbol: "QQQ", label: "Nasdaq" },
  "I:DJI": { symbol: "DJI", label: "Dow" },
  "I:VIX": { symbol: "VIX", label: "VIX" },
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await pulseLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({
        items: Object.values(INDEX_MAP).map(({ symbol, label }) => ({
          symbol, label, price: null, change: null, changePercent: null,
        })),
        lastUpdated: new Date().toISOString(),
      })
    }

    const url = `https://api.polygon.io/v3/snapshot/indices?ticker.any_of=I:SPX,I:COMP,I:DJI,I:VIX&apiKey=${POLYGON_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      logger.error("Polygon pulse API error", undefined, { status: response.status })
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: 502 }
      )
    }

    const data = await response.json()
    const items: PulseItem[] = []

    // Maintain display order: SPX, Nasdaq, Dow, VIX
    const orderedTickers = ["I:SPX", "I:COMP", "I:DJI", "I:VIX"]

    for (const ticker of orderedTickers) {
      const mapping = INDEX_MAP[ticker]
      if (!mapping) continue

      const snapshot = (data.results || []).find((r: PolygonIndexSnapshot) => r.ticker === ticker)
      items.push({
        symbol: mapping.symbol,
        label: mapping.label,
        price: snapshot?.value ?? null,
        change: snapshot?.session?.change ?? null,
        changePercent: snapshot?.session?.change_percent ?? null,
      })
    }

    return NextResponse.json(
      { items, lastUpdated: new Date().toISOString() } satisfies MarketPulseResponse,
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    logger.error("Market pulse API error", error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
