"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import type { Chart } from "klinecharts"
import type { OverlayTool, ChartIndicator } from "@/types/chart"

interface PelicanChartContextValue {
  activeTool: OverlayTool | null
  setActiveTool: (tool: OverlayTool | null) => void
  indicators: ChartIndicator[]
  toggleIndicator: (indicator: ChartIndicator) => void
  chartRef: React.MutableRefObject<Chart | null>
}

const PelicanChartContext = createContext<PelicanChartContextValue | null>(null)

export function usePelicanChart(): PelicanChartContextValue {
  const ctx = useContext(PelicanChartContext)
  if (!ctx) {
    return {
      activeTool: null,
      setActiveTool: () => {},
      indicators: [],
      toggleIndicator: () => {},
      chartRef: { current: null },
    }
  }
  return ctx
}

export function PelicanChartProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveTool] = useState<OverlayTool | null>(null)
  const [indicators, setIndicators] = useState<ChartIndicator[]>(['MA'])
  const chartRef = useRef<Chart | null>(null)

  const toggleIndicator = useCallback((indicator: ChartIndicator) => {
    setIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator]
    )
  }, [])

  const value = useMemo<PelicanChartContextValue>(
    () => ({ activeTool, setActiveTool, indicators, toggleIndicator, chartRef }),
    [activeTool, indicators, toggleIndicator]
  )

  return (
    <PelicanChartContext.Provider value={value}>
      {children}
    </PelicanChartContext.Provider>
  )
}
