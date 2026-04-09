"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FlashIcon as Lightning,
  RefreshIcon as Refresh,
  MessageMultiple01Icon as ChatCircleDots,
} from "@hugeicons/core-free-icons"
import { createClient } from "@/lib/supabase/client"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { useTrades } from "@/hooks/use-trades"
import { useWatchlist } from "@/hooks/use-watchlist"
import { usePlaybooks } from "@/hooks/use-playbooks"
import { useTodaysWarnings } from "@/hooks/use-todays-warnings"
import { useTradePatterns } from "@/hooks/use-trade-patterns"
import { trackEvent } from "@/lib/tracking"

interface PelicanReadProps {
  onAnalyze: (ticker: string | null, prompt: string) => void
}

function extractDeskBullets(content: string): string[] {
  const cleanedLines = content
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•]|\d+\.)\s*/, "")
        .replace(/[*#_`]/g, "")
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !/^(pelican read|morning brief|open positions|watchlist|top movers|active playbooks|active trading warnings|detected trading patterns)$/i.test(line))

  const longLines = cleanedLines.filter((line) => line.length >= 28)
  if (longLines.length >= 3) return longLines.slice(0, 3)

  return content
    .replace(/[*#_`]/g, "")
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 28)
    .slice(0, 3)
}

export default function PelicanRead({ onAnalyze }: PelicanReadProps) {
  const [briefContent, setBriefContent] = useState("")
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [autoStarted, setAutoStarted] = useState(false)
  const { movers } = useMorningBrief()
  const { openTrades } = useTrades()
  const { items: watchlistItems } = useWatchlist()
  const { playbooks } = usePlaybooks()
  const { warnings } = useTodaysWarnings()
  const { patterns } = useTradePatterns()
  const supabase = useMemo(() => createClient(), [])
  const abortRef = useRef<AbortController | null>(null)

  const todayKey = useMemo(() => {
    return `pelican-brief-${new Date().toISOString().split("T")[0]}`
  }, [])

  const positionsSummary = useMemo(() => {
    if (openTrades.length === 0) return "No open positions"
    return openTrades.map((trade) => {
      return `${trade.direction.toUpperCase()} ${trade.ticker} @ ${trade.entry_price}${trade.stop_loss ? ` stop ${trade.stop_loss}` : ""}${trade.take_profit ? ` target ${trade.take_profit}` : ""}`
    }).join("\n")
  }, [openTrades])

  const watchlistSummary = useMemo(() => {
    if (watchlistItems.length === 0) return "No watchlist items"
    return watchlistItems.map((item) => item.ticker).join(", ")
  }, [watchlistItems])

  const moversSummary = useMemo(() => {
    return [...movers.gainers, ...movers.losers]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 10)
      .map((mover) => `${mover.ticker}: ${mover.changePercent >= 0 ? "+" : ""}${mover.changePercent.toFixed(1)}%`)
      .join(", ")
  }, [movers.gainers, movers.losers])

  const buildPrompt = useCallback(() => {
    let prompt = "Morning brief — key events this week, what's moving, and where are the major indices."

    prompt += `\n\nOPEN POSITIONS:\n${positionsSummary}`
    prompt += `\n\nWATCHLIST:\n${watchlistSummary}`
    prompt += `\n\nTOP MOVERS:\n${moversSummary || "No unusual movers yet"}`

    const customAlerts = watchlistItems.filter((item) => item.custom_prompt)
    if (customAlerts.length > 0) {
      prompt += "\n\nCUSTOM WATCHLIST ALERTS:\n"
      prompt += customAlerts.map((item) => `${item.ticker}: "${item.custom_prompt}"`).join("\n")
      prompt += "\nCheck these alert conditions and mention any names that are close."
    }

    if (warnings.length > 0) {
      prompt += "\n\nACTIVE TRADING WARNINGS:\n"
      prompt += warnings.map((warning) => `- [${warning.severity.toUpperCase()}] ${warning.title}: ${warning.message}`).join("\n")
      prompt += "\nFactor these warnings into the risk framing and the game plan."
    }

    if (patterns.length > 0) {
      prompt += "\n\nDETECTED TRADING PATTERNS:\n"
      prompt += patterns.map((pattern) => `- [${pattern.severity.toUpperCase()}] ${pattern.title}: ${pattern.description}`).join("\n")
      prompt += "\nCall out any critical pattern that matters for today's positioning."
    }

    if (playbooks.length > 0) {
      prompt += "\n\nACTIVE PLAYBOOKS:\n"
      prompt += playbooks
        .slice(0, 5)
        .map((playbook) => `- ${playbook.name}${playbook.timeframe ? ` (${playbook.timeframe})` : ""}: ${playbook.entry_rules || "No entry rules provided"}`)
        .join("\n")
      prompt += `\nUse the watchlist to highlight only genuine playbook matches.`
    }

    return prompt
  }, [moversSummary, patterns, playbooks, positionsSummary, warnings, watchlistItems, watchlistSummary])
  const briefBullets = useMemo(() => extractDeskBullets(briefContent), [briefContent])

  const generateBrief = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setBriefLoading(true)
    setBriefError(null)
    setBriefContent("")

    trackEvent({ eventType: "brief_opened", feature: "desk" })

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://pelican-backend.fly.dev"
    const prompt = buildPrompt()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`${backendUrl}/api/pelican_stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
          conversation_history: [],
          conversationId: null,
          files: [],
          timestamp: new Date().toISOString(),
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""
      let streamDone = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data: ")) continue

          const payload = trimmed.slice(6).trim()
          if (!payload) continue
          if (payload === "[DONE]") {
            streamDone = true
            continue
          }

          const parsed = JSON.parse(payload) as {
            delta?: string
            content?: string
            done?: boolean
            type?: string
            error?: string
            message?: string
          }

          if (parsed.error) {
            throw new Error(parsed.message || parsed.error)
          }

          if (parsed.done || parsed.type === "done") {
            streamDone = true
            continue
          }

          const chunk = parsed.delta || parsed.content
          if (chunk) {
            fullContent += chunk
            setBriefContent(fullContent)
          }
        }

        if (streamDone) break
      }

      localStorage.setItem(todayKey, fullContent)
    } catch (error) {
      if (controller.signal.aborted) return
      setBriefError("Failed to generate Pelican Read. Please try again.")
      // Pelican Read generation error — user sees briefError state
    } finally {
      setBriefLoading(false)
    }
  }, [buildPrompt, supabase, todayKey])

  useEffect(() => {
    const cached = localStorage.getItem(todayKey)
    if (cached) {
      setBriefContent(cached)
    }
  }, [todayKey])

  useEffect(() => {
    if (autoStarted || briefContent || briefLoading) return
    const cached = localStorage.getItem(todayKey)
    if (!cached) {
      setAutoStarted(true)
      void generateBrief()
    }
  }, [autoStarted, briefContent, briefLoading, generateBrief, todayKey])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return (
    <section className="border-b border-[var(--border-subtle)]">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Lightning} size={16} strokeWidth={1.8} color="currentColor" className="text-[var(--accent-primary)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">Pelican Read</span>
        </div>

        <button
          type="button"
          onClick={() => void generateBrief()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          aria-label="Regenerate Pelican Read"
        >
          <HugeiconsIcon icon={Refresh} size={16} strokeWidth={1.5} color="currentColor" className={briefLoading ? "animate-spin" : undefined} />
        </button>
      </div>

      <div className="px-3 pb-2">
        {briefError ? (
          <div className="flex items-center justify-between gap-2 rounded bg-[var(--data-negative)]/5 px-2 py-1.5">
            <p className="min-w-0 truncate text-[11px] text-[var(--data-negative)]">Failed to generate. Please try again.</p>
            <button
              type="button"
              onClick={() => void generateBrief()}
              className="flex-shrink-0 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:underline"
            >
              Retry
            </button>
          </div>
        ) : !briefContent && briefLoading ? (
          <div className="space-y-1.5 py-0.5">
            <div className="h-3 w-32 rounded bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-2.5 w-full rounded bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-2.5 w-[92%] rounded bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-2.5 w-[80%] rounded bg-[var(--bg-elevated)] animate-pulse" />
          </div>
        ) : briefBullets.length > 0 ? (
          <ul className="space-y-1">
            {briefBullets.map((bullet, index) => (
              <li key={`${bullet}-${index}`} className="flex items-start gap-2 text-xs leading-snug text-[var(--text-secondary)]">
                <span className="mt-1 h-1 w-1 flex-none rounded-full bg-[var(--data-warning)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-1 text-xs text-[var(--text-muted)]">
            {briefLoading ? "Pelican Read is updating..." : "Pelican Read is warming up."}
          </p>
        )}
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => onAnalyze(null, "Use today's Pelican Read as context and tell me the three highest-conviction takeaways for my positions, watchlist, and risk management today.")}
          className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <HugeiconsIcon icon={ChatCircleDots} size={16} strokeWidth={1.5} color="currentColor" />
          Discuss with Pelican
        </button>
      </div>
    </section>
  )
}
