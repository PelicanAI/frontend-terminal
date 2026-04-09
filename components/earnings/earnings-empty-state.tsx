"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon as CalendarBlank, FilterIcon as Funnel } from "@hugeicons/core-free-icons"
import { PelicanButton } from "@/components/ui/pelican"

interface EarningsEmptyStateProps {
  variant: "no-data" | "filtered"
  onClearFilters?: () => void
}

export function EarningsEmptyState({ variant, onClearFilters }: EarningsEmptyStateProps) {
  if (variant === "no-data") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <HugeiconsIcon icon={CalendarBlank} className="w-16 h-16 text-[var(--text-disabled)] mb-4" strokeWidth={1} color="currentColor" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          No earnings data available
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
          Earnings data is temporarily unavailable. Please try again later or
          check back during market hours.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <HugeiconsIcon icon={Funnel} className="w-16 h-16 text-[var(--text-disabled)] mb-4" strokeWidth={1} color="currentColor" />
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
        No earnings match your filters
      </h3>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-xs mb-4">
        Try adjusting your filters or search term to see more results.
      </p>
      {onClearFilters && (
        <PelicanButton variant="secondary" size="sm" onClick={onClearFilters}>
          Clear filters
        </PelicanButton>
      )}
    </div>
  )
}
