'use client'

import useSWR from 'swr'

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
  const tickerKey = [...tickers].sort().join(',')

  const { data, error, isLoading, mutate } = useSWR<Record<string, Quote>>(
    tickerKey ? ['live-quotes', tickerKey] : null,
    async () => {
      if (!tickerKey) return {}
      const res = await fetch(`/api/market/quotes?tickers=${tickerKey}`)
      if (!res.ok) throw new Error('Failed to fetch quotes')
      const data = await res.json()
      return data.quotes || {}
    },
    {
      refreshInterval: isMarketHours() ? 60000 : 300000, // 60s market hours, 5min after
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
