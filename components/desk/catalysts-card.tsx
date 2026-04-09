"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useEconomicCalendar } from "@/hooks/use-economic-calendar"
import { useEnrichedEarnings } from "@/hooks/use-enriched-earnings"

interface CatalystsCardProps {
  onAnalyze: (ticker: string | null, prompt: string) => void
}

interface CatalystRow {
  id: string
  ticker: string | null
  time: string
  label: string
  prompt: string
  impact: "low" | "medium" | "high"
  sortKey: number
}

function formatEventTime(time: string): { label: string; sortKey: number } {
  if (!time) return { label: "TBD", sortKey: 720 }

  const [hours, minutes] = time.split(":").map(Number)
  if (hours == null || minutes == null || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { label: time, sortKey: 720 }
  }

  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return {
    label: `${hour12}:${String(minutes).padStart(2, "0")}`,
    sortKey: hours * 60 + minutes,
  }
}

function getEarningsImpact(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high"
  if (score >= 35) return "medium"
  return "low"
}

export default function CatalystsCard({ onAnalyze }: CatalystsCardProps) {
  const today = useMemo(() => new Date().toISOString().split("T")[0] ?? "", [])
  const { events: economicEvents, isLoading: economicLoading } = useEconomicCalendar({ from: today, to: today })
  const { events: earningsEvents, isLoading: earningsLoading } = useEnrichedEarnings({ from: today, to: today })

  const topEvents = useMemo(() => {
    const economicRows: CatalystRow[] = economicEvents
      .filter((event) => event.impact === "high" || event.impact === "medium")
      .map((event) => {
        const { label, sortKey } = formatEventTime(event.time)
        return {
          id: `economic-${event.event}-${event.time}`,
          ticker: null,
          time: label,
          label: event.event,
          impact: event.impact,
          sortKey,
          prompt: `Walk me through today's ${event.event} release${event.time ? ` at ${event.time} ET` : ""}. What matters most, what outcomes would move the market, and how should I frame the reaction if it hits or misses?`,
        }
      })
      .sort((a, b) => a.sortKey - b.sortKey)

    const earningsRows: CatalystRow[] = earningsEvents
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 4)
      .map((event) => {
        const session = event.hour === "bmo" ? "BMO" : event.hour === "amc" ? "AMC" : "DMH"
        const sortKey = event.hour === "bmo" ? 510 : event.hour === "amc" ? 960 : 720
        const impact = getEarningsImpact(event.impactScore)
        const company = event.name ? `${event.symbol} ${event.name}` : `${event.symbol} earnings`

        return {
          id: `earnings-${event.symbol}-${event.date}`,
          ticker: event.symbol,
          time: session,
          label: company,
          impact,
          sortKey,
          prompt: `Prepare me for ${event.symbol} earnings ${session === "BMO" ? "before the open" : session === "AMC" ? "after the close" : "during market hours"} today. What matters most, what is expected on EPS and revenue, and what kind of reaction would confirm strength or weakness?`,
        }
      })

    return [...economicRows.slice(0, 2), ...earningsRows.slice(0, 3)]
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(0, 4)
  }, [economicEvents, earningsEvents])

  return (
    <section className="border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Catalysts today</span>
      </div>

      <div className="space-y-0.5 px-3 pb-2">
        {economicLoading || earningsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 rounded px-1.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
              <div className="h-2.5 w-6 rounded bg-[var(--bg-elevated)] animate-pulse" />
              <div className="h-2.5 w-full rounded bg-[var(--bg-elevated)] animate-pulse" />
            </div>
          ))
        ) : topEvents.length > 0 ? (
          topEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onAnalyze(event.ticker, event.prompt)}
              className="flex w-full items-center gap-2 rounded px-1.5 py-0.5 text-left transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                  event.impact === "high"
                    ? "bg-[var(--data-negative)]"
                    : event.impact === "medium"
                      ? "bg-[var(--data-warning)]"
                      : "bg-[var(--text-muted)]"
                )}
              />
              <span className="w-8 flex-shrink-0 font-[var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">
                {event.time}
              </span>
              <span className="truncate text-xs text-[var(--text-secondary)]">{event.label}</span>
            </button>
          ))
        ) : (
          <p className="px-1.5 py-1 text-xs text-[var(--text-muted)]">Quiet tape so far — no major catalysts on deck.</p>
        )}
      </div>
    </section>
  )
}
