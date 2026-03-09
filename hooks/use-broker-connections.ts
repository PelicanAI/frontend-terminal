"use client"

import useSWR from "swr"
import { useAuth } from "@/lib/providers/auth-provider"

export interface BrokerConnection {
  id: string
  brokerage_authorization_id: string | null
  brokerage_name: string | null
  status: 'active' | 'disabled' | 'error'
  last_synced_at: string | null
  connected_at: string
}

export function useBrokerConnections() {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR<BrokerConnection[]>(
    user ? ['broker-connections', user.id] : null,
    async () => {
      const res = await fetch('/api/snaptrade/connections')
      if (!res.ok) throw new Error('Failed to fetch connections')
      const json = await res.json()
      return json.connections ?? []
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const activeConnections = (data ?? []).filter(c => c.status === 'active')

  return {
    connections: data ?? [],
    activeConnections,
    hasConnections: activeConnections.length > 0,
    isLoading,
    error: error ?? null,
    refetch: mutate,
  }
}
