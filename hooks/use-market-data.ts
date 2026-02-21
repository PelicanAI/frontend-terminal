"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"

export interface MarketIndex {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
}

export interface SectorData {
  name: string
  changePercent: number | null
}

export interface WatchlistTicker {
  symbol: string
  price: number | null
  changePercent: number | null
}

export interface MarketData {
  indices: MarketIndex[]
  vix: number | null
  vixChange: number | null
  sectors: SectorData[]
  watchlist: WatchlistTicker[]
  isLoading: boolean
  error: Error | null
  lastUpdated: Date | null
}

interface UseMarketDataOptions {
  // Refresh interval in milliseconds (default: 60000 = 1 minute)
  refreshInterval?: number
  // Enable/disable auto-refresh
  autoRefresh?: boolean
  // Custom watchlist symbols
  watchlistSymbols?: string[]
}

/**
 * Custom hook for fetching and managing market data
 *
 * This hook is designed to be easily extended with real market data APIs.
 * Currently returns placeholder data, but the structure is ready for real integration.
 *
 * Example future usage:
 * ```typescript
 * const { indices, vix, sectors, watchlist, isLoading, refresh } = useMarketData({
 *   refreshInterval: 60000,
 *   autoRefresh: true,
 *   watchlistSymbols: ['AAPL', 'TSLA', 'NVDA']
 * })
 * ```
 *
 * To add real data:
 * 1. Create API endpoint: /api/market-data
 * 2. Uncomment the useSWR fetcher below
 * 3. Remove placeholder data
 * 4. Add error handling as needed
 */
export function useMarketData({
  refreshInterval = 60000,
  autoRefresh = false,
  watchlistSymbols = ["AAPL", "TSLA", "NVDA", "SPY"],
}: UseMarketDataOptions = {}): MarketData & { refresh: () => void } {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch market data from API
  const { data, error, isLoading, mutate } = useSWR(
    '/api/market-data',
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch market data')
      return response.json()
    },
    {
      refreshInterval: autoRefresh ? refreshInterval : 0,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )

  // Placeholder data - fallback if API fails
  const placeholderData: MarketData = {
    indices: [
      { symbol: "SPX", name: "S&P 500", price: null, change: null, changePercent: null },
      { symbol: "IXIC", name: "Nasdaq", price: null, change: null, changePercent: null },
      { symbol: "DJI", name: "Dow Jones", price: null, change: null, changePercent: null },
    ],
    vix: null,
    vixChange: null,
    sectors: [
      { name: "Technology", changePercent: null },
      { name: "Financials", changePercent: null },
      { name: "Healthcare", changePercent: null },
      { name: "Energy", changePercent: null },
    ],
    watchlist: watchlistSymbols.map((symbol) => ({
      symbol,
      price: null,
      changePercent: null,
    })),
    isLoading: false,
    error: null,
    lastUpdated,
  }

  const refresh = useCallback(() => {
    mutate()
    setLastUpdated(new Date())
  }, [mutate])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, refresh])

  return {
    ...(data || placeholderData),
    error,
    isLoading,
    lastUpdated,
    refresh,
  }
}

/**
 * Utility functions for market data processing
 */

export function formatPrice(price: number | null): string {
  if (price === null) return "---"
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export { formatPercent } from '@/lib/formatters'

export function getMarketStatus(): "pre-market" | "open" | "after-hours" | "closed" {
  const now = new Date()
  const utcHours = now.getUTCHours()
  const utcMinutes = now.getUTCMinutes()
  const utcDay = now.getUTCDay()

  // Convert to ET (UTC-5 or UTC-4 depending on DST)
  // Simplified: using UTC-5 (EST) - adjust for DST in production
  const etHours = (utcHours - 5 + 24) % 24
  const totalMinutes = etHours * 60 + utcMinutes

  // Weekend check
  if (utcDay === 0 || utcDay === 6) return "closed"

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (totalMinutes >= 4 * 60 && totalMinutes < 9 * 60 + 30) return "pre-market"

  // Regular hours: 9:30 AM - 4:00 PM ET
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60) return "open"

  // After-hours: 4:00 PM - 8:00 PM ET
  if (totalMinutes >= 16 * 60 && totalMinutes < 20 * 60) return "after-hours"

  return "closed"
}