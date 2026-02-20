"use client"

import { motion } from "framer-motion"
import { X } from "@phosphor-icons/react"

interface DraftIndicatorProps {
  pendingDraft: string
  onCancel?: () => void
  onEdit?: () => void
}

export function DraftIndicator({ pendingDraft, onCancel, onEdit }: DraftIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--data-warning)]/10 border border-[var(--data-warning)]/20 rounded-full text-xs text-[var(--data-warning)]">
        <div className="w-1.5 h-1.5 bg-[var(--data-warning)] rounded-full animate-pulse shrink-0" />
        <button
          onClick={onEdit}
          className="truncate max-w-[200px] hover:text-[var(--data-warning)] hover:underline underline-offset-2 transition-colors cursor-pointer"
          title="Click to edit"
        >
          Queued: &quot;{pendingDraft.slice(0, 40)}
          {pendingDraft.length > 40 ? "..." : ""}&quot;
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-0.5 rounded-full hover:bg-[var(--data-warning)]/20 transition-colors shrink-0"
            title="Cancel queued message"
          >
            <X size={12} weight="bold" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
