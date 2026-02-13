"use client"

import { PelicanCard } from "@/components/ui/pelican-card"
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
    if (["A", "B"].some((v) => g.startsWith(v))) return "text-green-400 border-green-500/30 bg-green-500/10"
    if (g.startsWith("C")) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    return "text-red-400 border-red-500/30 bg-red-500/10"
  }

  return (
    <PelicanCard className="border-primary/20 bg-primary/5 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">AI Process Audit</h3>
          <p className="mt-1 font-mono text-[10px] uppercase text-primary">Institutional Grade Analysis</p>
        </div>
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl font-black shadow-[0_0_20px_rgba(168,85,247,0.2)]",
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
              <span className="text-xs font-semibold text-white/70">{d.label}</span>
              <span className={cn("text-xs font-mono font-bold", getGradeColor(d.grade).split(" ")[0])}>{d.grade}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/[0.05] bg-white/[0.03]">
              <div
                className="h-full bg-primary shadow-[0_0_10px_oklch(0.60_0.25_280)] transition-all duration-1000 ease-out"
                style={{ width: `${d.score}%` }}
              />
            </div>
            <p className="text-[10px] italic leading-relaxed text-muted-foreground/60">&ldquo;{d.note}&rdquo;</p>
          </div>
        ))}
      </div>
    </PelicanCard>
  )
}
