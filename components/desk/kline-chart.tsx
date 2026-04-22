"use client"

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import {
  init,
  dispose,
  type Chart,
  type DeepPartial,
  type Styles,
} from "klinecharts"
import { createPelicanDataLoader } from "@/lib/chart/pelican-dataloader"
import { registerPelicanOverlays } from "@/lib/chart/pelican-overlays"
import { toPolygonTicker } from "@/lib/chart/polygon-adapter"
import { normalizeTicker } from "@/lib/ticker-normalizer"
import { usePelicanChart } from "@/providers/pelican-chart-provider"
import type { ChartIndicator, TimeframeKey } from "@/types/chart"

/* ─── types ─── */

export interface KlineChartRef {
  chart: Chart | null
}

interface KlineChartProps {
  ticker: string
  timeframe: TimeframeKey
}

/* ─── timeframe → klinecharts Period ─── */

const PERIOD_MAP: Record<TimeframeKey, { type: string; span: number }> = {
  "1m":  { type: "minute", span: 1 },
  "5m":  { type: "minute", span: 5 },
  "15m": { type: "minute", span: 15 },
  "30m": { type: "minute", span: 30 },
  "1h":  { type: "hour", span: 1 },
  "4h":  { type: "hour", span: 4 },
  "1D":  { type: "day", span: 1 },
  "1W":  { type: "week", span: 1 },
}

/* ─── chart styles (matches Desk design tokens) ─── */

const CHART_STYLES: DeepPartial<Styles> = {
  grid: {
    show: true,
    horizontal: { show: true, size: 1, color: "#1e1e2e", style: "dashed", dashedValue: [2, 4] },
    vertical: { show: true, size: 1, color: "#1e1e2e", style: "dashed", dashedValue: [2, 4] },
  },
  candle: {
    type: "candle_solid",
    bar: {
      upColor: "#22c55e",
      downColor: "#ef4444",
      noChangeColor: "#a0a0b0",
      upBorderColor: "#22c55e",
      downBorderColor: "#ef4444",
      noChangeBorderColor: "#a0a0b0",
      upWickColor: "#22c55e",
      downWickColor: "#ef4444",
      noChangeWickColor: "#a0a0b0",
    },
    priceMark: {
      show: true,
      high: { show: true, color: "#a0a0b0", textOffset: 5, textSize: 10, textFamily: "var(--font-mono), monospace", textWeight: "normal" },
      low: { show: true, color: "#a0a0b0", textOffset: 5, textSize: 10, textFamily: "var(--font-mono), monospace", textWeight: "normal" },
      last: {
        show: true,
        upColor: "#22c55e",
        downColor: "#ef4444",
        noChangeColor: "#a0a0b0",
        line: { show: true, style: "dashed", dashedValue: [4, 4], size: 1 },
      },
    },
    tooltip: {
      showRule: "follow_cross",
      showType: "standard",
    },
  },
  indicator: {
    lastValueMark: { show: false },
    tooltip: { showRule: "follow_cross" },
  },
  xAxis: {
    show: true,
    axisLine: { show: true, color: "#1e1e2e", size: 1 },
    tickLine: { show: true, size: 1, color: "#1e1e2e", length: 3 },
    tickText: { show: true, color: "#a0a0b0", size: 11, family: "var(--font-mono), monospace", weight: "normal", marginStart: 4, marginEnd: 4 },
  },
  yAxis: {
    show: true,
    axisLine: { show: true, color: "#1e1e2e", size: 1 },
    tickLine: { show: true, size: 1, color: "#1e1e2e", length: 3 },
    tickText: { show: true, color: "#a0a0b0", size: 11, family: "var(--font-mono), monospace", weight: "normal", marginStart: 4, marginEnd: 4 },
  },
  separator: {
    size: 1,
    color: "#1e1e2e",
    fill: true,
    activeBackgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: { show: true, style: "dashed", dashedValue: [4, 2], size: 1, color: "#8b5cf6" },
      text: { show: true, style: "stroke_fill", color: "#e0e0e0", size: 11, family: "var(--font-mono), monospace", weight: "normal", borderStyle: "solid", borderDashedValue: [], borderSize: 1, borderColor: "#8b5cf6", borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: "#1e1e2e" },
    },
    vertical: {
      show: true,
      line: { show: true, style: "dashed", dashedValue: [4, 2], size: 1, color: "#8b5cf6" },
      text: { show: true, style: "stroke_fill", color: "#e0e0e0", size: 11, family: "var(--font-mono), monospace", weight: "normal", borderStyle: "solid", borderDashedValue: [], borderSize: 1, borderColor: "#8b5cf6", borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: "#1e1e2e" },
    },
  },
  overlay: {
    point: {
      color: "#8b5cf6",
      borderColor: "#8b5cf6",
      borderSize: 1,
      radius: 4,
      activeColor: "#9d74f7",
      activeBorderColor: "#9d74f7",
      activeBorderSize: 1,
      activeRadius: 6,
    },
    line: { color: "#8b5cf6", size: 1, style: "solid", smooth: false, dashedValue: [2, 2] },
    rect: { style: "fill", color: "rgba(139, 92, 246, 0.15)", borderColor: "#8b5cf6", borderSize: 1, borderStyle: "solid", borderDashedValue: [], borderRadius: 0 },
    text: { style: "fill", color: "#a0a0b0", size: 11, family: "var(--font-mono), monospace", weight: "normal", borderStyle: "solid", borderDashedValue: [], borderSize: 0, borderColor: "transparent", borderRadius: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, backgroundColor: "transparent" },
  },
}

