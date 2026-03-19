'use client'

import { useState } from 'react'
import { useCreditsContext } from '@/providers/credits-provider'
import { Gear, CircleNotch, ArrowSquareOut } from '@phosphor-icons/react'

interface ManageSubscriptionButtonProps {
  className?: string
  variant?: 'default' | 'link'
}

export function ManageSubscriptionButton({ 
  className = '', 
  variant = 'default' 
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false)
  const { isSubscribed } = useCreditsContext()

  if (!isSubscribed) {
    return null
  }

  const handleManageSubscription = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to open billing portal')
      }

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className={`text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1 ${className}`}
      >
        {loading ? (
          <CircleNotch size={12} weight="regular" className="animate-spin" />
        ) : (
          <ArrowSquareOut size={12} weight="regular" />
        )}
        <span>Manage subscription</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleManageSubscription}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <CircleNotch size={16} weight="regular" className="animate-spin" />
      ) : (
        <Gear size={16} weight="regular" />
      )}
      <span>Manage Subscription</span>
    </button>
  )
}

