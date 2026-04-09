"use client"

import { useMemo, useRef, useState, useEffect } from "react"

interface DeskChartProps {
  symbol: string
}

const INDEX_SYMBOL_MAP: Record<string, string> = {
  SPX: "SP:SPX",
  COMP: "NASDAQ:IXIC",
  DJI: "DJ:DJI",
  VIX: "CBOE:VIX",
}

const CRYPTO_BASES = new Set(["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "DOT", "AVAX", "MATIC", "LINK"])

function toTradingViewSymbol(rawSymbol: string): string {
  const trimmed = rawSymbol.trim().toUpperCase()
  if (INDEX_SYMBOL_MAP[trimmed]) {
    return INDEX_SYMBOL_MAP[trimmed]
  }

  if (trimmed.includes("/")) {
    const [base] = trimmed.split("/")
    const cleaned = trimmed.replace("/", "")
    if (base && CRYPTO_BASES.has(base)) {
      return cleaned
    }
    return `FX:${cleaned}`
  }

  if (trimmed.includes("-")) {
    return trimmed.replace(/-/g, "")
  }

  return trimmed
}

export default function DeskChart({ symbol }: DeskChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  const tradingViewSymbol = useMemo(() => toTradingViewSymbol(symbol), [symbol])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""
    setIsLoading(true)

    const rootStyles = getComputedStyle(document.documentElement)
    const backgroundColor = rootStyles.getPropertyValue("--bg-base").trim() || "rgb(10 10 15)"
    const gridColor = rootStyles.getPropertyValue("--border-subtle").trim() || "rgba(255,255,255,0.06)"

    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container h-full w-full"

    const widgetInner = document.createElement("div")
    widgetInner.className = "tradingview-widget-container__widget h-full w-full"
    widgetContainer.appendChild(widgetInner)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval: "5",
      timezone: "America/Chicago",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor,
      gridColor,
    })

    widgetContainer.appendChild(script)
    container.appendChild(widgetContainer)

    const timer = window.setTimeout(() => {
      setIsLoading(false)
    }, 1200)

    return () => {
      window.clearTimeout(timer)
      container.innerHTML = ""
    }
  }, [tradingViewSymbol])

  return (
    <div className="relative h-full min-h-0 bg-[var(--bg-base)]">
      <div className="relative h-full w-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-base)]/70">
            <div className="mx-4 h-24 w-full rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
