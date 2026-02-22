"use client"

import { Sparkle, Lock } from "@phosphor-icons/react"
import { PelicanButton } from "@/components/ui/pelican"
import type { Playbook } from "@/types/trading"
import type { PlaybookStats } from "@/hooks/use-playbooks"

interface PlaybookGradeTabProps {
  playbook: Playbook
  stats: PlaybookStats | null
  onGrade: () => void
}

const MIN_TRADES_FOR_GRADE = 3

export function PlaybookGradeTab({
  playbook,
  stats,
  onGrade,
}: PlaybookGradeTabProps) {
  const tradeCount = stats?.totalTrades ?? playbook.total_trades
  const canGrade = tradeCount >= MIN_TRADES_FOR_GRADE

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center mb-6">
        <Sparkle
          size={32}
          weight="fill"
          className="text-[var(--accent-primary)]"
        />
      </div>

      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        Grade with Pelican
      </h3>

      <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
        {canGrade
          ? `Pelican will analyze your "${playbook.name}" playbook across ${tradeCount} trades. You'll get a compliance grade (A-F), pattern analysis, and specific improvement recommendations.`
          : `You need at least ${MIN_TRADES_FOR_GRADE} closed trades tagged with this setup type before Pelican can grade your playbook. Currently: ${tradeCount} trades.`}
      </p>

      <PelicanButton
        variant="primary"
        size="lg"
        onClick={onGrade}
        disabled={!canGrade}
      >
        {canGrade ? (
          <>
            <Sparkle size={16} weight="bold" />
            Grade my playbook
          </>
        ) : (
          <>
            <Lock size={16} weight="regular" />
            Need {MIN_TRADES_FOR_GRADE - tradeCount} more trades
          </>
        )}
      </PelicanButton>
    </div>
  )
}
