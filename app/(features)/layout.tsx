"use client"

/**
 * Features Layout
 * ===============
 *
 * Layout wrapper for V2 feature pages: Brief, Heatmap, Journal, Earnings.
 * Provides:
 * - Top navigation bar
 * - Pelican panel context
 * - 70/30 split when panel is open (desktop)
 * - Bottom sheet panel (mobile)
 *
 * The Chat page is NOT wrapped in this layout - it keeps its existing
 * sidebar-based layout. This layout is ONLY for the new V2 feature pages.
 *
 * @version 2.0.0 - Mobile responsive
 */

import React, { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { TopNav } from '@/components/navigation/top-nav'
import { PelicanPanelProvider, usePelicanPanelContext } from '@/providers/pelican-panel-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { TickerSearch } from '@/components/command-k/ticker-search'
import { useCommandK } from '@/hooks/use-command-k'
import { PelicanContainer } from '@/components/ui/pelican-container'
import { usePageTracking } from '@/hooks/use-page-tracking'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ChatCircle } from '@phosphor-icons/react'
import { TrialExhaustedModal } from '@/components/trial-exhausted-modal'
import { InsufficientCreditsModal } from '@/components/insufficient-credits-modal'
import { toast } from '@/hooks/use-toast'

const PelicanChatPanel = dynamicImport(
  () => import('@/components/pelican-panel/pelican-chat-panel').then((m) => ({ default: m.PelicanChatPanel })),
  { ssr: false }
)

// =============================================================================
// INNER LAYOUT (Has access to panel context)
// =============================================================================

function FeaturesLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const panel = usePelicanPanelContext()
  const commandK = useCommandK()
  const isMobile = useIsMobile()
  usePageTracking()
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  // Clear panel messages when navigating between pages
  useEffect(() => {
    panel.clearMessages()
    setMobilePanelOpen(false)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync mobile panel with desktop panel state
  useEffect(() => {
    if (isMobile && panel.isOpen) {
      setMobilePanelOpen(true)
    }
  }, [panel.isOpen, isMobile])

  // Close desktop panel when mobile sheet opens
  useEffect(() => {
    if (mobilePanelOpen && !isMobile) {
      setMobilePanelOpen(false)
    }
  }, [mobilePanelOpen, isMobile])

  return (
    <PelicanContainer className="flex h-screen flex-col">
      <TickerSearch open={commandK.isOpen} onClose={commandK.close} />

      <div className="relative z-[var(--z-sticky)]">
        <TopNav />
      </div>

      <div className="relative z-10 flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <motion.main
          id="main-content"
          layout
          initial={false}
          animate={{ width: panel.isOpen && !isMobile ? "70%" : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="min-w-0 flex-1 overflow-y-auto"
        >
          {children}
        </motion.main>

        {/* Desktop sidebar panel */}
        <AnimatePresence mode="wait">
          {panel.isOpen && !isMobile && (
            <motion.aside
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="hidden lg:flex border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 shadow-[0_0_50px_rgba(0,0,0,0.08)] backdrop-blur-2xl overflow-hidden h-full"
              style={{ width: "30%", minWidth: "340px", maxWidth: "440px" }}
            >
              <PelicanChatPanel
                onConversationSelect={() => {
                  window.dispatchEvent(new CustomEvent("pelican:conversation-created"))
                }}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Pelican FAB */}
      {!mobilePanelOpen && (
        <button
          aria-label="Open Pelican AI chat"
          className="lg:hidden fixed bottom-6 left-6 z-40 w-12 h-12 bg-[var(--accent-primary)] rounded-full shadow-lg shadow-[var(--accent-primary)]/25 flex items-center justify-center active:scale-95 transition-transform"
          onClick={() => setMobilePanelOpen(true)}
        >
          <ChatCircle size={20} weight="fill" className="text-white" />
        </button>
      )}

      {/* Mobile Pelican Bottom Sheet */}
      <Sheet open={mobilePanelOpen && isMobile} onOpenChange={setMobilePanelOpen}>
        <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl bg-[var(--background)] border-t border-[var(--border-subtle)]">
          <div className="w-12 h-1 bg-[var(--text-muted)] rounded-full mx-auto mt-3 mb-2" />
          <PelicanChatPanel
            onConversationSelect={() => {
              window.dispatchEvent(new CustomEvent("pelican:conversation-created"))
            }}
          />
        </SheetContent>
      </Sheet>
    </PelicanContainer>
  )
}

// =============================================================================
// OUTER LAYOUT (Provides panel context)
// =============================================================================

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  const [trialModal, setTrialModal] = useState<{ open: boolean; message?: string }>({ open: false })
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; required?: number; balance?: number; message?: string }>({ open: false })

  const handleTrialExhausted = useCallback((info: unknown) => {
    const data = info as { message?: string } | undefined
    setTrialModal({ open: true, message: data?.message ?? undefined })
  }, [])

  const handleInsufficientCredits = useCallback((info: unknown) => {
    const data = info as { required?: number; balance?: number; message?: string } | undefined
    setCreditsModal({
      open: true,
      required: data?.required ?? undefined,
      balance: data?.balance ?? undefined,
      message: data?.message ?? undefined,
    })
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('[FEATURES-LAYOUT] Panel error', error)
    toast({
      title: 'Something went wrong',
      description: 'Could not check your credits. Please try again.',
      variant: 'destructive',
    })
  }, [])

  return (
    <PelicanPanelProvider
      onTrialExhausted={handleTrialExhausted}
      onInsufficientCredits={handleInsufficientCredits}
      onError={handleError}
    >
      <FeaturesLayoutInner>{children}</FeaturesLayoutInner>
      <TrialExhaustedModal
        isOpen={trialModal.open}
        onClose={() => setTrialModal({ open: false })}
        message={trialModal.message}
      />
      <InsufficientCreditsModal
        isOpen={creditsModal.open}
        onClose={() => setCreditsModal({ open: false })}
        required={creditsModal.required}
        balance={creditsModal.balance}
        message={creditsModal.message}
      />
    </PelicanPanelProvider>
  )
}
