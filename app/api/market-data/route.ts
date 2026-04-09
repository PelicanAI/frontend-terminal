import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const marketDataLimiter = createUserRateLimiter('market-data', 60, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

// Polygon endpoints
const INDICES_URL = `https://api.polygon.io/v3/snapshot/indices?ticker.any_of=I:SPX,I:COMP,I:DJI,I:VIX&apiKey=${POLYGON_API_KEY}`
const STOCKS_URL = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=XLK,XLF,XLV,XLE,AAPL,TSLA,NVDA,SPY&apiKey=${POLYGON_API_KEY}`

// Polygon API response interfaces
interface PolygonIndexSnapshot {
  ticker: string
  value?: number
  session?: {
    change?: number
    change_percent?: number
  }
}

interface PolygonIndicesResponse {
  results?: PolygonIndexSnapshot[]
  status?: string
}

interface PolygonStockSnapshot {
  ticker: string
  todaysChangePerc?: number
  lastTrade?: { p?: number }
  day?: { c?: number }
}

interface PolygonStocksResponse {
  tickers?: PolygonStockSnapshot[]
  status?: string
}

// Our API response interfaces
interface MarketIndex {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
}

interface SectorData {
  name: string
  changePercent: number | null
}

interface WatchlistTicker {
  symbol: string
  price: number | null
  changePercent: number | null
}

interface MarketDataResponse {
  indices: MarketIndex[]
  vix: number | null
  vixChange: number | null
  sectors: SectorData[]
  watchlist: WatchlistTicker[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await marketDataLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({
        indices: [
          { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
          { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
          { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
        ],
        vix: null,
        vixChange: null,
        sectors: [
          { name: "Technology", changePercent: null },
          { name: "Financials", changePercent: null },
          { name: "Healthcare", changePercent: null },
          { name: "Energy", changePercent: null },
        ],
        watchlist: [
          { symbol: "AAPL", price: null, changePercent: null },
          { symbol: "TSLA", price: null, changePercent: null },
          { symbol: "NVDA", price: null, changePercent: null },
          { symbol: "SPY", price: null, changePercent: null },
        ],
      })
    }

    // Fetch both endpoints in parallel
    const [indicesResponse, stocksResponse] = await Promise.all([
      fetch(INDICES_URL),
      fetch(STOCKS_URL),
    ])

    if (!indicesResponse.ok || !stocksResponse.ok) {
      logger.error("Polygon.io API error", undefined, { indicesStatus: indicesResponse.status, stocksStatus: stocksResponse.status })
      return NextResponse.json(
        { error: "Failed to fetch market data from upstream provider" },
        { status: 502 }
      )
    }

    const indicesData: PolygonIndicesResponse = await indicesResponse.json()
    const stocksData: PolygonStocksResponse = await stocksResponse.json()

    // Map indices data
    const indicesMap: Record<string, { name: string; symbol: string }> = {
      "I:SPX": { name: "S&P 500", symbol: "SPX" },
      "I:COMP": { name: "Nasdaq", symbol: "IXIC" },
      "I:DJI": { name: "Dow Jones", symbol: "DJI" },
    }

    const indices: MarketIndex[] = []
    let vix: number | null = null
    let vixChange: number | null = null

    // Process indices from Polygon response
    if (indicesData.results && Array.isArray(indicesData.results)) {
      indicesData.results.forEach((item: PolygonIndexSnapshot) => {
        if (item.ticker === "I:VIX") {
          // Extract VIX separately
          vix = item.value ?? null
          vixChange = item.session?.change_percent ?? null
        } else {
          // Map to indices array
          const mapping = indicesMap[item.ticker]
          if (mapping) {
            indices.push({
              symbol: mapping.symbol,
              name: mapping.name,
              price: item.value ?? null,
              change: item.session?.change ?? null,
              changePercent: item.session?.change_percent ?? null,
            })
          }
        }
      })
    }

    // Map sector ETFs
    const sectorMap: Record<string, string> = {
      XLK: "Technology",
      XLF: "Financials",
      XLV: "Healthcare",
      XLE: "Energy",
    }

    const sectors: SectorData[] = []
    const watchlist: WatchlistTicker[] = []

    // Process stocks/ETFs from Polygon response
    if (stocksData.tickers && Array.isArray(stocksData.tickers)) {
      stocksData.tickers.forEach((ticker: PolygonStockSnapshot) => {
        const symbol = ticker.ticker

        // Check if it's a sector ETF
        if (sectorMap[symbol]) {
          sectors.push({
            name: sectorMap[symbol],
            changePercent: ticker.todaysChangePerc ?? null,
          })
        }
        // Check if it's in watchlist
        else if (["AAPL", "TSLA", "NVDA", "SPY"].includes(symbol)) {
          watchlist.push({
            symbol,
            price: ticker.lastTrade?.p ?? ticker.day?.c ?? null,
            changePercent: ticker.todaysChangePerc ?? null,
          })
        }
      })
    }

    // Ensure all expected sectors exist (fill with null if missing)
    const expectedSectors = ["Technology", "Financials", "Healthcare", "Energy"]
    expectedSectors.forEach((sectorName) => {
      if (!sectors.find((s) => s.name === sectorName)) {
        sectors.push({ name: sectorName, changePercent: null })
      }
    })

    // Ensure all expected watchlist tickers exist (fill with null if missing)
    const expectedWatchlist = ["AAPL", "TSLA", "NVDA", "SPY"]
    expectedWatchlist.forEach((symbol) => {
      if (!watchlist.find((w) => w.symbol === symbol)) {
        watchlist.push({ symbol, price: null, changePercent: null })
      }
    })

    const response: MarketDataResponse = {
      indices,
      vix,
      vixChange,
      sectors,
      watchlist,
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    })
  } catch (error) {
    logger.error("Market data API error", error instanceof Error ? error : undefined)

    // Return null values with 502 to indicate upstream failure
    return NextResponse.json(
      {
        indices: [
          { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
          { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
          { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
        ],
        vix: null,
        vixChange: null,
        sectors: [
          { name: "Technology", changePercent: null },
          { name: "Financials", changePercent: null },
          { name: "Healthcare", changePercent: null },
          { name: "Energy", changePercent: null },
        ],
        watchlist: [
          { symbol: "AAPL", price: null, changePercent: null },
          { symbol: "TSLA", price: null, changePercent: null },
          { symbol: "NVDA", price: null, changePercent: null },
          { symbol: "SPY", price: null, changePercent: null },
        ],
      },
      { status: 502 }
    )
  }
}