/* ─── component ─── */

const KlineChart = forwardRef<KlineChartRef, KlineChartProps>(
  function KlineChart({ ticker, timeframe }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<Chart | null>(null)
    const { activeTool, indicators, chartRef: ctxChartRef } = usePelicanChart()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const prevIndicatorsRef = useRef<ChartIndicator[]>([])
    const indicatorPaneIdsRef = useRef<Map<string, string>>(new Map())

    useImperativeHandle(ref, () => ({
      get chart() { return chartRef.current },
    }))

    /* ── init chart once ── */
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      // Register Pelican overlays (idempotent)
      registerPelicanOverlays()

      const chart = init(container, {
        styles: CHART_STYLES,
        locale: "en-US",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })

      if (!chart) return

      chartRef.current = chart
      ctxChartRef.current = chart

      // Set up DataLoader
      chart.setDataLoader(createPelicanDataLoader())

      // Volume pane
      chart.createIndicator("VOL", false, { id: "volume_pane", height: 80 })

      // ResizeObserver
      const ro = new ResizeObserver(() => {
        chart.resize()
      })
      ro.observe(container)

      // Set initial symbol + period to trigger data load
      const normalized = normalizeTicker(ticker)
      const pricePrecision = normalized?.assetType === "forex" ? 5 : 2
      chart.setSymbol({
        ticker: toPolygonTicker(ticker),
        pricePrecision,
        volumePrecision: 0,
      })
      chart.setPeriod(PERIOD_MAP[timeframe] as { type: "day"; span: number })

      setLoading(false)

      return () => {
        ro.disconnect()
        dispose(container)
        chartRef.current = null
        ctxChartRef.current = null
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* ── ticker changes ── */
    useEffect(() => {
      const chart = chartRef.current
      if (!chart) return

      setLoading(true)
      setError(null)

      const normalized = normalizeTicker(ticker)
      const pricePrecision = normalized?.assetType === "forex" ? 5 : 2

      chart.setSymbol({
        ticker: toPolygonTicker(ticker),
        pricePrecision,
        volumePrecision: 0,
      })

      setLoading(false)
    }, [ticker])

    /* ── timeframe changes ── */
    useEffect(() => {
      const chart = chartRef.current
      if (!chart) return

      const period = PERIOD_MAP[timeframe]
      if (period) {
        chart.setPeriod(period as { type: "day"; span: number })
      }
    }, [timeframe])

    /* ── sync overlay tool ── */
    useEffect(() => {
      const chart = chartRef.current
      if (!chart || !activeTool) return
      chart.createOverlay(activeTool)
    }, [activeTool])

    /* ── sync indicators ── */
    useEffect(() => {
      const chart = chartRef.current
      if (!chart) return

      const prev = new Set(prevIndicatorsRef.current)
      const next = new Set(indicators)

      // Remove indicators no longer active
      for (const ind of prev) {
        if (!next.has(ind)) {
          const paneId = indicatorPaneIdsRef.current.get(ind)
          chart.removeIndicator({ name: ind, paneId })
          indicatorPaneIdsRef.current.delete(ind)
        }
      }

      // Add new indicators
      for (const ind of next) {
        if (!prev.has(ind)) {
          // Main-pane indicators (overlaid on candles)
          const isMainPane = ind === "MA" || ind === "EMA" || ind === "BOLL" || ind === "SAR"
          if (isMainPane) {
            chart.createIndicator(ind, true)
          } else {
            // Sub-pane indicators
            const paneId = chart.createIndicator(ind, false, { height: 80 })
            if (paneId) indicatorPaneIdsRef.current.set(ind, paneId)
          }
        }
      }

      prevIndicatorsRef.current = indicators
    }, [indicators])

    /* ── retry ── */
    const handleRetry = useCallback(() => {
      const chart = chartRef.current
      if (!chart) return
      setError(null)
      setLoading(true)
      // Re-set symbol to trigger a fresh data load
      const normalized = normalizeTicker(ticker)
      const pricePrecision = normalized?.assetType === "forex" ? 5 : 2
      chart.setSymbol({
        ticker: toPolygonTicker(ticker),
        pricePrecision,
        volumePrecision: 0,
      })
      setLoading(false)
    }, [ticker])

    return (
      <div className="relative h-full w-full bg-[#0a0a0f]">
        <div ref={containerRef} className="h-full w-full" />

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0f]/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0f]/90">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-sm text-[var(--text-muted)]">{error}</span>
              <button
                onClick={handleRetry}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-1 text-xs text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

export default memo(KlineChart)
