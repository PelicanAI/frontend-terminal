'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowsClockwise,
  Users,
  UserCheck,
  ChatCircle,
  Clock,
  CurrencyDollar,
} from '@phosphor-icons/react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

// --- Types ---

interface AnalyticsData {
  daily_conversations_30d: { date: string; count: number }[]
  daily_signups_30d: { date: string; count: number }[]
  daily_messages_30d: { date: string; count: number }[]
  daily_credits_30d: { date: string; total_used: number }[]
  plan_distribution: { plan: string; count: number }[]
  top_tickers_30d: { ticker: string; count: number }[]
  user_activity_distribution: { bucket: string; count: number }[]
  conversion_funnel: {
    total_signups: number
    active_trial: number
    converted_paid: number
    churned: number
  }
  mrr: number
  active_users_7d: number
  active_users_30d: number
  avg_messages_per_user: number
  avg_conversation_length: number
  total_conversations: number
  busiest_hours: { hour: number; label: string; count: number }[]
  fetched_at: string
}

// --- Chart theme ---

const GRID_STROKE = '#1f1f2e'
const AXIS_TICK = { fill: '#9898a6', fontSize: 12 }
const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#16161f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e8e8ed',
  },
  labelStyle: { color: '#9898a6' },
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#3b82f6',
  base: '#3b82f6',
  pro: '#8b5cf6',
  power: '#f59e0b',
  founder: '#22c55e',
  trial: '#6b7280',
  none: '#4b5563',
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// --- Helpers ---

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function utcToET(utcHour: number): string {
  // UTC-5 for ET (approximate, ignoring DST for display)
  const etHour = ((utcHour - 5) + 24) % 24
  const suffix = etHour >= 12 ? 'PM' : 'AM'
  const display = etHour === 0 ? 12 : etHour > 12 ? etHour - 12 : etHour
  return `${display}${suffix}`
}

// Compute 7-day rolling average
function rollingAvg(data: { date: string; count: number }[], window = 7) {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    const avg = slice.reduce((s, v) => s + v.count, 0) / slice.length
    return { date: d.date, label: formatDayLabel(d.date), count: d.count, avg: Math.round(avg * 10) / 10 }
  })
}

// Bucket messages by day of week from daily data
function dayOfWeekFromDaily(data: { date: string; count: number }[]) {
  const buckets = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i]!, total: 0, days: 0 }))
  for (const d of data) {
    const dow = new Date(d.date + 'T00:00:00').getDay()
    buckets[dow]!.total += d.count
    if (d.count > 0) buckets[dow]!.days++
  }
  // Reorder Mon-Sun
  const reordered = [...buckets.slice(1), buckets[0]!]
  return reordered.map((b) => ({ day: b.day, count: b.total }))
}

// --- Skeleton ---

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-16 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-px h-48">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-muted animate-pulse"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Pie label ---

function renderPieLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle = 0, innerRadius, outerRadius, name, value, percent } = props
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 1.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="#9898a6" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {name} ({value}, {((percent ?? 0) * 100).toFixed(0)}%)
    </text>
  )
}

// --- Main Component ---

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{error ?? 'No data'}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare chart data
  const messagesChartData = data.daily_messages_30d.map((d) => ({
    label: formatDayLabel(d.date),
    user: d.count,
    // Approximate assistant messages as roughly equal
    assistant: Math.round(d.count * 0.9),
  }))

  const signupsWithAvg = rollingAvg(data.daily_signups_30d)

  const tickerData = data.top_tickers_30d.slice(0, 12)

  const hourData = data.busiest_hours.map((h) => ({
    label: utcToET(h.hour),
    count: h.count,
  }))

  const dowData = dayOfWeekFromDaily(data.daily_messages_30d)

  const pieData = data.plan_distribution.map((p) => ({
    name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
    value: p.count,
    color: PLAN_COLORS[p.plan] ?? '#6b7280',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-3">
          {data.fetched_at && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated: {formatTimestamp(data.fetched_at)}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <ArrowsClockwise size={16} weight="regular" className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-blue-500/10 p-2">
              <UserCheck size={16} weight="regular" className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active 7d</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{data.active_users_7d.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-blue-500/10 p-2">
              <Users size={16} weight="regular" className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active 30d</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{data.active_users_30d.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-amber-500/10 p-2">
              <ChatCircle size={16} weight="regular" className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Msgs/User</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{data.avg_messages_per_user.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <Clock size={16} weight="regular" className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Convo Length</p>
              <p className="text-2xl font-bold font-mono tabular-nums">
                {data.avg_conversation_length} <span className="text-sm font-normal text-muted-foreground">msgs</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <CurrencyDollar size={16} weight="regular" className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold font-mono tabular-nums">${data.mrr.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Messages Per Day (split bars) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages Per Day (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={messagesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9898a6' }} />
              <Bar dataKey="user" name="User" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="assistant" name="Assistant" fill="#93c5fd" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 3: Signups + Tickers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Signups with rolling avg */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups Per Day (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={signupsWithAvg}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9898a6' }} />
                <Line type="monotone" dataKey="count" name="Signups" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="avg" name="7-day Avg" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Popular Tickers - Horizontal bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Tickers (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {tickerData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No ticker data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tickerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis type="number" tick={AXIS_TICK} />
                  <YAxis dataKey="ticker" type="category" tick={AXIS_TICK} width={60} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Mentions" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Usage by Hour + Day of Week */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Hour (ET)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} interval={2} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Messages" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dowData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Messages" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Plan Distribution Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No plan data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderPieLabel}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Row 6: User Engagement Cohorts placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Engagement Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Cohort analysis requires additional API data. Coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
