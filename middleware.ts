import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { countryToLocale } from '@/lib/languages'

async function getLocale(req: NextRequest): Promise<string> {
  // 1. Check cookie
  const cookieLocale = req.cookies.get('locale')?.value;
  if (cookieLocale) {
    return cookieLocale;
  }

  // 2. Cloudflare country header (free on Vercel, no external call)
  const cfCountry = req.headers.get('cf-ipcountry');
  if (cfCountry && countryToLocale[cfCountry]) {
    return countryToLocale[cfCountry];
  }

  // 3. Browser language
  const acceptLanguage = req.headers.get('accept-language');
  if (acceptLanguage) {
    const firstLang = acceptLanguage.split(',')[0];
    if (firstLang) {
      const browserLocale = firstLang.split('-')[0]?.toLowerCase() || 'en';
      const supportedLocales = ['en', 'zh', 'es', 'fr', 'ar', 'pt', 'ru', 'ja', 'de', 'ko', 'it', 'tr', 'nl', 'pl', 'sv', 'id', 'uk', 'he', 'el', 'cs', 'ro', 'hu', 'da', 'fi', 'no', 'sk', 'vi', 'th', 'ms'];
      if (supportedLocales.includes(browserLocale)) {
        return browserLocale;
      }
    }
  }

  return 'en';
}

export async function middleware(request: NextRequest) {
  // CRITICAL: Stripe webhook must bypass ALL middleware (no auth, no redirects)
  // Webhooks need raw request body and cannot have any interference
  if (request.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next()
  }

  // V3 route redirects — legacy feature routes mapped to consolidated pages
  const pathname = request.nextUrl.pathname
  const routeRedirects: Record<string, string> = {
    '/positions': '/portfolio',
    '/journal': '/portfolio?tab=history',
    '/playbooks': '/portfolio',
    '/heatmap': '/markets',
    '/correlations': '/markets?tab=correlations',
    '/earnings': '/markets?tab=earnings',
  }

  const redirectTarget = routeRedirects[pathname]
  if (redirectTarget) {
    const url = request.nextUrl.clone()
    const newUrl = new URL(redirectTarget, url.origin)
    request.nextUrl.searchParams.forEach((value, key) => {
      if (!newUrl.searchParams.has(key)) {
        newUrl.searchParams.set(key, value)
      }
    })
    return NextResponse.redirect(newUrl, 308)
  }

  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // For non-API routes, update session and add locale detection
  if (!isApiRoute) {
    const sessionResponse = await updateSession(request)
    let locale = await getLocale(request);

    // Set locale cookie if not already set
    if (!request.cookies.get('locale')) {
      sessionResponse.cookies.set('locale', locale, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        path: '/'
      });
    }

    // Add locale to headers for server components
    sessionResponse.headers.set('x-locale', locale);
    return sessionResponse;
  }

  // API routes: just update session (auth check)
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
