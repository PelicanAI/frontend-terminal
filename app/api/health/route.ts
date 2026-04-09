import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createIpRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const limiter = createIpRateLimiter("health", 10, "1 m")

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { success: rlOk } = await limiter.limit(getClientIp(request))
  if (!rlOk) return rateLimitResponse()

  let status: "ok" | "degraded" = "ok"

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("conversations").select("id").limit(1).maybeSingle()
    if (error) {
      status = "degraded"
    }
  } catch {
    status = "degraded"
  }

  return NextResponse.json(
    { status, timestamp: new Date().toISOString() },
    {
      status: status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-cache" },
    }
  )
}