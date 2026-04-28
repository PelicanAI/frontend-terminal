"use client"

import { useState } from "react"
import { MarketPulseStrip } from "@/components/morning/market-pulse-strip"
import { TabIndicator } from "@/components/motion/tab-indicator"
import DeskPositions from "./desk-positions"
import DeskWatchlist from "./desk-watchlist"
import DeskMovers from "./desk-movers"
import DeskSectors from "./desk-sectors"

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

export default function DeskDataZone({ onTickerClick, onAnalyze }: DeskDataZoneProps) {
  const [activeTab, setActiveTab] = useState<DeskTab>("positions")

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)]">
        <MarketPulseStrip compact onIndexClick={(symbol) => onTickerClick(symbol)} />
      </div>

      <div className="flex-shrink-0 px-3">
        <TabIndicator
          tabs={tabs.map((tab) => ({ id: tab.key, label: tab.label }))}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as DeskTab)}
          className="overflow-x-auto scrollbar-hide border-[var(--border-subtle)]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "positions" && <DeskPositions onTickerClick={onTickerClick} onAnalyze={onAnalyze} />}
        {activeTab === "watchlist" && <DeskWatchlist onTickerClick={onTickerClick} onAnalyze={onAnalyze} />}
        {activeTab === "movers" && <DeskMovers onTickerClick={onTickerClick} onAnalyze={onAnalyze} />}
        {activeTab === "sectors" && <DeskSectors onTickerClick={onTickerClick} onAnalyze={onAnalyze} />}
      </div>
    </div>
  )
}
