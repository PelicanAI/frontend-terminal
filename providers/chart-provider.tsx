"use client"

import { createContext, useContext, useState, useCallback } from "react"
import type { ReactNode } from "react"

type PanelMode = "overview" | "chart" | "calendar"

interface ChartContextValue {
  mode: PanelMode
  selectedTicker: string | null
  showChart: (ticker: string) => void
  showCalendar: () => void
  closeChart: () => void
}

const ChartContext = createContext<ChartContextValue | null>(null)

export function ChartProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PanelMode>("overview")
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const showChart = useCallback((ticker: string) => {
    // Strip hyphens/slashes for TradingView (BTC-USD → BTCUSD, EUR/USD → EURUSD)
    setSelectedTicker(ticker.replace(/[-/]/g, "").toUpperCase())
    setMode("chart")
  }, [])

  const showCalendar = useCallback(() => {
    setMode("calendar")
  }, [])

  const closeChart = useCallback(() => {
    setMode("overview")
    setSelectedTicker(null)
  }, [])

  return (
    <ChartContext.Provider value={{ mode, selectedTicker, showChart, showCalendar, closeChart }}>
      {children}
    </ChartContext.Provider>
  )
}

const NOOP = () => {}
const DEFAULT_CHART_CONTEXT: ChartContextValue = {
  mode: "overview",
  selectedTicker: null,
  showChart: NOOP,
  showCalendar: NOOP,
  closeChart: NOOP,
}

/**
 * Returns chart context. Safe to call outside ChartProvider — returns no-op defaults.
 */
export function useChart(): ChartContextValue {
  const ctx = useContext(ChartContext)
  return ctx ?? DEFAULT_CHART_CONTEXT
}
