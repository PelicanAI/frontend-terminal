'use client'

import useSWR from 'swr'
import { hasMarketData, isRealtime } from '@/lib/config/asset-coverage'
import { KNOWN_FOREX_PAIRS, KNOWN_CRYPTO_PAIRS } from '@/lib/ticker-blocklist'

export interface Quote {
  price: number
  change: number
  changePercent: number
  dayHigh?: number
  dayLow?: number
  volume?: number
  prevClose?: number
  updatedAt?: string
}

interface UseLiveQuotesReturn {
  quotes: Record<string, Quote>
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Detect asset type from a normalized ticker string.
 * Returns 'forex', 'crypto', or 'stock'.
 */
function detectAssetType(ticker: string): 'stock' | 'forex' | 'crypto' {
  const upper = ticker.toUpperCase()
  if (upper.startsWith('C:')) return 'forex'
  if (upper.startsWith('X:')) return 'crypto'
  if (KNOWN_FOREX_PAIRS.has(upper)) return 'forex'
  if (KNOWN_CRYPTO_PAIRS.has(upper)) return 'crypto'
  return 'stock'
}

function parseTickerInput(tickerInput: string): { ticker: string; assetType: string } {
  const trimmed = tickerInput.trim()
  const lastColon = trimmed.lastIndexOf(':')
  const maybeAssetType = lastColon > -1 ? trimmed.slice(lastColon + 1).toLowerCase() : ''
  const hasAssetAnnotation = ['stock', 'etf', 'crypto', 'forex', 'indices', 'option', 'future', 'other'].includes(maybeAssetType)
  const cleanTicker = (hasAssetAnnotation ? trimmed.slice(0, lastColon) : trimmed).toUpperCase()
  return {
    ticker: cleanTicker,
    assetType: hasAssetAnnotation ? maybeAssetType : detectAssetType(cleanTicker),
  }
}

/**
 * Build the query param value with asset type annotations.
 * e.g. ["AAPL", "EURUSD", "BTCUSD"] → "AAPL:stock,EURUSD:forex,BTCUSD:crypto"
 */
function buildTickerParam(tickers: string[]): string {
  return tickers
    .map(t => {
      const { ticker, assetType } = parseTickerInput(t)
      return assetType === 'stock' ? ticker : `${ticker}:${assetType}`
    })
    .join(',')
}

function isMarketHours(): boolean {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = et.getHours()
  const minute = et.getMinutes()
  const day = et.getDay()

  // Weekday 9:30 AM - 4:00 PM ET
  if (day === 0 || day === 6) return false
  if (hour < 9 || (hour === 9 && minute < 30)) return false
  if (hour >= 16) return false
  return true
}

export function useLiveQuotes(tickers: string[]): UseLiveQuotesReturn {
  const coveredTickers = tickers.filter((ticker) => {
    const { ticker: cleanTicker, assetType } = parseTickerInput(ticker)
    return cleanTicker.length > 0 && hasMarketData(assetType)
  })
  const tickerKey = [...coveredTickers].sort().join(',')

  // Check if any ticker is forex/crypto (24hr markets) for refresh interval
  const has24hrAsset = coveredTickers.some(t => isRealtime(parseTickerInput(t).assetType))

  const { data, error, isLoading, mutate } = useSWR<Record<string, Quote>>(
    tickerKey ? ['live-quotes', tickerKey] : null,
    async () => {
      if (!tickerKey) return {}
      const param = buildTickerParam(coveredTickers)
      const res = await fetch(`/api/market/quotes?tickers=${encodeURIComponent(param)}`)
      if (!res.ok) throw new Error('Failed to fetch quotes')
      const json = await res.json()
      return json.quotes || {}
    },
    {
      // 60s during stock market hours or if any 24hr asset present; 5min otherwise
      refreshInterval: (isMarketHours() || has24hrAsset) ? 60000 : 300000,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    quotes: data || {},
    isLoading,
    error: error ?? null,
    refetch: mutate,
  }
}
