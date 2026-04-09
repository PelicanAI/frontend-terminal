'use client'

import { useMemo, useState } from 'react'
import { m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { FilterIcon as FunnelSimple } from '@hugeicons/core-free-icons'
import { listStagger, listItem } from '@/components/ui/pelican'
import type { BehavioralInsights } from '@/hooks/use-behavioral-insights'
import type { Quote } from '@/hooks/use-live-quotes'
import type { TickerHistory } from '@/hooks/use-ticker-history'
import { computePositionHealth, computeSmartAlerts, type PositionAlert, type PositionHealth } from '@/lib/position-health'
import { PortfolioPosition, PortfolioStats } from '@/types/portfolio'
import { PositionCard } from './position-card'

const DESKTOP_POSITION_GRID =
  'grid-cols-[minmax(180px,1.45fr)_repeat(4,minmax(96px,0.8fr))_minmax(96px,0.8fr)_minmax(152px,1fr)_minmax(110px,0.95fr)]'

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
}: PositionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredPositions = useMemo(() => {
    let result = [...positions]

    if (activeFilter === 'long') result = result.filter((position) => position.direction === 'long')
    else if (activeFilter === 'short') result = result.filter((position) => position.direction === 'short')
    else if (['stock', 'crypto', 'forex', 'option'].includes(activeFilter)) {
      result = result.filter((position) => position.asset_type === activeFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((position) => position.ticker.toLowerCase().includes(query))
    }

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
      default:
        break
    }

    return result
  }, [positions, activeFilter, sortBy, searchQuery])

  const positionData = useMemo<PositionData[]>(() => {
    const data = filteredPositions.map((position) => ({
      position,
      health: computePositionHealth(position, insights, portfolioStats),
      alerts: computeSmartAlerts(position, portfolioStats),
    }))

    if (sortBy === 'health') {
      data.sort((a, b) => b.health.score - a.health.score)
    }

    return data
  }, [filteredPositions, insights, portfolioStats, sortBy])

  if (positionData.length === 0 && positions.length > 0) {
    return (
      <div className="border-b border-[var(--border-default)] py-10 text-center">
        <HugeiconsIcon icon={FunnelSimple} size={24} className="mx-auto text-[var(--text-muted)]" strokeWidth={1.25} color="currentColor" />
        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
          No positions match the active filter set
        </p>
        <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
          Adjust the blotter tabs or search query to widen the feed.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className={`hidden border-b border-[var(--border-default)] px-3 py-2.5 lg:grid ${DESKTOP_POSITION_GRID} gap-3 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]`}>
        <span>Symbol</span>
        <span>Entry</span>
        <span>Now</span>
        <span>Stop</span>
        <span>Target</span>
        <span>Value</span>
        <span>P&amp;L</span>
        <span>R / Score</span>
      </div>

      <m.div variants={listStagger} initial="hidden" animate="visible">
        {positionData.map((data) => (
          <m.div key={data.position.id} variants={listItem}>
            <PositionCard
              position={data.position}
              healthScore={data.health}
              smartAlerts={data.alerts}
              tickerHistory={tickerHistory[data.position.ticker] ?? null}
              quote={quotes[data.position.ticker] ?? null}
              isWatching={watchlistTickers?.has(data.position.ticker.toUpperCase()) ?? false}
              isExpanded={expandedId === data.position.id}
              onToggleExpand={() => setExpandedId((current) => current === data.position.id ? null : data.position.id)}
              onScanWithPelican={() => onScanWithPelican(data.position)}
              onEdit={() => onEdit(data.position)}
              onClose={() => onClose(data.position)}
            />
          </m.div>
        ))}
      </m.div>
    </div>
  )
}
