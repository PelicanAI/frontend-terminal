"use client"

import useSWR from "swr"
import type { HeatmapStock, HeatmapResponse, HeatmapTimeframe } from "@/app/api/heatmap/route"

export type { HeatmapStock, HeatmapResponse, HeatmapTimeframe }

export type HeatmapMarket = 'stocks' | 'forex' | 'crypto'

export interface UseHeatmapReturn {
  stocks: HeatmapStock[]
  isLoading: boolean
  error: Error | null
  lastUpdated: string | null
  refetch: () => void
}

export function useHeatmap({
  autoRefresh = false,
  refreshInterval = 60000,
  timeframe = '1D' as HeatmapTimeframe,
  market = 'stocks' as HeatmapMarket,
}: {
  autoRefresh?: boolean
  refreshInterval?: number
  timeframe?: HeatmapTimeframe
  market?: HeatmapMarket
} = {}): UseHeatmapReturn {
  // Build API URL based on market
  const apiUrl = market === 'stocks'
    ? `/api/heatmap?timeframe=${timeframe}`
    : `/api/heatmap/${market}`

  // Auto-refresh: stocks only for 1D, crypto always (24/7), forex conditionally
  const shouldAutoRefresh = autoRefresh && (
    (market === 'stocks' && timeframe === '1D') ||
    market === 'crypto' ||
    market === 'forex'
  )
  const effectiveInterval = shouldAutoRefresh ? refreshInterval : 0

  const { data, error, isLoading, mutate } = useSWR<HeatmapResponse>(
    apiUrl,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch heatmap data')
      return response.json()
    },
    {
      refreshInterval: effectiveInterval,
      revalidateOnFocus: false,
      dedupingInterval: market === 'stocks' && timeframe !== '1D' ? 120000 : 30000,
    }
  )

  return {
    stocks: data?.stocks ?? [],
    isLoading,
    error: error ?? null,
    lastUpdated: data?.lastUpdated ?? null,
    refetch: mutate,
  }
}

/**
 * Format change percent with sign
 */
export function formatChangePercent(changePercent: number | null): string {
  if (changePercent === null) return "\u2014"
  const sign = changePercent >= 0 ? "+" : ""
  return `${sign}${changePercent.toFixed(2)}%`
}

/**
 * Get color intensity (0-1) for a change percent
 */
export function getColorIntensity(changePercent: number | null): number {
  if (changePercent === null) return 0
  return Math.min(Math.abs(changePercent) / 5, 1)
}

/**
 * Get Tailwind color classes for stock based on change percent
 */
export function getStockColor(changePercent: number | null): {
  bg: string
  text: string
  border: string
} {
  if (changePercent === null) {
    return { bg: 'bg-surface-1', text: 'text-foreground/50', border: 'border-border' }
  }

  const intensity = getColorIntensity(changePercent)

  if (changePercent >= -0.3 && changePercent <= 0.3) {
    return { bg: 'bg-[oklch(0.22_0.02_280_/_0.4)]', text: 'text-foreground/70', border: 'border-white/10' }
  }

  if (changePercent > 0) {
    return {
      bg: `bg-green-500/${Math.round(intensity * 30)}`,
      text: intensity > 0.6 ? 'text-green-50' : 'text-green-400',
      border: 'border-green-500/30',
    }
  }

  return {
    bg: `bg-red-500/${Math.round(intensity * 30)}`,
    text: intensity > 0.6 ? 'text-red-50' : 'text-red-400',
    border: 'border-red-500/30',
  }
}
