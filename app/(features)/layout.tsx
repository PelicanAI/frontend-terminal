"use client"

/**
 * Features Layout
 * ===============
 *
 * Layout wrapper for V2 feature pages: Brief, Heatmap, Journal, Earnings.
 * Provides:
 * - Top navigation bar
 * - Pelican panel context
 * - 70/30 split when panel is open
 *
 * The Chat page is NOT wrapped in this layout - it keeps its existing
 * sidebar-based layout. This layout is ONLY for the new V2 feature pages.
 *
 * @version 1.0.0
 */

export const dynamic = 'force-dynamic'
export const dynamicParams = true

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { TopNav } from '@/components/navigation/top-nav'
import { PelicanPanelProvider, usePelicanPanelContext } from '@/providers/pelican-panel-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { TickerSearch } from '@/components/command-k/ticker-search'
import { useCommandK } from '@/hooks/use-command-k'
import { PelicanContainer } from '@/components/ui/pelican-container'

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

  // Clear panel messages when navigating between pages
  useEffect(() => {
    panel.clearMessages()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PelicanContainer className="flex h-screen flex-col">
      <TickerSearch open={commandK.isOpen} onClose={commandK.close} />

      <div className="relative z-[var(--z-sticky)]">
        <TopNav className="backdrop-blur-xl bg-[#0a0a0f]/80" />
      </div>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <motion.main
          layout
          initial={false}
          animate={{ width: panel.isOpen ? "70%" : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="min-w-0 flex-1 overflow-auto"
        >
          {children}
        </motion.main>

        <AnimatePresence mode="wait">
          {panel.isOpen && (
            <motion.aside
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="hidden border-l border-white/[0.05] bg-[#0a0a0f]/80 shadow-[0_0_50px_rgba(139,92,246,0.05)] backdrop-blur-2xl md:flex"
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
