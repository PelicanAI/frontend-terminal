'use client'

import { useCredits } from '@/hooks/use-credits'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { FlashIcon as Lightning, Alert01Icon as Warning } from '@hugeicons/core-free-icons'

interface CreditDisplayProps {
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export function CreditDisplay({ variant = 'default', className = '' }: CreditDisplayProps) {
  const { credits, loading } = useCredits()

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  const validPlans = ['starter', 'pro', 'power', 'founder']
  const isSubscribed = credits && validPlans.includes(credits.plan)
  const isTrial = credits && !isSubscribed && credits.freeQuestionsRemaining > 0

  if (isTrial) {
    const remaining = credits.freeQuestionsRemaining
    const isLow = remaining <= 3

    if (variant === 'compact') {
      return (
        <div className={`flex items-center gap-1.5 ${className}`}>
          <HugeiconsIcon icon={Lightning} size={14} className={` ${isLow ? 'text-amber-400' : 'text-blue-400'}`} strokeWidth={1.5} color="currentColor" />
          <span className={`text-xs font-medium ${isLow ? 'text-amber-400' : 'text-blue-400'}`}>
            {remaining} free
          </span>
        </div>
      )
    }

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <HugeiconsIcon icon={Lightning} size={16} className={` ${isLow ? 'text-amber-400' : 'text-blue-400'}`} strokeWidth={1.5} color="currentColor" />
        <span className={`text-sm font-medium ${isLow ? 'text-amber-400' : 'text-blue-400'}`}>
          {remaining} free question{remaining !== 1 ? 's' : ''} left
        </span>
        <Link
          href="/pricing"
          className="text-xs text-muted-foreground hover:text-[var(--text-primary)] hover:underline"
        >
          Upgrade
        </Link>
      </div>
    )
  }

  if (!credits || credits.plan === 'none') {
    return (
      <Link 
        href="/pricing" 
        className={`flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors ${className}`}
      >
        <HugeiconsIcon icon={Lightning} size={16} strokeWidth={1.5} color="currentColor" />
        <span>Subscribe to start</span>
      </Link>
    )
  }

  if (credits.plan === 'founder') {
    if (variant === 'compact') {
      return (
        <div className={`flex items-center gap-1.5 ${className}`}>
          <HugeiconsIcon icon={Lightning} size={14} className="text-amber-400" strokeWidth={1.5} color="currentColor" />
          <span className="text-xs font-medium text-amber-400">Founder</span>
        </div>
      )
    }
    
    if (variant === 'detailed') {
      return (
        <div className={`space-y-2 ${className}`}>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Lightning} size={16} className="text-amber-400" strokeWidth={1.5} color="currentColor" />
            <span className="text-sm font-semibold text-amber-400">Founder Account</span>
          </div>
          <p className="text-xs text-muted-foreground">Unlimited access</p>
        </div>
      )
    }

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <HugeiconsIcon icon={Lightning} size={16} className="text-amber-400" strokeWidth={1.5} color="currentColor" />
        <span className="text-sm font-medium text-amber-400">Founder</span>
      </div>
    )
  }

  const isLow = credits.balance < 50
  const isCritical = credits.balance < 20

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <HugeiconsIcon icon={Lightning} size={14} className={` ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-muted-foreground'}`} strokeWidth={1.5} color="currentColor" />
        <span className={`text-sm font-medium ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-foreground'}`}>
          {credits.balance.toLocaleString()}
        </span>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Credits</span>
          <span className={`text-sm font-semibold ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-foreground'}`}>
            {credits.balance.toLocaleString()}
          </span>
        </div>
        
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.min(100, (credits.usedThisMonth / credits.monthlyAllocation) * 100)}%` 
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{credits.usedThisMonth.toLocaleString()} used</span>
          <span>{credits.monthlyAllocation.toLocaleString()} / month</span>
        </div>

        {isLow && (
          <Link 
            href="/pricing" 
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <HugeiconsIcon icon={Warning} size={12} strokeWidth={1.5} color="currentColor" />
            Get more credits
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <HugeiconsIcon icon={Lightning} size={16} className={` ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-muted-foreground'}`} strokeWidth={1.5} color="currentColor" />
      <span className={`text-sm font-medium ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-foreground'}`}>
        {credits.balance.toLocaleString()} credits
      </span>
      
      {isLow && (
        <Link 
          href="/pricing" 
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
        >
          Get more
        </Link>
      )}
    </div>
  )
}

