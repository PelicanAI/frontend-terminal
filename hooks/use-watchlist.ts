"use client"

import useSWR from "swr"
import { useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { normalizeTicker } from "@/lib/utils"
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
      const rows = data as WatchlistItem[]

      // One-time dedup: remove rows that are duplicates after normalization
      const seen = new Set<string>()
      const dupeIds: string[] = []
      for (const row of rows) {
        const norm = normalizeTicker(row.ticker)
        if (seen.has(norm)) {
          dupeIds.push(row.id)
        }
        seen.add(norm)
      }
      if (dupeIds.length > 0) {
        await supabase.from('watchlist').delete().in('id', dupeIds)
        return rows.filter(r => !dupeIds.includes(r.id))
      }

      return rows
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )

  const items = data || []

  const addToWatchlist = useCallback(async (
    rawTicker: string,
    conversationId?: string
  ): Promise<boolean> => {
    const ticker = normalizeTicker(rawTicker)

    if (pendingOps.current.has(`add-${ticker}`)) return false
    pendingOps.current.add(`add-${ticker}`)

    // Already on watchlist (normalized comparison)
    if (items.some(i => normalizeTicker(i.ticker) === ticker)) {
      pendingOps.current.delete(`add-${ticker}`)
      return true
    }

    // Optimistic insert
    const tempId = crypto.randomUUID()
    const optimistic: WatchlistItem = {
      id: tempId,
      ticker,
      notes: null,
      alert_price_above: null,
      alert_price_below: null,
      created_at: new Date().toISOString(),
    }

    mutate([optimistic, ...items], false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const insertData: Record<string, string | null> = {
        ticker,
        user_id: user.id,
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
      pendingOps.current.delete(`add-${ticker}`)
    }
  }, [items, mutate, supabase])

  const removeFromWatchlist = useCallback(async (
    rawTicker: string
  ): Promise<boolean> => {
    const ticker = normalizeTicker(rawTicker)

    if (pendingOps.current.has(`remove-${ticker}`)) return false
    pendingOps.current.add(`remove-${ticker}`)

    const existing = items.find(i => normalizeTicker(i.ticker) === ticker)
    if (!existing) {
      pendingOps.current.delete(`remove-${ticker}`)
      return true
    }

    // Optimistic remove — filter by normalized comparison
    mutate(items.filter(i => normalizeTicker(i.ticker) !== ticker), false)

    try {
      // Delete the actual row by its stored ticker value
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('ticker', existing.ticker)

      if (error) throw error

      mutate()
      return true
    } catch {
      // Rollback
      mutate(items, false)
      return false
    } finally {
      pendingOps.current.delete(`remove-${ticker}`)
    }
  }, [items, mutate, supabase])

  const isOnWatchlist = useCallback((rawTicker: string): boolean => {
    const ticker = normalizeTicker(rawTicker)
    return items.some(i => normalizeTicker(i.ticker) === ticker)
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
