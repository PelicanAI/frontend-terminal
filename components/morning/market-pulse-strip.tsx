'use client'

import { useMarketPulse } from '@/hooks/use-market-pulse'
import { getMarketStatus } from '@/hooks/use-market-data'
import { NumberTicker } from '@/components/motion/number-ticker'
import { PressScale } from '@/components/motion/press-scale'
import { PriceFlash } from '@/components/motion/price-flash'
import { SkeletonRow } from '@/components/motion/shimmer-skeleton'
import { fmt } from '@/lib/motion'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  'open': { label: 'Market Open', dotClass: 'bg-[var(--data-positive)] animate-pulse', badgeClass: 'bg-[var(--data-positive)]/10 text-[var(--data-positive)]' },
  'pre-market': { label: 'Pre-Market', dotClass: 'bg-[var(--data-warning)]', badgeClass: 'bg-[var(--data-warning)]/10 text-[var(--data-warning)]' },
  'after-hours': { label: 'After Hours', dotClass: 'bg-[var(--accent-primary)]', badgeClass: 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' },
  'closed': { label: 'Closed', dotClass: 'bg-[var(--text-muted)]', badgeClass: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]' },
} as const

interface MarketPulseStripProps {
  onIndexClick?: (symbol: string, label: string) => void
  compact?: boolean
}

export function MarketPulseStrip({ onIndexClick, compact = false }: MarketPulseStripProps) {
  const { data, isLoading } = useMarketPulse()
  const marketStatus = getMarketStatus()
  const config = STATUS_CONFIG[marketStatus]

  if (isLoading) {
    return (
      <div className={cn(
        "scrollbar-hide flex items-center overflow-x-auto",
        compact
          ? "h-10 gap-3 px-3"
          : "gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 px-4 py-2.5"
      )}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} gap={8} cells={[{ width: "4ch" }, { width: "7ch" }, { width: "6ch" }]} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "scrollbar-hide flex items-center justify-between overflow-x-auto",
        compact
          ? "h-10 gap-3 px-3"
          : "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 px-4 py-2.5"
      )}
    >
      <div className={cn("flex items-center", compact ? "gap-3" : "gap-6")}>
        {data?.items.map((item) => (
          <PressScale key={item.symbol}>
            <button
              type="button"
              onClick={() => onIndexClick?.(item.symbol, item.label)}
              className={cn(
                "shrink-0 rounded-md transition-colors hover:bg-[var(--bg-elevated)]",
                compact ? "flex items-center gap-2 px-1.5 py-1" : "flex items-center gap-2 px-1.5 py-0.5"
              )}
            >
              <span className={cn(
                "font-medium text-[var(--text-muted)]",
                compact ? "text-[10px] uppercase tracking-wide" : "text-xs"
              )}>
                {item.label}
              </span>
              <span className={cn(
                "font-[var(--font-geist-mono)] font-medium tabular-nums text-[var(--text-primary)]",
                compact ? "text-xs" : "text-sm"
              )}>
                {item.price != null
                  ? (
                    <PriceFlash value={item.price}>
                      <NumberTicker value={item.price} format={(value) => fmt.price(value)} />
                    </PriceFlash>
                  )
                  : '---'}
              </span>
              {item.changePercent != null && (
                <span className={cn(
                  "font-[var(--font-geist-mono)] tabular-nums",
                  compact ? "text-[10px]" : "text-xs",
                  item.changePercent >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
                )}>
                  <PriceFlash value={item.changePercent} direction={item.changePercent >= 0 ? "up" : "down"}>
                    <NumberTicker value={item.changePercent} format={(value) => fmt.percent(value)} />
                  </PriceFlash>
                </span>
              )}
            </button>
          </PressScale>
        ))}
      </div>

      <div className={cn("ml-4 flex shrink-0 items-center gap-2", compact && "ml-auto")}>
        <span className={cn(
          "inline-flex items-center rounded-full font-medium",
          compact
            ? "gap-1 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
            : "gap-1.5 px-2.5 py-1 text-[11px]",
          compact ? "" : config.badgeClass,
        )}>
          <span className={cn("rounded-full", compact ? "h-1 w-1" : "h-1.5 w-1.5", config.dotClass)} />
          {config.label}
        </span>
      </div>
    </div>
  )
}
