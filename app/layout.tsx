import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/lib/providers"
import { Suspense } from "react"
import * as Sentry from '@sentry/nextjs'
import SentryErrorBoundary from "@/components/sentry-error-boundary"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL('https://pelicantrading.ai'),
    title: {
      default: 'Pelican Trading | AI Market Intelligence for Traders',
      template: '%s | Pelican Trading',
    },
    description: "AI-powered trading assistant for smarter trading decisions. Real-time market analysis, backtesting, and institutional-grade intelligence.",
    openGraph: {
      title: 'Pelican Trading | AI Market Intelligence for Traders',
      description: 'AI-powered trading assistant for smarter trading decisions.',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Pelican Trading' }],
      type: 'website',
      siteName: 'Pelican Trading',
      url: 'https://pelicantrading.ai',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pelican Trading | AI Market Intelligence for Traders',
      description: 'AI-powered trading assistant for smarter trading decisions.',
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
    <html lang="en" suppressHydrationWarning className="dark:bg-[#13112a]">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#13112a" />
      </head>
      <body className={`font-sans antialiased bg-background ${inter.variable} ${GeistMono.variable}`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded">Skip to main content</a>
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
