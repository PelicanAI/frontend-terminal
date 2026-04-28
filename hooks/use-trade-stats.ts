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
  sharpe_ratio: number
  avg_winner_size: number
  avg_loser_size: number
  sizing_edge: number
  gross_profit: number
  gross_loss: number
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

// ── Shared SWR config ──

const rpcSwrConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 60000,
  shouldRetryOnError: false,
}

// ── Combined data type ──

interface AllTradeStatsData {
  stats: TradeStats
  setupStats: SetupStats[]
  dayOfWeekStats: DayOfWeekStats[]
  equityCurve: EquityCurvePoint[]
}

/**
 * Hook for fetching trade statistics
 */
export function useTradeStats({
  isPaper,
}: {
  isPaper?: boolean
} = {}): UseTradeStatsReturn {
  const supabase = useMemo(() => createClient(), [])

  const { data, error, isLoading, mutate } = useSWR<AllTradeStatsData>(
    ['trade-stats-all', isPaper],
    async () => {
      // Deployed stats RPCs do not accept p_is_paper. Keep the hook argument
      // for caller compatibility, but do not send unsupported RPC params.
      const [statsRes, setupRes, dayRes, curveRes] = await Promise.allSettled([
        supabase.rpc('get_trade_stats'),
        supabase.rpc('get_stats_by_setup'),
        supabase.rpc('get_pnl_by_day_of_week'),
        supabase.rpc('get_equity_curve'),
      ])

      const statsOk = statsRes.status === 'fulfilled' && !statsRes.value.error && statsRes.value.data
      const setupOk = setupRes.status === 'fulfilled' && !setupRes.value.error && setupRes.value.data
      const dayOk = dayRes.status === 'fulfilled' && !dayRes.value.error && dayRes.value.data
      const curveOk = curveRes.status === 'fulfilled' && !curveRes.value.error && curveRes.value.data

      if (statsOk && setupOk && dayOk && curveOk) {
        const rpcStats = statsRes.value.data as Partial<TradeStats>
        return {
          stats: {
            ...rpcStats,
            sharpe_ratio: rpcStats.sharpe_ratio ?? 0,
            avg_winner_size: rpcStats.avg_winner_size ?? 0,
            avg_loser_size: rpcStats.avg_loser_size ?? 0,
            sizing_edge: rpcStats.sizing_edge ?? 0,
            gross_profit: rpcStats.gross_profit ?? 0,
            gross_loss: rpcStats.gross_loss ?? 0,
          } as TradeStats,
          setupStats: (setupRes.value.data as SetupStats[]) || [],
          dayOfWeekStats: (dayRes.value.data as DayOfWeekStats[]) || [],
          equityCurve: (curveRes.value.data as EquityCurvePoint[]) || [],
        }
      }

      const rpcErrors = [statsRes, setupRes, dayRes, curveRes]
        .map((result) => {
          if (result.status === 'rejected') return result.reason
          return result.value.error
        })
        .filter(Boolean)

      const message = rpcErrors
        .map((rpcError) => rpcError instanceof Error ? rpcError.message : String(rpcError))
        .join('; ')

      throw new Error(message || 'Unable to load trade statistics')
    },
    rpcSwrConfig,
  )

  return {
    stats: data?.stats ?? null,
    setupStats: data?.setupStats ?? [],
    dayOfWeekStats: data?.dayOfWeekStats ?? [],
    equityCurve: data?.equityCurve ?? [],
    isLoading,
    error: error ?? null,
    refetch: () => mutate(),
  }
}
