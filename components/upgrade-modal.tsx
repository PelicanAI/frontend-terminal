'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Zap, X, ArrowRight } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  required: number
  balance: number
}

export function UpgradeModal({ isOpen, onClose, required, balance }: UpgradeModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortfall = required - balance

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div 
        className="relative bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
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
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Not Enough Credits</h2>
          <p className="text-muted-foreground text-sm mt-1">
            You need more credits to run this query
          </p>
        </div>

        <div className="bg-[var(--bg-surface)]/50 border border-[var(--border-default)] rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center text-sm mb-3">
            <span className="text-muted-foreground">Query cost</span>
            <span className="text-[var(--text-primary)] font-medium">{required} credits</span>
          </div>
          <div className="flex justify-between items-center text-sm mb-3">
            <span className="text-muted-foreground">Your balance</span>
            <span className="text-red-400 font-medium">{balance} credits</span>
          </div>
          <div className="border-t border-[var(--border-subtle)] my-3" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">You need</span>
            <span className="text-amber-400 font-semibold">{shortfall} more credits</span>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <span>Upgrade Plan</span>
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
          Credits reset monthly. Upgrade anytime for instant access.
        </p>
      </div>
    </div>
  )
}

