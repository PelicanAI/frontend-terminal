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
import { ArrowsClockwise, Database, Pulse, Warning, FileText } from '@phosphor-icons/react'

// --- Types ---

interface TableStat {
  table_name: string
  row_count: number
}

interface HealthData {
  database: {
    status: string
    tables: TableStat[]
  }
  fallbackMessages: number
  avgMessageLength: number
  estimatedApiCost: {
    messagesThisMonth: number
    estimatedCost: number
  }
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

function SkeletonTable() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Helpers ---

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// --- Main Component ---

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' })
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
        <h1 className="text-2xl font-bold">System Health</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Health</h1>
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

  const { database, fallbackMessages, avgMessageLength, estimatedApiCost } = data

  const isOnline = database.status === 'online'
  const tableCount = database.tables.length
  const sortedTables = [...database.tables].sort((a, b) => b.row_count - a.row_count)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Health</h1>
        <Button variant="ghost" size="sm" onClick={() => fetchData(true)}>
          <ArrowsClockwise size={16} weight="regular" className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Row 1: Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Database */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className={`rounded-md p-2 ${isOnline ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <Database size={16} weight="regular" className={isOnline ? 'text-emerald-500' : 'text-red-500'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Database</p>
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{isOnline ? 'Online' : 'Unknown'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                {tableCount} tables
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Health */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <Pulse size={16} weight="regular" className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">API Health</p>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fallback Rate */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className={`rounded-md p-2 ${fallbackMessages > 10 ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
              <Warning size={16} weight="regular" className={fallbackMessages > 10 ? 'text-orange-500' : 'text-emerald-500'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fallback Rate</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{fallbackMessages}</p>
              <p className="text-xs text-muted-foreground">fallback messages</p>
            </div>
          </CardContent>
        </Card>

        {/* Avg Message Length */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-md bg-blue-500/10 p-2">
              <FileText size={16} weight="regular" className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Message Length</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{avgMessageLength.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">characters</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Database Table Sizes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Database Table Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTables.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No table data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTables.map((t) => (
                  <TableRow key={t.table_name}>
                    <TableCell className="font-mono text-sm">{t.table_name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(t.row_count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Estimated API Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated API Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-6 text-center space-y-2">
            <p className="text-3xl font-bold font-mono tabular-nums">
              ~${estimatedApiCost.estimatedCost.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              Estimated AI API cost this month based on{' '}
              <span className="font-mono tabular-nums">{estimatedApiCost.messagesThisMonth.toLocaleString()}</span>{' '}
              messages × ${estimatedApiCost.estimatedCost > 0 ? '0.02' : '0.02'}/message
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
