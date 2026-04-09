"use client"

import { HeatmapStock } from "@/app/api/heatmap/route"
import { getStockColor, formatChangePercent } from "@/hooks/use-heatmap"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUp01Icon as ArrowUp,
  ArrowDown01Icon as ArrowDown,
  MinusSignIcon as Minus,
  Bookmark01Icon as BookmarkSimple,
} from "@hugeicons/core-free-icons"

interface HeatmapGridProps {
  stocks: HeatmapStock[]
  onStockClick?: (ticker: string, name: string) => void
  market?: string
  watchlistTickers?: Set<string>
  addToWatchlist?: (ticker: string, options?: { added_from?: 'manual' | 'chat' | 'trade' | 'onboarding'; conversationId?: string }) => Promise<boolean>
  removeFromWatchlist?: (ticker: string) => void
}

function formatGridPrice(price: number, market?: string): string {
  if (market === 'forex') return price.toFixed(price < 10 ? 5 : 3)
  return `$${price.toFixed(2)}`
}

export function HeatmapGrid({ stocks, onStockClick, market, watchlistTickers, addToWatchlist, removeFromWatchlist }: HeatmapGridProps) {
  if (stocks.length === 0) {
    return (
      <div className="flex items-center justify-center border border-[var(--border-subtle)] rounded-lg bg-surface-1 p-4 sm:p-8 md:p-12">
        <p className="text-foreground/50 text-sm">No data available</p>
      </div>
    )
  }

  // Sort by absolute change percent (largest movers first)
  const sortedStocks = [...stocks].sort((a, b) => {
    const absA = Math.abs(a.changePercent ?? 0)
    const absB = Math.abs(b.changePercent ?? 0)
    return absB - absA
  })

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {sortedStocks.map((stock) => {
        const colors = getStockColor(stock.changePercent)
        const isPositive = (stock.changePercent ?? 0) > 0
        const isNegative = (stock.changePercent ?? 0) < 0
        const isWatched = watchlistTickers?.has(stock.ticker.toUpperCase()) ?? false

        return (
          <button
            key={stock.ticker}
            onClick={() => onStockClick?.(stock.ticker, stock.name)}
            className={`
              relative overflow-hidden rounded-lg border p-3
              transition-all duration-200
              hover:scale-105 hover:shadow-lg hover:z-10
              ${colors.bg} ${colors.border}
            `}
          >
            {/* Ticker */}
            <div className={`font-mono font-semibold text-sm mb-1 ${colors.text}`}>
              {stock.ticker}
            </div>

            {/* Change Percent */}
            <div className="flex items-center justify-between gap-1">
              <span className={`font-mono text-xs font-medium ${colors.text}`}>
                {formatChangePercent(stock.changePercent)}
              </span>
              {isPositive && <HugeiconsIcon icon={ArrowUp} size={12} className="text-green-400" strokeWidth={1.5} color="currentColor" />}
              {isNegative && <HugeiconsIcon icon={ArrowDown} size={12} className="text-red-400" strokeWidth={1.5} color="currentColor" />}
              {!isPositive && !isNegative && <HugeiconsIcon icon={Minus} size={12} className="text-foreground/30" strokeWidth={1.5} color="currentColor" />}
            </div>

            {/* Price */}
            {stock.price !== null && (
              <div className="mt-1 text-[10px] text-foreground/50 font-mono tabular-nums">
                {formatGridPrice(stock.price, market)}
              </div>
            )}

            {/* Watchlist bookmark */}
            {addToWatchlist && removeFromWatchlist && (
              <button
                type="button"
                className="absolute top-1 right-1 appearance-none bg-transparent border-none p-0 m-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isWatched) {
                    removeFromWatchlist(stock.ticker)
                  } else {
                    addToWatchlist(stock.ticker, { added_from: 'manual' })
                  }
                }}
                aria-label={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
              >
                <div className="p-1 rounded hover:bg-white/10 transition-colors">
                  <HugeiconsIcon icon={BookmarkSimple} size={14} className={isWatched ? 'text-[var(--accent-primary)]' : 'text-white/40 hover:text-white/60'} strokeWidth={1.5} color="currentColor" />
                </div>
              </button>
            )}

            {/* Sector indicator (subtle) — only show when no watchlist buttons */}
            {(!addToWatchlist || !removeFromWatchlist) && (
              <div className="absolute top-1 right-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
