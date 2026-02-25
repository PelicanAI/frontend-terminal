"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo } from "react"

export interface Trade {
  id: string
  user_id: string
  ticker: string
  asset_type: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price: number | null
  stop_loss: number | null
  take_profit: number | null
  status: 'open' | 'closed' | 'cancelled'
  pnl_amount: number | null
  pnl_percent: number | null
  r_multiple: number | null
  entry_date: string
  exit_date: string | null
  thesis: string | null
  notes: string | null
  setup_tags: string[] | null
  conviction: number | null
  ai_grade: Record<string, unknown> | null
  plan_rules_followed: string[] | null
  plan_rules_violated: string[] | null
  plan_checklist_completed: Record<string, boolean> | null
  playbook_id: string | null
  is_paper: boolean
  created_at: string
  updated_at: string
}

export interface TradeFormData {
  ticker: string
  asset_type?: string
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  stop_loss?: number | null
  take_profit?: number | null
  entry_date: string
  thesis?: string | null
  notes?: string | null
  setup_tags?: string[]
  conviction?: number | null
  is_paper?: boolean
  playbook_id?: string | null
  plan_rules_followed?: string[]
  plan_rules_violated?: string[]
  plan_checklist_completed?: Record<string, boolean>
}

export interface CloseTradeData {
  exit_price: number
  exit_date: string
  notes?: string | null
  mistakes?: string | null
}

export interface CloseTradeResult {
  success: boolean
  pnl_amount?: number
  pnl_percent?: number
  r_multiple?: number
  error?: string
}

export interface UseTradesReturn {
  trades: Trade[]
  openTrades: Trade[]
  closedTrades: Trade[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  logTrade: (data: TradeFormData) => Promise<Trade>
  closeTrade: (tradeId: string, data: CloseTradeData) => Promise<CloseTradeResult>
  updateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<void>
  deleteTrade: (tradeId: string) => Promise<void>
}

/**
 * Hook for managing trades
 *
 * Provides CRUD operations for trades and real-time updates via SWR
 */
export function useTrades({
  status,
  isPaper,
}: {
  status?: 'open' | 'closed' | 'cancelled'
  isPaper?: boolean
} = {}): UseTradesReturn {
  const supabase = useMemo(() => createClient(), [])

  const { data, error, isLoading, mutate } = useSWR<Trade[]>(
    ['trades', status, isPaper],
    async () => {
      let query = supabase
        .from('trades')
        .select('*')
        .order('entry_date', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (isPaper !== undefined) {
        query = query.eq('is_paper', isPaper)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Trade[]
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const trades = data || []
  const openTrades = trades.filter((t) => t.status === 'open')
  const closedTrades = trades.filter((t) => t.status === 'closed')

  const logTrade = async (tradeData: TradeFormData): Promise<Trade> => {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('You must be logged in to log a trade')
    }

    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        ticker: tradeData.ticker.toUpperCase(),
        asset_type: tradeData.asset_type || 'stock',
        direction: tradeData.direction,
        quantity: tradeData.quantity,
        entry_price: tradeData.entry_price,
        stop_loss: tradeData.stop_loss,
        take_profit: tradeData.take_profit,
        entry_date: tradeData.entry_date,
        thesis: tradeData.thesis,
        notes: tradeData.notes,
        setup_tags: tradeData.setup_tags || [],
        conviction: tradeData.conviction,
        is_paper: tradeData.is_paper ?? false,
        playbook_id: tradeData.playbook_id || null,
        plan_rules_followed: tradeData.plan_rules_followed || [],
        plan_rules_violated: tradeData.plan_rules_violated || [],
        plan_checklist_completed: tradeData.plan_checklist_completed || {},
        status: 'open',
        position_size_usd: tradeData.entry_price * tradeData.quantity,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to save trade')
    }

    // Revalidate trades
    mutate()

    return data as Trade
  }

  const closeTrade = async (tradeId: string, closeData: CloseTradeData): Promise<CloseTradeResult> => {
    // Call the close_trade RPC function
    const { data, error } = await supabase.rpc('close_trade', {
      p_trade_id: tradeId,
      p_exit_price: closeData.exit_price,
      p_exit_date: closeData.exit_date,
      p_notes: closeData.notes || null,
      p_mistakes: closeData.mistakes || null,
    })

    if (error) {
      return { success: false, error: error.message || 'Failed to close trade' }
    }

    // Revalidate trades
    mutate()

    // Revalidate all stats-related SWR keys (trade stats, equity curve, P&L by day, etc.)
    globalMutate(
      (key: unknown) => {
        if (typeof key === 'string') {
          return key.includes('stats') || key.includes('equity') || key.includes('pnl')
        }
        if (Array.isArray(key)) {
          return key.some(
            (k) => typeof k === 'string' && (k.includes('stats') || k.includes('equity') || k.includes('pnl'))
          )
        }
        return false
      },
      undefined,
      { revalidate: true }
    )

    // Fire and forget — auto-grade the closed trade
    fetch('/api/grade-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trade_id: tradeId }),
    })
      .then(() => {
        // Re-fetch to pick up the grade
        setTimeout(() => mutate(), 1500)
      })
      .catch(() => {
        // Grading is non-blocking
      })

    return {
      success: true,
      pnl_amount: data?.pnl_amount,
      pnl_percent: data?.pnl_percent,
      r_multiple: data?.r_multiple,
    }
  }

  const updateTrade = async (tradeId: string, updates: Partial<Trade>): Promise<void> => {
    // Strip protected fields that should never be client-updated
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, status, pnl_amount, pnl_percent, r_multiple, created_at, id, ...safeUpdates } = updates

    const { error } = await supabase
      .from('trades')
      .update(safeUpdates)
      .eq('id', tradeId)

    if (error) {
      throw new Error(error.message || 'Failed to update trade')
    }

    // Revalidate trades
    mutate()
  }

  const deleteTrade = async (tradeId: string): Promise<void> => {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)

    if (error) {
      throw new Error(error.message || 'Failed to delete trade')
    }

    // Revalidate trades
    mutate()
  }

  return {
    trades,
    openTrades,
    closedTrades,
    isLoading,
    error: error ?? null,
    refetch: mutate,
    logTrade,
    closeTrade,
    updateTrade,
    deleteTrade,
  }
}
