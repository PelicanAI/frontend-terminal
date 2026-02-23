"use client"

import { MagnifyingGlass } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { StrategyFilter, StrategyCategory, StrategyDifficulty, StrategySource } from "@/types/trading"

interface StrategyFiltersProps {
  filters: StrategyFilter
  onChange: (filters: StrategyFilter | ((prev: StrategyFilter) => StrategyFilter)) => void
}

const SOURCES: { value: StrategySource; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'curated', label: 'Curated' },
  { value: 'community', label: 'Community' },
]

const CATEGORIES: { value: StrategyCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'event_driven', label: 'Event-Driven' },
  { value: 'options', label: 'Options' },
]

const DIFFICULTIES: { value: StrategyDifficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

function PillGroup<T extends string>({ options, value, onSelect }: { options: { value: T; label: string }[]; value: T; onSelect: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap",
            value === opt.value
              ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function StrategyFilters({ filters, onChange }: StrategyFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PillGroup
        options={SOURCES}
        value={filters.source}
        onSelect={(source) => onChange((prev) => ({ ...prev, source }))}
      />
      <div className="w-px h-5 bg-[var(--border-subtle)]" />
      <PillGroup
        options={CATEGORIES}
        value={filters.category}
        onSelect={(category) => onChange((prev) => ({ ...prev, category }))}
      />
      <div className="w-px h-5 bg-[var(--border-subtle)]" />
      <PillGroup
        options={DIFFICULTIES}
        value={filters.difficulty}
        onSelect={(difficulty) => onChange((prev) => ({ ...prev, difficulty }))}
      />
      <div className="w-px h-5 bg-[var(--border-subtle)]" />
      <div className="relative">
        <MagnifyingGlass size={14} weight="regular" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search strategies..."
          value={filters.search}
          onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value }))}
          className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors w-48"
        />
      </div>
    </div>
  )
}
