"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon as CaretLeft,
  ArrowRight01Icon as CaretRight,
  Calendar03Icon as CalendarBlank,
  FilterIcon as Funnel,
} from "@hugeicons/core-free-icons"
import { PelicanButton } from "@/components/ui/pelican"

interface EarningsEmptyStateProps {
  variant: "no-data" | "filtered"
  onClearFilters?: () => void
  onPreviousWeek?: () => void
  onNextWeek?: () => void
}

export function EarningsEmptyState({
  variant,
  onClearFilters,
  onPreviousWeek,
  onNextWeek,
}: EarningsEmptyStateProps) {
  if (variant === "no-data") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <HugeiconsIcon icon={CalendarBlank} className="mb-4 h-10 w-10 text-[var(--muted-foreground)]" strokeWidth={1.5} color="currentColor" />
        <h3 className="text-base font-medium text-[var(--foreground)]">
          No earnings reports this week
        </h3>
        <p className="mb-4 mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">
          Try a different week or show only your watchlist.
        </p>
        {(onPreviousWeek || onNextWeek) && (
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            {onPreviousWeek && (
              <PelicanButton variant="secondary" size="sm" onClick={onPreviousWeek}>
                <HugeiconsIcon icon={CaretLeft} className="h-4 w-4" strokeWidth={2} color="currentColor" />
                Previous week
              </PelicanButton>
            )}
            {onNextWeek && (
              <PelicanButton variant="secondary" size="sm" onClick={onNextWeek}>
                Next week
                <HugeiconsIcon icon={CaretRight} className="h-4 w-4" strokeWidth={2} color="currentColor" />
              </PelicanButton>
            )}
          </div>
        )}
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
