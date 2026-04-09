"use client"

import dynamicImport from "next/dynamic"

interface DeskRightPanelProps {
  onTickerClick: (ticker: string) => void
  onAnalyze: (ticker: string | null, prompt: string) => void
}

const PelicanRead = dynamicImport(() => import("./pelican-read"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/40" />,
})

const CatalystsCard = dynamicImport(() => import("./catalysts-card"), {
  ssr: false,
  loading: () => <div className="h-28 animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/40" />,
})

const NewsCard = dynamicImport(() => import("./news-card"), {
  ssr: false,
  loading: () => <div className="h-20 animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/40" />,
})

const RadarCard = dynamicImport(() => import("./radar-card"), {
  ssr: false,
  loading: () => <div className="flex-1 animate-pulse bg-[var(--bg-base)]/40" />,
})

export default function DeskRightPanel({ onTickerClick, onAnalyze }: DeskRightPanelProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[var(--bg-surface)]">
      <PelicanRead onAnalyze={onAnalyze} />
      <CatalystsCard onAnalyze={onAnalyze} />
      <NewsCard />
      <div className="min-h-0 flex-1">
        <RadarCard onTickerClick={onTickerClick} onAnalyze={onAnalyze} />
      </div>
    </div>
  )
}
