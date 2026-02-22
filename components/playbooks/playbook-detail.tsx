"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Eye,
  ChartBar,
  List,
  Sparkle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { PelicanButton, pageEnter, tabContent } from "@/components/ui/pelican"
import { usePlaybookStats } from "@/hooks/use-playbooks"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import type { Playbook } from "@/types/trading"
import { PlaybookOverviewTab } from "./detail-tabs/overview-tab"
import { PlaybookStatsTab } from "./detail-tabs/stats-tab"
import { PlaybookTradesTab } from "./detail-tabs/trades-tab"
import { PlaybookGradeTab } from "./detail-tabs/grade-tab"

type TabKey = "overview" | "stats" | "trades" | "grade"

interface PlaybookDetailProps {
  playbook: Playbook
  onBack: () => void
}

const tabs: { key: TabKey; label: string; icon: typeof Eye }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "stats", label: "Stats", icon: ChartBar },
  { key: "trades", label: "Trades", icon: List },
  { key: "grade", label: "Grade", icon: Sparkle },
]

export function PlaybookDetail({ playbook, onBack }: PlaybookDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const { stats, isLoading: statsLoading } = usePlaybookStats(playbook.id)
  const { openWithPrompt } = usePelicanPanelContext()

  const handleGrade = () => {
    const { visibleMessage, fullPrompt } = buildGradePrompt(playbook, stats)
    openWithPrompt(null, { visibleMessage, fullPrompt }, "journal", "journal_grade")
  }

  return (
    <motion.div variants={pageEnter} initial="hidden" animate="visible">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <PelicanButton variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} weight="bold" />
          Back
        </PelicanButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">
            {playbook.name}
          </h2>
          {playbook.description && (
            <p className="text-sm text-[var(--text-secondary)] truncate mt-0.5">
              {playbook.description}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 active:scale-[0.98]",
              activeTab === key
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            )}
          >
            <Icon
              size={16}
              weight={activeTab === key ? "fill" : "regular"}
            />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookOverviewTab playbook={playbook} />
          </motion.div>
        )}
        {activeTab === "stats" && (
          <motion.div key="stats" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookStatsTab stats={stats} isLoading={statsLoading} />
          </motion.div>
        )}
        {activeTab === "trades" && (
          <motion.div key="trades" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookTradesTab stats={stats} isLoading={statsLoading} />
          </motion.div>
        )}
        {activeTab === "grade" && (
          <motion.div key="grade" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookGradeTab
              playbook={playbook}
              stats={stats}
              onGrade={handleGrade}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Grade prompt builder ──

function buildGradePrompt(
  playbook: Playbook,
  stats: ReturnType<typeof usePlaybookStats>["stats"]
): { visibleMessage: string; fullPrompt: string } {
  const visibleMessage = `Grade my "${playbook.name}" playbook`

  const rulesSection = [
    playbook.market_conditions && `Market Conditions: ${playbook.market_conditions}`,
    playbook.entry_rules && `Entry Rules: ${playbook.entry_rules}`,
    playbook.exit_rules && `Exit Rules: ${playbook.exit_rules}`,
    playbook.risk_rules && `Risk Rules: ${playbook.risk_rules}`,
  ]
    .filter(Boolean)
    .join("\n")

  const statsSection = stats
    ? `Total Trades: ${stats.totalTrades}
Win Rate: ${stats.winRate.toFixed(1)}%
Average R: ${stats.avgR?.toFixed(2) ?? "N/A"}
Profit Factor: ${stats.profitFactor?.toFixed(2) ?? "N/A"}
Expectancy: ${stats.expectancy != null ? `$${stats.expectancy.toFixed(2)}` : "N/A"}
Total P&L: $${stats.totalPnl.toFixed(2)}
Recent Results: ${stats.recentTrades.map((t) => (t.pnl_amount ?? 0) > 0 ? "W" : "L").join(" ")}`
    : "No trade data available yet."

  const fullPrompt = `I want you to grade my trading playbook called "${playbook.name}" (setup type: ${playbook.setup_type}).

Here are my rules:
${rulesSection}

${playbook.checklist?.length ? `Pre-trade checklist: ${playbook.checklist.join(", ")}` : ""}

Here are my stats:
${statsSection}

Please analyze and provide:
1. Is my edge real or is the sample size too small to tell?
2. Am I following my own rules based on the results?
3. What patterns do you see in my wins vs losses?
4. What is the ONE thing I should change to improve?
5. Give me an execution compliance grade from A to F with a brief justification.

Be direct and specific. Use my actual numbers.`

  return { visibleMessage, fullPrompt }
}
