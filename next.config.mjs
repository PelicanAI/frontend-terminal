import {withSentryConfig} from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable linting and type checking during builds for production safety
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: false,
  },
  // Security headers to protect against common attacks
  async headers() {
    return [
      {
        source: '/((?!demos/).*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // CSP: 'unsafe-eval' is required by TradingView's charting SDK (eval() used internally).
          // Only /chat and /heatmap pages embed TradingView, but CSP applies globally here.
          // TODO post-launch: implement route-specific CSP via middleware to strip 'unsafe-eval'
          // from marketing pages, settings, and other non-chart routes.
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.tradingview.com https://api.elbstream.com https://assets.parqet.com; connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.polygon.io https://s3.tradingview.com https://*.sentry.io https://*.stripe.com https://pelican-trading-api.fly.dev https://*.fly.dev; worker-src 'self' blob:; frame-src 'self' https://js.stripe.com https://*.tradingview.com https://*.tradingview-widget.com"
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "pelican-trading-xr",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: false,

  // Exclude large base64 asset files from source map processing (prevents WasmHash buffer errors)
  sourcemaps: {
    ignore: ['lib/share-cards/*-base64*', 'lib/share-cards/font-geist-*'],
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});