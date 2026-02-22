"use client"

export const dynamic = "force-dynamic"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Plus } from "@phosphor-icons/react"
import { usePlaybooks } from "@/hooks/use-playbooks"
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
import type { PlaybookFormData } from "@/components/playbooks/create-playbook-modal"
import type { Playbook } from "@/types/trading"

export default function PlaybooksPage() {
  const { playbooks, isLoading, createPlaybook } = usePlaybooks()
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
      {!isLoading && playbooks.length === 0 && (
        <PlaybookEmptyState onCreatePlaybook={() => setShowCreateModal(true)} />
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
            />
          ))}
        </motion.div>
      )}

      {/* Create modal */}
      <CreatePlaybookModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreate}
      />

      {/* Mobile FAB */}
      {playbooks.length > 0 && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-[var(--accent-primary)] rounded-full shadow-lg shadow-[var(--accent-primary)]/25 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="New Playbook"
        >
          <Plus size={24} weight="bold" className="text-white" />
        </button>
      )}
    </motion.div>
  )
}
