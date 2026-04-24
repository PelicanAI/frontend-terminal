"use client"

import { useState } from "react"
import { MarketPulseStrip } from "@/components/morning/market-pulse-strip"
import { cn } from "@/lib/utils"
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
        {activeTab === "positions" && <DeskPositions onTickerClick={onTickerClick} onAnalyze={onAnalyze} />}
        {activeTab === "watchlist" && <DeskWatchlist onTickerClick={onTickerClick} onAnalyze={onAnalyze} />}
        {activeTab === "movers" && <DeskMovers onAnalyze={onAnalyze} />}
        {activeTab === "sectors" && <DeskSectors onAnalyze={onAnalyze} />}
      </div>
    </div>
  )
}
