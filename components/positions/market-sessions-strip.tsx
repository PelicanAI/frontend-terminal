"use client"

import { useState, useEffect, useMemo } from "react"
import { MARKETS, getMarketStatus, type MarketDefinition } from "@/lib/market-hours"
import { cn } from "@/lib/utils"

interface MarketSessionsStripProps {
  marketsTraded: string[]
  className?: string
}

function getMarketsForTraded(traded: string[]): MarketDefinition[] {
  const marketMap: Record<string, string> = {
    stocks: 'us-equities',
    forex: 'forex',
    crypto: 'crypto',
    futures: 'us-futures',
    options: 'us-equities',
  }
  const seen = new Set<string>()
  return traded
    .map(t => marketMap[t])
    .filter((id): id is string => !!id && !seen.has(id) && (seen.add(id), true))
    .map(id => MARKETS.find(m => m.id === id))
    .filter((m): m is MarketDefinition => !!m)
}

export function MarketSessionsStrip({ marketsTraded, className }: MarketSessionsStripProps) {
  const markets = useMemo(() => getMarketsForTraded(marketsTraded), [marketsTraded])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  if (markets.length <= 1) return null

  return (
    <div className={cn("flex items-center gap-4 flex-wrap", className)}>
      {markets.map(market => {
        const status = getMarketStatus(market, now)
        const isOpen = status.status === 'open'
        return (
          <div key={market.id} className="flex items-center gap-1.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOpen ? "bg-emerald-400" : "bg-gray-500"
            )} />
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {market.name}
            </span>
            {isOpen && status.currentSession && (
              <span className="text-xs text-[var(--text-secondary)]">
                {status.currentSession}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
