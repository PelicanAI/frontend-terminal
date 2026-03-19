'use client'

import { useState, useCallback } from 'react'
import { MagnifyingGlass, CaretDown, CaretUp, CaretLeft, CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { UserDetail } from '@/components/admin/UserDetail'

interface AdminUser {
  id: string
  displayName: string | null
  email: string
  createdAt: string
  lastSignIn?: string | null
  isAdmin: boolean
  plan: string
  creditsBalance: number
  creditsUsed: number
  freeQuestionsRemaining: number
  messageCount?: number
  totalConversations?: number
  lastActive?: string | null
}

interface UsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const PLAN_OPTIONS = ['all', 'none', 'starter', 'pro', 'power', 'founder', 'past_due'] as const
const ACTIVITY_OPTIONS = [
  { value: 'all', label: 'All Activity' },
  { value: 'active', label: 'Active (7d)' },
  { value: 'inactive', label: 'Inactive (30d)' },
] as const
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_credits', label: 'Most Credits' },
  { value: 'least_credits', label: 'Least Credits' },
  { value: 'most_active', label: 'Most Active' },
] as const

function planVariant(plan: string) {
  switch (plan) {
    case 'pro':
    case 'power':
    case 'founder':
      return 'default' as const
    case 'starter':
      return 'secondary' as const
    case 'past_due':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

function planColor(plan: string) {
  switch (plan) {
    case 'pro':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'power':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'founder':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'starter':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'past_due':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    default:
      return ''
  }
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function exportCSV(users: AdminUser[]) {
  const header = 'email,plan_type,credits_balance,credits_used_this_month,total_conversations,total_messages,last_active,signup_date'
  const rows = users.map((u) => {
    const email = u.email.includes(',') ? `"${u.email}"` : u.email
    const lastActive = u.lastActive ? u.lastActive.split('T')[0] : ''
    return `${email},${u.plan},${u.creditsBalance},${u.creditsUsed},${u.totalConversations ?? 0},${u.messageCount ?? 0},${lastActive},${u.createdAt.split('T')[0]}`
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pelican-users-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function UsersTable({ initialData }: { initialData: UsersResponse }) {
  const [data, setData] = useState<UsersResponse>(initialData)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchUsers = useCallback(async (page: number, query: string, plan: string, activity: string, sort: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (query.trim()) params.set('search', query.trim())
      if (plan && plan !== 'all') params.set('plan', plan)
      if (activity && activity !== 'all') params.set('activity', activity)
      if (sort) params.set('sort', sort)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setExpandedId(null)
    fetchUsers(1, search, planFilter, activityFilter, sortBy)
  }

  const handlePlanChange = (plan: string) => {
    setPlanFilter(plan)
    setExpandedId(null)
    fetchUsers(1, search, plan, activityFilter, sortBy)
  }

  const handleActivityChange = (activity: string) => {
    setActivityFilter(activity)
    setExpandedId(null)
    fetchUsers(1, search, planFilter, activity, sortBy)
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
    setExpandedId(null)
    fetchUsers(1, search, planFilter, activityFilter, sort)
  }

  const goToPage = (page: number) => {
    setExpandedId(null)
    fetchUsers(page, search, planFilter, activityFilter, sortBy)
  }

  const handleExport = async () => {
    // Fetch all users matching current filters (up to 1000)
    const params = new URLSearchParams({ page: '1', limit: '100' })
    if (search.trim()) params.set('search', search.trim())
    if (planFilter && planFilter !== 'all') params.set('plan', planFilter)
    if (activityFilter && activityFilter !== 'all') params.set('activity', activityFilter)
    if (sortBy) params.set('sort', sortBy)

    try {
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const json = await res.json()
        exportCSV(json.users)
      }
    } catch {
      // Silent fail -- user can retry
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={planFilter}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={activityFilter}
            onChange={(e) => handleActivityChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {ACTIVITY_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <IconTooltip label="Export CSV">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadSimple size={16} weight="regular" className="mr-1" />
              CSV
            </Button>
          </IconTooltip>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="hidden md:table-cell">Credits</TableHead>
              <TableHead className="hidden lg:table-cell">Messages</TableHead>
              <TableHead className="hidden lg:table-cell">Last Active</TableHead>
              <TableHead className="hidden xl:table-cell">Signed Up</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data.users.map((user) => {
                const isExpanded = expandedId === user.id
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : user.id)
                    }
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {user.displayName || user.email}
                        </p>
                        {user.displayName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={planVariant(user.plan)}
                        className={`text-[10px] ${planColor(user.plan)}`}
                      >
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">
                      <span className="font-medium">{user.creditsBalance.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        / {user.creditsUsed.toLocaleString()} used
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">
                      {(user.messageCount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {user.lastActive ? timeAgo(user.lastActive) : 'Never'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {formatShortDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      {isExpanded ? (
                        <CaretUp size={16} weight="regular" className="text-muted-foreground" />
                      ) : (
                        <CaretDown size={16} weight="regular" className="text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Expanded detail */}
        {expandedId && (
          <div className="border-t border-border bg-muted/30" onClick={(e) => e.stopPropagation()}>
            {data.users
              .filter((u) => u.id === expandedId)
              .map((user) => (
                <UserDetail key={user.id} user={user} />
              ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.page} of {data.totalPages} ({data.total} users)
          </span>
          <div className="flex gap-1">
            <IconTooltip label="Previous page">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(data.page - 1)}
                disabled={data.page <= 1 || loading}
              >
                <CaretLeft size={16} weight="regular" />
              </Button>
            </IconTooltip>
            <IconTooltip label="Next page">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(data.page + 1)}
                disabled={data.page >= data.totalPages || loading}
              >
                <CaretRight size={16} weight="regular" />
              </Button>
            </IconTooltip>
          </div>
        </div>
      )}
    </div>
  )
}
