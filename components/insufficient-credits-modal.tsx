'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Lightning, X, ArrowRight } from '@phosphor-icons/react'

interface InsufficientCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  required?: number | null
  balance?: number | null
  message?: string | null
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  required,
  balance,
  message
}: InsufficientCreditsModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} weight="regular" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
            <Lightning size={28} weight="regular" className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Not enough credits</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {message || `This query requires ${required ?? 0} credits. You have ${balance ?? 0}.`}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <span>Upgrade Plan</span>
            <ArrowRight size={16} weight="regular" />
          </Link>

          <button
            onClick={onClose}
            className="w-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Maybe Later
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Credits reset monthly. Upgrade anytime for instant access.
        </p>
      </div>
    </div>
  )
}
