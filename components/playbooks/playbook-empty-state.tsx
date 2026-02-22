"use client"

import { motion } from "framer-motion"
import { BookOpenText, Plus } from "@phosphor-icons/react"
import { PelicanButton, pageEnter } from "@/components/ui/pelican"

interface PlaybookEmptyStateProps {
  onCreatePlaybook: () => void
}

export function PlaybookEmptyState({ onCreatePlaybook }: PlaybookEmptyStateProps) {
  return (
    <motion.div
      variants={pageEnter}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center mb-6">
        <BookOpenText size={32} weight="thin" className="text-[var(--accent-primary)]" />
      </div>

      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Define your edge
      </h2>

      <p className="text-sm text-[var(--text-secondary)] max-w-md mb-8 leading-relaxed">
        A playbook captures your trading strategy with specific rules for entry, exit, and risk.
        Tag trades with your playbooks to measure which setups actually make money.
      </p>

      <PelicanButton variant="primary" size="lg" onClick={onCreatePlaybook}>
        <Plus size={16} weight="bold" />
        Create your first playbook
      </PelicanButton>
    </motion.div>
  )
}
