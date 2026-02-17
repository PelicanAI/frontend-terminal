"use client"

import { PelicanCard } from "@/components/ui/pelican"
import { cn } from "@/lib/utils"

interface GradeDimension {
  label: string
  grade: string
  score: number
  note: string
}

interface AIGradeCardProps {
  overall: string
  dimensions: GradeDimension[]
}

export function AIGradeCard({ overall, dimensions }: AIGradeCardProps) {
  const getGradeColor = (g: string) => {
    if (["A", "B"].some((v) => g.startsWith(v))) return "text-[var(--data-positive)] border-[var(--data-positive)]/30 bg-[var(--data-positive)]/10"
    if (g.startsWith("C")) return "text-[var(--data-warning)] border-[var(--data-warning)]/30 bg-[var(--data-warning)]/10"
    return "text-[var(--data-negative)] border-[var(--data-negative)]/30 bg-[var(--data-negative)]/10"
  }

  return (
    <PelicanCard className="border-[var(--accent-primary)]/20 bg-[var(--accent-glow)] p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium">AI Process Audit</h3>
          <p className="mt-1 font-mono text-[10px] uppercase text-[var(--accent-primary)]">Institutional Grade Analysis</p>
        </div>
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl font-black font-mono shadow-[0_0_20px_rgba(139,92,246,0.2)]",
            getGradeColor(overall)
          )}
        >
          {overall}
        </div>
      </div>

      <div className="space-y-6">
        {dimensions.map((d) => (
          <div key={d.label} className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{d.label}</span>
              <span className={cn("text-xs font-mono font-bold tabular-nums", getGradeColor(d.grade).split(" ")[0])}>{d.grade}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div
                className="h-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)] transition-all duration-1000 ease-out"
                style={{ width: `${d.score}%` }}
              />
            </div>
            <p className="text-[10px] italic leading-relaxed text-[var(--text-muted)]">&ldquo;{d.note}&rdquo;</p>
          </div>
        ))}
      </div>
    </PelicanCard>
  )
}
