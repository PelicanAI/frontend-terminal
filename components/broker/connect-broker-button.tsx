'use client'

import { useState } from 'react'
import { PlugsConnected } from '@phosphor-icons/react'
import { SnapTradeReact } from 'snaptrade-react'
import { PelicanButton } from '@/components/ui/pelican'
import { toast } from '@/hooks/use-toast'

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
  const [isLoading, setIsLoading] = useState(false)
  const [redirectLink, setRedirectLink] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  async function handleConnect() {
    setIsLoading(true)
    try {
      // Step 1: Register (idempotent)
      const registerRes = await fetch('/api/snaptrade/register', { method: 'POST' })
      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to register with broker service')
      }

      // Step 2: Get redirect URI
      const connectRes = await fetch('/api/snaptrade/connect', { method: 'POST' })
      if (!connectRes.ok) {
        const err = await connectRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate broker login link')
      }

      const { redirectURI } = await connectRes.json()
      if (!redirectURI) {
        throw new Error('No redirect URI returned')
      }

      setRedirectLink(redirectURI)
      setIsOpen(true)
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PelicanButton
        variant={variant}
        size={size}
        onClick={handleConnect}
        disabled={isLoading}
        className={className}
      >
        <PlugsConnected size={14} weight="bold" />
        {isLoading ? 'Connecting...' : 'Connect Broker'}
      </PelicanButton>

      <SnapTradeReact
        loginLink={redirectLink ?? ''}
        isOpen={isOpen}
        close={() => setIsOpen(false)}
        onSuccess={async (authorizationId: string) => {
          try {
            await fetch('/api/snaptrade/connections', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ authorizationId }),
            })
            await fetch('/api/snaptrade/sync', { method: 'POST' })
            toast({
              title: 'Broker connected',
              description: 'Syncing positions from your brokerage...',
            })
            setIsOpen(false)
            window.location.reload()
          } catch {
            toast({
              title: 'Sync failed',
              description: 'Broker connected but position sync failed. Try again from settings.',
              variant: 'destructive',
            })
          }
        }}
        onError={() => {
          toast({
            title: 'Connection failed',
            description: 'Please try again.',
            variant: 'destructive',
          })
        }}
      />
    </>
  )
}
