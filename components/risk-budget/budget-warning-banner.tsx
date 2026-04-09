'use client'

import { cn } from '@/lib/utils'
import type { BudgetStatus } from '@/lib/risk-budget/budget-tracker'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon as Warning,
  LockIcon as Lock,
  Shield01Icon as Shield,
} from '@hugeicons/core-free-icons'

interface BudgetWarningBannerProps {
  budget: BudgetStatus
}

export function BudgetWarningBanner({ budget }: BudgetWarningBannerProps) {
  if (budget.overallStatus === 'green' || budget.warnings.length === 0) return null

  const colors: Record<string, string> = {
    yellow: 'bg-[var(--data-warning)]/10 border-[var(--data-warning)]/30 text-[var(--data-warning)]',
    red: 'bg-[var(--data-negative)]/10 border-[var(--data-negative)]/30 text-[var(--data-negative)]',
    locked: 'bg-[var(--data-negative)]/15 border-[var(--data-negative)]/40 text-[var(--data-negative)]',
  }

  const Icon = budget.overallStatus === 'locked' ? Lock : budget.overallStatus === 'red' ? Shield : Warning

  return (
    <div className={cn("p-3 border rounded-xl text-sm", colors[budget.overallStatus])}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={Icon} size={16} className="flex-shrink-0 mt-0.5" strokeWidth={2} color="currentColor" />
        <div>
          <p className="font-medium text-xs">
            {budget.overallStatus === 'locked' ? 'Trading Budget Exceeded' : 'Risk Budget Warning'}
          </p>
          {budget.warnings.map((w, i) => (
            <p key={i} className="text-[10px] mt-1 opacity-80">{w}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
