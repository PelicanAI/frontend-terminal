"use client"

import React, { useState, useMemo, useCallback } from 'react'
import type { CorrelationAsset, CorrelationPair } from '@/types/correlations'

// --- Color utilities ---

function correlationColor(value: number, isDark: boolean): string {
  if (Math.abs(value) < 0.05) {
    return isDark ? 'hsl(230, 8%, 25%)' : 'hsl(230, 8%, 85%)'
  }
  if (value > 0) {
    const sat = Math.min(value * 80, 80)
    const light = isDark ? 35 + (1 - value) * 15 : 50 - value * 20
    return `hsl(142, ${sat}%, ${light}%)`
  }
  const absVal = Math.abs(value)
  const sat = Math.min(absVal * 80, 80)
  const light = isDark ? 35 + (1 - absVal) * 15 : 50 - absVal * 20
  return `hsl(0, ${sat}%, ${light}%)`
}

function cellTextColor(value: number): string {
  return Math.abs(value) > 0.6 ? 'white' : 'var(--text-primary)'
}

function beginnerLabel(value: number): string {
  if (value > 0.7) return 'Strong'
  if (value > 0.3) return 'Moderate'
  if (value > -0.3) return 'Weak'
  if (value > -0.7) return 'Inverse'
  return 'Strong Inv.'
}

// --- Category grouping ---

const CATEGORY_ORDER = [
  'broad_market', 'growth_proxy', 'tech', 'safe_haven',
  'credit', 'real_assets', 'volatility_gauge', 'currency_pair', 'risk_appetite',
]

// --- Component ---

interface CorrelationMatrixProps {
  assets: CorrelationAsset[]
  correlations: CorrelationPair[]
  period: string
  selectedPair: { assetA: string; assetB: string } | null
  onSelectPair: (assetA: string, assetB: string) => void
  beginnerMode: boolean
}

