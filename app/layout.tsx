import type React from "react"
import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/lib/providers"
import { Suspense } from "react"
import * as Sentry from '@sentry/nextjs'
import SentryErrorBoundary from "@/components/sentry-error-boundary"
import { ReferralCapture } from "@/components/ReferralCapture"
import "./globals.css"

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL('https://pelicantrading.ai'),
    title: {
      default: 'Pelican AI | Ask the Market. Get the Receipts.',
      template: '%s | Pelican AI',
    },
    description: "Research tool for traders and investors. Real-time market analysis, trade journaling, and institutional-grade intelligence.",
    openGraph: {
      title: 'Pelican AI — Ask the Market. Get the Receipts.',
      description: 'Research tool for traders and investors. Real-time analysis on 10,000+ tickers.',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Pelican AI' }],
      type: 'website',
      siteName: 'Pelican AI',
      url: 'https://pelicantrading.ai',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pelican AI — Ask the Market. Get the Receipts.',
      description: 'Ask the market. Get the receipts. Research tool for traders and investors.',
      images: ['/og-image.png'],
      site: '@PelicanAI_',
      creator: '@GrasshopperNick',
    },
    other: {
      ...Sentry.getTraceData()
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#2e2e2e" />
        <meta name="color-scheme" content="dark light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("pelican-theme-v2")||"dark";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${plex.className} antialiased bg-background ${plex.variable} ${plexMono.variable}`}>
        <ReferralCapture />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded">Skip to main content</a>
        <SentryErrorBoundary>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Providers>
              <>
                {children}
              </>
            </Providers>
          </Suspense>
        </SentryErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
