"use client"

import { memo, useCallback, useRef, useState } from "react"
import { PelicanChartProvider, usePelicanChart } from "@/providers/pelican-chart-provider"
import KlineChart, { type KlineChartRef } from "./kline-chart"
import type { ChartIndicator, OverlayTool, TimeframeKey } from "@/types/chart"

interface DeskChartProps {
  symbol: string
  onSymbolChange?: (symbol: string) => void
}

const TIMEFRAMES: TimeframeKey[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"]

const MAIN_INDICATORS: { key: ChartIndicator; label: string }[] = [
  { key: "MA", label: "MA" },
  { key: "EMA", label: "EMA" },
  { key: "BOLL", label: "BOLL" },
]

const SUB_INDICATORS: { key: ChartIndicator; label: string }[] = [
  { key: "MACD", label: "MACD" },
  { key: "RSI", label: "RSI" },
  { key: "KDJ", label: "KDJ" },
  { key: "ATR", label: "ATR" },
]

const DRAWING_TOOLS: { key: OverlayTool; label: string }[] = [
  { key: "horizontalStraightLine", label: "H-Line" },
  { key: "straightLine", label: "Trend" },
  { key: "fibonacciLine", label: "Fib" },
  { key: "rect", label: "Rect" },
  { key: "parallelStraightLine", label: "Channel" },
  { key: "priceChannelLine", label: "Price Ch" },
]

/* ─── Indicator dropdown ─── */
function IndicatorDropdown() {
  const { indicators, toggleIndicator } = usePelicanChart()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition-colors ${
          indicators.length > 0
            ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        }`}
      >
        Ind {indicators.length > 0 && `(${indicators.length})`}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 min-w-[120px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-xl">
            <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Main
            </div>
            {MAIN_INDICATORS.map((ind) => (
              <button
                key={ind.key}
                onClick={() => toggleIndicator(ind.key)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-[10px] transition-colors ${
                  indicators.includes(ind.key)
                    ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${indicators.includes(ind.key) ? "bg-[var(--accent-primary)]" : "bg-[var(--border-default)]"}`} />
                {ind.label}
              </button>
            ))}
            <div className="my-0.5 h-px bg-[var(--border-subtle)]" />
            <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Sub
            </div>
            {SUB_INDICATORS.map((ind) => (
              <button
                key={ind.key}
                onClick={() => toggleIndicator(ind.key)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-[10px] transition-colors ${
                  indicators.includes(ind.key)
                    ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${indicators.includes(ind.key) ? "bg-[var(--accent-primary)]" : "bg-[var(--border-default)]"}`} />
                {ind.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Drawing tools ─── */
function DrawingToolbar() {
  const { activeTool, setActiveTool } = usePelicanChart()

  const handleClick = useCallback((tool: OverlayTool) => {
    setActiveTool(activeTool === tool ? null : tool)
  }, [activeTool, setActiveTool])

  return (
    <div className="flex items-center gap-0.5">
      {DRAWING_TOOLS.map((tool) => (
        <button
          key={tool.key}
          onClick={() => handleClick(tool.key)}
          title={tool.label}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition-colors ${
            activeTool === tool.key
              ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {tool.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Main chart wrapper ─── */
function DeskChartInner({ symbol }: DeskChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1D")
  const chartRef = useRef<KlineChartRef>(null)

  return (
    <PelicanChartProvider>
      <div className="flex h-full min-h-0 w-full flex-col">
        {/* toolbar */}
        <div className="flex h-8 flex-shrink-0 items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3">
          <span className="mr-2 font-mono text-xs font-semibold text-[var(--text-primary)]">
            {symbol}
          </span>
          <div className="h-3 w-px bg-[var(--border-default)]" />

          {/* Timeframes */}
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

          <div className="h-3 w-px bg-[var(--border-default)]" />

          {/* Indicators */}
          <IndicatorDropdown />

          <div className="h-3 w-px bg-[var(--border-default)]" />

          {/* Drawing tools */}
          <DrawingToolbar />
        </div>

        {/* chart */}
        <div className="relative min-h-0 flex-1">
          <KlineChart
            ref={chartRef}
            ticker={symbol}
            timeframe={timeframe}
          />
        </div>
      </div>
    </PelicanChartProvider>
  )
}

export default memo(DeskChartInner)
