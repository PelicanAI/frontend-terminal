"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCreditsContext } from '@/providers/credits-provider'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon as Gear } from '@hugeicons/core-free-icons'
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
  alwaysShow?: boolean
}

// =============================================================================
// NAV TABS
// =============================================================================

const NAV_TABS: NavTab[] = [
  { key: 'desk', label: 'The Desk', href: '/desk', alwaysShow: true },
  { key: 'chat', label: 'Chat', href: '/chat', alwaysShow: true },
  { key: 'portfolio', label: 'Portfolio', href: '/portfolio', alwaysShow: true },
  { key: 'lab', label: 'Lab', href: '/strategies', alwaysShow: true },
  { key: 'markets', label: 'Markets', href: '/markets', alwaysShow: true },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TopNav({ className }: TopNavProps) {
  const pathname = usePathname()
  const { credits } = useCreditsContext()
  const visibleTabs = NAV_TABS

  // Determine active tab based on pathname
  const getActiveTab = (): string => {
    if (pathname.startsWith('/morning')) return 'desk'
    if (pathname.startsWith('/desk')) return 'desk'
    if (pathname.startsWith('/chat')) return 'chat'
    if (pathname.startsWith('/portfolio')) return 'portfolio'
    if (pathname.startsWith('/positions')) return 'portfolio'
    if (pathname.startsWith('/journal')) return 'portfolio'
    if (pathname.startsWith('/lab')) return 'lab'
    if (pathname.startsWith('/strategies')) return 'lab'
    if (pathname.startsWith('/playbooks')) return 'lab'
    if (pathname.startsWith('/markets')) return 'markets'
    if (pathname.startsWith('/heatmap')) return 'markets'
    if (pathname.startsWith('/correlations')) return 'markets'
    if (pathname.startsWith('/earnings')) return 'markets'
    return 'chat'
  }

  const activeTab = getActiveTab()

  return (
    <nav className={cn(
      "sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]",
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
          <div className="relative flex-1 min-w-0">
            <div
              className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key

                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={cn(
                      "relative px-3 py-1.5 md:py-4 text-sm font-medium transition-colors duration-150 whitespace-nowrap flex-shrink-0 rounded-lg md:rounded-none active:scale-95",
                      isActive
                        ? "text-[var(--text-primary)] bg-[var(--surface-hover)] md:bg-transparent"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:bg-[var(--surface-hover)]"
                    )}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="hidden md:block absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full shadow-[0_0_8px_var(--accent-muted)]" />
                    )}
                  </Link>
                )
              })}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
          </div>
        </div>

        {/* Right: Credits */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
          {/* Credits */}
          <IconTooltip label="Settings" side="bottom">
            <Link
              href="/settings"
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] active:scale-95 transition-all"
              aria-label="Settings"
            >
              <HugeiconsIcon icon={Gear} size={18} strokeWidth={1.5} color="currentColor" />
            </Link>
          </IconTooltip>
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
