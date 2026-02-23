"use client"

export const dynamic = "force-dynamic"

import { useState, useCallback, useMemo, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, SortAscending, Info, X, Compass } from "@phosphor-icons/react"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { usePlaybooks, useSuggestedStrategies } from "@/hooks/use-playbooks"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import {
  PageHeader,
  PelicanButton,
  pageEnter,
  staggerContainer,
  staggerItem,
} from "@/components/ui/pelican"
import { PlaybookCard } from "@/components/playbooks/playbook-card"
import { PlaybookDetail } from "@/components/playbooks/playbook-detail"
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

const TAGGING_HINT_KEY = 'pelican_playbook_tagging_hint_dismissed'

export default function PlaybooksPage() {
  const [tab, setTab] = useState<TabKey>('active')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const { playbooks, isLoading, createPlaybook } = usePlaybooks(tab, sortBy)
  const { suggestions: suggestedStrategies } = useSuggestedStrategies()
  const { openWithPrompt } = usePelicanPanelContext()
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(true)

  // Check localStorage for tagging hint dismissal
  useEffect(() => {
    setHintDismissed(localStorage.getItem(TAGGING_HINT_KEY) === 'true')
  }, [])

  // Split playbooks into sections
  const { myPlaybooks, adoptedPlaybooks } = useMemo(() => {
    const my: Playbook[] = []
    const adopted: Playbook[] = []
    for (const p of playbooks) {
      if (p.forked_from) {
        adopted.push(p)
      } else {
        my.push(p)
      }
    }
    return { myPlaybooks: my, adoptedPlaybooks: adopted }
  }, [playbooks])

  // Total count for subtitle (My + Adopted, excluding suggested)
  const totalCount = myPlaybooks.length + adoptedPlaybooks.length

  // Check if ALL playbook cards show "No trades tagged yet"
  const allUntagged = playbooks.length > 0 && playbooks.every(p => p.total_trades === 0)
  const showTaggingHint = allUntagged && !hintDismissed

  const handleDismissHint = useCallback(() => {
    localStorage.setItem(TAGGING_HINT_KEY, 'true')
    setHintDismissed(true)
  }, [])

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

  const hasAnyPlaybooks = playbooks.length > 0 || tab !== 'active'

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
          totalCount > 0
            ? `${totalCount} playbook${totalCount !== 1 ? "s" : ""}`
            : undefined
        }
        actions={
          totalCount > 0 ? (
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
      {hasAnyPlaybooks ? (
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

      {/* Tagging hint banner */}
      {showTaggingHint && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-start gap-3 mb-5 p-4 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-primary)]/20"
        >
          <Info size={18} weight="regular" className="text-[var(--accent-primary)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
            Tag trades to your playbooks to track performance per strategy. When logging or editing a trade, select a playbook to link it.
          </p>
          <button
            onClick={handleDismissHint}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <X size={16} weight="regular" />
          </button>
        </motion.div>
      )}

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

      {/* Global empty state — no playbooks at all on active tab */}
      {!isLoading && playbooks.length === 0 && tab === 'active' && (
        <GlobalEmptyState onCreatePlaybook={() => setShowCreateModal(true)} />
      )}

      {/* Empty filtered state for non-active tabs */}
      {!isLoading && playbooks.length === 0 && tab !== 'active' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No {tab === 'archived' ? 'archived' : ''} playbooks found.
          </p>
        </div>
      )}

      {/* === SECTIONED LAYOUT === */}
      {playbooks.length > 0 && (
        <div className="space-y-8">
          {/* MY PLAYBOOKS */}
          <PlaybookSection
            title="MY PLAYBOOKS"
            count={myPlaybooks.length}
            playbooks={myPlaybooks}
            onSelect={handleSelectPlaybook}
            onScan={handleScan}
            onEdit={handleEdit}
            emptyState={
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  You haven&apos;t created any custom playbooks yet.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.98]"
                  >
                    Start from Scratch
                  </button>
                  <Link
                    href="/strategies"
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors active:scale-[0.98]"
                  >
                    Browse Templates &amp; Customize
                  </Link>
                </div>
              </div>
            }
            showNewCard
            onNewPlaybook={() => setShowCreateModal(true)}
          />

          {/* FROM STRATEGY LIBRARY */}
          <PlaybookSection
            title="FROM STRATEGY LIBRARY"
            count={adoptedPlaybooks.length}
            playbooks={adoptedPlaybooks}
            onSelect={handleSelectPlaybook}
            onScan={handleScan}
            onEdit={handleEdit}
            trailingAction={
              <Link
                href="/strategies"
                className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Browse more &rarr;
              </Link>
            }
            emptyState={
              <div className="py-6 text-center">
                <Link
                  href="/strategies"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  Browse the Strategy Library to find setups that match your style &rarr;
                </Link>
              </div>
            }
          />

          {/* SUGGESTED FOR YOU */}
          {suggestedStrategies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
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
        </div>
      )}

      {/* Create modal */}
      <CreatePlaybookModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreate}
      />

      {/* Mobile FAB */}
      {totalCount > 0 && (
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

// ─── Section Component ───────────────────────────────────────────────────────

interface PlaybookSectionProps {
  title: string
  count: number
  playbooks: Playbook[]
  onSelect: (playbook: Playbook) => void
  onScan: (playbook: Playbook) => void
  onEdit: (playbook: Playbook) => void
  emptyState: React.ReactNode
  trailingAction?: React.ReactNode
  showNewCard?: boolean
  onNewPlaybook?: () => void
}

function PlaybookSection({
  title,
  count,
  playbooks,
  onSelect,
  onScan,
  onEdit,
  emptyState,
  trailingAction,
  showNewCard,
  onNewPlaybook,
}: PlaybookSectionProps) {
  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </span>
          <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
            {count}
          </span>
        </div>
        {trailingAction}
      </div>

      {/* Content */}
      {playbooks.length === 0 ? (
        emptyState
      ) : (
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
              onClick={onSelect}
              onScan={onScan}
              onEdit={onEdit}
            />
          ))}

          {/* "+ New Playbook" ghost card */}
          {showNewCard && onNewPlaybook && (
            <motion.button
              variants={staggerItem}
              onClick={onNewPlaybook}
              className="flex flex-col items-center justify-center gap-2 min-h-[12rem] rounded-xl border-2 border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)] transition-all cursor-pointer"
            >
              <Plus size={24} weight="regular" />
              <span className="text-sm font-medium">New Playbook</span>
            </motion.button>
          )}
        </motion.div>
      )}
    </section>
  )
}

// ─── Global Empty State ──────────────────────────────────────────────────────

function GlobalEmptyState({ onCreatePlaybook }: { onCreatePlaybook: () => void }) {
  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center mb-6">
        <Plus size={32} weight="thin" className="text-[var(--accent-primary)]" />
      </div>

      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Build your trading edge
      </h2>

      <p className="text-sm text-[var(--text-secondary)] max-w-md mb-8 leading-relaxed">
        A playbook captures your trading strategy with specific rules for entry, exit, and risk.
        Tag trades with your playbooks to measure which setups actually make money.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <button
          onClick={onCreatePlaybook}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-all text-left group"
        >
          <Plus size={24} weight="regular" className="text-[var(--accent-primary)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Start from Scratch</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">Define your own setup with custom entry, exit, and risk rules.</p>
        </button>
        <Link
          href="/strategies"
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-all group"
        >
          <Compass size={24} weight="regular" className="text-[var(--accent-primary)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Browse Templates &amp; Customize</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">Browse proven strategies from the Pelican team and community.</p>
        </Link>
      </div>
    </motion.div>
  )
}
