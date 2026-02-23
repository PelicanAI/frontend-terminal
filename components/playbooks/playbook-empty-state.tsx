"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpenText, Plus, Compass } from "@phosphor-icons/react"
import { pageEnter } from "@/components/ui/pelican"

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
        Build your trading edge
      </h2>

      <p className="text-sm text-[var(--text-secondary)] max-w-md mb-8 leading-relaxed">
        A playbook captures your trading strategy with specific rules for entry, exit, and risk.
        Tag trades with your playbooks to measure which setups actually make money.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          href="/strategies"
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-all group"
        >
          <Compass size={24} weight="regular" className="text-[var(--accent-primary)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Start from a template</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">Browse proven strategies from the Pelican team and community.</p>
        </Link>
        <button
          onClick={onCreatePlaybook}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-all text-left group"
        >
          <Plus size={24} weight="regular" className="text-[var(--accent-primary)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Create from scratch</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">Define your own setup with custom entry, exit, and risk rules.</p>
        </button>
      </div>
    </motion.div>
  )
}
