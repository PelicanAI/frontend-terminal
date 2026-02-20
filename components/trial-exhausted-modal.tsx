'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Zap, X, ArrowRight } from 'lucide-react'

interface TrialExhaustedModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string | null
}

export function TrialExhaustedModal({ isOpen, onClose, message }: TrialExhaustedModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
            <Zap className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Free Trial Ended</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {message || 'Your free trial has ended. Subscribe to continue using Pelican.'}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <span>View Plans</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={onClose}
            className="w-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Maybe Later
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Upgrade anytime for instant access.
        </p>
      </div>
    </div>
  )
}
