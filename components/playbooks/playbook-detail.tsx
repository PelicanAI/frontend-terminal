"use client"

import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowLeft01Icon as ArrowLeft,
  ViewIcon as Eye,
  BarChartIcon as ChartBar,
  ListViewIcon as List,
  SparklesIcon as Sparkle,
  GlobeIcon as Globe,
  MoreVerticalIcon as DotsThreeVertical,
  ArchiveIcon as Archive,
  Delete01Icon as Trash,
  Cancel01Icon as XIcon,
  PencilEdit01Icon as PencilSimple,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { PelicanButton, pageEnter, tabContent } from "@/components/ui/pelican"
import { usePlaybooks, usePlaybookStats } from "@/hooks/use-playbooks"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { PublishModal } from "@/components/strategies/publish-modal"
import { CreatePlaybookModal } from "@/components/playbooks/create-playbook-modal"
import type { PlaybookFormData } from "@/components/playbooks/create-playbook-modal"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Playbook } from "@/types/trading"
import { PlaybookOverviewTab } from "./detail-tabs/overview-tab"
import { PlaybookStatsTab } from "./detail-tabs/stats-tab"
import { PlaybookTradesTab } from "./detail-tabs/trades-tab"
import { PlaybookGradeTab } from "./detail-tabs/grade-tab"

type TabKey = "overview" | "stats" | "trades" | "grade"

interface PlaybookDetailProps {
  playbook: Playbook
  onBack: () => void
  onArchive?: (playbook: Playbook) => void
  onDelete?: (playbook: Playbook) => void
  onUnadopt?: (playbook: Playbook) => void
}

const tabs: { key: TabKey; label: string; icon: IconSvgElement }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "stats", label: "Stats", icon: ChartBar },
  { key: "trades", label: "Trades", icon: List },
  { key: "grade", label: "Grade", icon: Sparkle },
]

export function PlaybookDetail({ playbook, onBack, onArchive, onDelete, onUnadopt }: PlaybookDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const { stats, isLoading: statsLoading } = usePlaybookStats(playbook.id)
  const { updatePlaybook } = usePlaybooks()
  const { openWithPrompt } = usePelicanPanelContext()

  const canPublish = !playbook.is_published && !playbook.is_curated && playbook.entry_rules && playbook.exit_rules && playbook.risk_rules
  const canEdit = !playbook.is_curated
  const isAdopted = !!playbook.forked_from
  const hasMenu = onArchive || onDelete || onUnadopt

  const handleGrade = () => {
    const { visibleMessage, fullPrompt } = buildGradePrompt(playbook, stats)
    openWithPrompt(null, { visibleMessage, fullPrompt }, "journal", "journal_grade")
  }

  return (
    <m.div variants={pageEnter} initial="hidden" animate="visible">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <PelicanButton variant="ghost" size="sm" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={2} color="currentColor" />
          Back
        </PelicanButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">
              {playbook.name}
            </h2>
            {playbook.forked_from && (
              <span className="text-[10px] font-medium text-[var(--accent-primary)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-md whitespace-nowrap">
                Forked
              </span>
            )}
          </div>
          {playbook.description && (
            <p className="text-sm text-[var(--text-secondary)] truncate mt-0.5">
              {playbook.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="Edit playbook"
            >
              <HugeiconsIcon icon={PencilSimple} size={18} className="text-[var(--text-secondary)]" strokeWidth={1.5} color="currentColor" />
            </button>
          )}
          {canPublish && (
            <PelicanButton variant="secondary" size="sm" onClick={() => setShowPublishModal(true)}>
              <HugeiconsIcon icon={Globe} size={14} strokeWidth={1.5} color="currentColor" />
              Publish
            </PelicanButton>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors" aria-label="More options">
                  <HugeiconsIcon icon={DotsThreeVertical} size={18} strokeWidth={2} color="currentColor" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                {isAdopted && onUnadopt ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onUnadopt(playbook)}
                  >
                    <HugeiconsIcon icon={XIcon} size={14} strokeWidth={1.5} color="currentColor" />
                    Remove from Playbooks
                  </DropdownMenuItem>
                ) : (
                  <>
                    {onArchive && (
                      <DropdownMenuItem onClick={() => onArchive(playbook)}>
                        <HugeiconsIcon icon={Archive} size={14} className="text-[var(--text-secondary)]" strokeWidth={1.5} color="currentColor" />
                        Archive Playbook
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(playbook)}
                        >
                          <HugeiconsIcon icon={Trash} size={14} strokeWidth={1.5} color="currentColor" />
                          Delete Playbook
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <PublishModal
        playbook={playbook}
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
      />

      <CreatePlaybookModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSubmit={async (data: PlaybookFormData) => {
          await updatePlaybook(playbook.id, data as Partial<Playbook>)
        }}
        editPlaybook={playbook}
      />

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
            <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.5} color="currentColor" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <m.div key="overview" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookOverviewTab playbook={playbook} />
          </m.div>
        )}
        {activeTab === "stats" && (
          <m.div key="stats" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookStatsTab stats={stats} isLoading={statsLoading} />
          </m.div>
        )}
        {activeTab === "trades" && (
          <m.div key="trades" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookTradesTab stats={stats} isLoading={statsLoading} />
          </m.div>
        )}
        {activeTab === "grade" && (
          <m.div key="grade" variants={tabContent} initial="hidden" animate="visible" exit="exit">
            <PlaybookGradeTab
              playbook={playbook}
              stats={stats}
              onGrade={handleGrade}
            />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
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
