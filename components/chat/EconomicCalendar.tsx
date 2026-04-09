"use client"

import { memo, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

interface EconomicCalendarProps {
  onClose: () => void
}

function EconomicCalendarInner({ onClose }: EconomicCalendarProps) {
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
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: false,
      width: "100%",
      height: "100%",
      importanceFilter: "-1,0,1",
      countryFilter: "us",
    })

    widgetContainer.appendChild(script)
    container.appendChild(widgetContainer)

    const timer = setTimeout(() => setIsLoading(false), 1500)

    return () => {
      clearTimeout(timer)
      if (container) {
        container.innerHTML = ""
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 hover:bg-muted/50"
        >
          <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={1.5} color="currentColor" />
        </Button>
        <span className="text-lg font-bold text-foreground">Economic Calendar</span>
      </div>

      <div className="flex-1 relative min-h-0 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="h-48 w-full mx-4 rounded-lg bg-muted/30 animate-pulse" />
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0 w-full h-full bg-card overflow-hidden" />
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

export const EconomicCalendar = memo(EconomicCalendarInner)
