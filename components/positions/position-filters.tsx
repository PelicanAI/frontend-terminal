'use client'

import { PortfolioPosition } from '@/types/portfolio'
import { MagnifyingGlass, SortAscending, Plus } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { ConnectBrokerButton } from '@/components/broker/connect-broker-button'

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
    <div className="space-y-3">
      {/* Filter tabs row */}
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        {/* Scrollable filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide w-full sm:w-auto shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {tab.label}
              <span className="ml-1 font-mono tabular-nums">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Sort + Search + Log */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(showConnectBroker !== false) && (
            <ConnectBrokerButton variant="ghost" size="sm" />
          )}
          {onLogTrade && (
            <button
              onClick={onLogTrade}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-150 whitespace-nowrap"
            >
              <Plus size={14} weight="bold" />
              <span className="hidden sm:inline">Log Position</span>
              <span className="sm:hidden">Log</span>
            </button>
          )}
          {/* Sort dropdown */}
          <div className="relative">
            <SortAscending
              size={14}
              weight="regular"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-secondary)] pl-8 pr-7 py-1.5 focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors cursor-pointer hover:border-[var(--border-hover)]"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Search input */}
          <div className="relative flex-1 sm:flex-none">
            <MagnifyingGlass
              size={14}
              weight="regular"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search ticker..."
              className="w-full sm:w-36 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] pl-8 pr-3 py-1.5 focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors hover:border-[var(--border-hover)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
