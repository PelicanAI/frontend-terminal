"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Flame, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStreaks } from '@/hooks/use-streaks'
import { useCreditsContext } from '@/providers/credits-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

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
  { key: 'journal', label: 'Journal', href: '/journal' },
  { key: 'earnings', label: 'Earnings', href: '/earnings' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TopNav({ className }: TopNavProps) {
  const pathname = usePathname()
  const { journalStreak } = useStreaks()
  const { credits, hasAccess } = useCreditsContext()
  const [creditsDropdownOpen, setCreditsDropdownOpen] = useState(false)

  const plan = credits?.plan ?? 'free'

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

  // Format plan name
  const formatPlan = (planType: string): string => {
    if (planType === 'free') return 'Free'
    if (planType === 'starter') return 'Starter'
    if (planType === 'pro') return 'Pro'
    if (planType === 'elite') return 'Elite'
    return 'Free'
  }

  return (
    <nav className={cn(
      "border-b border-border bg-[#0a0a0f]/80 backdrop-blur-xl",
      "sticky top-0 z-[var(--z-sticky)]",
      className
    )}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo + Tabs */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-80 flex-shrink-0"
          >
            <Image
              src="/pelican-logo-transparent.webp"
              alt="Pelican AI"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
            <span className="font-bold text-base text-primary hidden sm:inline">
              Pelican AI
            </span>
          </Link>

          {/* Tabs */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    "border-b-2 -mb-[2px]",
                    isActive
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>

          {/* Mobile: Dropdown menu for tabs */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="h-9">
                {NAV_TABS.find(t => t.key === activeTab)?.label || 'Menu'}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {NAV_TABS.map((tab) => (
                <DropdownMenuItem key={tab.key} asChild>
                  <Link
                    href={tab.href}
                    className={cn(
                      "w-full cursor-pointer",
                      activeTab === tab.key && "text-primary font-medium"
                    )}
                  >
                    {tab.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Streak + Credits */}
        <div className="flex items-center gap-3">
          {/* Streak */}
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              backgroundColor: "oklch(0.60 0.25 280 / 0.12)",
              borderColor: "oklch(0.60 0.25 280 / 0.25)",
            }}
            title={`${journalStreak} day journal streak`}
          >
            <Flame className="h-4 w-4" style={{ color: "oklch(0.60 0.25 280)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/75">
              Streak
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: "oklch(0.60 0.25 280)" }}>
              {journalStreak}
            </span>
            <span className="text-xs text-foreground/65">days</span>
          </div>

          {/* Credits Dropdown */}
          <DropdownMenu open={creditsDropdownOpen} onOpenChange={setCreditsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full border border-white/10 bg-white/[0.04] px-3 hover:bg-white/[0.08]"
              >
                <span className="text-sm font-medium tabular-nums">
                  {(credits?.balance ?? 0).toLocaleString()} credits
                </span>
                <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {formatPlan(plan)}
                </p>
              </div>
              <DropdownMenuSeparator />
              <div className="px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {(credits?.balance ?? 0).toLocaleString()}
                  </span>
                </div>
                {!hasAccess && (
                  <p className="text-xs text-orange-500 mt-2">
                    Out of credits
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/pricing"
                  className="w-full cursor-pointer text-sm font-medium text-primary"
                >
                  Manage Plan
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
