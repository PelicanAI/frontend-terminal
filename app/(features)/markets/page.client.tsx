"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamicImport from "next/dynamic"
import { AnimatePresence, m } from "framer-motion"
import { TabIndicator } from "@/components/motion/tab-indicator"
import { tabContent } from "@/components/ui/pelican"

const HeatmapTab = dynamicImport(() => import("@/components/markets/heatmap-tab"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4 py-4 motion-reduce:animate-none">
      <div className="h-10 w-72 rounded-lg bg-[var(--bg-elevated)]" />
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-1">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-[var(--bg-surface)]" />
        ))}
      </div>
    </div>
  ),
})

const CorrelationsTab = dynamicImport(() => import("@/components/markets/correlations-tab"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse py-4 motion-reduce:animate-none">
      <div className="h-[60vh] rounded-xl bg-[var(--bg-surface)]" />
    </div>
  ),
})

const EarningsTab = dynamicImport(() => import("@/components/markets/earnings-tab"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4 py-4 motion-reduce:animate-none">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-16 rounded-lg bg-[var(--bg-elevated)]" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-[var(--bg-surface)]" />
        ))}
      </div>
    </div>
  ),
})

type MarketsTab = "heatmap" | "correlations" | "earnings"

const TAB_ALIASES: Record<string, MarketsTab> = {
  calendar: "earnings",
}

const tabs: { key: MarketsTab; label: string }[] = [
  { key: "heatmap", label: "Heatmap" },
  { key: "correlations", label: "Correlations" },
  { key: "earnings", label: "Earnings" },
]

function resolveMarketsTab(tabParam: string | null): MarketsTab {
  if (!tabParam) return "heatmap"
  if (tabParam === "heatmap" || tabParam === "correlations" || tabParam === "earnings") return tabParam
  return TAB_ALIASES[tabParam] ?? "heatmap"
}

export default function MarketsPage() {
  return (
    <Suspense fallback={null}>
      <MarketsPageInner />
    </Suspense>
  )
}

function MarketsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<MarketsTab>(() => resolveMarketsTab(tabParam))

  const navigateToTab = useCallback((tab: MarketsTab) => {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (tab === "heatmap") {
      nextParams.delete("tab")
    } else {
      nextParams.set("tab", tab)
    }

    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `/markets?${nextQuery}` : "/markets", { scroll: false })
    setActiveTab(tab)
  }, [router, searchParams])

  useEffect(() => {
    const nextTab = resolveMarketsTab(tabParam)
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab))
  }, [tabParam])

  return (
    <div className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Markets</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Market heatmap, cross-asset correlations, and earnings calendar.
          </p>
        </div>

        <TabIndicator
          tabs={tabs.map((tab) => ({ id: tab.key, label: tab.label }))}
          activeId={activeTab}
          onChange={(id) => navigateToTab(id as MarketsTab)}
          className="mb-5 overflow-x-auto scrollbar-hide border-[var(--border-default)]"
        />

        <AnimatePresence mode="wait">
          {activeTab === "heatmap" && (
            <m.div key="heatmap" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <HeatmapTab />
            </m.div>
          )}
          {activeTab === "correlations" && (
            <m.div key="correlations" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <CorrelationsTab />
            </m.div>
          )}
          {activeTab === "earnings" && (
            <m.div key="earnings" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <EarningsTab />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
