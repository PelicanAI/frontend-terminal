"use client"

export const dynamic = "force-dynamic"

import { useState, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, SortAscending } from "@phosphor-icons/react"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { usePlaybooks, useSuggestedStrategies } from "@/hooks/use-playbooks"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import {
  PageHeader,
  PelicanButton,
  pageEnter,
  staggerContainer,
} from "@/components/ui/pelican"
import { PlaybookCard } from "@/components/playbooks/playbook-card"
import { PlaybookDetail } from "@/components/playbooks/playbook-detail"
import { PlaybookEmptyState } from "@/components/playbooks/playbook-empty-state"
import { CreatePlaybookModal } from "@/components/playbooks/create-playbook-modal"
import type { PlaybookFormData } from "@/hooks/use-playbooks"
import type { Playbook } from "@/types/trading"

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
] as const

const sortOptions = [
  { key: 'recent', label: 'Recently Used' },
  { key: 'win_rate', label: 'Win Rate' },
  { key: 'most_trades', label: 'Most Trades' },
  { key: 'newest', label: 'Newest' },
] as const

type TabKey = typeof tabs[number]['key']
type SortKey = typeof sortOptions[number]['key']

export default function PlaybooksPage() {
  const [tab, setTab] = useState<TabKey>('active')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const { playbooks, isLoading, createPlaybook } = usePlaybooks(tab, sortBy)
  const { suggestions: suggestedStrategies } = useSuggestedStrategies()
  const { openWithPrompt } = usePelicanPanelContext()
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleSelectPlaybook = useCallback((playbook: Playbook) => {
    setSelectedPlaybook(playbook)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedPlaybook(null)
  }, [])

  const handleCreate = useCallback(
    async (data: PlaybookFormData) => {
      await createPlaybook(data)
    },
    [createPlaybook]
  )

  const handleScan = useCallback((playbook: Playbook) => {
    const hasStats = playbook.total_trades > 0
    const visibleMessage = hasStats
      ? `Review my "${playbook.name}" playbook performance`
      : `Walk me through the "${playbook.name}" strategy`
    const fullPrompt = hasStats
      ? `Review my ${playbook.name} playbook. I've taken ${playbook.total_trades} trades with a ${(playbook.win_rate ?? 0).toFixed(0)}% win rate and avg R of ${(playbook.avg_r_multiple ?? 0).toFixed(1)}. Am I following my rules? Where am I deviating from my entry/exit criteria? What should I adjust based on the data?`
      : `I just added the ${playbook.name} playbook to my collection. Walk me through this strategy in detail — ideal market conditions, how to identify the setup, entry timing, position sizing, and exit management. What should a beginner watch out for?`
    openWithPrompt(null, { visibleMessage, fullPrompt }, 'playbooks', 'playbook_scan')
  }, [openWithPrompt])

  const handleEdit = useCallback((playbook: Playbook) => {
    setSelectedPlaybook(playbook)
  }, [])

  // Detail view
  if (selectedPlaybook) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6">
        <PlaybookDetail playbook={selectedPlaybook} onBack={handleBack} />
      </div>
    )
  }

  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto p-4 sm:p-6"
    >
      {/* Header */}
      <PageHeader
        title="Playbook Lab"
        subtitle={
          playbooks.length > 0
            ? `${playbooks.length} playbook${playbooks.length !== 1 ? "s" : ""}`
            : undefined
        }
        actions={
          playbooks.length > 0 ? (
            <PelicanButton
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} weight="bold" />
              New Playbook
            </PelicanButton>
          ) : undefined
        }
      />

      {/* Filter tabs + sort */}
      {playbooks.length > 0 || tab !== 'active' ? (
        <div className="flex items-center justify-between mb-5">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  tab === t.key
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <SortAscending size={14} className="text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-transparent text-xs text-[var(--text-secondary)] border-none outline-none cursor-pointer appearance-none pr-4"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239898a6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
              }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {/* Loading */}
      {isLoading && playbooks.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && playbooks.length === 0 && tab === 'active' && (
        <PlaybookEmptyState onCreatePlaybook={() => setShowCreateModal(true)} />
      )}

      {/* Empty filtered state */}
      {!isLoading && playbooks.length === 0 && tab !== 'active' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No {tab === 'archived' ? 'archived' : ''} playbooks found.
          </p>
        </div>
      )}

      {/* Grid */}
      {playbooks.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {playbooks.map((playbook) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              onClick={handleSelectPlaybook}
              onScan={handleScan}
              onEdit={handleEdit}
            />
          ))}
        </motion.div>
      )}

      {/* Suggested For You */}
      {playbooks.length > 0 && suggestedStrategies.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Suggested For You
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {suggestedStrategies.map((s) => (
              <Link
                key={s.id}
                href={`/strategies/${s.slug}`}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors line-clamp-1">
                    {s.name}
                  </h4>
                  <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0 ml-2">
                    View &rarr;
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {s.category && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--accent-muted)] text-[var(--accent-primary)]">
                      {s.category.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
                    {s.adoption_count} adopted
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Create modal */}
      <CreatePlaybookModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreate}
      />

      {/* Mobile FAB */}
      {playbooks.length > 0 && (
        <IconTooltip label="New Playbook" side="left">
          <button
            onClick={() => setShowCreateModal(true)}
            className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-[var(--accent-primary)] rounded-full shadow-lg shadow-[var(--accent-primary)]/25 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="New Playbook"
          >
            <Plus size={24} weight="bold" className="text-white" />
          </button>
        </IconTooltip>
      )}
    </motion.div>
  )
}
