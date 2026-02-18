"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo } from "react"

export interface TradeStats {
  total_trades: number
  open_trades: number
  closed_trades: number
  win_rate: number
  total_pnl: number
  total_pnl_percent: number
  avg_win: number
  avg_loss: number
  largest_win: number
  largest_loss: number
  avg_r_multiple: number
  profit_factor: number
  expectancy: number
}

export interface SetupStats {
  setup_tag: string
  trade_count: number
  win_rate: number
  avg_pnl: number
  total_pnl: number
}

export interface DayOfWeekStats {
  day_of_week: string
  trade_count: number
  win_count: number
  loss_count: number
  total_pnl: number
  avg_pnl: number
}

export interface EquityCurvePoint {
  date: string
  cumulative_pnl: number
  trade_count: number
}

export interface UseTradeStatsReturn {
  stats: TradeStats | null
  setupStats: SetupStats[]
  dayOfWeekStats: DayOfWeekStats[]
  equityCurve: EquityCurvePoint[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Shared SWR config for RPC-backed hooks.
// Prevents infinite retry loops when PostgREST returns 404 (stale schema cache)
// or 403 (auth issue). Caps other errors at 3 retries with exponential backoff.
const rpcSwrConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 30000,
  onErrorRetry: (error: any, _key: string, _config: any, revalidate: any, { retryCount }: { retryCount: number }) => {
    if (error?.status === 404) return
    if (error?.status === 403) return
    if (retryCount >= 3) return
    setTimeout(() => revalidate({ retryCount }), 5000 * Math.pow(2, retryCount))
  },
}

/**
 * Hook for fetching trade statistics
 *
 * Calls Supabase RPC functions to get aggregated trade data
 */
export function useTradeStats({
  isPaper,
}: {
  isPaper?: boolean
} = {}): UseTradeStatsReturn {
  const supabase = useMemo(() => createClient(), [])

  // Fetch overall stats
  const { data: stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR<TradeStats>(
    ['trade-stats', isPaper],
    async () => {
      const { data, error } = await supabase.rpc('get_trade_stats', {
        p_is_paper: isPaper ?? null,
      })

      if (error) throw error
      return data as TradeStats
    },
    rpcSwrConfig,
  )

  // Fetch setup stats
  const { data: setupStats, error: setupError, isLoading: setupLoading, mutate: mutateSetup } = useSWR<SetupStats[]>(
    ['setup-stats', isPaper],
    async () => {
      const { data, error } = await supabase.rpc('get_stats_by_setup', {
        p_is_paper: isPaper ?? null,
      })

      if (error) throw error
      return (data as SetupStats[]) || []
    },
    rpcSwrConfig,
  )

  // Fetch day of week stats
  const { data: dayOfWeekStats, error: dayError, isLoading: dayLoading, mutate: mutateDay } = useSWR<DayOfWeekStats[]>(
    ['day-of-week-stats', isPaper],
    async () => {
      const { data, error } = await supabase.rpc('get_pnl_by_day_of_week', {
        p_is_paper: isPaper ?? null,
      })

      if (error) throw error
      return (data as DayOfWeekStats[]) || []
    },
    rpcSwrConfig,
  )

  // Fetch equity curve
  const { data: equityCurve, error: curveError, isLoading: curveLoading, mutate: mutateCurve } = useSWR<EquityCurvePoint[]>(
    ['equity-curve', isPaper],
    async () => {
      const { data, error } = await supabase.rpc('get_equity_curve', {
        p_is_paper: isPaper ?? null,
      })

      if (error) throw error
      return (data as EquityCurvePoint[]) || []
    },
    rpcSwrConfig,
  )

  const isLoading = statsLoading || setupLoading || dayLoading || curveLoading
  const error = statsError || setupError || dayError || curveError

  const refetch = () => {
    mutateStats()
    mutateSetup()
    mutateDay()
    mutateCurve()
  }

  return {
    stats: stats ?? null,
    setupStats: setupStats ?? [],
    dayOfWeekStats: dayOfWeekStats ?? [],
    equityCurve: equityCurve ?? [],
    isLoading,
    error: error ?? null,
    refetch,
  }
}
