'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowsClockwise } from '@phosphor-icons/react'

// --- Types ---

interface FeatureItem {
  feature: string
  userCount: number
  totalCount: number
  adoptionRate: number
}

interface Funnel {
  signedUp: number
  sentFirstMessage: number
  loggedTrade: number
  builtPlaybook: number
  dailyJournal: number
}

interface FeatureByPlan {
  plan: string
  chat: number
  trades: number
  journal: number
  playbooks: number
  watchlist: number
}

interface FeaturesData {
  totalUsers: number
  features: FeatureItem[]
  funnel: Funnel
  featureByPlan: FeatureByPlan[]
}

// --- Constants ---

const FEATURE_DISPLAY: Record<string, string> = {
  chat: 'Chat',
  trades: 'Trade Journal',
  daily_journal: 'Daily Journal',
  playbooks: 'Playbooks',
  watchlist: 'Watchlist',
}

const COMING_SOON_FEATURES = [
  'Morning Brief',
  'Heatmap',
  'Earnings Calendar',
  'Correlations',
]

// --- Skeleton ---

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-16 rounded bg-muted animate-pulse" />
          <div className="h-2 rounded-full bg-muted animate-pulse" />
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

// --- Helpers ---

function intensityClass(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500/30 text-emerald-400'
  if (pct >= 40) return 'bg-blue-500/25 text-blue-400'
  if (pct >= 15) return 'bg-amber-500/20 text-amber-400'
  return 'bg-muted text-muted-foreground'
}

// --- Main Component ---

export default function AdminFeaturesPage() {
  const [data, setData] = useState<FeaturesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/features', { cache: 'no-store' })
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
        <h1 className="text-2xl font-bold">Feature Adoption</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable />
        <SkeletonTable />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Feature Adoption</h1>
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

  const { features, funnel, featureByPlan } = data

  // Funnel steps
  const funnelSteps = [
    { label: 'Signed Up', value: funnel.signedUp },
    { label: 'Sent First Message', value: funnel.sentFirstMessage },
    { label: 'Logged a Trade', value: funnel.loggedTrade },
    { label: 'Built Playbook', value: funnel.builtPlaybook },
    { label: 'Daily Journal', value: funnel.dailyJournal },
  ]
  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1)

  // Sort plans for matrix: trial, starter/base, pro, power, none
  const planOrder = ['starter', 'pro', 'power', 'founder', 'none']
  const sortedFeatureByPlan = [...featureByPlan].sort(
    (a, b) => (planOrder.indexOf(a.plan) === -1 ? 99 : planOrder.indexOf(a.plan)) -
              (planOrder.indexOf(b.plan) === -1 ? 99 : planOrder.indexOf(b.plan))
  )

  const featureColumns = ['chat', 'trades', 'journal', 'playbooks', 'watchlist'] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feature Adoption</h1>
        <Button variant="ghost" size="sm" onClick={() => fetchData(true)}>
          <ArrowsClockwise size={16} weight="regular" className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Row 1: Feature Usage Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.feature}>
            <CardContent className="py-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {FEATURE_DISPLAY[f.feature] ?? f.feature}
                  </p>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {f.adoptionRate}%
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums">{f.userCount}</span>
                  <span className="text-xs text-muted-foreground">users</span>
                  <span className="text-xs text-muted-foreground ml-auto font-mono tabular-nums">
                    {f.totalCount.toLocaleString()} total actions
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(f.adoptionRate, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Coming soon placeholders */}
        {COMING_SOON_FEATURES.map((name) => (
          <Card key={name} className="opacity-50">
            <CardContent className="py-5">
              <div className="space-y-3">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">Tracking coming soon</p>
                <div className="h-2 rounded-full bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Adoption Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adoption Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelSteps.map((step, idx) => {
              const pct = maxFunnel > 0 ? (step.value / maxFunnel) * 100 : 0
              const dropOff =
                idx > 0 && funnelSteps[idx - 1]!.value > 0
                  ? (
                      ((funnelSteps[idx - 1]!.value - step.value) / funnelSteps[idx - 1]!.value) *
                      100
                    ).toFixed(1)
                  : null
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{step.label}</span>
                    <div className="flex items-center gap-3">
                      {dropOff && (
                        <span className="text-xs text-muted-foreground">
                          -{dropOff}% drop-off
                        </span>
                      )}
                      <span className="font-mono tabular-nums">{step.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-6 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded bg-purple-500/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Feature × Plan Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature × Plan Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedFeatureByPlan.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No plan data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    {sortedFeatureByPlan.map((p) => (
                      <TableHead key={p.plan} className="text-center capitalize">
                        {p.plan}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureColumns.map((col) => (
                    <TableRow key={col}>
                      <TableCell className="font-medium capitalize">
                        {col === 'journal' ? 'Daily Journal' : col}
                      </TableCell>
                      {sortedFeatureByPlan.map((p) => {
                        const val = p[col]
                        return (
                          <TableCell key={p.plan} className="text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-mono tabular-nums ${intensityClass(val)}`}
                            >
                              {val}%
                            </span>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
