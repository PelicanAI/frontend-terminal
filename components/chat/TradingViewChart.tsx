"use client"

import { memo, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

interface TradingViewChartProps {
  symbol: string
  onClose: () => void
}

const CRYPTO_BASES = new Set(["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "DOT", "AVAX", "MATIC", "LINK"])

/** Convert slash-format pairs to TradingView symbol format */
function toTradingViewSymbol(symbol: string): string {
  if (!symbol.includes("/")) return symbol
  const [base] = symbol.split("/")
  const cleaned = symbol.replace("/", "")
  if (base && CRYPTO_BASES.has(base)) return cleaned
  return `FX:${cleaned}`
}

function TradingViewChartInner({ symbol, onClose }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear previous widget
    container.innerHTML = ""
    setIsLoading(true)

    // Create widget container
    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container"
    widgetContainer.style.height = "100%"
    widgetContainer.style.width = "100%"

    const widgetInner = document.createElement("div")
    widgetInner.className = "tradingview-widget-container__widget"
    widgetInner.style.height = "100%"
    widgetInner.style.width = "100%"
    widgetContainer.appendChild(widgetInner)

    // Create and inject script
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
      allow_symbol_change: true,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.04)",
    })

    widgetContainer.appendChild(script)
    container.appendChild(widgetContainer)

    // Hide loading after widget has time to initialize
    const timer = setTimeout(() => setIsLoading(false), 1500)

    return () => {
      clearTimeout(timer)
      if (container) {
        container.innerHTML = ""
      }
    }
  }, [symbol])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 hover:bg-muted/50"
        >
          <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={1.5} color="currentColor" />
        </Button>
        <span className="text-lg font-bold text-foreground">{symbol}</span>
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="h-48 w-full mx-4 rounded-lg bg-muted/30 animate-pulse" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* TradingView Attribution */}
      <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground/60">
        <span>Powered by</span>
        <a
          href="https://www.tradingview.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/80 hover:text-muted-foreground underline-offset-2 hover:underline transition-colors"
        >
          TradingView
        </a>
      </div>
    </div>
  )
}

export const TradingViewChart = memo(TradingViewChartInner)
