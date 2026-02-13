"use client"

import useSWR from "swr"
import { HeatmapStock, HeatmapResponse } from "@/app/api/heatmap/route"

export interface UseHeatmapReturn {
  stocks: HeatmapStock[]
  isLoading: boolean
  error: Error | null
  lastUpdated: string | null
  refetch: () => void
}

/**
 * Hook for fetching S&P 500 heatmap data
 *
 * Fetches stock prices and performance data for heatmap visualization
 * Uses SWR for caching and auto-revalidation
 *
 * @param autoRefresh - Enable auto-refresh (default: false for performance)
 * @param refreshInterval - Refresh interval in ms (default: 60000 = 1 minute)
 */
export function useHeatmap({
  autoRefresh = false,
  refreshInterval = 60000,
}: {
  autoRefresh?: boolean
  refreshInterval?: number
} = {}): UseHeatmapReturn {
  const { data, error, isLoading, mutate } = useSWR<HeatmapResponse>(
    '/api/heatmap',
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch heatmap data')
      return response.json()
    },
    {
      refreshInterval: autoRefresh ? refreshInterval : 0,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds client-side
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
 * Format change percent with color indicator
 */
export function formatChangePercent(changePercent: number | null): string {
  if (changePercent === null) return "—"
  const sign = changePercent >= 0 ? "+" : ""
  return `${sign}${changePercent.toFixed(2)}%`
}

/**
 * Get color intensity for heatmap cell based on change percent
 * Returns opacity value (0-1)
 */
export function getColorIntensity(changePercent: number | null): number {
  if (changePercent === null) return 0
  const absChange = Math.abs(changePercent)
  // Cap at 5% for max intensity
  return Math.min(absChange / 5, 1)
}

/**
 * Get color for stock based on change percent
 * Positive = green, Negative = red, Neutral = gray
 */
export function getStockColor(changePercent: number | null): {
  bg: string
  text: string
  border: string
} {
  if (changePercent === null) {
    return {
      bg: 'bg-surface-1',
      text: 'text-foreground/50',
      border: 'border-border',
    }
  }

  const intensity = getColorIntensity(changePercent)

  if (changePercent >= -0.3 && changePercent <= 0.3) {
    return {
      bg: 'bg-[oklch(0.22_0.02_280_/_0.4)]',
      text: 'text-foreground/70',
      border: 'border-white/10',
    }
  }

  if (changePercent > 0) {
    // Green for positive
    return {
      bg: `bg-green-500/${Math.round(intensity * 30)}`,
      text: intensity > 0.6 ? 'text-green-50' : 'text-green-400',
      border: 'border-green-500/30',
    }
  } else if (changePercent < 0) {
    // Red for negative
    return {
      bg: `bg-red-500/${Math.round(intensity * 30)}`,
      text: intensity > 0.6 ? 'text-red-50' : 'text-red-400',
      border: 'border-red-500/30',
    }
  } else {
    // Neutral
    return {
      bg: 'bg-surface-1',
      text: 'text-foreground/70',
      border: 'border-border',
    }
  }
}
