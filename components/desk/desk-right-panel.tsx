"use client"

import PelicanRead from "./pelican-read"
import CatalystsCard from "./catalysts-card"
import NewsCard from "./news-card"
import RadarCard from "./radar-card"

interface DeskRightPanelProps {
  onTickerClick: (ticker: string) => void
  onAnalyze: (ticker: string | null, prompt: string) => void
}

export default function DeskRightPanel({ onTickerClick, onAnalyze }: DeskRightPanelProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-[var(--bg-surface)]">
      <PelicanRead onAnalyze={onAnalyze} />
      <CatalystsCard onAnalyze={onAnalyze} />
      <NewsCard />
      <div className="min-h-0 flex-1">
        <RadarCard onTickerClick={onTickerClick} onAnalyze={onAnalyze} />
      </div>
    </div>
  )
}
