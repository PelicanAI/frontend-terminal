'use client'

import { useState, useRef, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { FlashIcon as Lightning } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { useCreditsContext } from '@/providers/credits-provider'
import { IconTooltip } from '@/components/ui/icon-tooltip'

export function ChatCreditCounter() {
  const { credits, loading, isFounder, isTrial } = useCreditsContext()
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPopover])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        <div className="h-3.5 w-12 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!credits) return null

  // Founder badge
  if (isFounder) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-amber-400">
        <HugeiconsIcon icon={Lightning} size={14} strokeWidth={1.5} color="currentColor" />
        <span className="text-xs font-medium">Founder</span>
      </div>
    )
  }

  // Trial users
  if (isTrial) {
    const remaining = credits.freeQuestionsRemaining
    const isLow = remaining <= 3
    return (
      <Link
        href="/pricing"
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-muted/50 ${
          isLow ? 'text-amber-400' : 'text-muted-foreground'
        }`}
      >
        <HugeiconsIcon icon={Lightning} size={14} strokeWidth={1.5} color="currentColor" />
        <span className="text-xs font-medium font-mono tabular-nums">{remaining} free</span>
      </Link>
    )
  }

  // Subscribed users
  const balance = credits.balance
  const isLow = balance < 50
  const isExhausted = balance === 0

  const colorClass = isExhausted
    ? 'text-red-400'
    : isLow
    ? 'text-amber-400'
    : 'text-muted-foreground'

  const planLabel = credits.plan === 'starter' ? 'Starter' : credits.plan === 'pro' ? 'Pro' : credits.plan === 'power' ? 'Power' : credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)

  const resetDate = credits.billingCycleStart
    ? new Date(new Date(credits.billingCycleStart).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const usagePercent = credits.monthlyAllocation > 0
    ? Math.min(100, Math.round((credits.usedThisMonth / credits.monthlyAllocation) * 100))
    : 0

  return (
    <div className="relative">
      <IconTooltip label="Credit balance" side="bottom">
      <button
        ref={triggerRef}
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-muted/50 ${colorClass}`}
      >
        <HugeiconsIcon icon={Lightning} size={14} strokeWidth={1.5} color="currentColor" />
        <span className="text-xs font-medium font-mono tabular-nums">{balance.toLocaleString()}</span>
      </button>
      </IconTooltip>

      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-xl z-50 p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {planLabel} Plan
            </span>
            {resetDate && (
              <span className="text-[10px] text-muted-foreground">
                Resets {resetDate}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Remaining</span>
              <span className={`font-semibold font-mono tabular-nums ${colorClass}`}>
                {balance.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Used</span>
              <span className="text-foreground font-mono tabular-nums">
                {credits.usedThisMonth.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Allocation</span>
              <span className="text-foreground font-mono tabular-nums">
                {credits.monthlyAllocation.toLocaleString()}/mo
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isExhausted ? 'bg-[var(--data-negative)]' : isLow ? 'bg-[var(--data-warning)]' : 'bg-[var(--accent-primary)]'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right font-mono tabular-nums">
              {usagePercent}% used
            </p>
          </div>

          {(isLow || isExhausted) && (
            <Link
              href="/pricing"
              className="block text-center text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
              onClick={() => setShowPopover(false)}
            >
              Upgrade plan
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
