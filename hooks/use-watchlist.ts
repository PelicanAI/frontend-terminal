"use client"

import useSWR from "swr"
import { useMemo, useCallback, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { normalizeTicker } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { ActionWatchlistItem } from "@/types/action-buttons"

interface WatchlistItem {
  id: string
  ticker: string
  notes: string | null
  alert_price_above: number | null
  alert_price_below: number | null
  custom_prompt: string | null
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
        .select('id, ticker, notes, alert_price_above, alert_price_below, custom_prompt, created_at')
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

  // One-time dedup: clean up duplicate rows after first data load
  const hasDeduped = useRef(false)

  useEffect(() => {
    if (hasDeduped.current || !data || data.length === 0) return
    hasDeduped.current = true

    const seen = new Set<string>()
    const dupeIds: string[] = []
    for (const row of data) {
      const norm = normalizeTicker(row.ticker)
      if (seen.has(norm)) dupeIds.push(row.id)
      seen.add(norm)
    }

    if (dupeIds.length > 0) {
      supabase.from('watchlist').delete().in('id', dupeIds).then(() => mutate())
    }
  }, [data, supabase, mutate])

  const addToWatchlist = useCallback(async (
    rawTicker: string,
    options?: {
      added_from?: 'manual' | 'chat' | 'trade' | 'onboarding'
      conversationId?: string
    }
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
      custom_prompt: null,
      created_at: new Date().toISOString(),
    }

    mutate([optimistic, ...items], false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const insertData: Record<string, string | null> = {
        ticker,
        user_id: user.id,
        added_from: options?.added_from || 'manual',
      }
      if (options?.conversationId) {
        insertData.conversation_id = options.conversationId
      }

      const { error } = await supabase
        .from('watchlist')
        .insert(insertData)

      if (error) throw error

      // Revalidate to get real data
      mutate()
      toast({ title: "Added to watchlist", description: ticker })
      return true
    } catch {
      // Rollback
      mutate(items, false)
      toast({ title: "Failed to add to watchlist", variant: "destructive" })
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
      toast({ title: "Removed from watchlist", description: ticker })
      return true
    } catch {
      // Rollback
      mutate(items, false)
      toast({ title: "Failed to remove from watchlist", variant: "destructive" })
      return false
    } finally {
      pendingOps.current.delete(`remove-${ticker}`)
    }
  }, [items, mutate, supabase])

  const updateCustomPrompt = useCallback(async (
    rawTicker: string,
    customPrompt: string | null
  ): Promise<boolean> => {
    const ticker = normalizeTicker(rawTicker)
    const existing = items.find(i => normalizeTicker(i.ticker) === ticker)
    if (!existing) return false

    // Optimistic update
    const updatedItems = items.map(i =>
      normalizeTicker(i.ticker) === ticker
        ? { ...i, custom_prompt: customPrompt }
        : i
    )
    mutate(updatedItems, false)

    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ custom_prompt: customPrompt })
        .eq('id', existing.id)

      if (error) throw error
      mutate()
      return true
    } catch {
      mutate(items, false)
      return false
    }
  }, [items, mutate, supabase])

  const updateWatchlistItem = useCallback(async (
    id: string,
    updates: {
      alert_price_above?: number | null
      alert_price_below?: number | null
      notes?: string | null
      custom_prompt?: string | null
    }
  ): Promise<boolean> => {
    // Optimistic update
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
    mutate(updatedItems, false)

    try {
      const { error } = await supabase
        .from('watchlist')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      mutate()
      return true
    } catch {
      mutate(items, false)
      toast({ title: "Failed to update watchlist item", variant: "destructive" })
      return false
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
    updateCustomPrompt,
    updateWatchlistItem,
    isOnWatchlist,
    refetch: mutate,
  }
}
