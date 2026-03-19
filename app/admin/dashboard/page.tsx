'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Pulse,
  TrendUp,
  CurrencyDollar,
  Lightning,
  ChatCircle,
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  Warning,
  UserPlus,
  CreditCard,
  CircleNotch,
  ArrowUpRight,
  ArrowDownRight,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

// =============================================================================
// TYPES
// =============================================================================

interface StatMetric {
  value: number
  delta?: number
  deltaPercent?: number
}

interface StatsData {
  totalUsers: StatMetric
  active7d: StatMetric
  active30d: StatMetric
  mrr: StatMetric
  creditsUsed: StatMetric
  messagesToday: StatMetric
  recentSignups: { email: string; plan: string; createdAt: string }[]
  alerts: { zeroCreditUsers: number; nearLimitUsers: number; newPaidThisWeek: number }
}

interface AnalyticsData {
  daily_signups_30d: { date: string; count: number }[]
  daily_messages_30d: { date: string; count: number }[]
  daily_conversations_30d: { date: string; count: number }[]
  active_users_7d: number
  active_users_30d: number
}

interface ConvoTag {
  owner: string
  classification: string
  source?: string
}

interface ConversationRow {
  id: string
  title: string | null
  userName: string | null
  createdAt: string
  messageCount?: number | null
  tag?: ConvoTag
}

interface ConvoMessage {
  id: string
  role: string
  content: string
  created_at: string
}

