"use client"

import { useState } from "react"
import dynamicImport from "next/dynamic"
import { AnimatePresence, m } from "framer-motion"
import { MarketPulseStrip } from "@/components/morning/market-pulse-strip"
import { tabContent } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"

interface DeskDataZoneProps {
  onTickerClick: (ticker: string) => void
  onAnalyze: (ticker: string | null, prompt: string) => void
}

type DeskTab = "positions" | "watchlist" | "movers" | "sectors"

const tabs: Array<{ key: DeskTab; label: string }> = [
  { key: "positions", label: "Positions" },
  { key: "watchlist", label: "Watchlist" },
  { key: "movers", label: "Movers" },
  { key: "sectors", label: "Sectors" },
]

const DeskPositions = dynamicImport(() => import("./desk-positions"), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-[var(--bg-surface)] animate-pulse" />,
})

const DeskWatchlist = dynamicImport(() => import("./desk-watchlist"), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-[var(--bg-surface)] animate-pulse" />,
})

const DeskMovers = dynamicImport(() => import("./desk-movers"), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-[var(--bg-surface)] animate-pulse" />,
})

const DeskSectors = dynamicImport(() => import("./desk-sectors"), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-[var(--bg-surface)] animate-pulse" />,
})

export default function DeskDataZone({ onTickerClick, onAnalyze }: DeskDataZoneProps) {
  const [activeTab, setActiveTab] = useState<DeskTab>("positions")

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)]">
        <MarketPulseStrip compact onIndexClick={(symbol) => onTickerClick(symbol)} />
      </div>

      <div className="flex flex-shrink-0 items-center gap-0.5 border-b border-[var(--border-subtle)] px-3 py-1">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
                activeTab === tab.key
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "positions" ? (
            <m.div key="positions" variants={tabContent} initial="hidden" animate="visible" exit="exit" className="h-full min-h-0">
              <DeskPositions onAnalyze={onAnalyze} />
            </m.div>
          ) : null}

          {activeTab === "watchlist" ? (
            <m.div key="watchlist" variants={tabContent} initial="hidden" animate="visible" exit="exit" className="h-full min-h-0">
              <DeskWatchlist onAnalyze={onAnalyze} />
            </m.div>
          ) : null}

          {activeTab === "movers" ? (
            <m.div key="movers" variants={tabContent} initial="hidden" animate="visible" exit="exit" className="h-full min-h-0">
              <DeskMovers onAnalyze={onAnalyze} />
            </m.div>
          ) : null}

          {activeTab === "sectors" ? (
            <m.div key="sectors" variants={tabContent} initial="hidden" animate="visible" exit="exit" className="h-full min-h-0">
              <DeskSectors onAnalyze={onAnalyze} />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
