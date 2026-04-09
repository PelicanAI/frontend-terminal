"use client"

import { useCallback, useState } from "react"
import dynamicImport from "next/dynamic"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { trackEvent } from "@/lib/tracking"

const DeskChart = dynamicImport(() => import("@/components/desk/desk-chart"), {
  ssr: false,
  loading: () => <div className="h-full bg-[var(--bg-surface)] animate-pulse" />,
})

const DeskDataZone = dynamicImport(() => import("@/components/desk/desk-data-zone"), {
  ssr: false,
  loading: () => <div className="h-full bg-[var(--bg-surface)] animate-pulse" />,
})

const DeskRightPanel = dynamicImport(() => import("@/components/desk/desk-right-panel"), {
  ssr: false,
  loading: () => <div className="h-full bg-[var(--bg-surface)] animate-pulse" />,
})

export default function DeskPage() {
  const [chartSymbol, setChartSymbol] = useState("SPY")
  const { openWithPrompt } = usePelicanPanelContext()

  const handleTickerClick = useCallback((ticker: string) => {
    setChartSymbol(ticker)
    trackEvent({
      eventType: "brief_section_engaged",
      feature: "desk",
      ticker,
      data: { section: "chart", action: "ticker_click" },
    })
  }, [])

  const handleAnalyze = useCallback((ticker: string | null, prompt: string) => {
    if (ticker) {
      setChartSymbol(ticker)
    }

    void openWithPrompt(ticker, prompt, "morning", "brief_action")
  }, [openWithPrompt])

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--bg-base)] text-[var(--text-primary)] lg:h-[calc(100vh-56px)]">
      <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:overflow-hidden">
        <div className="flex h-8 flex-shrink-0 items-center gap-3 overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">The Desk</span>
          <span className="text-[var(--border-default)]">·</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[var(--data-warning)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--data-warning)]" />
            Chop potential
          </span>

          <div className="ml-auto flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="flex items-center gap-1 whitespace-nowrap text-[var(--text-muted)]">
              <span className="h-1 w-1 rounded-full bg-[var(--data-negative)]" />
              Fed speakers
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap text-[var(--text-muted)]">
              <span className="h-1 w-1 rounded-full bg-[var(--data-warning)]" />
              Meta &amp; Disney earnings
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap text-[var(--text-muted)]">
              <span className="h-1 w-1 rounded-full bg-[var(--data-warning)]" />
              VIX elevated
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[300px_minmax(360px,1fr)_auto] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(280px,55vh)_minmax(0,1fr)] lg:overflow-hidden">
          <section
            className="order-1 h-full min-h-0 overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-base)]"
            style={{ minHeight: 0 }}
          >
            <DeskChart symbol={chartSymbol} onSymbolChange={setChartSymbol} />
          </section>

          <aside
            className="order-3 min-h-[320px] overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:order-2 lg:row-span-2 lg:min-h-0 lg:border-l lg:border-t-0"
            style={{ minHeight: 0 }}
          >
            <DeskRightPanel onTickerClick={handleTickerClick} onAnalyze={handleAnalyze} />
          </aside>

          <section
            className="order-2 min-h-[360px] overflow-hidden bg-[var(--bg-base)] lg:order-3 lg:min-h-0"
            style={{ minHeight: 0 }}
          >
            <DeskDataZone onTickerClick={handleTickerClick} onAnalyze={handleAnalyze} />
          </section>
        </div>
      </div>
    </div>
  )
}
