'use client'

import { PortfolioPosition } from '@/types/portfolio'
import { MagnifyingGlass, SortAscending, Plus } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { ConnectBrokerButton } from '@/components/broker/connect-broker-button'
import { useBrokerConnections } from '@/hooks/use-broker-connections'

interface PositionFiltersProps {
  positions: PortfolioPosition[]
  activeFilter: string
  sortBy: string
  searchQuery: string
  onFilterChange: (filter: string) => void
  onSortChange: (sort: string) => void
  onSearchChange: (query: string) => void
  onLogTrade?: () => void
  showConnectBroker?: boolean
}

interface FilterTab {
  key: string
  label: string
  count: number
}

export function PositionFilters({
  positions,
  activeFilter,
  sortBy,
  searchQuery,
  onFilterChange,
  onSortChange,
  onSearchChange,
  onLogTrade,
  showConnectBroker,
}: PositionFiltersProps) {
  const { activeConnections } = useBrokerConnections()
  const shouldShowConnectBroker = showConnectBroker !== false && activeConnections.length === 0

  const tabs = useMemo<FilterTab[]>(() => {
    const longCount = positions.filter((p) => p.direction === 'long').length
    const shortCount = positions.filter((p) => p.direction === 'short').length
    const stockCount = positions.filter((p) => p.asset_type === 'stock').length
    const cryptoCount = positions.filter((p) => p.asset_type === 'crypto').length
    const forexCount = positions.filter((p) => p.asset_type === 'forex').length
    const optionCount = positions.filter((p) => p.asset_type === 'option').length

    return [
      { key: 'all', label: 'All', count: positions.length },
      { key: 'long', label: 'Long', count: longCount },
      { key: 'short', label: 'Short', count: shortCount },
      { key: 'stock', label: 'Stocks', count: stockCount },
      { key: 'crypto', label: 'Crypto', count: cryptoCount },
      { key: 'forex', label: 'Forex', count: forexCount },
      { key: 'option', label: 'Options', count: optionCount },
    ]
  }, [positions])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter pills */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]/80 border border-[var(--accent-primary)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            {tab.label}
            <span className="ml-1 font-[var(--font-geist-mono)] tabular-nums opacity-50">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions row */}
      <div className="flex items-center gap-2 shrink-0">
        {shouldShowConnectBroker && (
          <ConnectBrokerButton
            variant="secondary"
            size="sm"
            className="text-[10px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded border border-[var(--border-subtle)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap flex-shrink-0"
          />
        )}
        {onLogTrade && (
          <button
            onClick={onLogTrade}
            className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]/80 hover:text-[var(--accent-primary)] transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Plus size={12} weight="bold" />
            <span className="hidden sm:inline">Log Position</span>
            <span className="sm:hidden">Log</span>
          </button>
        )}
        {/* Sort dropdown */}
        <div className="relative">
          <SortAscending
            size={12}
            weight="regular"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none bg-transparent border border-[var(--border-subtle)]/40 hover:border-[var(--border-subtle)]/60 rounded text-[11px] text-[var(--text-secondary)] pl-7 pr-6 py-1 min-w-[90px] lg:min-w-[120px] focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors cursor-pointer"
          >
            <option value="size_desc">Size ↓</option>
            <option value="size_asc">Size ↑</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="conviction">Conviction</option>
            <option value="rr">R:R</option>
            <option value="health">Health</option>
          </select>
          {/* Custom dropdown arrow */}
          <svg
            className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Search input */}
        <div className="relative">
          <MagnifyingGlass
            size={12}
            weight="regular"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ticker..."
            className="w-24 lg:w-32 text-xs bg-transparent border border-[var(--border-subtle)]/30 hover:border-[var(--border-subtle)]/60 rounded text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]/40 pl-7 pr-2 py-1 focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
