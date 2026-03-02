"use client"

import React, { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCreditsContext } from '@/providers/credits-provider'
import { useTraderProfile } from '@/hooks/use-trader-profile'
import { IconTooltip } from '@/components/ui/icon-tooltip'

// =============================================================================
// TYPES
// =============================================================================

interface TopNavProps {
  className?: string
}

interface NavTab {
  key: string
  label: string
  href: string
  /** Which markets this tab is relevant to. Omit or leave undefined for always-show. */
  markets?: string[]
  /** If true, tab is always visible regardless of trader profile. */
  alwaysShow?: boolean
}

// =============================================================================
// NAV TABS
// =============================================================================

const NAV_TABS: NavTab[] = [
  { key: 'brief', label: 'Brief', href: '/morning', alwaysShow: true },
  { key: 'chat', label: 'Chat', href: '/chat', alwaysShow: true },
  { key: 'positions', label: 'Positions', href: '/positions', alwaysShow: true },
  { key: 'journal', label: 'Journal', href: '/journal', alwaysShow: true },
  { key: 'playbooks', label: 'Playbooks', href: '/playbooks', alwaysShow: true },
  { key: 'heatmap', label: 'Heatmap', href: '/heatmap', alwaysShow: true },
  { key: 'correlations', label: 'Correlations', href: '/correlations', alwaysShow: true },
  { key: 'earnings', label: 'Earnings', href: '/earnings', markets: ['stocks', 'options'] },
  { key: 'strategies', label: 'Strategies', href: '/strategies', alwaysShow: true },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TopNav({ className }: TopNavProps) {
  const pathname = usePathname()
  const { credits } = useCreditsContext()
  const { survey } = useTraderProfile()

  // Derive market flags from survey (default to stocks if no survey yet)
  const marketsTraded = survey?.markets_traded || ['stocks']
  const hasSurvey = !!survey
  const tradesForex = marketsTraded.includes('forex')
  const tradesFutures = marketsTraded.includes('futures')

  // Filter tabs based on trader profile markets
  // If no survey (onboarding incomplete), show all tabs
  const visibleTabs = useMemo(() => {
    if (!hasSurvey) return NAV_TABS
    return NAV_TABS.filter(tab => {
      if (tab.alwaysShow) return true
      return tab.markets?.some(m => marketsTraded.includes(m))
    })
  }, [hasSurvey, marketsTraded])

  // Resolve display label — rename "Earnings" to "Calendar" for forex/futures traders
  const getTabLabel = (tab: NavTab): string => {
    if (tab.key === 'earnings' && (tradesForex || tradesFutures)) return 'Calendar'
    return tab.label
  }

  // Determine active tab based on pathname
  const getActiveTab = (): string => {
    if (pathname.startsWith('/morning')) return 'brief'
    if (pathname.startsWith('/chat')) return 'chat'
    if (pathname.startsWith('/heatmap')) return 'heatmap'
    if (pathname.startsWith('/correlations')) return 'correlations'
    if (pathname.startsWith('/positions')) return 'positions'
    if (pathname.startsWith('/journal')) return 'journal'
    if (pathname.startsWith('/playbooks')) return 'playbooks'
    if (pathname.startsWith('/strategies')) return 'strategies'
    if (pathname.startsWith('/earnings')) return 'earnings'
    return 'chat' // Default
  }

  const activeTab = getActiveTab()

  return (
    <nav className={cn(
      "sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xl",
      className
    )}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo + Tabs */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1 overflow-hidden">
          {/* Logo */}
          <Link
            href="/chat"
            className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-80 flex-shrink-0"
          >
            <Image
              src="/pelican-logo-transparent.webp"
              alt="Pelican AI"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
            <span className="hidden sm:inline text-base font-bold text-[var(--text-primary)] tracking-tight">
              Pelican AI
            </span>
          </Link>

          {/* Tabs — horizontal scroll on mobile, inline on desktop */}
          <div
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <React.Fragment key={tab.key}>
                  {tab.key === 'heatmap' && (
                    <div className="hidden md:block h-4 w-px bg-[var(--border-subtle)] mx-1 flex-shrink-0" />
                  )}
                  <Link
                  href={tab.href}
                  onMouseEnter={() => {
                    // Prefetch earnings data on hover for instant navigation
                    if (tab.key === 'earnings') {
                      const today = new Date()
                      const monday = new Date(today)
                      monday.setDate(today.getDate() - today.getDay() + 1)
                      const friday = new Date(monday)
                      friday.setDate(monday.getDate() + 4)
                      const from = monday.toISOString().split('T')[0]
                      const to = friday.toISOString().split('T')[0]
                      fetch(`/api/earnings?from=${from}&to=${to}`).catch(() => {})
                    }
                  }}
                  className={cn(
                    "relative px-3 py-1.5 md:py-4 text-sm font-medium transition-colors duration-150 whitespace-nowrap flex-shrink-0 rounded-lg md:rounded-none active:scale-95",
                    isActive
                      ? "text-[var(--text-primary)] bg-[var(--surface-hover)] md:bg-transparent"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:bg-[var(--surface-hover)]"
                  )}
                >
                  {getTabLabel(tab)}
                  {isActive && (
                    <span className="hidden md:block absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full shadow-[0_0_8px_var(--accent-muted)]" />
                  )}
                </Link>
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Right: Credits */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
          {/* Credits */}
          <IconTooltip label="Credit balance" side="bottom">
            <Link
              href="/pricing"
              className="px-2 sm:px-3 py-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs sm:text-sm font-mono text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] active:scale-95 transition-all tabular-nums"
            >
              <span className="hidden sm:inline">{(credits?.balance ?? 0).toLocaleString()} credits</span>
              <span className="sm:hidden">{(credits?.balance ?? 0).toLocaleString()}</span>
            </Link>
          </IconTooltip>
        </div>
      </div>
    </nav>
  )
}
