"use client"

import useSWR from "swr"

export interface EarningsEvent {
  date: string
  symbol: string
  epsActual: number | null
  epsEstimate: number | null
  revenueActual: number | null
  revenueEstimate: number | null
  hour: 'bmo' | 'amc' | 'dmh' | null
  quarter: number
  year: number
}

export interface UseEarningsReturn {
  events: EarningsEvent[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching earnings calendar
 * Fetches upcoming earnings events from Finnhub
 */
export function useEarnings({
  from,
  to,
}: {
  from?: string
  to?: string
} = {}): UseEarningsReturn {
  const fromDate = from || new Date().toISOString().split('T')[0]
  const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error, isLoading, mutate } = useSWR<{ events: EarningsEvent[] }>(
    `/api/earnings?from=${fromDate}&to=${toDate}`,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch earnings')
      return response.json()
    },
    {
      refreshInterval: 60000, // 60 seconds - pick up newly reported actuals
      revalidateOnFocus: false,
    }
  )

  return {
    events: data?.events || [],
    isLoading,
    error: error ?? null,
    refetch: mutate,
  }
}
