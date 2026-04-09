import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { getPlexSans, getPlexMono } from "@/lib/share-cards/fonts"
import { TradeRecapCard } from "@/lib/share-cards/trade-recap"
import { PelicanInsightCard } from "@/lib/share-cards/pelican-insight"
import { StatsTableCard } from "@/lib/share-cards/stats-table"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"

const limiter = createUserRateLimiter("share-card", 20, "1 m")

function getFonts(plexSans: ArrayBuffer, plexMono: ArrayBuffer) {
  return [
    { name: "IBM Plex Sans", data: plexSans, weight: 600 as const, style: "normal" as const },
    { name: "IBM Plex Mono", data: plexMono, weight: 400 as const, style: "normal" as const },
  ]
}

function getDimensions(format: string) {
  return format === "square" ? { width: 1080, height: 1080 } : { width: 1200, height: 630 }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const format = searchParams.get("format") || "og"

    const dimensions = getDimensions(format)
    const [plexSans, plexMono] = await Promise.all([getPlexSans(), getPlexMono()])

    let cardContent: React.ReactElement

    switch (type) {
      case "trade-recap": {
        const tradeId = searchParams.get("tradeId")
        if (!tradeId) return new Response("Missing tradeId", { status: 400 })

        const supabase = await createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
          return new Response("Unauthorized", { status: 401 })
        }

        const { success: rlOk } = await limiter.limit(user.id)
        if (!rlOk) return rateLimitResponse()

        const { data: trade, error: tradeError } = await supabase
          .from("trades")
          .select("*")
          .eq("id", tradeId)
          .eq("user_id", user.id)
          .single()

        if (tradeError || !trade) {
          return new Response("Trade not found", { status: 404 })
        }

        cardContent = <TradeRecapCard trade={trade} />
        break
      }

      case "pelican-insight": {
        const headline = searchParams.get("headline")
        const tickers = searchParams.get("tickers")?.split(",").filter(Boolean) || []

        if (!headline) return new Response("Missing headline", { status: 400 })

        cardContent = <PelicanInsightCard headline={headline} tickers={tickers} />
        break
      }

      default:
        return new Response("Invalid card type", { status: 400 })
    }

    const response = new ImageResponse(cardContent, {
      ...dimensions,
      fonts: getFonts(plexSans, plexMono),
    })
    response.headers.set("Cache-Control", "no-store, max-age=0")
    return response
  } catch {
    return new Response("Failed to generate card", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, format } = body

    const dimensions = getDimensions(format || "og")
    const [plexSans, plexMono] = await Promise.all([getPlexSans(), getPlexMono()])

    let cardContent: React.ReactElement

    switch (type) {
      case "pelican-insight": {
        const { headline, tickers } = body
        if (!headline) return new Response("Missing headline", { status: 400 })
        cardContent = <PelicanInsightCard headline={headline} tickers={tickers || []} />
        break
      }

      case "stats-table": {
        const { period, rows } = body
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          return new Response("No stats rows", { status: 400 })
        }
        cardContent = (
          <StatsTableCard period={period || "Performance"} rows={rows} />
        )
        break
      }

      default:
        return new Response("POST supports pelican-insight and stats-table", { status: 400 })
    }

    const response = new ImageResponse(cardContent, {
      ...dimensions,
      fonts: getFonts(plexSans, plexMono),
    })
    response.headers.set("Cache-Control", "no-store, max-age=0")
    return response
  } catch (error) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Failed to generate card'
      : `POST error: ${error instanceof Error ? error.message : String(error)}`
    return new Response(message, { status: 500 })
  }
}
