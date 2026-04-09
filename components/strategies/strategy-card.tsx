"use client"

import Link from "next/link"
import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  StarIcon as Star,
  UserMultipleIcon as Users,
  SecurityCheckIcon as ShieldCheck,
  FlashIcon as Lightning,
  CheckmarkCircle01Icon as CheckCircle,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { staggerItem } from "@/components/ui/pelican"
import type { Playbook } from "@/types/trading"

const CATEGORY_COLORS: Record<string, string> = {
  momentum: "bg-blue-500/15 text-blue-400",
  mean_reversion: "bg-emerald-500/15 text-emerald-400",
  event_driven: "bg-amber-500/15 text-amber-400",
  options: "bg-rose-500/15 text-rose-400",
}

const CATEGORY_LABELS: Record<string, string> = {
  momentum: "Momentum",
  mean_reversion: "Mean Reversion",
  event_driven: "Event-Driven",
  options: "Options",
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-400",
  intermediate: "text-amber-400",
  advanced: "text-rose-400",
}

interface StrategyCardProps {
  strategy: Playbook
  isAdopted?: boolean
}

export function StrategyCard({ strategy, isAdopted }: StrategyCardProps) {
  const categoryColor = CATEGORY_COLORS[strategy.category || ''] || "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
  const categoryLabel = CATEGORY_LABELS[strategy.category || ''] || strategy.setup_type

  return (
    <Link href={`/strategies/${strategy.slug}`}>
      <m.div
        variants={staggerItem}
        whileHover={{
          y: -1,
          boxShadow: "0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.15)",
          borderColor: "rgba(255,255,255,0.15)",
          transition: { duration: 0.15, ease: "easeOut" as const },
        }}
        whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        className={cn(
          "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5",
          "cursor-pointer transition-colors duration-150",
          "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.1)]"
        )}
      >
        {/* Top row: category + difficulty */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md", categoryColor)}>
            {categoryLabel}
          </span>
          <div className="flex items-center gap-2">
            {strategy.is_curated && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--accent-primary)]">
                <HugeiconsIcon icon={Lightning} size={12} strokeWidth={1.5} color="currentColor" />
                Curated
              </span>
            )}
            {strategy.difficulty && (
              <span className={cn("text-[10px] font-medium capitalize", DIFFICULTY_COLORS[strategy.difficulty])}>
                {strategy.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
          {strategy.name}
        </h3>

        {/* Description */}
        {strategy.description ? (
          <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
            {strategy.description}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <HugeiconsIcon icon={Users} size={13} strokeWidth={1.5} color="currentColor" />
            <span className="font-mono tabular-nums">{strategy.adoption_count}</span>
          </div>
          {strategy.community_rating != null && strategy.rating_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <HugeiconsIcon icon={Star} size={13} className="text-amber-400" strokeWidth={1.5} color="currentColor" />
              <span className="font-mono tabular-nums">{strategy.community_rating.toFixed(1)}</span>
              <span className="text-[var(--text-disabled)]">({strategy.rating_count})</span>
            </div>
          )}
          {strategy.stats_verified && (
            <div className="flex items-center gap-1 text-xs text-[var(--data-positive)]">
              <HugeiconsIcon icon={ShieldCheck} size={13} strokeWidth={1.5} color="currentColor" />
              <span>Verified</span>
            </div>
          )}
          {isAdopted && (
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <HugeiconsIcon icon={CheckCircle} size={12} strokeWidth={1.5} color="currentColor" />
              <span>In playbooks</span>
            </div>
          )}
          {strategy.win_rate != null && strategy.stats_trade_count >= 10 && (
            <div className="ml-auto text-xs font-mono tabular-nums" style={{ color: (strategy.win_rate ?? 0) >= 50 ? 'var(--data-positive)' : 'var(--data-negative)' }}>
              {strategy.win_rate.toFixed(0)}% WR
            </div>
          )}
        </div>
      </m.div>
    </Link>
  )
}
