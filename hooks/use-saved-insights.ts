"use client"

import useSWR from "swr"
import { useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface SavedInsight {
  id: string
  content: string
  tickers: string[]
  note: string | null
  conversation_id: string | null
  message_id: string | null
  created_at: string
}

export function useSavedInsights() {
  const supabase = useMemo(() => createClient(), [])

  const { data, error, isLoading, mutate } = useSWR<SavedInsight[]>(
    'saved-insights',
    async () => {
      const { data, error } = await supabase
        .from('saved_insights')
        .select('id, content, tickers, note, conversation_id, message_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as SavedInsight[]
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const items = data || []

  const saveInsight = useCallback(async (
    content: string,
    opts?: {
      tickers?: string[]
      conversationId?: string
      messageId?: string
    }
  ): Promise<boolean> => {
    const preview: SavedInsight = {
      id: crypto.randomUUID(),
      content,
      tickers: opts?.tickers || [],
      note: null,
      conversation_id: opts?.conversationId || null,
      message_id: opts?.messageId || null,
      created_at: new Date().toISOString(),
    }

    mutate([preview, ...items], false)

    try {
      const insertData: Record<string, unknown> = { content }
      if (opts?.tickers?.length) insertData.tickers = opts.tickers
      if (opts?.conversationId) insertData.conversation_id = opts.conversationId
      if (opts?.messageId) insertData.message_id = opts.messageId

      const { error } = await supabase
        .from('saved_insights')
        .insert(insertData)

      if (error) throw error

      mutate()
      return true
    } catch {
      mutate(items, false)
      return false
    }
  }, [items, mutate, supabase])

  const deleteInsight = useCallback(async (id: string): Promise<boolean> => {
    mutate(items.filter(i => i.id !== id), false)

    try {
      const { error } = await supabase
        .from('saved_insights')
        .delete()
        .eq('id', id)

      if (error) throw error
      mutate()
      return true
    } catch {
      mutate(items, false)
      return false
    }
  }, [items, mutate, supabase])

  return {
    items,
    loading: isLoading,
    error: error ?? null,
    saveInsight,
    deleteInsight,
    refetch: mutate,
  }
}
