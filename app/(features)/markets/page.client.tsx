"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamicImport from "next/dynamic"
import { AnimatePresence, m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon as Calendar,
  ChartLineData01Icon as ChartLine,
  GridViewIcon as GridFour,
} from "@hugeicons/core-free-icons"
import { tabContent } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"

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

const tabs: { key: MarketsTab; label: string; icon: typeof GridFour }[] = [
  { key: "heatmap", label: "Heatmap", icon: GridFour },
  { key: "correlations", label: "Correlations", icon: ChartLine },
  { key: "earnings", label: "Earnings", icon: Calendar },
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

        <div className="mb-5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigateToTab(tab.key)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150",
                activeTab === tab.key
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              <HugeiconsIcon icon={tab.icon} size={14} strokeWidth={1.5} color="currentColor" />
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--accent-primary)]" />
              )}
            </button>
          ))}
        </div>

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
