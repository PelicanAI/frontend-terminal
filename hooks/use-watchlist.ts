"use client"

import useSWR from "swr"
import { useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ActionWatchlistItem } from "@/types/action-buttons"

interface WatchlistItem {
  id: string
  ticker: string
  notes: string | null
  alert_price_above: number | null
  alert_price_below: number | null
  created_at: string
}

export function useWatchlist() {
  const supabase = useMemo(() => createClient(), [])
  const pendingOps = useRef(new Set<string>())

  const { data, error, isLoading, mutate } = useSWR<WatchlistItem[]>(
    'watchlist',
    async () => {
      const { data, error } = await supabase
        .from('watchlist')
        .select('id, ticker, notes, alert_price_above, alert_price_below, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as WatchlistItem[]
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )

  const items = data || []

  const addToWatchlist = useCallback(async (
    ticker: string,
    conversationId?: string
  ): Promise<boolean> => {
    const upper = ticker.toUpperCase()

    if (pendingOps.current.has(`add-${upper}`)) return false
    pendingOps.current.add(`add-${upper}`)

    // Already on watchlist
    if (items.some(i => i.ticker === upper)) {
      pendingOps.current.delete(`add-${upper}`)
      return true
    }

    // Optimistic insert
    const tempId = crypto.randomUUID()
    const optimistic: WatchlistItem = {
      id: tempId,
      ticker: upper,
      notes: null,
      alert_price_above: null,
      alert_price_below: null,
      created_at: new Date().toISOString(),
    }

    mutate([optimistic, ...items], false)

    try {
      const insertData: Record<string, string | null> = {
        ticker: upper,
      }
      if (conversationId) {
        insertData.conversation_id = conversationId
      }

      const { error } = await supabase
        .from('watchlist')
        .insert(insertData)

      if (error) throw error

      // Revalidate to get real data
      mutate()
      return true
    } catch {
      // Rollback
      mutate(items, false)
      return false
    } finally {
      pendingOps.current.delete(`add-${upper}`)
    }
  }, [items, mutate, supabase])

  const removeFromWatchlist = useCallback(async (
    ticker: string
  ): Promise<boolean> => {
    const upper = ticker.toUpperCase()

    if (pendingOps.current.has(`remove-${upper}`)) return false
    pendingOps.current.add(`remove-${upper}`)

    const existing = items.find(i => i.ticker === upper)
    if (!existing) {
      pendingOps.current.delete(`remove-${upper}`)
      return true
    }

    // Optimistic remove
    mutate(items.filter(i => i.ticker !== upper), false)

    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('ticker', upper)

      if (error) throw error

      mutate()
      return true
    } catch {
      // Rollback
      mutate(items, false)
      return false
    } finally {
      pendingOps.current.delete(`remove-${upper}`)
    }
  }, [items, mutate, supabase])

  const isOnWatchlist = useCallback((ticker: string): boolean => {
    return items.some(i => i.ticker === ticker.toUpperCase())
  }, [items])

  const asActionItems: ActionWatchlistItem[] = useMemo(
    () => items.map(i => ({ id: i.id, ticker: i.ticker })),
    [items]
  )

  return {
    items,
    asActionItems,
    loading: isLoading,
    error: error ?? null,
    addToWatchlist,
    removeFromWatchlist,
    isOnWatchlist,
    refetch: mutate,
  }
}
