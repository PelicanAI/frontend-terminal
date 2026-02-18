"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo, useCallback } from "react"
import type { TradingPlan } from "@/types/trading"

export interface UseTradingPlanReturn {
  plan: TradingPlan | null
  plans: TradingPlan[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createPlan: (data: CreatePlanData) => Promise<TradingPlan>
  updatePlan: (planId: string, updates: Partial<TradingPlan>) => Promise<void>
  deletePlan: (planId: string) => Promise<void>
  setActivePlan: (planId: string) => Promise<void>
}

export interface CreatePlanData {
  name: string
  max_risk_per_trade_pct?: number | null
  max_daily_loss?: number | null
  max_weekly_loss?: number | null
  max_monthly_loss?: number | null
  max_open_positions?: number | null
  max_position_size_usd?: number | null
  max_position_size_pct?: number | null
  min_risk_reward_ratio?: number | null
  max_trades_per_day?: number | null
  require_stop_loss?: boolean
  require_take_profit?: boolean
  require_thesis?: boolean
  pre_entry_checklist?: string[]
  allowed_asset_types?: string[]
  blocked_tickers?: string[]
  max_consecutive_losses_before_stop?: number | null
  no_same_ticker_after_loss?: boolean
  plan_notes?: string | null
}

export function useTradingPlan(): UseTradingPlanReturn {
  const supabase = useMemo(() => createClient(), [])

  const { data, error, isLoading, mutate } = useSWR<TradingPlan[]>(
    'trading-plans',
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('trading_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data as TradingPlan[]) || []
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const plans = data || []
  const activePlan = plans.find(p => p.is_active) || null

  const createPlan = useCallback(async (planData: CreatePlanData): Promise<TradingPlan> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('trading_plans')
      .insert({
        user_id: user.id,
        name: planData.name,
        is_active: plans.length === 0,
        max_risk_per_trade_pct: planData.max_risk_per_trade_pct ?? null,
        max_daily_loss: planData.max_daily_loss ?? null,
        max_weekly_loss: planData.max_weekly_loss ?? null,
        max_monthly_loss: planData.max_monthly_loss ?? null,
        max_open_positions: planData.max_open_positions ?? null,
        max_position_size_usd: planData.max_position_size_usd ?? null,
        max_position_size_pct: planData.max_position_size_pct ?? null,
        min_risk_reward_ratio: planData.min_risk_reward_ratio ?? null,
        max_trades_per_day: planData.max_trades_per_day ?? null,
        require_stop_loss: planData.require_stop_loss ?? false,
        require_take_profit: planData.require_take_profit ?? false,
        require_thesis: planData.require_thesis ?? false,
        pre_entry_checklist: planData.pre_entry_checklist ?? [],
        allowed_asset_types: planData.allowed_asset_types ?? [],
        blocked_tickers: planData.blocked_tickers ?? [],
        max_consecutive_losses_before_stop: planData.max_consecutive_losses_before_stop ?? null,
        no_same_ticker_after_loss: planData.no_same_ticker_after_loss ?? false,
        plan_notes: planData.plan_notes ?? null,
      })
      .select()
      .single()

    if (error) throw error
    mutate()
    return data as TradingPlan
  }, [supabase, mutate, plans.length])

  const updatePlan = useCallback(async (planId: string, updates: Partial<TradingPlan>) => {
    const { error } = await supabase
      .from('trading_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)

    if (error) throw error
    mutate()
  }, [supabase, mutate])

  const deletePlan = useCallback(async (planId: string) => {
    const { error } = await supabase
      .from('trading_plans')
      .delete()
      .eq('id', planId)

    if (error) throw error
    mutate()
  }, [supabase, mutate])

  const setActivePlan = useCallback(async (planId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Deactivate all plans
    await supabase
      .from('trading_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Activate the chosen one
    const { error } = await supabase
      .from('trading_plans')
      .update({ is_active: true })
      .eq('id', planId)

    if (error) throw error
    mutate()
  }, [supabase, mutate])

  return {
    plan: activePlan,
    plans,
    isLoading,
    error: error ?? null,
    refetch: mutate,
    createPlan,
    updatePlan,
    deletePlan,
    setActivePlan,
  }
}
