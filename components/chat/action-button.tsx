'use client'

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  ViewIcon as Eye,
  Search01Icon as MagnifyingGlass,
  CancelCircleIcon as XCircle,
  ClockArrowDownIcon as ClockCounterClockwise,
  NoteEditIcon as NotePencil,
  StarIcon as Star,
  ArrowExpand01Icon as ArrowsOutSimple,
  ArrowLeftRightIcon as ArrowsLeftRight,
  ClipboardIcon as ClipboardText,
  DashboardSquare01Icon as SquaresFour,
  GitBranchIcon as GitBranch,
  Brain01Icon as Brain,
  Shield01Icon as Shield,
  ChartLineData01Icon as ChartLineUp,
} from '@hugeicons/core-free-icons'
import type { MessageAction, ActionType } from '@/types/action-buttons'

const ACTION_ICONS: Record<ActionType, { icon: IconSvgElement }> = {
  view_position: { icon: Eye },
  pelican_scan: { icon: MagnifyingGlass },
  close_trade: { icon: XCircle },
  review_trade: { icon: ClockCounterClockwise },
  log_trade: { icon: NotePencil },
  add_watchlist: { icon: Star },
  remove_watchlist: { icon: Star },
  deep_dive: { icon: ArrowsOutSimple },
  compare: { icon: ArrowsLeftRight },
  show_heatmap: { icon: SquaresFour },
  show_correlations: { icon: GitBranch },
  save_insight: { icon: ClipboardText },
  analyze_behavior: { icon: Brain },
  check_plan: { icon: Shield },
  review_trade_vs_plan: { icon: ChartLineUp },
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
        Icon && <HugeiconsIcon icon={Icon} size={14} strokeWidth={1.5} color="currentColor" />
      )}
      <span>{action.label}</span>
    </button>
  )
}
