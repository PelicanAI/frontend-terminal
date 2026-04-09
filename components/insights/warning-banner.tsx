'use client'

import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon as Warning,
  SecurityWarningIcon as ShieldWarning,
  ArrowDown01Icon as CaretDown,
  ArrowUp01Icon as CaretUp,
  Cancel01Icon as X,
} from '@hugeicons/core-free-icons'
import { PelicanButton } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'
import { IconTooltip } from '@/components/ui/icon-tooltip'

// ============================================================================
// Types
// ============================================================================

interface WarningItem {
  type: 'calendar' | 'streak' | 'plan'
  severity: 'warning' | 'critical'
  title: string
  message: string
  action: string
}

interface WarningBannerProps {
  warnings: WarningItem[]
  onAction?: (warning: WarningItem) => void
}

// ============================================================================
// Config
// ============================================================================

const severityStyles = {
  warning: {
    bg: 'bg-[var(--data-warning)]/10',
    border: 'border-[var(--data-warning)]/20',
    icon: Warning,
    iconColor: 'text-[var(--data-warning)]',
  },
  critical: {
    bg: 'bg-[var(--data-negative)]/10',
    border: 'border-[var(--data-negative)]/20',
    icon: ShieldWarning,
    iconColor: 'text-[var(--data-negative)]',
  },
} as const

// ============================================================================
// Single Warning Row
// ============================================================================

function WarningRow({
  warning,
  onAction,
  onDismiss,
}: {
  warning: WarningItem
  onAction?: (w: WarningItem) => void
  onDismiss: () => void
}) {
  const style = severityStyles[warning.severity]
  const Icon = style.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg border',
        style.bg,
        style.border,
      )}
    >
      <HugeiconsIcon icon={Icon} size={18} className={cn('shrink-0', style.iconColor)} strokeWidth={2} color="currentColor" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {warning.title}
        </span>
        <span className="text-sm text-[var(--text-secondary)] ml-2">
          {warning.message}
        </span>
      </div>
      <PelicanButton
        variant="ghost"
        size="sm"
        onClick={() => onAction?.(warning)}
        className="shrink-0"
      >
        {warning.action}
      </PelicanButton>
      <IconTooltip label="Dismiss warning" side="bottom">
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-colors duration-150"
          aria-label="Dismiss warning"
        >
          <HugeiconsIcon icon={X} size={14} strokeWidth={1.5} color="currentColor" />
        </button>
      </IconTooltip>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export function WarningBanner({ warnings, onAction }: WarningBannerProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState(false)

  const visible = warnings.filter((_, i) => !dismissed.has(i))

  if (visible.length === 0) return null

  const first = visible[0]!
  const rest = visible.slice(1)
  const firstIndex = warnings.indexOf(first)

  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-2"
    >
      {/* Primary warning */}
      <WarningRow
        warning={first}
        onAction={onAction}
        onDismiss={() => setDismissed((prev) => new Set(prev).add(firstIndex))}
      />

      {/* Additional warnings */}
      {rest.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-4 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
          >
            {expanded ? (
              <HugeiconsIcon icon={CaretUp} size={12} strokeWidth={1.5} color="currentColor" />
            ) : (
              <HugeiconsIcon icon={CaretDown} size={12} strokeWidth={1.5} color="currentColor" />
            )}
            <span className="font-mono tabular-nums">{rest.length}</span>
            {' '}more warning{rest.length > 1 ? 's' : ''}
          </button>

          <AnimatePresence>
            {expanded && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col gap-2 overflow-hidden"
              >
                {rest.map((w) => {
                  const idx = warnings.indexOf(w)
                  return (
                    <WarningRow
                      key={idx}
                      warning={w}
                      onAction={onAction}
                      onDismiss={() =>
                        setDismissed((prev) => new Set(prev).add(idx))
                      }
                    />
                  )
                })}
              </m.div>
            )}
          </AnimatePresence>
        </>
      )}
    </m.div>
  )
}
