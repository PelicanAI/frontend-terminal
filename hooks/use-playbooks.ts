"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo, useCallback } from "react"
import type { Playbook } from "@/types/trading"

export interface UsePlaybooksReturn {
  playbooks: Playbook[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createPlaybook: (data: CreatePlaybookData) => Promise<Playbook>
  updatePlaybook: (id: string, updates: Partial<CreatePlaybookData>) => Promise<void>
  deletePlaybook: (id: string) => Promise<void>
}

export interface CreatePlaybookData {
  name: string
  setup_type: string
  description?: string | null
  timeframe?: string | null
  market_conditions?: string | null
  entry_rules?: string | null
  exit_rules?: string | null
  risk_rules?: string | null
  checklist?: string[]
}

export function usePlaybooks(): UsePlaybooksReturn {
  const supabase = useMemo(() => createClient(), [])

  const { data, error, isLoading, mutate } = useSWR<Playbook[]>(
    'playbooks',
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as Playbook[]) || []
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const createPlaybook = useCallback(async (pbData: CreatePlaybookData): Promise<Playbook> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('playbooks')
      .insert({
        user_id: user.id,
        name: pbData.name,
        setup_type: pbData.setup_type,
        description: pbData.description ?? null,
        timeframe: pbData.timeframe ?? null,
        market_conditions: pbData.market_conditions ?? null,
        entry_rules: pbData.entry_rules ?? null,
        exit_rules: pbData.exit_rules ?? null,
        risk_rules: pbData.risk_rules ?? null,
        checklist: pbData.checklist ?? [],
      })
      .select()
      .single()

    if (error) throw error
    mutate()
    return data as Playbook
  }, [supabase, mutate])

  const updatePlaybook = useCallback(async (id: string, updates: Partial<CreatePlaybookData>) => {
    const { error } = await supabase
      .from('playbooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    mutate()
  }, [supabase, mutate])

  const deletePlaybook = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', id)

    if (error) throw error
    mutate()
  }, [supabase, mutate])

  return {
    playbooks: data || [],
    isLoading,
    error: error ?? null,
    refetch: mutate,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
  }
}
