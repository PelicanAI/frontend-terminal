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
import { cn } from '@/lib/utils'
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
  disabled?: boolean
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
    const optionCount = positions.filter((position) => position.asset_type === 'option').length
    const longCount = positions.filter((position) => position.direction === 'long').length
    const shortCount = positions.filter((position) => position.direction === 'short').length
    const stockCount = positions.filter((position) => position.asset_type === 'stock').length
    const cryptoCount = positions.filter((position) => position.asset_type === 'crypto').length
    const forexCount = positions.filter((position) => position.asset_type === 'forex').length

    return [
      { key: 'all', label: 'Individual', count: positions.length },
      { key: 'net', label: 'Net', count: positions.length, disabled: true },
      { key: 'option', label: 'Options', count: optionCount },
      { key: 'long', label: 'Long', count: longCount },
      { key: 'short', label: 'Short', count: shortCount },
      { key: 'stock', label: 'Stocks', count: stockCount },
      { key: 'crypto', label: 'Crypto', count: cryptoCount },
      { key: 'forex', label: 'Forex', count: forexCount },
    ].filter((tab) => tab.key === 'all' || tab.key === 'net' || tab.key === activeFilter || tab.count > 0)
  }, [positions, activeFilter])

  return (
    <div className="border-b border-[var(--border-default)] py-2">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex flex-nowrap items-center gap-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.key || (tab.key === 'all' && activeFilter === 'all')
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (!tab.disabled) onFilterChange(tab.key)
                }}
                disabled={tab.disabled}
                className={cn(
                  'min-h-10 shrink-0 border-b px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]',
                  isActive
                    ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  tab.disabled && 'cursor-not-allowed opacity-35 hover:text-[var(--text-muted)]',
                )}
                title={tab.disabled ? 'Net aggregation is not in this data contract yet' : undefined}
              >
                {tab.label}
                <span className="ml-1 font-mono tabular-nums text-[10px] text-[var(--text-ghost)]">{tab.count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
          {shouldShowConnectBroker && (
            <ConnectBrokerButton
              variant="ghost"
              size="sm"
              className="h-10 rounded-none border-0 px-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] shadow-none transition-colors hover:bg-transparent hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
            />
          )}

          {onLogTrade && (
            <button
              type="button"
              onClick={onLogTrade}
              className="flex h-10 items-center gap-1.5 border border-[var(--border-active)] bg-[var(--accent-glow)] px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--surface-active)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
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
              className="h-10 min-w-[128px] appearance-none border border-[var(--border-default)] bg-transparent pl-9 pr-8 font-mono text-xs text-[var(--text-primary)] shadow-none transition-colors hover:border-[var(--border-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
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
              className="h-10 w-40 border border-[var(--border-default)] bg-transparent pl-9 pr-3 text-xs text-[var(--text-primary)] shadow-none transition-colors placeholder:text-[var(--text-muted)] hover:border-[var(--border-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
