"use client"

import { memo, useRef, useState } from "react"
import dynamicImport from "next/dynamic"
import type { LightweightChartRef } from "./lightweight-chart"

const LightweightChart = dynamicImport(() => import("./lightweight-chart"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0a0a0f] animate-pulse" />,
})

interface DeskChartProps {
  symbol: string
  onSymbolChange?: (symbol: string) => void
}

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"] as const

function DeskChartInner({ symbol }: DeskChartProps) {
  const [timeframe, setTimeframe] = useState("1D")
  const chartRef = useRef<LightweightChartRef>(null)

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* toolbar */}
      <div className="flex h-8 flex-shrink-0 items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3">
        <span className="mr-2 font-mono text-xs font-semibold text-[var(--text-primary)]">
          {symbol}
        </span>
        <div className="h-3 w-px bg-[var(--border-default)]" />
        <div className="ml-2 flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition-colors ${
                timeframe === tf
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* chart */}
      <div className="relative min-h-0 flex-1">
        <LightweightChart
          ref={chartRef}
          ticker={symbol}
          timeframe={timeframe}
        />
      </div>
    </div>
  )
}

export default memo(DeskChartInner)
