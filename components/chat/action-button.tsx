'use client'

import {
  Eye,
  MagnifyingGlass,
  XCircle,
  ClockCounterClockwise,
  NotePencil,
  Star,
  ArrowsOutSimple,
  ArrowsLeftRight,
  ClipboardText,
  SquaresFour,
  GitBranch,
} from '@phosphor-icons/react'
import type { MessageAction, ActionType } from '@/types/action-buttons'
import type { IconWeight } from '@phosphor-icons/react'

const ACTION_ICONS: Record<ActionType, { icon: React.ElementType; weight?: IconWeight }> = {
  view_position: { icon: Eye },
  pelican_scan: { icon: MagnifyingGlass },
  close_trade: { icon: XCircle },
  review_trade: { icon: ClockCounterClockwise },
  log_trade: { icon: NotePencil },
  add_watchlist: { icon: Star },
  remove_watchlist: { icon: Star, weight: 'fill' },
  deep_dive: { icon: ArrowsOutSimple },
  compare: { icon: ArrowsLeftRight },
  show_heatmap: { icon: SquaresFour },
  show_correlations: { icon: GitBranch },
  save_insight: { icon: ClipboardText },
}

interface ActionButtonProps {
  action: MessageAction
  onClick: (action: MessageAction) => void
  loading?: boolean
}

export function ActionButton({ action, onClick, loading }: ActionButtonProps) {
  const config = ACTION_ICONS[action.type]
  const Icon = config?.icon

  return (
    <button
      onClick={() => onClick(action)}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-indigo-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-indigo-subtle)]"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={14} weight={config.weight || 'regular'} />
      )}
      <span>{action.label}</span>
    </button>
  )
}
