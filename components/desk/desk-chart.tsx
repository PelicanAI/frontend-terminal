"use client"

import { memo, useEffect, useRef, useState } from "react"
import { NASDAQ_100 } from "@/lib/trading/ticker-lists"

interface DeskChartProps {
  symbol: string
  onSymbolChange?: (symbol: string) => void
}

const CRYPTO_BASES = new Set(["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "DOT", "AVAX", "MATIC", "LINK"])
const INDEX_SYMBOL_MAP: Record<string, string> = {
  SPX: "SP:SPX",
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
  IWM: "AMEX:IWM",
  DIA: "AMEX:DIA",
  VIX: "CBOE:VIX",
  DJI: "DJ:DJI",
  COMP: "NASDAQ:IXIC",
}
const COMMON_STOCK_EXCHANGE_MAP: Record<string, string> = {
  PLTR: "NASDAQ:PLTR",
  SMCI: "NASDAQ:SMCI",
  COIN: "NASDAQ:COIN",
  HOOD: "NASDAQ:HOOD",
  SOFI: "NASDAQ:SOFI",
}

function toTradingViewSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase()

  if (INDEX_SYMBOL_MAP[normalized]) return INDEX_SYMBOL_MAP[normalized]
  if (COMMON_STOCK_EXCHANGE_MAP[normalized]) return COMMON_STOCK_EXCHANGE_MAP[normalized]

  if (normalized.startsWith("X:")) return normalized.slice(2)
  if (normalized.startsWith("C:")) return `FX:${normalized.slice(2)}`

  if (normalized.includes("/")) {
    const [base] = normalized.split("/")
    const cleaned = normalized.replace("/", "")
    if (base && CRYPTO_BASES.has(base)) return cleaned
    return `FX:${cleaned}`
  }

  if (normalized.endsWith("USD")) {
    const base = normalized.slice(0, -3)
    if (CRYPTO_BASES.has(base)) return normalized
  }

  if (NASDAQ_100.has(normalized)) return `NASDAQ:${normalized}`

  return normalized
}

function DeskChartInner({ symbol }: DeskChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""
    setIsLoading(true)

    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container"
    widgetContainer.style.height = "100%"
    widgetContainer.style.width = "100%"

    const widgetInner = document.createElement("div")
    widgetInner.className = "tradingview-widget-container__widget"
    widgetInner.style.height = "100%"
    widgetInner.style.width = "100%"
    widgetContainer.appendChild(widgetInner)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTradingViewSymbol(symbol),
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(10, 10, 15, 1)",
      gridColor: "rgba(255, 255, 255, 0.04)",
    })

    widgetContainer.appendChild(script)
    container.appendChild(widgetContainer)

    const timer = window.setTimeout(() => setIsLoading(false), 2000)

    return () => {
      window.clearTimeout(timer)
      container.innerHTML = ""
    }
  }, [symbol])

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative min-h-0 flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-base)]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  )
}

export default memo(DeskChartInner)
