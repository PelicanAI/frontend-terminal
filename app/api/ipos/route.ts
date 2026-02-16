import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const iposLimiter = createUserRateLimiter('ipos', 20, '1 m')

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

export interface IPOEntry {
  ticker: string | null
  company: string
  listingDate: string | null
  priceRangeLow: number | null
  priceRangeHigh: number | null
  finalPrice: number | null
  sharesOffered: number | null
  status: string
  exchange: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await iposLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    if (!POLYGON_API_KEY) {
      return NextResponse.json({ ipos: [] })
    }

    // Fetch upcoming/pending IPOs from Polygon
    const res = await fetch(
      `https://api.polygon.io/vX/reference/ipos?` +
      `status=pending&order=asc&limit=20&sort=listing_date` +
      `&apiKey=${POLYGON_API_KEY}`,
      { next: { revalidate: 3600 } } // cache 1 hour
    )

    if (!res.ok) {
      console.error('Polygon IPO API error:', res.status)
      return NextResponse.json({ ipos: [] })
    }

    interface PolygonIPO {
      ticker?: string | null
      security_description?: string
      issuer_name?: string
      listing_date?: string
      ipo_date?: string
      min_price?: number | null
      lowest_offer_price?: number | null
      max_price?: number | null
      highest_offer_price?: number | null
      final_issue_price?: number | null
      total_offer_size?: number | null
      max_shares_offered?: number | null
      ipo_status?: string
      primary_exchange?: string | null
    }

    const data = await res.json()
    const ipos: IPOEntry[] = (data.results || []).map((ipo: PolygonIPO) => ({
      ticker: ipo.ticker || null,
      company: ipo.security_description || ipo.issuer_name || 'Unknown',
      listingDate: ipo.listing_date || ipo.ipo_date || null,
      priceRangeLow: ipo.min_price ?? ipo.lowest_offer_price ?? null,
      priceRangeHigh: ipo.max_price ?? ipo.highest_offer_price ?? null,
      finalPrice: ipo.final_issue_price ?? null,
      sharesOffered: ipo.total_offer_size ?? ipo.max_shares_offered ?? null,
      status: ipo.ipo_status || 'pending',
      exchange: ipo.primary_exchange || null,
    }))

    return NextResponse.json(
      { ipos },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      }
    )
  } catch (err) {
    console.error('IPO fetch error:', err)
    return NextResponse.json({ ipos: [] })
  }
}
