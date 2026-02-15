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

export const dynamic = 'force-dynamic'
export const dynamicParams = true

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { TopNav } from '@/components/navigation/top-nav'
import { PelicanPanelProvider, usePelicanPanelContext } from '@/providers/pelican-panel-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { TickerSearch } from '@/components/command-k/ticker-search'
import { useCommandK } from '@/hooks/use-command-k'
import { PelicanContainer } from '@/components/ui/pelican-container'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { MessageSquare } from 'lucide-react'

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
              className="hidden lg:flex border-l border-white/[0.06] bg-[var(--surface-1)]/90 shadow-[0_0_50px_rgba(139,92,246,0.05)] backdrop-blur-2xl overflow-y-auto"
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
          className="lg:hidden fixed bottom-6 left-6 z-40 w-12 h-12 bg-[#8b5cf6] rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center active:scale-95 transition-transform"
          onClick={() => setMobilePanelOpen(true)}
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Mobile Pelican Bottom Sheet */}
      <Sheet open={mobilePanelOpen && isMobile} onOpenChange={setMobilePanelOpen}>
        <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl bg-[var(--background)] border-t border-white/[0.08]">
          <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mt-3 mb-2" />
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
  const handleTrialExhausted = (info: unknown) => {
    console.warn('[FEATURES-LAYOUT] Trial exhausted', info)
    // TODO: Show trial exhausted modal
  }

  const handleInsufficientCredits = (info: unknown) => {
    console.warn('[FEATURES-LAYOUT] Insufficient credits', info)
    // TODO: Show insufficient credits modal
  }

  const handleError = (error: Error) => {
    console.error('[FEATURES-LAYOUT] Panel error', error)
    // TODO: Show error toast
  }

  return (
    <PelicanPanelProvider
      onTrialExhausted={handleTrialExhausted}
      onInsufficientCredits={handleInsufficientCredits}
      onError={handleError}
    >
      <FeaturesLayoutInner>{children}</FeaturesLayoutInner>
    </PelicanPanelProvider>
  )
}
