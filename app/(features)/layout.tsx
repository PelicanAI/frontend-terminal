export const dynamic = 'force-dynamic'
export const dynamicParams = true

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

"use client"

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from '@/components/navigation/top-nav'
import { PelicanChatPanel } from '@/components/pelican-panel/pelican-chat-panel'
import { PelicanPanelProvider, usePelicanPanelContext } from '@/providers/pelican-panel-provider'
import { AnimatePresence } from 'framer-motion'
import { TickerSearch } from '@/components/command-k/ticker-search'
import { useCommandK } from '@/hooks/use-command-k'

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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* CMD+K Ticker Search */}
      <TickerSearch open={commandK.isOpen} onClose={commandK.close} />

      {/* Top Navigation */}
      <TopNav />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Page Content (resizes when panel is open) */}
        <div
          className="flex-1 overflow-auto min-w-0 transition-all duration-200"
          style={{
            width: panel.isOpen ? '70%' : '100%',
          }}
        >
          {children}
        </div>

        {/* Pelican Panel (30% when open) */}
        <AnimatePresence>
          {panel.isOpen && (
            <div
              className="hidden md:flex"
              style={{
                width: '30%',
                minWidth: '330px',
                maxWidth: '420px',
              }}
            >
              <PelicanChatPanel />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// =============================================================================
// OUTER LAYOUT (Provides panel context)
// =============================================================================

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  const [trialExhaustedOpen, setTrialExhaustedOpen] = useState(false)
  const [insufficientCreditsOpen, setInsufficientCreditsOpen] = useState(false)

  const handleTrialExhausted = (info: unknown) => {
    console.warn('[FEATURES-LAYOUT] Trial exhausted', info)
    setTrialExhaustedOpen(true)
    // TODO: Show trial exhausted modal
  }

  const handleInsufficientCredits = (info: unknown) => {
    console.warn('[FEATURES-LAYOUT] Insufficient credits', info)
    setInsufficientCreditsOpen(true)
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
