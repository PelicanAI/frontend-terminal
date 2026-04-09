'use client'

import { useState, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Refresh01Icon as ArrowsClockwise,
  Plug01Icon as Plug,
  Delete01Icon as Trash,
  AlertCircleIcon as WarningCircle,
  CheckmarkCircle01Icon as CheckCircle,
} from '@hugeicons/core-free-icons'
import { PelicanButton } from '@/components/ui/pelican'
import { toast } from '@/hooks/use-toast'
import { useBrokerConnections, type BrokerConnection } from '@/hooks/use-broker-connections'
import { ConnectBrokerButton } from './connect-broker-button'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusBadge({ status }: { status: BrokerConnection['status'] }) {
  const config = {
    pending: { color: 'var(--data-warning)', label: 'Pending', Icon: WarningCircle },
    active: { color: 'var(--data-positive)', label: 'Active', Icon: CheckCircle },
    disabled: { color: 'var(--text-muted)', label: 'Disconnected', Icon: Plug },
    error: { color: 'var(--data-negative)', label: 'Error', Icon: WarningCircle },
  }[status]

  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: config.color }}>
      <HugeiconsIcon icon={config.Icon} size={12} strokeWidth={1.5} color="currentColor" />
      {config.label}
    </span>
  )
}

export function ConnectedBrokers() {
  const { connections, isLoading, refetch } = useBrokerConnections()
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/snaptrade/sync', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Sync failed')
      }
      const { synced, closed } = await res.json()
      toast({
        title: 'Positions synced',
        description: `${synced} synced, ${closed} closed.`,
      })
      refetch()
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }, [refetch])

  const handleDisconnect = useCallback(async (connectionId: string) => {
    setDisconnecting(connectionId)
    try {
      const res = await fetch('/api/snaptrade/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Disconnect failed')
      }
      toast({ title: 'Broker disconnected' })
      refetch()
    } catch (error) {
      toast({
        title: 'Disconnect failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setDisconnecting(null)
    }
  }, [refetch])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-[var(--bg-elevated)] rounded" />
          <div className="h-12 bg-[var(--bg-elevated)] rounded" />
        </div>
      </div>
    )
  }

  const activeConnections = connections.filter(c => c.status !== 'disabled')

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Connected Brokers</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Auto-sync your brokerage positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeConnections.length > 0 && (
            <PelicanButton
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <HugeiconsIcon icon={ArrowsClockwise} size={14} className={syncing ? 'animate-spin' : ''} strokeWidth={1.5} color="currentColor" />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </PelicanButton>
          )}
          <ConnectBrokerButton variant="primary" size="sm" />
        </div>
      </div>

      {activeConnections.length === 0 ? (
        <div className="text-center py-8">
          <HugeiconsIcon icon={Plug} size={32} className="mx-auto mb-3 text-[var(--text-muted)]" strokeWidth={1} color="currentColor" />
          <p className="text-sm text-[var(--text-secondary)]">No brokers connected</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Connect your brokerage to auto-sync positions
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeConnections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-hover)] transition-colors duration-150"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                  <HugeiconsIcon icon={Plug} size={16} className="text-[var(--text-secondary)]" strokeWidth={1.5} color="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {conn.brokerage_name || 'Brokerage'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={conn.status} />
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Synced {timeAgo(conn.last_synced_at)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDisconnect(conn.id)}
                disabled={disconnecting === conn.id}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--data-negative)] hover:bg-[var(--data-negative)]/10 transition-colors duration-150"
                aria-label="Disconnect broker"
              >
                <HugeiconsIcon icon={Trash} size={16} strokeWidth={1.5} color="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
