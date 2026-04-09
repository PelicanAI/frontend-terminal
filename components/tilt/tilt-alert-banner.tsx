'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { TiltAlert } from '@/lib/tilt/tilt-detector'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert01Icon as Warning, Cancel01Icon as X } from '@hugeicons/core-free-icons'

interface TiltAlertBannerProps {
  alerts: TiltAlert[]
}

export function TiltAlertBanner({ alerts }: TiltAlertBannerProps) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const visible = alerts.filter(a => !dismissed.includes(a.pattern))
  if (visible.length === 0) return null

  const hasCritical = visible.some(a => a.severity === 'critical')

  return (
    <div className={cn(
      "p-4 border rounded-xl",
      hasCritical
        ? "bg-[var(--data-negative)]/10 border-[var(--data-negative)]/30"
        : "bg-[var(--data-warning)]/10 border-[var(--data-warning)]/30"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <HugeiconsIcon icon={Warning} size={18} className={cn(
              "flex-shrink-0 mt-0.5",
              hasCritical ? "text-[var(--data-negative)]" : "text-[var(--data-warning)]"
            )} strokeWidth={1.5} color="currentColor" />
          <div>
            <p className={cn(
              "font-semibold text-sm",
              hasCritical ? "text-[var(--data-negative)]" : "text-[var(--data-warning)]"
            )}>
              {hasCritical ? 'Tilt Alert — Consider Stopping' : 'Behavioral Warning'}
            </p>
            <div className="mt-2 space-y-3">
              {visible.map(a => (
                <div key={a.pattern} className="text-sm">
                  <p className="text-[var(--text-primary)]/90 font-medium">{a.title}</p>
                  <p className="text-[var(--text-secondary)] text-xs mt-0.5">{a.message}</p>
                  <p className="text-[var(--accent-primary)] text-xs mt-1 italic">{a.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(visible.map(a => a.pattern))}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-4 flex-shrink-0"
        >
          <HugeiconsIcon icon={X} size={14} strokeWidth={1.5} color="currentColor" />
        </button>
      </div>
    </div>
  )
}
