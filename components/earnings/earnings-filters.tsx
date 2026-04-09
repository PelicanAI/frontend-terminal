"use client"

import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon as MagnifyingGlass, Briefcase01Icon as Briefcase } from '@hugeicons/core-free-icons'
import { FilterPill } from '@/components/earnings/filter-pill'
import type { EarningsFilters as EarningsFiltersType } from '@/types/earnings'

interface EarningsFiltersProps {
  filters: EarningsFiltersType
  onToggle: (key: keyof EarningsFiltersType) => void
  portfolioCount: number
  search: string
  onSearchChange: (value: string) => void
}

export function EarningsFilters({
  filters,
  onToggle,
  portfolioCount,
  search,
  onSearchChange,
}: EarningsFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      {/* Search input */}
      <div className="relative">
        <HugeiconsIcon icon={MagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
        <input
          type="text"
          placeholder="Search ticker..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-3 py-2 w-full sm:w-48 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/40 transition-colors duration-150"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <FilterPill
          active={filters.myPortfolio}
          onClick={() => onToggle('myPortfolio')}
          label="My Positions"
          icon={<HugeiconsIcon icon={Briefcase} className="h-3.5 w-3.5" strokeWidth={1.5} color="currentColor" />}
          count={portfolioCount > 0 ? portfolioCount : undefined}
        />
        <FilterPill
          active={filters.sp500}
          onClick={() => onToggle('sp500')}
          label="S&P 500"
        />
        <FilterPill
          active={filters.mag7}
          onClick={() => onToggle('mag7')}
          label="Mag 7"
        />
        <FilterPill
          active={filters.bmo}
          onClick={() => onToggle('bmo')}
          label="Before Open"
        />
        <FilterPill
          active={filters.amc}
          onClick={() => onToggle('amc')}
          label="After Close"
        />
        <FilterPill
          active={filters.reported}
          onClick={() => onToggle('reported')}
          label="Reported"
        />
      </div>
    </div>
  )
}
