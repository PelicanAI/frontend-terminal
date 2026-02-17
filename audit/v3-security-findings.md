# Pelican Frontend V3 Security Audit

**Auditor:** Agent 1 (Security Auditor)
**Date:** 2026-02-17
**Scope:** Full codebase security review -- dependencies, API routes, auth, rate limiting, Stripe, XSS, headers, middleware

---

## CRITICAL

- **[S-C1] Middleware Auth Bypass on Error** -- In `/lib/supabase/middleware.ts` (line 72-76), the `catch` block returns `NextResponse.next()` with no auth check. If `supabase.auth.getUser()` throws (e.g., Supabase outage, malformed cookie, network timeout), all protected routes -- including `/chat`, `/settings`, `/admin/*`, and every API route -- silently pass through without authentication. An attacker could intentionally trigger this by sending malformed auth cookies. This is the same class of vulnerability as the Next.js middleware auth bypass CVEs (CVE-2024-34350, CVE-2025-29927) that forced the V2 upgrade to 14.2.35+.

  ```typescript
  // lib/supabase/middleware.ts lines 72-76
  } catch {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
  ```

  **Fix:** Return a 401 or redirect to login in the catch block instead of passing through.

- **[S-C2] Rate Limiting Silently Disabled Without Upstash** -- In `/lib/rate-limit.ts` (lines 15-26), when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are missing, the rate limiter returns a mock that **always allows** every request. This means if Upstash credentials are misconfigured, removed, or the env vars fail to load, all 10+ rate-limited endpoints (education-chat, help-chat, market-data, upload, checkout, regeneration, etc.) become completely unprotected. An attacker could abuse the OpenAI API, Polygon API, and Finnhub API with unlimited calls at your expense.

  ```typescript
  // lib/rate-limit.ts lines 15-26
  function createSafeMockLimiter(requests: number): RateLimiterLike {
    return {
      async limit() {
        return { success: true, ... }  // ALWAYS succeeds
      },
    }
  }
  ```

  **Fix:** In production, throw an error or deny all requests when Redis is unavailable. Only use the mock in development.

---

## HIGH

- **[S-H1] 11 npm Vulnerabilities Including 5 High Severity** -- `npm audit` reports 11 vulnerabilities:
  - **next 10.0.0-15.5.9** (HIGH): DoS via Image Optimizer (`GHSA-9g9p-9gw9-jx7f`) and DoS via insecure RSC deserialization (`GHSA-h25m-26qc-wcjf`). Current version `^14.2.35` falls in the vulnerable range for newer CVEs.
  - **glob** (HIGH): Command injection via CLI
  - **tar** (HIGH x3): Race condition memory exposure, arbitrary file overwrite, symlink poisoning, hardlink path traversal
  - **webpack** (MODERATE x2): SSRF via buildHttp allowedUris bypass
  - **@sentry/nextjs, @sentry/node, @sentry/node-core** (MODERATE): Sensitive header leak when `sendDefaultPii` is true
  - **js-yaml** (MODERATE): Prototype pollution in merge
  - **qs** (LOW): ArrayLimit bypass DoS

  **Fix:** Run `npm audit fix` for non-breaking fixes. Evaluate `npm audit fix --force` for Next.js and glob upgrades. Check if Sentry `sendDefaultPii` is enabled.

- **[S-H2] API Routes Have No Auth Guard in Middleware -- Only Defense-in-Depth** -- The middleware (`/lib/supabase/middleware.ts`) does NOT block unauthenticated API requests. It only calls `updateSession()` which refreshes the session but does NOT redirect or return 401 for API routes. Auth enforcement relies entirely on each route handler calling `supabase.auth.getUser()` individually. While every route currently does this correctly, a single missed check in a future route would expose it. The `/api/health` route intentionally has no auth, which is fine, but the middleware architecture means any new route is unprotected by default.

  **Fix:** Add middleware-level auth enforcement for `/api/*` routes (except `/api/health` and `/api/stripe/webhook`).

