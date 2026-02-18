import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const etfLimiter = createUserRateLimiter('etf-movers', 30, '1 m')
const POLYGON_API_KEY = process.env.POLYGON_API_KEY

const ETF_TICKERS = [
  // Sector
  'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP', 'XLU', 'XLY', 'XLC', 'XLB', 'XLRE',
  // Thematic
  'ARKK', 'TAN', 'LIT', 'HACK', 'ROBO', 'SKYY', 'DRIV', 'SMH', 'CIBR',
  // Bond
  'TLT', 'IEF', 'SHY', 'HYG', 'LQD', 'BND', 'AGG', 'TIPS', 'BNDX',
  // Commodity
  'GLD', 'SLV', 'USO', 'UNG', 'DBA', 'PDBC', 'COPX', 'WEAT',
  // Leveraged
  'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'SOXL', 'SOXS', 'UVXY', 'SVXY',
]

// Map tickers to friendly names
const ETF_NAMES: Record<string, string> = {
  XLK: 'Technology Select', XLF: 'Financial Select', XLE: 'Energy Select',
  XLV: 'Health Care Select', XLI: 'Industrial Select', XLP: 'Consumer Staples',
  XLU: 'Utilities Select', XLY: 'Consumer Discretionary', XLC: 'Communication Services',
  XLB: 'Materials Select', XLRE: 'Real Estate Select',
  ARKK: 'ARK Innovation', TAN: 'Solar ETF', LIT: 'Lithium & Battery',
  HACK: 'Cybersecurity', ROBO: 'Robotics & AI', SKYY: 'Cloud Computing',
  DRIV: 'Autonomous & EV', SMH: 'Semiconductors', CIBR: 'Cyber Security',
  TLT: '20+ Year Treasury', IEF: '7-10 Year Treasury', SHY: '1-3 Year Treasury',
  HYG: 'High Yield Corporate', LQD: 'Investment Grade', BND: 'Total Bond',
  AGG: 'Core US Aggregate', TIPS: 'Treasury Inflation', BNDX: 'Intl Bond',
  GLD: 'Gold', SLV: 'Silver', USO: 'Crude Oil', UNG: 'Natural Gas',
  DBA: 'Agriculture', PDBC: 'Broad Commodity', COPX: 'Copper Miners', WEAT: 'Wheat',
  TQQQ: 'Nasdaq 3x Bull', SQQQ: 'Nasdaq 3x Bear', UPRO: 'S&P 3x Bull',
  SPXU: 'S&P 3x Bear', SOXL: 'Semis 3x Bull', SOXS: 'Semis 3x Bear',
  UVXY: 'VIX Short-Term', SVXY: 'Short VIX',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await etfLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ tickers: [] })
    }

    const tickerList = ETF_TICKERS.join(',')
    const res = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerList}&apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      console.error('Polygon ETF API error:', res.status)
      return NextResponse.json({ tickers: [] }, { status: 502 })
    }

    const data = await res.json()

    interface PolygonETFTicker {
      ticker: string
      todaysChangePerc?: number
      day?: { c?: number; v?: number }
      lastTrade?: { p?: number }
    }

    const tickers = (data.tickers || [])
      .map((t: PolygonETFTicker) => ({
        ticker: t.ticker,
        name: ETF_NAMES[t.ticker] || t.ticker,
        price: t.lastTrade?.p ?? t.day?.c ?? 0,
        changePercent: t.todaysChangePerc ?? 0,
        volume: t.day?.v ?? 0,
      }))
      .filter((t: { price: number }) => t.price > 0)
      .sort((a: { changePercent: number }, b: { changePercent: number }) =>
        Math.abs(b.changePercent) - Math.abs(a.changePercent)
      )

    return NextResponse.json({ tickers }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('ETF movers error:', error)
    return NextResponse.json({ error: 'Internal server error', tickers: [] }, { status: 500 })
  }
}
