"use client"

import useSWR from "swr"

export interface EconomicEvent {
  event: string
  country: string
  date: string
  time: string
  impact: 'low' | 'medium' | 'high'
  actual: number | null
  estimate: number | null
  prior: number | null
  unit: string
}

export function useEconomicCalendar({ from, to }: { from: string; to: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    from && to ? `/api/economic-calendar?from=${from}&to=${to}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch economic calendar')
      return res.json()
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  return {
    events: (data?.events ?? []) as EconomicEvent[],
    isLoading,
    error: error ?? null,
    refetch: mutate,
  }
}