- **[S-H3] Admin Authorization via Database Flag -- No Role-Based Enforcement** -- Admin access (`/lib/admin.ts`) is controlled by an `is_admin` boolean in the `user_credits` table, queried using the user's own Supabase client. If RLS policies on `user_credits` are misconfigured or if a user could modify their own row (e.g., via a Supabase client-side vulnerability), they could grant themselves admin access. The admin check should use the service role client to verify admin status, not the user's own session.

  ```typescript
  // lib/admin.ts lines 47-53
  const { data: credits } = await supabase  // User's own client, subject to RLS
    .from('user_credits')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  ```

  **Fix:** Use the service role client (`getServiceClient()`) to check `is_admin`, bypassing any client-side manipulation. Or better, use Supabase custom claims / JWT roles.

- **[S-H4] Help Chat (Public Endpoint) Exposes OpenAI API to Abuse** -- `/api/help-chat/route.ts` is rate-limited by IP (30 req/hr) but has no authentication requirement. Combined with the rate limit mock fallback (S-C2), this endpoint could be abused to rack up OpenAI API costs. Even with IP-based rate limiting working, attackers can rotate IPs via proxies/VPNs. The `x-forwarded-for` header used for IP extraction is also spoofable in some configurations.

  **Fix:** Add CAPTCHA or proof-of-work for unauthenticated endpoints. Consider reducing the rate limit. Add cost monitoring alerts on OpenAI.

---

## MEDIUM

- **[S-M1] Admin Conversations Content Search is Vulnerable to SQL Pattern Injection** -- In `/api/admin/conversations/route.ts` (line 42), the `contentSearch` parameter is passed directly to `.ilike()` without escaping SQL wildcard characters (`%`, `_`). While this is not SQL injection (PostgREST parameterizes queries), it allows attackers to craft patterns that cause expensive full-table scans or unexpected matches.

  ```typescript
  .ilike('content', `%${contentSearch}%`)  // contentSearch not sanitized
  ```

  **Fix:** Escape `%` and `_` characters in `contentSearch` before passing to `.ilike()`, similar to how `sanitizePostgrestSearch()` is used in the conversations list endpoint.

- **[S-M2] Admin Users Endpoint Fetches ALL Users Without Pagination at Database Level** -- `/api/admin/users/route.ts` fetches all auth users (`perPage: 1000`), all messages, and all conversations from Supabase in every request. As the user base grows, this becomes a DoS vector -- any admin request could timeout or exhaust memory. Similarly, `/api/admin/analytics/route.ts` fetches all messages and users.

  **Fix:** Implement server-side pagination, aggregation queries, or materialized views for admin endpoints.

