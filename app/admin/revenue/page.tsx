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
import { ArrowsClockwise, CurrencyDollar, TrendUp, UserCheck } from '@phosphor-icons/react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

// --- Types ---

interface PlanDistribution {
  plan: string
  count: number
  mrr: number
  avgCreditsUsed: number
  avgCreditsTotal: number
  utilization: number
}

interface AtRiskUser {
  email: string
  plan: string
  reason: string
  lastActive?: string
  creditsBalance?: number
  utilization?: number
}

interface ConversionFunnel {
  signedUp: number
  usedFreeQs: number
  hitLimit: number
  convertedPaid: number
}

interface RevenueData {
  mrr: number
  arr: number
  arpu: number
  paidUsers: number
  planDistribution: PlanDistribution[]
  atRiskUsers: AtRiskUser[]
  conversionFunnel: ConversionFunnel
}

// --- Constants ---

const PLAN_COLORS: Record<string, string> = {
  starter: '#3b82f6',
  base: '#3b82f6',
  pro: '#8b5cf6',
  power: '#f59e0b',
  founder: '#22c55e',
  trial: '#6b7280',
  free: '#6b7280',
  none: '#6b7280',
}

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: '#16161f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e8e8ed',
  },
  labelStyle: { color: '#9898a6' },
}

// --- Helpers ---

function formatDollars(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function riskBadgeVariant(reason: string): { label: string; className: string } {
  switch (reason) {
    case 'inactive_14d':
      return { label: 'Inactive 14d+', className: 'bg-red-500/15 text-red-400 border-red-500/20' }
    case 'credit_depleted':
      return { label: 'Credit Depleted', className: 'bg-orange-500/15 text-orange-400 border-orange-500/20' }
    case 'low_utilization':
      return { label: 'Low Utilization', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' }
    default:
      return { label: reason, className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' }
  }
}

// --- Skeleton ---

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-20 rounded bg-muted animate-pulse" />
        </div>
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

// --- Custom Pie Label ---

function renderPieLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle = 0, innerRadius, outerRadius, name, value, percent } = props
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="#9898a6" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {name} ({value}, {((percent ?? 0) * 100).toFixed(0)}%)
    </text>
  )
}

// --- Main Component ---

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/revenue', { cache: 'no-store' })
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
        <h1 className="text-2xl font-bold">Revenue</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonTable />
          <SkeletonTable />
        </div>
        <SkeletonTable />
        <SkeletonTable />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Revenue</h1>
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

  const { mrr, arr, arpu, paidUsers, planDistribution, atRiskUsers, conversionFunnel } = data

  // Pie chart data
  const pieData = planDistribution.map((p) => ({
    name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
    value: p.count,
    color: PLAN_COLORS[p.plan] ?? '#6b7280',
  }))

  // Funnel steps
  const funnelSteps = [
    { label: 'Signed Up', value: conversionFunnel.signedUp },
    { label: 'Used Free Qs', value: conversionFunnel.usedFreeQs },
    { label: 'Hit Limit', value: conversionFunnel.hitLimit },
    { label: 'Converted to Paid', value: conversionFunnel.convertedPaid },
  ]
  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revenue</h1>
        <Button variant="ghost" size="sm" onClick={() => fetchData(true)}>
          <ArrowsClockwise size={16} weight="regular" className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <CurrencyDollar size={16} weight="regular" className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{formatDollars(mrr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-blue-500/10 p-2">
              <TrendUp size={16} weight="regular" className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{formatDollars(arr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-purple-500/10 p-2">
              <CurrencyDollar size={16} weight="regular" className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARPU</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{formatDollars(arpu)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-amber-500/10 p-2">
              <UserCheck size={16} weight="regular" className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid Users</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{paidUsers.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Plan Distribution Pie + Revenue by Plan Table */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No plan data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
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
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Plan Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Avg Credits</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planDistribution.map((p) => {
                  const utilColor =
                    p.utilization > 60
                      ? 'bg-emerald-500'
                      : p.utilization > 30
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  return (
                    <TableRow key={p.plan}>
                      <TableCell className="capitalize font-medium">{p.plan}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{p.count}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatDollars(p.mrr)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{p.avgCreditsUsed.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${utilColor}`}
                              style={{ width: `${Math.min(p.utilization, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-xs text-muted-foreground w-8 text-right">
                            {p.utilization}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelSteps.map((step, idx) => {
              const pct = maxFunnel > 0 ? (step.value / maxFunnel) * 100 : 0
              const convRate =
                idx > 0 && funnelSteps[idx - 1]!.value > 0
                  ? ((step.value / funnelSteps[idx - 1]!.value) * 100).toFixed(1)
                  : null
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{step.label}</span>
                    <div className="flex items-center gap-3">
                      {convRate && (
                        <span className="text-xs text-muted-foreground">
                          {convRate}% conversion
                        </span>
                      )}
                      <span className="font-mono tabular-nums">{step.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-6 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded bg-blue-500/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Row 4: At-Risk Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            At-Risk Users
            {atRiskUsers.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({atRiskUsers.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atRiskUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No at-risk users detected</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Risk Reason</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskUsers.map((user, idx) => {
                  const badge = riskBadgeVariant(user.reason)
                  let detail = ''
                  if (user.lastActive) detail = `Last active: ${formatRelativeTime(user.lastActive)}`
                  else if (user.utilization !== undefined) detail = `${user.utilization}% used`
                  else if (user.creditsBalance !== undefined) detail = `${user.creditsBalance} credits`
                  return (
                    <TableRow key={`${user.email}-${idx}`}>
                      <TableCell className="text-sm truncate max-w-[200px]">{user.email}</TableCell>
                      <TableCell className="capitalize text-sm">{user.plan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground font-mono tabular-nums">
                        {detail}
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
