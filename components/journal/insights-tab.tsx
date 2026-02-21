"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowsClockwise, Warning, Lightning } from "@phosphor-icons/react"
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights"
import { useTradePatterns, type TradePattern } from "@/hooks/use-trade-patterns"
import { useDetectPatterns } from "@/hooks/use-detect-patterns"
import { useToast } from "@/hooks/use-toast"
import { PelicanCard, PelicanButton, staggerContainer, staggerItem } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"
import { EdgeSummary } from "@/components/insights/edge-summary"
import { NotEnoughData } from "@/components/insights/not-enough-data"
import { TimeOfDayChart } from "@/components/journal/insights/time-of-day-chart"
import { HoldingPeriodChart } from "@/components/journal/insights/holding-period-chart"
import { TickerScorecard } from "@/components/journal/insights/ticker-scorecard"
import { StreaksCard } from "@/components/journal/insights/streaks-card"
import { CalendarCard } from "@/components/journal/insights/calendar-card"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"

// ============================================================================
// Types
// ============================================================================

interface InsightsTabProps {
  onAskPelican: (prompt: string) => void
  onLogTrade: () => void
}

// ============================================================================
// Sub-components
// ============================================================================

function ActiveWarnings({
  patterns,
  onDismiss,
}: {
  patterns: TradePattern[]
  onDismiss: (id: string) => void
}) {
  const activeWarnings = patterns.filter(
    (p) => p.severity === "warning" || p.severity === "critical"
  )

  if (activeWarnings.length === 0) {
    return (
      <PelicanCard className="p-5 flex items-center justify-center" noPadding>
        <div className="text-center py-4">
          <Lightning size={24} weight="regular" className="text-[var(--data-positive)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">No active warnings</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Your patterns look healthy</p>
        </div>
      </PelicanCard>
    )
  }

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-3">
        <Warning size={18} weight="regular" className="text-[var(--data-warning)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Active Warnings
          <span className="ml-1.5 font-mono tabular-nums text-[var(--data-warning)]">
            {activeWarnings.length}
          </span>
        </h3>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {activeWarnings.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex items-start gap-2 p-2.5 rounded-lg text-sm",
              p.severity === "critical"
                ? "bg-[var(--data-negative)]/[0.08]"
                : "bg-[var(--data-warning)]/[0.08]",
            )}
          >
            <div className="flex-1">
              <p className="font-medium text-[var(--text-primary)]">{p.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.description}</p>
            </div>
            <button
              onClick={() => onDismiss(p.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs flex-shrink-0 mt-0.5"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </PelicanCard>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function InsightsTab({ onAskPelican, onLogTrade }: InsightsTabProps) {
  const { data: insights, isLoading: insightsLoading, refresh } = useBehavioralInsights()
  const { patterns, dismissPattern, refreshPatterns } = useTradePatterns()
  const { detect, isDetecting } = useDetectPatterns()
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { completeMilestone } = useOnboardingProgress()

  // Milestone: first insight unlocked
  useEffect(() => {
    if (insights?.has_enough_data) completeMilestone("first_insight")
  }, [insights?.has_enough_data, completeMilestone])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await detect()
      refresh()
      refreshPatterns()
      toast({
        title: `Found ${result.patterns_found} new pattern${result.patterns_found !== 1 ? "s" : ""}`,
        description: "Your insights have been updated.",
      })
    } catch {
      toast({
        title: "Failed to refresh patterns",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [detect, refresh, refreshPatterns, toast])

  // Loading state
  if (insightsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">Analyzing your trades...</p>
        </div>
      </div>
    )
  }

  // Not enough data
  if (!insights || !insights.has_enough_data) {
    return (
      <NotEnoughData
        totalTrades={insights?.total_closed_trades ?? 0}
        minNeeded={insights?.min_trades_needed ?? 5}
        onLogTrade={onLogTrade}
      />
    )
  }

  const refreshing = isDetecting || isRefreshing

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Trading DNA</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            <span className="font-mono tabular-nums">{insights.total_closed_trades}</span> closed trades analyzed
            {insights.generated_at && (
              <>
                {" "}&middot; Updated{" "}
                {new Date(insights.generated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </>
            )}
          </p>
        </div>
        <PelicanButton
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <ArrowsClockwise
            size={14}
            weight="bold"
            className={cn(refreshing && "animate-spin")}
          />
          {refreshing ? "Analyzing..." : "Refresh Patterns"}
        </PelicanButton>
      </motion.div>

      {/* Row 1: Edge Summary + Active Warnings */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EdgeSummary insights={insights} onAskPelican={onAskPelican} />
        <ActiveWarnings patterns={patterns} onDismiss={dismissPattern} />
      </motion.div>

      {/* Row 2: Time of Day + Holding Period charts */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TimeOfDayChart data={insights.time_of_day} onAskPelican={onAskPelican} />
        <HoldingPeriodChart data={insights.holding_period} onAskPelican={onAskPelican} />
      </motion.div>

      {/* Row 3: Ticker Scorecard (full width) */}
      <motion.div variants={staggerItem} className="mb-6">
        <TickerScorecard data={insights.ticker_performance} onAskPelican={onAskPelican} />
      </motion.div>

      {/* Row 4: Streaks + Calendar Patterns */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StreaksCard data={insights.streaks} onAskPelican={onAskPelican} />
        <CalendarCard data={insights.calendar_patterns} onAskPelican={onAskPelican} />
      </motion.div>
    </motion.div>
  )
}
