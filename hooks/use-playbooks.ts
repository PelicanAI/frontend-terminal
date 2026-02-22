"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Playbook } from "@/types/trading"

export function usePlaybooks() {
  const supabase = useMemo(() => createClient(), [])

  const { data, error, isLoading, mutate } = useSWR<Playbook[]>(
    'playbooks',
    async () => {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as Playbook[]) || []
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const playbooks = data || []
  const activePlaybooks = playbooks.filter(p => p.is_active !== false)

  return {
    playbooks,
    activePlaybooks,
    isLoading,
    error: error ?? null,
    refetch: mutate,
  }
}
