"use client"

import { type DataPoint, type Column, calculateStats } from '@/lib/data-parsers'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface DataTableProps {
  data: DataPoint[] | Record<string, unknown>[]
  columns?: Column[]
  title?: string
  query?: string
  summary?: Record<string, unknown>
  onToggle?: () => void
  onShare?: () => void
  compact?: boolean
}

// Default columns for legacy arrow format
const DEFAULT_ARROW_COLUMNS: Column[] = [
  { key: 'date', label: 'Date', type: 'date', align: 'left' },
  { key: 'initialDrop', label: 'Initial Drop', type: 'percentage', align: 'left' },
  { key: 'forwardReturn', label: 'Forward Return', type: 'percentage', align: 'left' },
  { key: 'status', label: 'Status', type: 'text', align: 'center' },
]

// Helper: Format value based on type
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

// Helper: Get cell styling based on type and value
function getCellClass(value: unknown, type?: string, isFirstColumn?: boolean): string {
  const base = "px-3 sm:px-4 py-2 sm:py-3 text-sm"
  const sticky = isFirstColumn ? "sticky left-0 bg-inherit" : ""

  const strValue = value !== null && value !== undefined ? String(value) : ""

  // Percentage values: color by sign
  if (type === 'percentage' && strValue && strValue !== '—') {
    const cleaned = strValue.replace(/[–\u2013-]/g, '-').replace(/%/g, '').replace(/\+/g, '').trim()
    const num = parseFloat(cleaned)
    if (!isNaN(num)) {
      const color = num >= 0
        ? "text-green-600 dark:text-green-400 font-semibold"
        : "text-red-600 dark:text-red-400 font-semibold"
      return `${base} ${color} ${sticky}`.trim()
    }
  }

  // Currency values: detect sign from the string
  if ((type === 'currency' || type === 'number') && strValue) {
    const isCurrency = /\$/.test(strValue)
    const isNegative = /^-/.test(strValue) || /^\(.*\)$/.test(strValue)

    if (isCurrency) {
      if (isNegative) {
        return `${base} text-red-600 dark:text-red-400 font-semibold font-mono ${sticky}`.trim()
      }
      return `${base} text-cyan-600 dark:text-cyan-400 font-semibold font-mono ${sticky}`.trim()
    }

    // Non-currency numbers with sign
    const num = parseFloat(strValue.replace(/[,$%+]/g, ''))
    if (!isNaN(num)) {
      if (strValue.startsWith('-') || strValue.startsWith('(')) {
        return `${base} text-red-600 dark:text-red-400 font-semibold ${sticky}`.trim()
      }
      if (strValue.startsWith('+')) {
        return `${base} text-green-600 dark:text-green-400 font-semibold ${sticky}`.trim()
      }
    }
  }

  if (isFirstColumn) {
    return `${base} font-medium text-foreground ${sticky}`.trim()
  }

  return `${base} text-foreground`.trim()
}

// Helper: Check if data is legacy arrow format
function isArrowFormat(data: (DataPoint | Record<string, unknown>)[]): data is DataPoint[] {
  return data.length > 0 && data[0] !== undefined && 'forwardReturn' in data[0]
}

