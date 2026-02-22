"use client"

import { motion } from "framer-motion"
import { CheckSquare } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { staggerItem } from "@/components/ui/pelican"
import type { Playbook } from "@/types/trading"

interface PlaybookCardProps {
  playbook: Playbook
  onClick: (playbook: Playbook) => void
}

const MARKET_COLORS: Record<string, string> = {
  stocks: "bg-blue-500/15 text-blue-400",
  forex: "bg-emerald-500/15 text-emerald-400",
  crypto: "bg-amber-500/15 text-amber-400",
  futures: "bg-rose-500/15 text-rose-400",
  all: "bg-[var(--accent-muted)] text-[var(--accent-primary)]",
}

function formatSetupType(type: string): string {
  return type
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function PlaybookCard({ playbook, onClick }: PlaybookCardProps) {
  const hasStats = playbook.total_trades > 0
  const winRate = playbook.win_rate ?? 0
  const checklistCount = playbook.checklist?.length ?? 0

  // Determine market type from setup or default
  const marketType = "all"
  const marketColor = MARKET_COLORS[marketType] ?? MARKET_COLORS.all

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{
        y: -1,
        boxShadow: "0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.15)",
        borderColor: "rgba(255,255,255,0.15)",
        transition: { duration: 0.15, ease: "easeOut" as const },
      }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      onClick={() => onClick(playbook)}
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5",
        "cursor-pointer transition-colors duration-150",
        "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
      )}
    >
      {/* Top row: badge + timeframe */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md",
            marketColor
          )}
        >
          {formatSetupType(playbook.setup_type)}
        </span>

        {playbook.timeframe && (
          <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
            {playbook.timeframe}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-primary)] transition-colors line-clamp-1">
        {playbook.name}
      </h3>

      {/* Description */}
      {playbook.description ? (
        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
          {playbook.description}
        </p>
      ) : (
        <div className="mb-4" />
      )}

      {/* Stats row or empty message */}
      {hasStats ? (
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <StatCell
            label="Trades"
            value={String(playbook.total_trades)}
          />
          <StatCell
            label="Win %"
            value={`${winRate.toFixed(0)}%`}
            color={winRate >= 50 ? "var(--data-positive)" : "var(--data-negative)"}
          />
          <StatCell
            label="Avg R"
            value={
              playbook.avg_r_multiple != null
                ? `${playbook.avg_r_multiple >= 0 ? "+" : ""}${playbook.avg_r_multiple.toFixed(1)}`
                : "--"
            }
            color={
              playbook.avg_r_multiple != null
                ? playbook.avg_r_multiple >= 0
                  ? "var(--data-positive)"
                  : "var(--data-negative)"
                : undefined
            }
          />
          <StatCell
            label="Win/Loss"
            value={`${playbook.winning_trades}/${playbook.total_trades - playbook.winning_trades}`}
          />
        </div>
      ) : (
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-xs italic text-[var(--text-muted)]">
            No trades tagged yet
          </span>
          {checklistCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <CheckSquare size={14} weight="regular" />
              <span className="font-mono tabular-nums">{checklistCount}</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="text-center">
      <div
        className="text-sm font-mono tabular-nums font-semibold"
        style={color ? { color } : { color: "var(--text-primary)" }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
    </div>
  )
}
