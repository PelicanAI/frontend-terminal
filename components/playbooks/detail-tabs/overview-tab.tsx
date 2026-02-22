"use client"

import {
  Crosshair,
  SignOut,
  ShieldCheck,
  CloudSun,
  ListChecks,
  NoteBlank,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { Playbook } from "@/types/trading"

interface PlaybookOverviewTabProps {
  playbook: Playbook
}

const ruleCards = [
  {
    key: "market_conditions" as const,
    label: "Market Conditions",
    icon: CloudSun,
  },
  { key: "entry_rules" as const, label: "Entry Rules", icon: Crosshair },
  { key: "exit_rules" as const, label: "Exit Rules", icon: SignOut },
  { key: "risk_rules" as const, label: "Risk Rules", icon: ShieldCheck },
]

export function PlaybookOverviewTab({ playbook }: PlaybookOverviewTabProps) {
  const hasChecklist = playbook.checklist && playbook.checklist.length > 0

  return (
    <div className="space-y-6">
      {/* Rules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ruleCards.map(({ key, label, icon: Icon }) => {
          const content = playbook[key]
          if (!content) return null

          return (
            <div
              key={key}
              className={cn(
                "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4",
                "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                  <Icon
                    size={18}
                    weight="regular"
                    className="text-[var(--accent-primary)]"
                  />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {label}
                </h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {content}
              </p>
            </div>
          )
        })}
      </div>

      {/* Checklist */}
      {hasChecklist && (
        <div
          className={cn(
            "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4",
            "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <ListChecks
                size={18}
                weight="regular"
                className="text-[var(--accent-primary)]"
              />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Pre-Trade Checklist
            </h3>
          </div>
          <ol className="space-y-2">
            {playbook.checklist.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="font-mono tabular-nums text-[var(--text-muted)] text-xs mt-0.5 w-5 text-right shrink-0">
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Notes placeholder */}
      {!playbook.market_conditions &&
        !playbook.entry_rules &&
        !playbook.exit_rules &&
        !playbook.risk_rules &&
        !hasChecklist && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <NoteBlank
              size={32}
              weight="thin"
              className="text-[var(--text-muted)] mb-3"
            />
            <p className="text-sm text-[var(--text-muted)]">
              No rules defined yet. Edit this playbook to add your strategy rules.
            </p>
          </div>
        )}
    </div>
  )
}
