"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, Warning } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { modal, backdrop } from "@/components/ui/pelican"
import { usePublishPlaybook } from "@/hooks/use-strategies"
import type { Playbook } from "@/types/trading"

interface PublishModalProps {
  playbook: Playbook
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublished?: () => void
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function PublishModal({ playbook, open, onOpenChange, onPublished }: PublishModalProps) {
  const { publish, isPublishing } = usePublishPlaybook()
  const [slug, setSlug] = useState(slugify(playbook.name))
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasEntryRules = !!playbook.entry_rules
  const hasExitRules = !!playbook.exit_rules
  const hasRiskRules = !!playbook.risk_rules
  const meetsRequirements = hasEntryRules && hasExitRules && hasRiskRules

  const handlePublish = async () => {
    if (!meetsRequirements || !slug || !displayName) return
    setError(null)

    const result = await publish(playbook.id, slug, displayName)
    if (result.success) {
      setSuccess(true)
      onPublished?.()
    } else {
      setError(result.error || "Failed to publish")
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        variants={backdrop}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          variants={modal}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {success ? "Published!" : "Publish to Community"}
            </h2>
            <button onClick={() => onOpenChange(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X size={20} />
            </button>
          </div>

          {success ? (
            <div className="text-center py-6">
              <CheckCircle size={48} weight="fill" className="text-[var(--data-positive)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                Your strategy is now live at <span className="font-mono text-[var(--accent-primary)]">/strategies/{slug}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Requirements check */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Requirements</p>
                {[
                  { label: "Entry rules defined", met: hasEntryRules },
                  { label: "Exit rules defined", met: hasExitRules },
                  { label: "Risk rules defined", met: hasRiskRules },
                ].map(({ label, met }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    {met ? (
                      <CheckCircle size={16} weight="fill" className="text-[var(--data-positive)]" />
                    ) : (
                      <Warning size={16} weight="fill" className="text-[var(--data-negative)]" />
                    )}
                    <span className={met ? "text-[var(--text-secondary)]" : "text-[var(--data-negative)]"}>{label}</span>
                  </div>
                ))}
              </div>

              {meetsRequirements && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your trading alias..."
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">URL Slug</label>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                      <span>pelicantrading.ai/strategies/</span>
                      <span className="text-[var(--accent-primary)]">{slug}</span>
                    </div>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-xs text-[var(--data-negative)]">{error}</p>
              )}

              <button
                onClick={handlePublish}
                disabled={!meetsRequirements || !slug || !displayName || isPublishing}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-medium transition-all",
                  meetsRequirements && slug && displayName
                    ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                    : "bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed"
                )}
              >
                {isPublishing ? "Publishing..." : "Publish Strategy"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
