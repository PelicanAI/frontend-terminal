'use client'

import { useCreditsContext } from '@/providers/credits-provider'

interface PaywallGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PaywallGate({ children }: PaywallGateProps) {
  const { loading } = useCreditsContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Always render children — the chat page handles soft-disabling the input
  // when the user is out of credits instead of blocking the entire UI.
  return <>{children}</>
}

export function useSubscriptionRequired() {
  const { isSubscribed, loading, credits } = useCreditsContext()

  return {
    isSubscribed,
    loading,
    credits,
    requireSubscription: () => {
      if (!isSubscribed && !loading) {
        window.location.href = '/pricing'
      }
    }
  }
}