export function DataTable({ data, columns, title = "Market Data", query, summary, onToggle, onShare, compact }: DataTableProps) {
  // Determine which columns to use
  const displayColumns = useMemo(() => {
    if (columns) {
      return columns
    }

    // Legacy arrow format - use default columns
    if (isArrowFormat(data)) {
      return DEFAULT_ARROW_COLUMNS
    }

    // Auto-detect columns from data keys
    if (data.length > 0) {
      const firstRow = data[0]
      if (firstRow && typeof firstRow === 'object') {
        return Object.keys(firstRow).map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          type: 'text' as const,
          align: 'left' as const,
        }))
      }
    }

    return DEFAULT_ARROW_COLUMNS
  }, [data, columns])

  // Calculate stats for legacy format (only works with DataPoint[])
  const stats = useMemo(() => {
    if (isArrowFormat(data)) {
      return calculateStats(data)
    }
    return null
  }, [data])

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card relative overflow-hidden",
      compact ? "my-3 p-3 sm:p-4 shadow-sm" : "my-6 p-4 sm:p-8 shadow-xl"
    )}>

      {/* Pelican watermark — always present, subtler in compact mode */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden",
        compact ? "opacity-[0.12]" : "opacity-30"
      )}>
        <Image
          src="/pelican-logo-transparent.webp"
          alt=""
          width={320}
          height={320}
          className={cn(
            "h-auto object-contain",
            compact ? "w-[min(50vw,12rem)]" : "w-[min(60vw,20rem)]"
          )}
          aria-hidden="true"
        />
      </div>

      {/* Content layer above watermark */}
      <div className="relative z-10">

        {/* Header with logo and branding - only in full mode */}
        {!compact && (
          <div className="mb-6 flex items-center gap-3">
            <Image src="/pelican-logo-transparent.webp" alt="Pelican" width={48} height={48} className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">Pelican</span>
          </div>
        )}

        {/* User's query (if provided by AI) */}
        {query && (
          <p className="mb-6 text-base sm:text-lg font-medium text-foreground leading-relaxed">
            {query}
          </p>
        )}

        {/* Title (if different from query) */}
        {title && title !== query && (
          <h3 className={cn(
            "font-semibold text-foreground",
            compact ? "mb-2 text-sm" : "mb-4 text-base sm:text-lg"
          )}>{title}</h3>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg">
          <table className={cn(
            "w-full border-collapse",
            !compact && "min-w-[640px]"
          )} aria-label="Data visualization">
            <thead>
              <tr className="border-b-2 border-border">
                {displayColumns.map((col, i) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 sm:px-4 py-3 text-sm sm:text-base font-semibold text-foreground",
                      i === 0 && "sticky left-0 bg-transparent",
                      col.align === 'center' ? 'text-center' :
                      col.align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-border transition",
                    i % 2 === 0 ? "bg-card" : "bg-muted/20"
                  )}
                >
                  {displayColumns.map((col, colIndex) => {
                    const value = row[col.key as keyof typeof row]

                    // Special handling for status column in arrow format
                    if (col.key === 'status' && isArrowFormat(data)) {
                      const returnValue = (row as DataPoint).forwardReturn
                      const isPositive = parseFloat(returnValue.replace(/[–-]/g, '-').replace(/%/g, '').replace(/\+/g, '')) >= 0
                      return (
                        <td key={col.key} className="px-3 sm:px-4 py-3 text-center text-base sm:text-lg">
                          {isPositive ? (
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">✗</span>
                          )}
                        </td>
                      )
                    }

                    return (
                      <td
                        key={col.key}
                        className={getCellClass(value, col.type, colIndex === 0)}
                      >
                        {formatValue(value)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>

            {/* Summary row - either from props or calculated for legacy format */}
            {(summary || stats) && (
              <tfoot className="bg-primary/10 border-t-2 border-primary/30">
                <tr>
                  {summary ? (
                    // Structured format summary
                    displayColumns.map((col, i) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 sm:px-4 py-4 text-sm font-bold text-foreground",
                          i === 0 && "sticky left-0 bg-inherit"
                        )}
                      >
                        {formatValue(summary[col.key])}
                      </td>
                    ))
                  ) : stats ? (
                    // Legacy format stats
                    <td colSpan={displayColumns.length} className="px-3 sm:px-4 py-4">
                      <div className="flex flex-wrap gap-4 text-sm font-bold text-foreground">
                        <span>Avg Return: <span className="text-primary">{stats.avgReturn}</span></span>
                        <span>Positive: <span className="text-primary">{stats.percentPositive}</span></span>
                      </div>
                    </td>
                  ) : null}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer buttons */}
        {(onToggle || onShare) && (
          <div className="mt-3 flex items-center gap-3">
            {onToggle && (
              <button
                onClick={onToggle}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                View Raw Text
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Share Table
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
