'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SquaresFour,
  Users,
  ChatCircle,
  CreditCard,
  ChartBar,
  MagnifyingGlass,
  PuzzlePiece,
  Heartbeat,
  ArrowLeft,
  Shield,
} from '@phosphor-icons/react'
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
        <Shield size={20} weight="regular" className="text-primary" />
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
              <item.icon size={16} weight="regular" />
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
          <ArrowLeft size={12} weight="regular" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
