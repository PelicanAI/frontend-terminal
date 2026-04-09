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
    remotePatterns: [
      { protocol: 'https', hostname: 'api.elbstream.com', pathname: '/logos/**' },
    ],
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
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/positions', destination: '/portfolio', permanent: true },
      { source: '/journal', destination: '/portfolio', permanent: true },
      { source: '/playbooks', destination: '/portfolio', permanent: true },
      { source: '/heatmap', destination: '/markets', permanent: true },
      { source: '/correlations', destination: '/markets?tab=correlations', permanent: true },
      { source: '/earnings', destination: '/markets?tab=earnings', permanent: true },
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
    ignore: ['lib/share-cards/*-base64*'],
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Tree-shake Sentry logger statements and enable Vercel Cron monitoring
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
});
