'use client'

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon as Plus,
  Search01Icon as MagnifyingGlass,
  SortByUp01Icon as SortAscending,
} from '@hugeicons/core-free-icons'
import { ConnectBrokerButton } from '@/components/broker/connect-broker-button'
import { useBrokerConnections } from '@/hooks/use-broker-connections'
import { PortfolioPosition } from '@/types/portfolio'

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
    const longCount = positions.filter((position) => position.direction === 'long').length
    const shortCount = positions.filter((position) => position.direction === 'short').length
    const stockCount = positions.filter((position) => position.asset_type === 'stock').length
    const cryptoCount = positions.filter((position) => position.asset_type === 'crypto').length
    const forexCount = positions.filter((position) => position.asset_type === 'forex').length
    const optionCount = positions.filter((position) => position.asset_type === 'option').length

    return [
      { key: 'all', label: 'All', count: positions.length },
      { key: 'long', label: 'Long', count: longCount },
      { key: 'short', label: 'Short', count: shortCount },
      { key: 'stock', label: 'Stocks', count: stockCount },
      { key: 'crypto', label: 'Crypto', count: cryptoCount },
      { key: 'forex', label: 'Forex', count: forexCount },
      { key: 'option', label: 'Options', count: optionCount },
    ].filter((tab) => tab.key === 'all' || tab.key === activeFilter || tab.count > 0)
  }, [positions, activeFilter])

  return (
    <div className="border-b border-[var(--border-default)] pb-2">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-nowrap items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`min-h-11 shrink-0 border-b-2 px-2 py-2 text-sm font-medium uppercase tracking-wider whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] ${
                  isActive
                    ? 'cursor-pointer border-[var(--accent-primary)] text-[var(--text-primary)]'
                    : 'cursor-pointer border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
                <span className="ml-1 font-mono tabular-nums text-[var(--text-muted)]">({tab.count})</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {shouldShowConnectBroker && (
            <ConnectBrokerButton
              variant="ghost"
              size="sm"
              className="h-11 px-2 text-xs uppercase tracking-wider text-[var(--text-secondary)] hover:bg-transparent hover:text-[var(--text-primary)] border-0 shadow-none rounded-none transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
            />
          )}

          {onLogTrade && (
            <button
              type="button"
              onClick={onLogTrade}
              className="flex h-11 items-center gap-1.5 bg-[var(--accent-glow)] px-3 text-xs uppercase tracking-wider text-[var(--accent-primary)] transition-colors duration-150 cursor-pointer hover:bg-[var(--surface-active)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
            >
              <HugeiconsIcon icon={Plus} size={14} strokeWidth={1.8} color="currentColor" />
              <span>Log Position</span>
            </button>
          )}

          <div className="relative">
            <HugeiconsIcon
              icon={SortAscending}
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.5}
              color="currentColor"
            />
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="h-11 min-w-[120px] appearance-none border border-[var(--border-default)] bg-transparent pl-9 pr-8 text-sm text-[var(--text-primary)] shadow-none transition-colors duration-150 cursor-pointer hover:border-[var(--border-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
            >
              <option value="size_desc">Size ↓</option>
              <option value="size_asc">Size ↑</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="conviction">Conviction</option>
              <option value="rr">R:R</option>
              <option value="health">Health</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              width="8"
              height="8"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="relative">
            <HugeiconsIcon
              icon={MagnifyingGlass}
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.5}
              color="currentColor"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search ticker"
              className="h-11 w-32 border border-[var(--border-default)] bg-transparent pl-9 pr-3 text-sm text-[var(--text-primary)] shadow-none transition-colors duration-150 placeholder:text-[var(--text-muted)] hover:border-[var(--border-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] lg:w-40"
            />
          </div>

        </div>
      </div>
    </div>
  )
}
