// DEPRECATED: Actions moved to sidebar actions-tab.tsx — safe to delete
"use client"

import { m } from "framer-motion"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ChartLineData01Icon as ChartLineUp,
  Briefcase01Icon as Briefcase,
  SecurityCheckIcon as ShieldCheck,
  BalanceScaleIcon as Scales,
  Mortarboard01Icon as GraduationCap,
  FlashIcon as Lightning,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useLearningMode } from "@/providers/learning-mode-provider"
import type { ExpanderKey } from "./action-expanders"

// ============================================================================
// Types
// ============================================================================

interface ActionBarProps {
  active: ExpanderKey | null
  onToggle: (key: ExpanderKey | null) => void
  onFocusInput: () => void
  hasOpenTrades: boolean
  disabled?: boolean
  isAIResponding?: boolean
}

interface ActionButton {
  key: ExpanderKey | "quick"
  icon: IconSvgElement
  label: string
  show: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ActionBar({
  active,
  onToggle,
  onFocusInput,
  hasOpenTrades,
  disabled = false,
  isAIResponding = false,
}: ActionBarProps) {
  const { enabled: learningEnabled, setEnabled: setLearningEnabled } = useLearningMode()

  if (isAIResponding) return null

  const actions: ActionButton[] = [
    { key: "analyze", icon: ChartLineUp, label: "Analyze", show: true },
    { key: "scan", icon: Briefcase, label: "Scan Position", show: hasOpenTrades },
    { key: "pretrade", icon: ShieldCheck, label: "Pre-Trade Check", show: true },
    { key: "compare", icon: Scales, label: "Compare", show: true },
    { key: "learn", icon: GraduationCap, label: "Learn", show: true },
    { key: "quick", icon: Lightning, label: "Quick Ask", show: true },
  ]

  const visibleActions = actions.filter((a) => a.show)

  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-center gap-1 mb-1.5 px-1"
    >
      {visibleActions.map((action) => {
        const Icon = action.icon
        const isActive = active === action.key || (action.key === "learn" && learningEnabled)
        const isQuick = action.key === "quick"

        return (
          <button
            key={action.key}
            onClick={() => {
              if (disabled) return
              if (isQuick) {
                onFocusInput()
                return
              }
              const nextState = isActive ? null : (action.key as ExpanderKey)
              onToggle(nextState)
              if (action.key === "learn") {
                setLearningEnabled(nextState === "learn")
              }
            }}
            disabled={disabled}
            title={action.label}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150",
              disabled
                ? "text-[var(--text-disabled)] cursor-not-allowed"
                : isActive
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-transparent",
            )}
          >
            <HugeiconsIcon icon={Icon} size={15} strokeWidth={isActive ? 2 : 1.5} color="currentColor" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        )
      })}
    </m.div>
  )
}
