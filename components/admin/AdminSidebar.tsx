'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DashboardSquare01Icon as SquaresFour,
  UserMultipleIcon as Users,
  Chat01Icon as ChatCircle,
  CreditCardIcon as CreditCard,
  BarChartIcon as ChartBar,
  Search01Icon as MagnifyingGlass,
  PuzzleIcon as PuzzlePiece,
  Cardiogram01Icon as Heartbeat,
  ArrowLeft01Icon as ArrowLeft,
  Shield01Icon as Shield,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: SquaresFour },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/conversations', label: 'Conversations', icon: ChatCircle },
  { href: '/admin/revenue', label: 'Revenue', icon: CreditCard },
  { href: '/admin/analytics', label: 'Analytics', icon: ChartBar },
  { href: '/admin/content', label: 'Content Intel', icon: MagnifyingGlass },
  { href: '/admin/features', label: 'Feature Adoption', icon: PuzzlePiece },
  { href: '/admin/health', label: 'System Health', icon: Heartbeat },
]

export function AdminSidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card lg:w-64">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <HugeiconsIcon icon={Shield} size={20} className="text-primary" strokeWidth={1.5} color="currentColor" />
        <span className="text-sm font-semibold">Pelican Admin</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/admin/dashboard' && pathname === '/admin') ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.5} color="currentColor" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border px-4 py-3 space-y-2">
        <p className="truncate text-xs text-muted-foreground">{displayName}</p>
        <Link
          href="/chat"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft} size={12} strokeWidth={1.5} color="currentColor" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