export const CorrelationMatrix = React.memo(function CorrelationMatrix({
  assets, correlations, selectedPair, onSelectPair, beginnerMode,
}: CorrelationMatrixProps) {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

  // Sort assets by category then sort_order
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category)
      const catB = CATEGORY_ORDER.indexOf(b.category)
      if (catA !== catB) return catA - catB
      return a.sort_order - b.sort_order
    })
  }, [assets])

  // Correlation lookup map
  const corrMap = useMemo(() => {
    const map = new Map<string, CorrelationPair>()
    for (const pair of correlations) {
      map.set(`${pair.asset_a}-${pair.asset_b}`, pair)
      map.set(`${pair.asset_b}-${pair.asset_a}`, pair)
    }
    return map
  }, [correlations])

  const getCorrelation = useCallback(
    (a: string, b: string) => corrMap.get(`${a}-${b}`),
    [corrMap],
  )

  // Detect dark mode
  const isDark = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : true

  // Find category group boundaries for separators
  const groupBoundaries = useMemo(() => {
    const boundaries: number[] = []
    for (let i = 1; i < sortedAssets.length; i++) {
      if (sortedAssets[i]!.category !== sortedAssets[i - 1]!.category) {
        boundaries.push(i)
      }
    }
    return new Set(boundaries)
  }, [sortedAssets])

  const n = sortedAssets.length

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-[2px] min-w-max"
        style={{
          gridTemplateColumns: `90px repeat(${n}, minmax(52px, 1fr))`,
        }}
      >
        {/* Top-left empty cell */}
        <div />

        {/* Column headers */}
        {sortedAssets.map((asset, colIdx) => (
          <div
            key={`col-${asset.ticker}`}
            className="flex items-center justify-center cursor-default select-none"
            style={{
              height: '40px',
              borderLeft: groupBoundaries.has(colIdx) ? '2px solid var(--border-default)' : undefined,
              background: highlightedIndex === colIdx ? 'var(--accent-muted)' : undefined,
            }}
            onMouseEnter={() => setHighlightedIndex(colIdx)}
            onMouseLeave={() => setHighlightedIndex(null)}
          >
            <span
              className="text-[10px] font-mono font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              {asset.ticker}
            </span>
          </div>
        ))}

        {/* Rows */}
        {sortedAssets.map((rowAsset, rowIdx) => (
          <React.Fragment key={`row-${rowAsset.ticker}`}>
            {/* Row header */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 cursor-default select-none"
              style={{
                borderTop: groupBoundaries.has(rowIdx) ? '2px solid var(--border-default)' : undefined,
                background: highlightedIndex === rowIdx ? 'var(--accent-muted)' : undefined,
              }}
              onMouseEnter={() => setHighlightedIndex(rowIdx)}
              onMouseLeave={() => setHighlightedIndex(null)}
            >
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {rowAsset.ticker}
              </span>
            </div>

            {/* Cells */}
            {sortedAssets.map((colAsset, colIdx) => {
              const isSelected =
                selectedPair?.assetA === rowAsset.ticker && selectedPair?.assetB === colAsset.ticker ||
                selectedPair?.assetA === colAsset.ticker && selectedPair?.assetB === rowAsset.ticker

              // Diagonal
              if (rowIdx === colIdx) {
                return (
                  <div
                    key={`cell-${rowIdx}-${colIdx}`}
                    className="flex items-center justify-center rounded"
                    style={{
                      aspectRatio: '1',
                      background: 'var(--bg-elevated)',
                      borderTop: groupBoundaries.has(rowIdx) ? '2px solid var(--border-default)' : undefined,
                      borderLeft: groupBoundaries.has(colIdx) ? '2px solid var(--border-default)' : undefined,
                    }}
                  >
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                      1.00
                    </span>
                  </div>
                )
              }

              const pair = getCorrelation(rowAsset.ticker, colAsset.ticker)
              const isLower = rowIdx > colIdx
              const isHighlighted = highlightedIndex === rowIdx || highlightedIndex === colIdx

              // Lower triangle: correlation value with color
              if (isLower) {
                const value = pair?.correlation ?? 0
                const bgColor = pair ? correlationColor(value, isDark) : 'var(--bg-surface)'
                const textColor = pair ? cellTextColor(value) : 'var(--text-muted)'

                return (
                  <button
                    key={`cell-${rowIdx}-${colIdx}`}
                    className={`correlation-cell flex items-center justify-center rounded text-[10px] font-mono tabular-nums${isSelected ? ' correlation-cell--selected' : ''}`}
                    style={{
                      aspectRatio: '1',
                      background: bgColor,
                      color: textColor,
                      border: isSelected
                        ? '2px solid var(--accent-indigo)'
                        : '1px solid var(--border-subtle)',
                      filter: isHighlighted ? 'brightness(1.15)' : undefined,
                      borderTop: groupBoundaries.has(rowIdx) ? '2px solid var(--border-default)' : undefined,
                      borderLeft: groupBoundaries.has(colIdx) ? '2px solid var(--border-default)' : undefined,
                      animation: pair && Math.abs(pair.z_score) > 1.5
                        ? 'pulse-border 2s ease-in-out infinite'
                        : undefined,
                    }}
                    onClick={() => pair && onSelectPair(rowAsset.ticker, colAsset.ticker)}
                    title={pair ? `${rowAsset.display_name} / ${colAsset.display_name}: ${value.toFixed(3)}` : ''}
                  >
                    {pair
                      ? beginnerMode
                        ? beginnerLabel(value)
                        : value.toFixed(2)
                      : '\u2014'}
                  </button>
                )
              }

              // Upper triangle: z-score + regime dot
              const zScore = pair?.z_score ?? 0
              const regime = pair?.regime ?? 'normal'
              const dotColor = {
                normal: 'var(--data-positive)',
                elevated: 'var(--data-warning)',
                breakdown: 'var(--data-negative)',
                inversion: 'var(--data-warning)',
              }[regime]

              return (
                <button
                  key={`cell-${rowIdx}-${colIdx}`}
                  className={`correlation-cell flex flex-col items-center justify-center rounded text-[9px] font-mono tabular-nums gap-0.5${isSelected ? ' correlation-cell--selected' : ''}`}
                  style={{
                    aspectRatio: '1',
                    background: isHighlighted ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    border: isSelected
                      ? '2px solid var(--accent-indigo)'
                      : '1px solid var(--border-subtle)',
                    borderTop: groupBoundaries.has(rowIdx) ? '2px solid var(--border-default)' : undefined,
                    borderLeft: groupBoundaries.has(colIdx) ? '2px solid var(--border-default)' : undefined,
                  }}
                  onClick={() => pair && onSelectPair(rowAsset.ticker, colAsset.ticker)}
                  title={pair ? `${rowAsset.display_name} / ${colAsset.display_name}: z=${zScore.toFixed(1)}` : ''}
                >
                  {pair ? (
                    <>
                      <span style={{ color: Math.abs(zScore) > 1.5 ? 'var(--data-negative)' : 'var(--text-muted)' }}>
                        {zScore > 0 ? '+' : ''}{zScore.toFixed(1)}&sigma;
                      </span>
                      <span
                        className="rounded-full"
                        style={{ width: 5, height: 5, background: dotColor }}
                      />
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-disabled)' }}>&mdash;</span>
                  )}
                </button>
              )
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Pulse animation for anomaly cells */}
      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 0 2px var(--accent-indigo); }
        }
      `}</style>
    </div>
  )
})
