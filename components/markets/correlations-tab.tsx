"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, m } from "framer-motion"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Add01Icon as Plus,
  Alert01Icon as Warning,
  Analytics01Icon as Graph,
  AnalyticsDownIcon as TrendDown,
  AnalyticsUpIcon as TrendUp,
  Briefcase01Icon as Briefcase,
  ChartLineData01Icon as ChartLineUp,
  MessageMultiple01Icon as ChatCircleDots,
  MinusSignIcon as Minus,
  Refresh01Icon as ArrowsClockwise,
  ShuffleIcon as Shuffle,
} from "@hugeicons/core-free-icons"
import { useCorrelationMatrix } from "@/hooks/use-correlations"
import { BeginnerToggle, useBeginnerMode } from "@/components/correlations/beginner-toggle"
import { CorrelationListView } from "@/components/correlations/correlation-list-view"
import { CorrelationMatrix } from "@/components/correlations/correlation-matrix"
import { DataFreshness } from "@/components/correlations/data-freshness"
import { PairDetailPanel } from "@/components/correlations/pair-detail-panel"
import { PortfolioCorrelations } from "@/components/correlations/portfolio-correlations"
import { RegimeBanner } from "@/components/correlations/regime-banner"
import { SignalCards } from "@/components/correlations/signal-cards"
import { IconTooltip } from "@/components/ui/icon-tooltip"

type ViewTab = "market" | "portfolio"

const NEUTRAL_REGIME = { color: "var(--text-muted)", Icon: Minus, label: "Neutral" } as const

const regimeConfig: Record<string, { color: string; Icon: IconSvgElement; label: string }> = {
  risk_on: { color: "var(--data-positive)", Icon: TrendUp, label: "Risk On" },
  risk_off: { color: "var(--data-negative)", Icon: TrendDown, label: "Risk Off" },
  correlation_breakdown: { color: "var(--data-warning)", Icon: Warning, label: "Breakdown" },
  rotation: { color: "var(--accent-indigo)", Icon: Shuffle, label: "Rotation" },
  neutral: NEUTRAL_REGIME,
}

