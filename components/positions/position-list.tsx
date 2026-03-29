'use client'

import { useState, useMemo } from 'react'
import { PortfolioPosition, PortfolioStats } from '@/types/portfolio'
import { BehavioralInsights } from '@/hooks/use-behavioral-insights'
import { computePositionHealth, computeSmartAlerts, PositionHealth, PositionAlert } from '@/lib/position-health'
import type { TickerHistory } from '@/hooks/use-ticker-history'
import type { Quote } from '@/hooks/use-live-quotes'
import { PositionCard } from './position-card'
import { FunnelSimple } from '@phosphor-icons/react'


interface PositionListProps {
  positions: PortfolioPosition[]
  portfolioStats: PortfolioStats
  insights: BehavioralInsights | null
  tickerHistory: Record<string, TickerHistory>
  quotes: Record<string, Quote>
  watchlistTickers?: Set<string>
  activeFilter: string
  sortBy: string
  searchQuery: string
  onScanWithPelican: (position: PortfolioPosition) => void
  onEdit: (position: PortfolioPosition) => void
  onClose: (position: PortfolioPosition) => void
  onLogTrade?: () => void
}

export interface PositionData {
  position: PortfolioPosition
  health: PositionHealth
  alerts: PositionAlert[]
}

export function PositionList({
  positions,
  portfolioStats,
  insights,
  tickerHistory,
  quotes,
  watchlistTickers,
  activeFilter,
  sortBy,
  searchQuery,
  onScanWithPelican,
  onEdit,
  onClose,
  onLogTrade,
}: PositionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 1. Filter and sort positions
  const filteredPositions = useMemo(() => {
    let result = [...positions]

    // Direction filters
    if (activeFilter === 'long') result = result.filter((p) => p.direction === 'long')
    else if (activeFilter === 'short') result = result.filter((p) => p.direction === 'short')
    // Asset type filters
    else if (['stock', 'crypto', 'forex', 'option'].includes(activeFilter))
      result = result.filter((p) => p.asset_type === activeFilter)

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => p.ticker.toLowerCase().includes(q))
    }

    // Sort (non-health sorts applied here)
    switch (sortBy) {
      case 'size_desc':
        result.sort((a, b) => b.position_size_usd - a.position_size_usd)
        break
      case 'size_asc':
        result.sort((a, b) => a.position_size_usd - b.position_size_usd)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
        break
      case 'conviction':
        result.sort((a, b) => (b.conviction || 0) - (a.conviction || 0))
        break
      case 'rr':
        result.sort((a, b) => (b.risk_reward_ratio || 0) - (a.risk_reward_ratio || 0))
        break
      // 'health' sort applied after health computation
    }

    return result
  }, [positions, activeFilter, sortBy, searchQuery])

  // 2. Compute health scores and alerts for each position
  const positionData = useMemo<PositionData[]>(() => {
    const data = filteredPositions.map((pos) => ({
      position: pos,
      health: computePositionHealth(pos, insights, portfolioStats),
      alerts: computeSmartAlerts(pos, portfolioStats),
    }))

    // Apply health sort after computation
    if (sortBy === 'health') {
      data.sort((a, b) => b.health.score - a.health.score)
    }

    return data
  }, [filteredPositions, insights, portfolioStats, sortBy])

  // 3. Accordion toggle
  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // Empty filtered state
  if (positionData.length === 0 && positions.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FunnelSimple size={32} weight="light" className="text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)] mb-1">
          No positions match your filters
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Try adjusting your search or filter criteria
        </p>
        <button
          className="text-[10px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded border border-[var(--border-subtle)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          onClick={() => {
            // Reset is handled by parent — this is a convenience signal
            // Parent should listen for this pattern and reset filters
          }}
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Position cards */}
      {positionData.map((data) => (
        <PositionCard
          key={data.position.id}
          position={data.position}
          healthScore={data.health}
          smartAlerts={data.alerts}
          tickerHistory={tickerHistory[data.position.ticker] ?? null}
          quote={quotes[data.position.ticker] ?? null}
          isWatching={watchlistTickers?.has(data.position.ticker.toUpperCase()) ?? false}
          isExpanded={expandedId === data.position.id}
          onToggleExpand={() => handleToggle(data.position.id)}
          onScanWithPelican={() => onScanWithPelican(data.position)}
          onEdit={() => onEdit(data.position)}
          onClose={() => onClose(data.position)}
        />
      ))}

    </div>
  )
}