// =============================================================================
// HELPERS
// =============================================================================

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

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function planVariant(plan: string) {
  switch (plan) {
    case 'pro':
    case 'power':
      return 'default' as const
    case 'starter':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

// =============================================================================
// STAT CARD
// =============================================================================

function AdminStatCard({
  title,
  value,
  formattedValue,
  delta,
  deltaPercent,
  icon: Icon,
}: {
  title: string
  value: number
  formattedValue?: string
  delta?: number
  deltaPercent?: number
  icon: React.ElementType
}) {
  const hasPositiveDelta = delta !== undefined && delta > 0
  const hasNegativeDelta = delta !== undefined && delta < 0
  const isNeutral = delta === undefined || delta === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon size={16} weight="regular" className="text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tabular-nums">
          {formattedValue ?? value.toLocaleString()}
        </div>
        {!isNeutral && (
          <div className="flex items-center gap-1 mt-1">
            {hasPositiveDelta && (
              <>
                <ArrowUpRight size={12} weight="regular" className="text-emerald-500" />
                <span className="text-xs font-mono tabular-nums text-emerald-500">
                  +{delta!.toLocaleString()}
                </span>
              </>
            )}
            {hasNegativeDelta && (
              <>
                <ArrowDownRight size={12} weight="regular" className="text-red-500" />
                <span className="text-xs font-mono tabular-nums text-red-500">
                  {delta!.toLocaleString()}
                </span>
              </>
            )}
            {deltaPercent !== undefined && deltaPercent !== 0 && (
              <span className={`text-xs font-mono tabular-nums ${hasPositiveDelta ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                ({deltaPercent > 0 ? '+' : ''}{deltaPercent}%)
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// CHART TOOLTIP
// =============================================================================

const chartTooltipStyle = {
  backgroundColor: '#16161f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontSize: 12,
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Conversation expansion state
  const [expandedConvoId, setExpandedConvoId] = useState<string | null>(null)
  const [convoMessages, setConvoMessages] = useState<Record<string, ConvoMessage[]>>({})
  const [loadingConvoId, setLoadingConvoId] = useState<string | null>(null)

  // Recent conversations from analytics
  const [recentConversations, setRecentConversations] = useState<ConversationRow[]>([])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [statsRes, analyticsRes, convosRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/analytics'),
        fetch('/api/admin/conversations?limit=10'),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
      if (convosRes.ok) {
        const data = await convosRes.json()
        setRecentConversations(data.conversations ?? [])
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[Dashboard] fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleToggleConvo = useCallback(async (id: string) => {
    if (expandedConvoId === id) {
      setExpandedConvoId(null)
      return
    }
    setExpandedConvoId(id)
    if (convoMessages[id]) return

    setLoadingConvoId(id)
    try {
      const res = await fetch(`/api/admin/conversations/${id}/messages?limit=20&offset=0`)
      if (res.ok) {
        const data = await res.json()
        setConvoMessages((prev) => ({ ...prev, [id]: data.messages ?? [] }))
      }
    } catch {
      // ignore
    } finally {
      setLoadingConvoId(null)
    }
  }, [expandedConvoId, convoMessages])

  // Compute chart data
  const signupChartData = useMemo(() => {
    if (!analytics) return []
    const signupMap = new Map(analytics.daily_signups_30d.map((d) => [d.date, d.count]))
    const activeMap = new Map(analytics.daily_conversations_30d.map((d) => [d.date, d.count]))
    return analytics.daily_signups_30d.map((d) => ({
      date: formatShortDate(d.date),
      signups: signupMap.get(d.date) ?? 0,
      active: activeMap.get(d.date) ?? 0,
    }))
  }, [analytics])

  const messagesChartData = useMemo(() => {
    if (!analytics) return []
    return analytics.daily_messages_30d.map((d) => ({
      date: formatShortDate(d.date),
      messages: d.count,
    }))
  }, [analytics])

  const avgMessages = useMemo(() => {
    if (!messagesChartData.length) return 0
    return Math.round(
      messagesChartData.reduce((sum, d) => sum + d.messages, 0) / messagesChartData.length
    )
  }, [messagesChartData])

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                <div className="h-3 w-12 bg-muted animate-pulse rounded mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-[240px] bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              Updated {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <ArrowsClockwise size={12} weight="regular" className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Row 1: 6 Stat Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <AdminStatCard
            title="Total Users"
            value={stats.totalUsers.value}
            delta={stats.totalUsers.delta}
            deltaPercent={stats.totalUsers.deltaPercent}
            icon={Users}
          />
          <AdminStatCard
            title="Active (7d)"
            value={stats.active7d.value}
            delta={stats.active7d.delta}
            deltaPercent={stats.active7d.deltaPercent}
            icon={Pulse}
          />
          <AdminStatCard
            title="Active (30d)"
            value={stats.active30d.value}
            delta={stats.active30d.delta}
            deltaPercent={stats.active30d.deltaPercent}
            icon={TrendUp}
          />
          <AdminStatCard
            title="MRR"
            value={stats.mrr.value}
            formattedValue={`$${stats.mrr.value.toLocaleString()}`}
            delta={stats.mrr.delta}
            icon={CurrencyDollar}
          />
          <AdminStatCard
            title="Credits Used"
            value={stats.creditsUsed.value}
            icon={Lightning}
          />
          <AdminStatCard
            title="Messages Today"
            value={stats.messagesToday.value}
            delta={stats.messagesToday.delta}
            deltaPercent={stats.messagesToday.deltaPercent}
            icon={ChatCircle}
          />
        </div>
      )}

      {/* Row 2: Charts */}
      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Signups + Active Users Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Signups & Active Conversations (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupChartData}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1f1f2e" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9898a6', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#9898a6', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="signups"
                      stroke="#8b5cf6"
                      fill="url(#signupGradient)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="active"
                      stroke="#3b82f6"
                      fill="url(#activeGradient)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#8b5cf6]" />
                  Signups
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#3b82f6]" />
                  Active Conversations
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Messages Per Day Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages Per Day (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={messagesChartData}>
                    <CartesianGrid stroke="#1f1f2e" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9898a6', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#9898a6', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <ReferenceLine
                      y={avgMessages}
                      stroke="#9898a6"
                      strokeDasharray="4 4"
                      label={{ value: `Avg: ${avgMessages}`, fill: '#9898a6', fontSize: 11, position: 'insideTopRight' }}
                    />
                    <Bar
                      dataKey="messages"
                      fill="#8b5cf6"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#8b5cf6]" />
                  Messages
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded bg-muted-foreground/30 w-4 h-[1px]" />
                  Daily Average
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 3: Signups, Conversations, Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
            <Link
              href="/admin/users"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentSignups?.length ? (
              <p className="text-sm text-muted-foreground">No recent signups</p>
            ) : (
              <div className="space-y-3">
                {stats.recentSignups.map((user, i) => (
                  <Link
                    key={i}
                    href="/admin/users"
                    className="flex items-center justify-between text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
                  >
                    <span className="truncate flex-1 min-w-0">{user.email}</span>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge variant={planVariant(user.plan)} className="text-[10px]">
                        {user.plan}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {timeAgo(user.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latest Conversations</CardTitle>
            <Link
              href="/admin/conversations"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {!recentConversations.length ? (
              <p className="text-sm text-muted-foreground">No recent conversations</p>
            ) : (
              <div className="space-y-1">
                {recentConversations.map((conv) => {
                  const isExpanded = expandedConvoId === conv.id
                  const messages = convoMessages[conv.id] ?? []
                  const isLoadingMsg = loadingConvoId === conv.id

                  return (
                    <div key={conv.id}>
                      <div className="flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                        <button
                          onClick={() => handleToggleConvo(conv.id)}
                          className="flex items-center justify-between flex-1 text-sm text-left min-w-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate font-medium text-sm">
                                {conv.title || 'Untitled'}
                              </p>
                              {conv.tag && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 shrink-0 ${
                                    conv.tag.owner === 'team'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  }`}
                                >
                                  {conv.tag.owner === 'team' ? 'TEAM' : 'USER'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.userName || 'Unknown'} &middot; {timeAgo(conv.createdAt)}
                            </p>
                          </div>
                          <div className="ml-2 shrink-0">
                            {isExpanded ? (
                              <CaretUp size={16} weight="regular" className="text-muted-foreground" />
                            ) : (
                              <CaretDown size={16} weight="regular" className="text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        <IconTooltip label="Open full view">
                          <Link
                            href={`/admin/conversations/${conv.id}`}
                            className="ml-1 shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUpRight size={14} weight="regular" />
                          </Link>
                        </IconTooltip>
                      </div>

                      {isExpanded && (
                        <div className="ml-2 mb-2 border-l-2 border-border pl-3 max-h-[300px] overflow-y-auto">
                          {isLoadingMsg && (
                            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                              <CircleNotch size={12} weight="regular" className="animate-spin" />
                              Loading...
                            </div>
                          )}
                          {!isLoadingMsg && messages.length === 0 && (
                            <p className="text-xs text-muted-foreground py-2">No messages</p>
                          )}
                          {!isLoadingMsg && messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`text-xs py-2 px-2 rounded mb-1 ${
                                msg.role === 'user'
                                  ? 'bg-blue-500/5 border-l-2 border-blue-500/30'
                                  : 'bg-muted/30'
                              }`}
                            >
                              <span className="font-medium text-muted-foreground">
                                {msg.role === 'user' ? 'User' : 'AI'}:
                              </span>{' '}
                              <span className="text-foreground/80 break-words">
                                {msg.content.length > 300
                                  ? msg.content.slice(0, 300) + '...'
                                  : msg.content}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.alerts ? (
              <div className="space-y-3">
                {stats.alerts.zeroCreditUsers > 0 && (
                  <div className="flex items-start gap-3 text-sm">
                    <Warning size={16} weight="regular" className="mt-0.5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-medium">
                        <span className="font-mono tabular-nums">{stats.alerts.zeroCreditUsers}</span> users at zero credits
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Free users who have used all free questions
                      </p>
                    </div>
                  </div>
                )}
                {stats.alerts.nearLimitUsers > 0 && (
                  <div className="flex items-start gap-3 text-sm">
                    <Lightning size={16} weight="regular" className="mt-0.5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-medium">
                        <span className="font-mono tabular-nums">{stats.alerts.nearLimitUsers}</span> users near credit limit
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance below 50 credits
                      </p>
                    </div>
                  </div>
                )}
                {stats.alerts.newPaidThisWeek > 0 && (
                  <div className="flex items-start gap-3 text-sm">
                    <CreditCard size={16} weight="regular" className="mt-0.5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-medium">
                        <span className="font-mono tabular-nums">{stats.alerts.newPaidThisWeek}</span> new paid users this week
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Converted to a paid plan
                      </p>
                    </div>
                  </div>
                )}
                {stats.alerts.zeroCreditUsers === 0 &&
                  stats.alerts.nearLimitUsers === 0 &&
                  stats.alerts.newPaidThisWeek === 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserPlus size={16} weight="regular" />
                      No alerts right now
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading alerts...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
