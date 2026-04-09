"use client"

import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react"
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from "lightweight-charts"

/* ─── types ─── */

export interface CandleBar {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface LightweightChartRef {
  chart: IChartApi | null
  candleSeries: ISeriesApi<"Candlestick"> | null
}

interface LightweightChartProps {
  ticker: string
  timeframe: string
}

/* ─── timeframe → Polygon params ─── */

interface TimeframeConfig {
  multiplier: string
  timespan: string
  daysBack: number
}

const TIMEFRAME_MAP: Record<string, TimeframeConfig> = {
  "1m":  { multiplier: "1",  timespan: "minute", daysBack: 1 },
  "5m":  { multiplier: "5",  timespan: "minute", daysBack: 3 },
  "15m": { multiplier: "15", timespan: "minute", daysBack: 7 },
  "30m": { multiplier: "30", timespan: "minute", daysBack: 14 },
  "1h":  { multiplier: "1",  timespan: "hour",   daysBack: 30 },
  "4h":  { multiplier: "4",  timespan: "hour",   daysBack: 90 },
  "1D":  { multiplier: "1",  timespan: "day",    daysBack: 365 },
  "1W":  { multiplier: "1",  timespan: "week",   daysBack: 730 },
}

/* ─── helpers ─── */

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function normalizeTicker(ticker: string): string {
  const t = ticker.trim().toUpperCase()
  // Already formatted for Polygon
  if (t.startsWith("X:") || t.startsWith("C:")) return t
  return t
}

/* ─── component ─── */

const LightweightChart = forwardRef<LightweightChartRef, LightweightChartProps>(
  function LightweightChart({ ticker, timeframe }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      get chart() { return chartRef.current },
      get candleSeries() { return candleSeriesRef.current },
    }))

    /* create chart instance once */
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "#0a0a0f" },
          textColor: "#a0a0b0",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#1e1e2e" },
          horzLines: { color: "#1e1e2e" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: "#8b5cf6", width: 1, style: 2, labelBackgroundColor: "#8b5cf6" },
          horzLine: { color: "#8b5cf6", width: 1, style: 2, labelBackgroundColor: "#8b5cf6" },
        },
        rightPriceScale: {
          borderColor: "#1e1e2e",
          scaleMargins: { top: 0.05, bottom: 0.2 },
        },
        timeScale: {
          borderColor: "#1e1e2e",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      })

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      })

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      })

      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      })

      chartRef.current = chart
      candleSeriesRef.current = candleSeries
      volumeSeriesRef.current = volumeSeries

      /* resize observer */
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            chart.resize(width, height)
          }
        }
      })
      ro.observe(container)

      return () => {
        ro.disconnect()
        chart.remove()
        chartRef.current = null
        candleSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }, [])

    /* fetch data when ticker or timeframe changes */
    const fetchData = useCallback(async () => {
      const candleSeries = candleSeriesRef.current
      const volumeSeries = volumeSeriesRef.current
      if (!candleSeries || !volumeSeries) return

      const config = TIMEFRAME_MAP[timeframe]
      if (!config) return

      setLoading(true)
      setError(null)

      try {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - config.daysBack)

        const params = new URLSearchParams({
          ticker: normalizeTicker(ticker),
          from: formatDate(from),
          to: formatDate(to),
          timespan: config.timespan,
          multiplier: config.multiplier,
        })

        const res = await fetch(`/api/candles?${params}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch data (${res.status})`)
        }

        const data = await res.json()
        const bars: CandleBar[] = (data.candles ?? []).map((b: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({
          time: Math.floor(b.t / 1000) as Time,
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v,
        }))

        if (bars.length === 0) {
          setError("No data available for this ticker/timeframe")
          candleSeries.setData([])
          volumeSeries.setData([])
          setLoading(false)
          return
        }

        const candles: CandlestickData[] = bars.map((b) => ({
          time: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))

        const volumes: HistogramData[] = bars.map((b) => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open
            ? "rgba(34, 197, 94, 0.3)"
            : "rgba(239, 68, 68, 0.3)",
        }))

        candleSeries.setData(candles)
        volumeSeries.setData(volumes)

        chartRef.current?.timeScale().fitContent()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chart data")
      } finally {
        setLoading(false)
      }
    }, [ticker, timeframe])

    useEffect(() => {
      void fetchData()
    }, [fetchData])

    return (
      <div className="relative h-full w-full">
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
                onClick={() => void fetchData()}
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

export default memo(LightweightChart)
