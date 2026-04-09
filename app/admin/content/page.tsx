'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HugeiconsIcon } from '@hugeicons/react'
import { Refresh01Icon as ArrowsClockwise } from '@hugeicons/core-free-icons'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import Link from 'next/link'

// --- Types ---

interface QueryClassification {
  type: string
  count: number
  percentage: number
}

interface TopTicker {
  ticker: string
  mention_count: number
}

interface LongestConversation {
  id: string
  title: string
  email: string
  messageCount: number
  createdAt: string
}

interface FlaggedContentItem {
  id: string
  conversationId: string
  content: string
  reason: 'user_correction' | 'fallback_used' | string
  email: string
  timestamp: string
}

interface ContentData {
  queryClassification: QueryClassification[]
  topTickers: TopTicker[]
  longestConversations: LongestConversation[]
  flaggedContent: FlaggedContentItem[]
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

const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

// --- Helpers ---

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function reasonBadge(reason: string): { label: string; className: string } {
  switch (reason) {
    case 'user_correction':
      return { label: 'User Correction', className: 'bg-orange-500/15 text-orange-400 border-orange-500/20' }
    case 'fallback_used':
      return { label: 'Fallback Used', className: 'bg-red-500/15 text-red-400 border-red-500/20' }
    case 'overconfident':
      return { label: 'Overconfident', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' }
    default:
      return { label: reason, className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' }
  }
}

// --- Skeleton ---

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-48 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  )
}

function SkeletonTable() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Pie label ---

function renderPieLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle = 0, innerRadius, outerRadius, name, percent } = props
  if ((percent ?? 0) < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 1.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="#9898a6" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {name} ({((percent ?? 0) * 100).toFixed(0)}%)
    </text>
  )
}

// --- Main Component ---

export default function AdminContentPage() {
  const [data, setData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/content', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Content Intelligence</h1>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonTable />
        </div>
        <SkeletonChart />
        <SkeletonTable />
        <SkeletonTable />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Content Intelligence</h1>
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

  const { queryClassification, topTickers, longestConversations, flaggedContent } = data

  const pieData = queryClassification.map((q) => ({
    name: q.type,
    value: q.count,
  }))

  const tickerData = topTickers.slice(0, 12).map((t) => ({
    ticker: t.ticker,
    count: t.mention_count,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Intelligence</h1>
        <Button variant="ghost" size="sm" onClick={() => fetchData(true)}>
          <HugeiconsIcon icon={ArrowsClockwise} size={16} className="mr-1" strokeWidth={1.5} color="currentColor" />
          Refresh
        </Button>
      </div>

      {/* Row 1: Query Classification */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Query Classification</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No classification data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderPieLabel}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Classification table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Query Types Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryClassification.map((q) => (
                  <TableRow key={q.type}>
                    <TableCell className="font-medium">{q.type}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{q.count}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{q.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Top Tickers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Tickers (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {tickerData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No ticker data</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, tickerData.length * 32)}>
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

      {/* Row 3: Longest Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Longest Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {longestConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No conversations</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {longestConversations.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/admin/conversations?id=${c.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors truncate block max-w-[250px]"
                      >
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{c.messageCount}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatRelativeTime(c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Row 4: Flagged Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Flagged Content
            {flaggedContent.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({flaggedContent.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flaggedContent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No flagged content</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message Snippet</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedContent.map((item) => {
                  const badge = reasonBadge(item.reason)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/admin/conversations?id=${item.conversationId}`}
                          className="text-sm hover:text-primary transition-colors block max-w-[300px] truncate"
                        >
                          {item.content.slice(0, 150)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {item.email}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatRelativeTime(item.timestamp)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
