"use client"

import { useMemo } from "react"
import { useMarketData } from "@/hooks/use-market-data"
import { NumberTicker } from "@/components/motion/number-ticker"
import { PressScale } from "@/components/motion/press-scale"
import { SkeletonRow } from "@/components/motion/shimmer-skeleton"
import { fmt } from "@/lib/motion"
import { sectorNameToEtf } from "@/lib/desk/sector-etfs"
import { cn } from "@/lib/utils"

interface DeskSectorsProps {
  onAnalyze: (ticker: string | null, prompt: string) => void
  onTickerClick?: (ticker: string) => void
}

export default function DeskSectors({ onAnalyze, onTickerClick }: DeskSectorsProps) {
  const { sectors, isLoading } = useMarketData({ refreshInterval: 60000, autoRefresh: true })
  const sortedSectors = useMemo(
    () => [...sectors].sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)),
    [sectors]
  )

  if (isLoading && sectors.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 bg-[var(--bg-surface)]/40 px-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonRow key={index} cells={[{ width: "12ch" }, { width: "6ch" }]} />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-4">
        {sortedSectors.map((sector) => (
          <PressScale key={sector.name} hoverScale={1.005}>
            <button
              type="button"
              onClick={() => {
                const etf = sectorNameToEtf(sector.name)
                if (etf) onTickerClick?.(etf)
                onAnalyze(etf, `How is the ${sector.name} sector performing today? What is driving the move, which tickers are leading it, and how should I frame it versus the broader tape?`)
              }}
              className="flex w-full items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <span className="truncate pr-2 text-[11px] font-medium text-[var(--text-secondary)]">{sector.name}</span>
              <span
                className={cn(
                  "font-[var(--font-geist-mono)] text-[11px] tabular-nums",
                  (sector.changePercent ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                )}
              >
                {sector.changePercent != null ? <NumberTicker value={sector.changePercent} format={(value) => fmt.percent(value, 1)} /> : "—"}
              </span>
            </button>
          </PressScale>
        ))}
      </div>
    </div>
  )
}
