"use client"

import { SortAscending } from "@phosphor-icons/react"
import type { StrategyFilter } from "@/types/trading"

interface StrategySortProps {
  filters: StrategyFilter
  onChange: (filters: StrategyFilter | ((prev: StrategyFilter) => StrategyFilter)) => void
}

const SORT_OPTIONS = [
  { value: 'popular' as const, label: 'Most Popular' },
  { value: 'rating' as const, label: 'Highest Rated' },
  { value: 'newest' as const, label: 'Newest' },
]

export function StrategySort({ filters, onChange }: StrategySortProps) {
  return (
    <div className="flex items-center gap-2">
      <SortAscending size={14} weight="regular" className="text-[var(--text-muted)]" />
      <select
        value={filters.sortBy}
        onChange={(e) => onChange((prev) => ({ ...prev, sortBy: e.target.value as StrategyFilter['sortBy'] }))}
        className="text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent-primary)] transition-colors cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
