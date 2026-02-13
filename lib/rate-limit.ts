import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

type RateLimiterLike = {
  limit: (identifier: string) => Promise<RateLimitResult>
}

function createSafeMockLimiter(requests: number): RateLimiterLike {
  return {
    async limit() {
      return {
        success: true,
        limit: requests,
        remaining: requests,
        reset: Date.now() + 60_000,
      }
    },
  }
}

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  return new Redis({ url, token })
}

/**
 * Rate limiter for authenticated routes — keyed by user ID.
 */
export function createUserRateLimiter(prefix: string, requests: number, window: `${number} ${"ms" | "s" | "m" | "h" | "d"}` | `${number}${"ms" | "s" | "m" | "h" | "d"}`) {
  const redis = createRedisClient()
  if (!redis) return createSafeMockLimiter(requests)

  return new Ratelimit({
    redis,
    prefix: `ratelimit:${prefix}`,
    limiter: Ratelimit.slidingWindow(requests, window),
  })
}

/**
 * Rate limiter for unauthenticated routes — keyed by IP.
 */
export function createIpRateLimiter(prefix: string, requests: number, window: `${number} ${"ms" | "s" | "m" | "h" | "d"}` | `${number}${"ms" | "s" | "m" | "h" | "d"}`) {
  const redis = createRedisClient()
  if (!redis) return createSafeMockLimiter(requests)

  return new Ratelimit({
    redis,
    prefix: `ratelimit:${prefix}`,
    limiter: Ratelimit.slidingWindow(requests, window),
  })
}

/**
 * Extract client IP from request headers (works on Vercel)
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Standard rate limit exceeded response
 */
export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  )
}
