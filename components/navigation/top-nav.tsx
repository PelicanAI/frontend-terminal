"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useStreaks } from '@/hooks/use-streaks'
import { useCreditsContext } from '@/providers/credits-provider'

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
}

// =============================================================================
// NAV TABS
// =============================================================================

const NAV_TABS: NavTab[] = [
  { key: 'brief', label: 'Brief', href: '/morning' },
  { key: 'chat', label: 'Chat', href: '/chat' },
  { key: 'heatmap', label: 'Heatmap', href: '/heatmap' },
  { key: 'journal', label: 'Positions', href: '/journal' },
  { key: 'earnings', label: 'Earnings', href: '/earnings' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TopNav({ className }: TopNavProps) {
  const pathname = usePathname()
  const { journalStreak } = useStreaks()
  const { credits } = useCreditsContext()

  // Determine active tab based on pathname
  const getActiveTab = (): string => {
    if (pathname.startsWith('/morning')) return 'brief'
    if (pathname.startsWith('/chat')) return 'chat'
    if (pathname.startsWith('/heatmap')) return 'heatmap'
    if (pathname.startsWith('/journal')) return 'journal'
    if (pathname.startsWith('/earnings')) return 'earnings'
    return 'chat' // Default
  }

  const activeTab = getActiveTab()

  return (
    <nav className={cn(
      "sticky top-0 z-40 w-full border-b border-[rgba(139,92,246,0.06)] bg-[var(--surface-0)]/90 backdrop-blur-xl",
      className
    )}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo + Tabs */}
        <div className="flex items-center gap-6">
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
            <span className="hidden sm:inline text-base font-bold text-white tracking-tight">
              Pelican AI
            </span>
          </Link>

          {/* Tabs — horizontal scroll on mobile, inline on desktop */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 mx-2 sm:mx-4 md:mx-0 md:flex-initial">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <Link
                  key={tab.key}
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
                    "relative px-3 py-1.5 md:py-4 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 rounded-lg md:rounded-none active:scale-95",
                    isActive
                      ? "text-white brightness-110 bg-white/[0.06] md:bg-transparent"
                      : "text-gray-400 hover:text-gray-200 active:bg-white/[0.03]"
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <span className="hidden md:block absolute bottom-0 left-0 right-0 h-0.5 bg-[#8b5cf6] rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: Streak + Credits */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
          {/* Streak */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-sm text-gray-400">
            <span className={`${journalStreak > 0 ? 'text-base sm:text-lg filter drop-shadow-[0_0_6px_rgba(251,146,60,0.4)]' : ''}`}>🔥</span>
            <span className="font-mono font-medium text-white tabular-nums text-sm sm:text-base">{journalStreak}</span>
            <span className="text-xs hidden sm:inline">days</span>
          </div>

          {/* Credits */}
          <Link
            href="/pricing"
            className="px-2 sm:px-3 py-1 rounded-full border border-[rgba(139,92,246,0.10)] bg-[var(--surface-1)] text-xs sm:text-sm font-mono text-white hover:border-[rgba(139,92,246,0.25)] hover:bg-[var(--surface-2)] active:scale-95 transition-all tabular-nums"
          >
            <span className="hidden sm:inline">{(credits?.balance ?? 0).toLocaleString()} credits</span>
            <span className="sm:hidden">{(credits?.balance ?? 0).toLocaleString()}</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
