'use client'

import { useState } from 'react'
import { useCreditsContext } from '@/providers/credits-provider'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Settings01Icon as Gear,
  Loading03Icon as CircleNotch,
  SquareArrowDiagonal02Icon as ArrowSquareOut,
} from '@hugeicons/core-free-icons'

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
          <HugeiconsIcon icon={CircleNotch} size={12} className="animate-spin" strokeWidth={1.5} color="currentColor" />
        ) : (
          <HugeiconsIcon icon={ArrowSquareOut} size={12} strokeWidth={1.5} color="currentColor" />
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
        <HugeiconsIcon icon={CircleNotch} size={16} className="animate-spin" strokeWidth={1.5} color="currentColor" />
      ) : (
        <HugeiconsIcon icon={Gear} size={16} strokeWidth={1.5} color="currentColor" />
      )}
      <span>Manage Subscription</span>
    </button>
  )
}

