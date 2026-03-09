'use client'

import { useState, useCallback } from 'react'
import { PlugsConnected } from '@phosphor-icons/react'
import { PelicanButton } from '@/components/ui/pelican'
import { toast } from '@/hooks/use-toast'
import { useBrokerConnections } from '@/hooks/use-broker-connections'

// Conditionally import SnapTradeReact — it may not be SSR-safe
import dynamic from 'next/dynamic'
const SnapTradeReact = dynamic(
  () => import('snaptrade-react').then(mod => mod.SnapTradeReact),
  { ssr: false }
)

interface ConnectBrokerButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ConnectBrokerButton({
  variant = 'secondary',
  size = 'sm',
  className,
}: ConnectBrokerButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [redirectLink, setRedirectLink] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { refetch } = useBrokerConnections()

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    try {
      // Step 1: Register (idempotent — returns existing if already registered)
      const registerRes = await fetch('/api/snaptrade/register', { method: 'POST' })
      if (!registerRes.ok) {
        const err = await registerRes.json()
        throw new Error(err.error || 'Registration failed')
      }

      // Step 2: Get login link
      const connectRes = await fetch('/api/snaptrade/connect', { method: 'POST' })
      if (!connectRes.ok) {
        const err = await connectRes.json()
        throw new Error(err.error || 'Failed to generate connection link')
      }

      const { redirectURI } = await connectRes.json()
      setRedirectLink(redirectURI)
      setIsModalOpen(true)
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const handleSuccess = useCallback(async (authorizationId: string) => {
    setIsModalOpen(false)
    setRedirectLink(null)

    // Save the authorization ID (update the connection record)
    try {
      // Trigger a sync immediately
      const syncRes = await fetch('/api/snaptrade/sync', { method: 'POST' })
      if (syncRes.ok) {
        const { synced } = await syncRes.json()
        toast({
          title: 'Broker connected',
          description: `Synced ${synced} position${synced !== 1 ? 's' : ''} from your broker.`,
        })
      } else {
        toast({ title: 'Broker connected', description: 'Positions will sync shortly.' })
      }
    } catch {
      toast({ title: 'Broker connected', description: 'Positions will sync shortly.' })
    }

    // Refetch connection list
    refetch()

    // Store the authorizationId if needed — we can do this via a simple update call
    void fetch('/api/snaptrade/connections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationId }),
    }).catch(() => { /* non-critical */ })
  }, [refetch])

  const handleError = useCallback((error: { detail?: string; statusCode?: string }) => {
    setIsModalOpen(false)
    setRedirectLink(null)
    toast({
      title: 'Connection failed',
      description: error?.detail || 'Failed to connect broker. Please try again.',
      variant: 'destructive',
    })
  }, [])

  return (
    <>
      <PelicanButton
        variant={variant}
        size={size}
        onClick={handleConnect}
        disabled={isConnecting}
        className={className}
      >
        <PlugsConnected size={14} weight="bold" />
        {isConnecting ? 'Connecting...' : 'Connect Broker'}
      </PelicanButton>

      {redirectLink && (
        <SnapTradeReact
          loginLink={redirectLink}
          isOpen={isModalOpen}
          close={() => {
            setIsModalOpen(false)
            setRedirectLink(null)
          }}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </>
  )
}
