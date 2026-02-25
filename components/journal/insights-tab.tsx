"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ArrowsClockwise, Lightning, ChatCircleDots, X, Info } from "@phosphor-icons/react"
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
import { CalendarCard } from "@/components/journal/insights/calendar-card"
import { PlanComplianceCard } from "@/components/journal/insights/plan-compliance-card"
import { usePlanCompliance } from "@/hooks/use-plan-compliance"
import { useTradingPlan } from "@/hooks/use-trading-plan"
import { useTradeStats } from "@/hooks/use-trade-stats"
import { buildPlanReviewPrompt } from "@/lib/trading/plan-check"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { trackEvent } from "@/lib/tracking"

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

const SEVERITY_CONFIG = {
  critical: {
    dot: 'bg-[var(--data-negative)]',
    bg: 'bg-[var(--data-negative)]/[0.08]',
    border: 'border-[var(--data-negative)]/20',
    label: 'Critical',
    labelColor: 'text-[var(--data-negative)]',
  },
  warning: {
    dot: 'bg-[var(--data-warning)]',
    bg: 'bg-[var(--data-warning)]/[0.08]',
    border: 'border-[var(--data-warning)]/20',
    label: 'Warning',
    labelColor: 'text-[var(--data-warning)]',
  },
  info: {
    dot: 'bg-[var(--accent-primary)]',
    bg: 'bg-[var(--accent-primary)]/[0.06]',
    border: 'border-[var(--accent-primary)]/15',
    label: 'Info',
    labelColor: 'text-[var(--accent-primary)]',
  },
} as const

function formatMetricValue(key: string, value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') {
    if (key.includes('percent') || key.includes('rate') || key.includes('pct')) {
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
    }
    if (key.includes('amount') || key.includes('pnl') || key.includes('dollar')) {
      return `$${value.toFixed(2)}`
    }
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(2)
  }
  return String(value)
}

function formatMetricLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function PatternMetrics({ metrics }: { metrics: Record<string, unknown> }) {
  const entries = Object.entries(metrics).filter(
    ([, v]) => v != null && v !== '' && typeof v !== 'object'
  )
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {entries.slice(0, 4).map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="text-[var(--text-muted)]">{formatMetricLabel(key)}: </span>
          <span className="font-mono tabular-nums text-[var(--text-secondary)]">
            {formatMetricValue(key, value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function DetectedPatterns({
  patterns,
  onDismiss,
  onAskPelican,
}: {
  patterns: TradePattern[]
  onDismiss: (id: string) => void
  onAskPelican: (prompt: string) => void
}) {
  if (patterns.length === 0) {
    return (
      <PelicanCard className="p-5 flex items-center justify-center" noPadding>
        <div className="text-center py-4">
          <Lightning size={24} weight="regular" className="text-[var(--data-positive)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">No detected patterns</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Your trading looks healthy</p>
        </div>
      </PelicanCard>
    )
  }

  const handleDismiss = (pattern: TradePattern) => {
    trackEvent({
      eventType: 'alert_dismissed',
      feature: 'journal',
      data: { patternType: pattern.pattern_type },
    })
    onDismiss(pattern.id)
  }

  const handleAskPelican = (pattern: TradePattern) => {
    trackEvent({
      eventType: 'alert_acted',
      feature: 'journal',
      data: { patternType: pattern.pattern_type },
    })
    const metricsStr = pattern.metrics
      ? Object.entries(pattern.metrics)
          .filter(([, v]) => v != null && typeof v !== 'object')
          .map(([k, v]) => `${formatMetricLabel(k)}: ${formatMetricValue(k, v)}`)
          .join(', ')
      : ''
    onAskPelican(
      `Pelican, I have a detected trading pattern: "${pattern.title}" — ${pattern.description}${metricsStr ? ` (Metrics: ${metricsStr})` : ''}. Analyze this pattern and tell me specifically what I should change in my approach.`
    )
  }

  return (
    <PelicanCard className="p-5" noPadding>
      <div className="flex items-center gap-2 mb-3">
        <Info size={18} weight="regular" className="text-[var(--accent-primary)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Detected Patterns
          <span className="ml-1.5 font-mono tabular-nums text-[var(--text-secondary)]">
            {patterns.length}
          </span>
        </h3>
      </div>
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {patterns.map((p) => {
          const config = SEVERITY_CONFIG[p.severity] ?? SEVERITY_CONFIG.info
          return (
            <div
              key={p.id}
              className={cn(
                "p-3 rounded-lg text-sm border",
                config.bg,
                config.border,
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", config.dot)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      {p.title}
                    </p>
                    <span className={cn("text-[10px] font-medium uppercase tracking-wider flex-shrink-0", config.labelColor)}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {p.description}
                  </p>
                  {p.metrics && <PatternMetrics metrics={p.metrics as Record<string, unknown>} />}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => handleAskPelican(p)}
                      className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-1"
                    >
                      <ChatCircleDots size={12} weight="bold" />
                      Ask Pelican About This
                    </button>
                    <button
                      onClick={() => handleDismiss(p)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
                    >
                      <X size={10} weight="bold" />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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
  const { stats: complianceStats, isLoading: complianceLoading } = usePlanCompliance()
  const { plan } = useTradingPlan()
  const { stats: tradeStats } = useTradeStats()

  const handleComplianceAskPelican = useCallback((prompt: string) => {
    if (prompt === '__plan_review__' && plan) {
      onAskPelican(buildPlanReviewPrompt(plan, complianceStats, tradeStats))
    } else {
      onAskPelican(prompt)
    }
  }, [plan, complianceStats, tradeStats, onAskPelican])

  // Milestone: first insight unlocked (ref guard prevents re-fire on revalidation)
  const insightMilestoneRef = useRef(false)
  useEffect(() => {
    if (insights?.has_enough_data && !insightMilestoneRef.current) {
      insightMilestoneRef.current = true
      completeMilestone("first_insight")
    }
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

      {/* Row 0: Plan Compliance (full width) */}
      <motion.div variants={staggerItem} className="mb-6">
        <PlanComplianceCard
          stats={complianceStats}
          onAskPelican={handleComplianceAskPelican}
          isLoading={complianceLoading}
        />
      </motion.div>

      {/* Row 1: Edge Summary + Detected Patterns */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EdgeSummary insights={insights} onAskPelican={onAskPelican} />
        <DetectedPatterns patterns={patterns} onDismiss={dismissPattern} onAskPelican={onAskPelican} />
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

      {/* Row 4: Calendar Patterns */}
      <motion.div variants={staggerItem}>
        <CalendarCard data={insights.calendar_patterns} onAskPelican={onAskPelican} />
      </motion.div>
    </motion.div>
  )
}