export default function CorrelationsTab() {
  const [activeTab, setActiveTab] = useState<ViewTab>("market")
  const [period, setPeriod] = useState<"30d" | "90d" | "1y">("30d")
  const [selectedPair, setSelectedPair] = useState<{ assetA: string; assetB: string } | null>(null)
  const [beginnerMode, setBeginnerMode] = useBeginnerMode()
  const [calculating, setCalculating] = useState(false)

  const detailPanelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error, refetch } = useCorrelationMatrix(period)
  const { data: data90d } = useCorrelationMatrix("90d")

  useEffect(() => {
    if (selectedPair && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
    }
  }, [selectedPair])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === "1") setPeriod("30d")
      else if (event.key === "2") setPeriod("90d")
      else if (event.key === "3") setPeriod("1y")
      else if (event.key === "Escape") setSelectedPair(null)
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleSelectPair = useCallback((assetA: string, assetB: string) => {
    setSelectedPair({ assetA, assetB })
  }, [])

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const response = await fetch("/api/correlations/calculate", { method: "POST" })
      const json = await response.json()
      if (json.success) refetch()
    } catch {
      // noop
    } finally {
      setCalculating(false)
    }
  }

  const regime = data?.regime
  const regimeStyle = regime ? regimeConfig[regime.overall_regime] ?? NEUTRAL_REGIME : NEUTRAL_REGIME
  const RegimeIcon = regimeStyle.Icon

  const activeSignalCount = data?.correlations.filter(
    (pair) => Math.abs(pair.z_score) > 1.0 || pair.regime === "breakdown" || pair.regime === "inversion"
  ).length ?? 0

  if (!isLoading && data && data.correlations.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <HugeiconsIcon icon={Graph} size={48} className="mb-5" style={{ color: "var(--text-muted)" }} strokeWidth={1} color="currentColor" />
        <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Correlation data is building
        </h2>
        <p className="mb-8 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
          Pelican calculates correlations between assets automatically after market close. Log some trades and add
          tickers to your watchlist — correlations will appear here once there&apos;s enough data to analyze.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/portfolio?tab=history"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 active:scale-[0.98]"
            style={{ background: "var(--accent-primary)" }}
          >
            <HugeiconsIcon icon={Plus} size={16} strokeWidth={2} color="currentColor" />
            Log a Trade
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
            }}
          >
            <HugeiconsIcon icon={ChatCircleDots} size={16} strokeWidth={1.5} color="currentColor" />
            Ask Pelican About Correlations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <DataFreshness calculatedAt={regime?.calculated_at ?? null} />
          {data && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              · {data.assets.length} assets
            </span>
          )}
        </div>

        {regime && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <HugeiconsIcon icon={RegimeIcon} className="h-4 w-4" style={{ color: regimeStyle.color }} strokeWidth={2} color="currentColor" />
            <span className="text-sm font-semibold" style={{ color: regimeStyle.color }}>
              {regimeStyle.label}
            </span>
            <span className="font-[var(--font-geist-mono)] text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {regime.regime_score > 0 ? "+" : ""}
              {regime.regime_score.toFixed(1)}
              {activeSignalCount > 0 && ` · ${activeSignalCount} signal${activeSignalCount > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-base)" }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("market")
              setSelectedPair(null)
            }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: activeTab === "market" ? "var(--accent-indigo)" : "transparent",
              color: activeTab === "market" ? "white" : "var(--text-secondary)",
            }}
          >
            <HugeiconsIcon icon={ChartLineUp} className="h-3.5 w-3.5" strokeWidth={1.5} color="currentColor" />
            Market Matrix
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("portfolio")
              setSelectedPair(null)
            }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: activeTab === "portfolio" ? "var(--accent-indigo)" : "transparent",
              color: activeTab === "portfolio" ? "white" : "var(--text-secondary)",
            }}
          >
            <HugeiconsIcon icon={Briefcase} className="h-3.5 w-3.5" strokeWidth={1.5} color="currentColor" />
            My Portfolio
          </button>
        </div>
      </div>

      {activeTab === "market" && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-base)" }}>
            {(["30d", "90d", "1y"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: period === value ? "var(--accent-indigo)" : "transparent",
                  color: period === value ? "white" : "var(--text-secondary)",
                }}
              >
                {value === "1y" ? "1 Year" : value === "90d" ? "90 Day" : "30 Day"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <BeginnerToggle value={beginnerMode} onChange={setBeginnerMode} />
            <IconTooltip label="Recalculate correlations" side="bottom">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={calculating}
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: "var(--text-muted)", background: "var(--bg-base)" }}
              >
                <HugeiconsIcon
                  icon={ArrowsClockwise}
                  className={`h-4 w-4 ${calculating ? "animate-spin" : ""}`}
                  strokeWidth={2}
                  color="currentColor"
                />
              </button>
            </IconTooltip>
          </div>
        </div>
      )}

      {activeTab === "market" && data && regime && (
        <RegimeBanner
          regime={regime}
          correlations={data.correlations}
          beginnerMode={beginnerMode}
          activeSignalCount={activeSignalCount}
        />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <HugeiconsIcon
            icon={ArrowsClockwise}
            className="h-6 w-6 animate-spin"
            style={{ color: "var(--accent-indigo)" }}
            strokeWidth={2}
            color="currentColor"
          />
        </div>
      )}

      {error && (
        <div className="pelican-card p-4 text-center">
          <p className="text-sm" style={{ color: "var(--data-negative)" }}>
            Failed to load correlations: {error.message ?? String(error)}
          </p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm" style={{ color: "var(--accent-indigo)" }}>
            Retry
          </button>
        </div>
      )}

      {data && data.correlations.length > 0 && (
        <AnimatePresence mode="wait">
          {activeTab === "market" ? (
            <m.div
              key="market"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                <div className="xl:col-span-3">
                  <div className="pelican-card hidden overflow-auto md:block">
                    <CorrelationMatrix
                      assets={data.assets}
                      correlations={data.correlations}
                      period={period}
                      selectedPair={selectedPair}
                      onSelectPair={handleSelectPair}
                      beginnerMode={beginnerMode}
                    />
                  </div>
                  <div className="md:hidden">
                    <CorrelationListView
                      correlations={data.correlations}
                      assets={data.assets}
                      period={period}
                      beginnerMode={beginnerMode}
                      onSelectPair={handleSelectPair}
                    />
                  </div>
                </div>

                <div className="overflow-y-auto xl:col-span-1 xl:max-h-[calc(100vh-220px)]">
                  <SignalCards
                    correlations={data.correlations}
                    correlations90d={period === "30d" ? data90d?.correlations : undefined}
                    assets={data.assets}
                    beginnerMode={beginnerMode}
                    onSelectPair={handleSelectPair}
                  />
                </div>
              </div>

              {selectedPair && (
                <div ref={detailPanelRef}>
                  <PairDetailPanel
                    assetA={selectedPair.assetA}
                    assetB={selectedPair.assetB}
                    assets={data.assets}
                    beginnerMode={beginnerMode}
                    onClose={() => setSelectedPair(null)}
                  />
                </div>
              )}
            </m.div>
          ) : (
            <m.div
              key="portfolio"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <PortfolioCorrelations
                correlations={data.correlations}
                assets={data.assets}
                period={period}
                beginnerMode={beginnerMode}
                onSelectPair={handleSelectPair}
              />

              {selectedPair && (
                <div ref={detailPanelRef}>
                  <PairDetailPanel
                    assetA={selectedPair.assetA}
                    assetB={selectedPair.assetB}
                    assets={data.assets}
                    beginnerMode={beginnerMode}
                    onClose={() => setSelectedPair(null)}
                  />
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
