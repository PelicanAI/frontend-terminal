"use client"

import { useState, useEffect, useMemo } from "react"
import { MARKETS, getMarketStatus, formatCountdown, type MarketDefinition } from "@/lib/market-hours"
import { cn } from "@/lib/utils"

interface SessionIndicatorProps {
  assetType: string
  className?: string
}

function getMarketForAsset(assetType: string): MarketDefinition {
  switch (assetType) {
    case 'forex':
      return MARKETS.find(m => m.id === 'forex')!
    case 'crypto':
      return MARKETS.find(m => m.id === 'crypto')!
    case 'future':
    case 'futures':
      return MARKETS.find(m => m.id === 'us-futures')!
    default:
      return MARKETS.find(m => m.id === 'us-equities')!
  }
}

export function SessionIndicator({ assetType, className }: SessionIndicatorProps) {
  const market = useMemo(() => getMarketForAsset(assetType), [assetType])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const status = useMemo(() => getMarketStatus(market, now), [market, now])

  const isOpen = status.status === 'open'
  const isPreMarket = status.status === 'pre-market'
  const isAfterHours = status.status === 'after-hours'

  const dotColor = isOpen
    ? 'bg-emerald-400'
    : isPreMarket || isAfterHours
      ? 'bg-amber-400'
      : 'bg-gray-500'

  const label = status.currentSession
    ? `${status.currentSession}${status.status === 'pre-market' ? ' (Pre)' : status.status === 'after-hours' ? ' (AH)' : ''}`
    : status.holidayName
      ? `Closed \u2014 ${status.holidayName}`
      : 'Closed'

  const countdown = status.nextChangeLabel
    ? `${status.nextChangeLabel} ${formatCountdown(status.nextChange, now)}`
    : ''

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor, isOpen && "animate-pulse motion-reduce:animate-none")} />
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      {countdown && (
        <span className="text-xs text-[var(--text-secondary)]">{'\u00B7'} {countdown}</span>
      )}
    </div>
  )
}