- **[S-M3] CSP Allows 'unsafe-inline' and 'unsafe-eval' for Scripts** -- The Content-Security-Policy in `next.config.mjs` (line 52) includes `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. While `unsafe-inline` is commonly needed for Next.js, `unsafe-eval` significantly weakens CSP protection and enables certain XSS vectors. This is likely needed for TradingView widgets but should be scoped more narrowly.

  **Fix:** Investigate whether `unsafe-eval` can be removed or restricted to specific pages. Use nonce-based CSP for inline scripts where possible.

- **[S-M4] Sentry Tunnel Route Exposed at /monitoring** -- The Sentry `tunnelRoute: "/monitoring"` in `next.config.mjs` (line 81) proxies Sentry requests through the app server. This route is not authenticated and could be abused for: (a) amplification attacks against Sentry's endpoint, (b) sending arbitrary data to your Sentry project, polluting error tracking.

  **Fix:** Consider rate limiting the `/monitoring` route or adding basic validation.

- **[S-M5] No CSRF Protection on Mutation Endpoints** -- API routes accepting POST/PATCH/DELETE (checkout, conversations, upload, regenerate, admin actions) do not verify CSRF tokens or check `Origin`/`Referer` headers. While Supabase's cookie-based auth provides some protection (SameSite cookies), explicit CSRF protection is a defense-in-depth best practice for financial operations like Stripe checkout.

  **Fix:** Add `Origin` header verification for mutation endpoints, or implement CSRF tokens.

---

## LOW

- **[S-L1] Conversation Title Not Length-Validated on Create** -- `/api/conversations/route.ts` (line 122) accepts a `title` from the request body without length validation. While unlikely to cause issues with Postgres, extremely long titles could cause UI rendering issues or storage bloat.

  **Fix:** Add `title.slice(0, 200)` or similar length limit.

- **[S-L2] Error Details Leaked in Non-Production** -- Several routes conditionally expose error details when `NODE_ENV !== 'production'` (e.g., `/api/conversations/[id]/route.ts` line 163, `/api/messages/[id]/regenerate/route.ts` line 178). If the Vercel deployment doesn't set `NODE_ENV=production` correctly, internal error messages could leak to users.

  **Fix:** Verify `NODE_ENV` is set to `production` in all Vercel environments. Consider removing conditional error detail exposure entirely.

- **[S-L3] Stripe Price IDs Exposed via NEXT_PUBLIC Env Vars** -- Price IDs like `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` are exposed to the client. While Stripe price IDs are not secret, they reveal pricing structure and could be enumerated. The checkout route properly validates against an allowlist server-side, so this is informational only.

- **[S-L4] Security Headers Exclude /demos/ Path** -- The security headers in `next.config.mjs` (line 20) exclude routes matching `demos/` via the negative lookahead. While `demos/` is in `.gitignore`, if any demo content is accidentally deployed, it would lack all security headers (CSP, HSTS, X-Frame-Options, etc.).

  **Fix:** Remove the `demos/` exclusion from the headers source pattern, or ensure the demos directory can never be deployed.

- **[S-L5] .env.sentry-build-plugin in .gitignore But Pattern Could Miss Variants** -- `.gitignore` has `.env*` which catches most env files. The specific mention of `.env.sentry-build-plugin` after the glob pattern is redundant. No hardcoded secrets were found in the codebase. This is informational only -- current configuration is safe.

---

## Positive Findings (Things Done Well)

1. **Stripe Security is Solid** -- Checkout validates priceId against server-side allowlist, derives planName and credits server-side (never trusts client), webhook verifies signature via `constructEvent()`, and `STRIPE_WEBHOOK_SECRET` is properly required.

2. **XSS Protection is Strong** -- All `dangerouslySetInnerHTML` usage either goes through `DOMPurify.sanitize()` with strict allowlists (chat, education chat, help chat) or uses `JSON.stringify()` for structured data (JSON-LD). The `formatLine()` utility properly escapes HTML before applying markdown formatting, and re-sanitizes with DOMPurify afterward. `isomorphic-dompurify` is a dependency.

3. **Upload Security is Comprehensive** -- File uploads validate MIME types against an allowlist, check magic bytes, sanitize filenames, block SVGs, enforce size limits, compute SHA-256 checksums, and use signed URLs for access.

4. **Database Queries Filter by user_id** -- All conversation and message queries include `.eq("user_id", user.id)` or `.eq("conversations.user_id", user.id)` to enforce row-level ownership.

5. **Rate Limiting Coverage** -- When Upstash is configured, rate limiting covers: education-chat (20/hr), help-chat (30/hr by IP), market-data (60/min), upload (20/hr), title-generation (10/hr), regeneration (30/hr), checkout (5/hr), movers (30/min), heatmap (30/min), earnings (20/min), economic-calendar (20/min), ipos (20/min), ticker-search (60/min), and quotes (60/min).

6. **Security Headers are Comprehensive** -- HSTS with preload, X-Frame-Options DENY, nosniff, XSS-Protection, Referrer-Policy, Permissions-Policy, and CSP are all configured.

7. **Auth Enforcement is Consistent** -- Every API route (except the intentionally public `/api/health` and `/api/help-chat`) checks auth via `supabase.auth.getUser()` or `requireAdmin()`.

---

## Score: 7/10

**Summary:** The application has strong fundamentals -- Stripe payments, XSS protection, file uploads, and database queries are all well-secured. The two critical findings (middleware auth bypass on error and silent rate limit disablement) are serious but have narrow exploit windows. The main risk vectors are: (1) the catch-all in middleware that silently passes unauthenticated requests on Supabase errors, and (2) the rate limiter mock that removes all API abuse protection when Upstash is misconfigured. Fixing these two issues, upgrading npm dependencies, and adding middleware-level API auth would bring this to an 8.5-9/10.

**Priority Remediation Order:**
1. S-C1: Fix middleware catch block (5 minutes)
2. S-C2: Fail-closed rate limiting in production (15 minutes)
3. S-H1: npm audit fix (10 minutes)
4. S-H2: Middleware-level API auth (30 minutes)
5. S-H3: Service role admin check (15 minutes)
