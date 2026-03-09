"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTradingPlan } from "@/hooks/use-trading-plan"
import {
  calculateCompliance,
  generatePlanInsight,
  type PlanCompliance,
} from "@/lib/plan-compliance"
import type { TradingPlan } from "@/types/trading"
import type { Trade } from "@/hooks/use-trades"

export interface UseLiveComplianceReturn {
  compliance: PlanCompliance | null
  insight: string | null
  plan: TradingPlan | null
  isLoading: boolean
  error: Error | null
  refresh: () => void
}

export function useLiveCompliance(): UseLiveComplianceReturn {
  const supabase = useMemo(() => createClient(), [])
  const { plan } = useTradingPlan()

  const { data, isLoading, error, mutate } = useSWR<{
    compliance: PlanCompliance
    insight: string
  } | null>(
    plan ? ['live-compliance', plan.id] : null,
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      // Last 30 days of trades
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: tradeData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', thirtyDaysAgo.toISOString())
        .order('exit_date', { ascending: false, nullsFirst: false })

      const allTrades = (tradeData || []) as Trade[]

      // Today's trades
      const now = new Date()
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString()
      const todayTrades = allTrades.filter((t) => t.entry_date >= todayStart)

      // Open positions
      const openPositions = allTrades.filter((t) => t.status === 'open')

      // Today's closed P&L
      const todayClosedPnl = allTrades
        .filter(
          (t) =>
            t.status === 'closed' &&
            t.exit_date &&
            t.exit_date >= todayStart
        )
        .reduce((sum, t) => sum + (t.pnl_amount ?? 0), 0)

      const compliance = calculateCompliance({
        plan: plan!,
        trades: allTrades,
        openPositions,
        todayTrades,
        todayClosedPnl,
      })

      const insight = generatePlanInsight(compliance)

      return { compliance, insight }
    },
    { revalidateOnFocus: true, dedupingInterval: 30000 }
  )

  return {
    compliance: data?.compliance ?? null,
    insight: data?.insight ?? null,
    plan,
    isLoading,
    error: error ?? null,
    refresh: mutate,
  }
}
