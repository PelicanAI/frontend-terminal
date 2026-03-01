// DEPRECATED: Actions moved to sidebar actions-tab.tsx — safe to delete
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PelicanButton } from "@/components/ui/pelican"
import { ArrowRight, Warning } from "@phosphor-icons/react"
import { useAntiTradeCheck, type AntiTradeWarning } from "@/hooks/use-anti-trade-check"
import { cn } from "@/lib/utils"
import type { Trade } from "@/hooks/use-trades"

// ============================================================================
// Types
// ============================================================================

export type ExpanderKey = "analyze" | "scan" | "pretrade" | "compare" | "learn"

interface ExpanderBaseProps {
  onSend: (message: string) => void
  onClose: () => void
}

// ============================================================================
// Shared wrapper
// ============================================================================

function ExpanderShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid closing on the same click that opened
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handler)
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 mb-2">
        {children}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Analyze Expander
// ============================================================================

function AnalyzeExpander({ onSend, onClose }: ExpanderBaseProps) {
  const [ticker, setTicker] = useState("")
  const [timeframe, setTimeframe] = useState("daily")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    onSend(`Analyze ${t} on the ${timeframe} chart. Key levels, trend, and setup quality.`)
    onClose()
  }

  return (
    <ExpanderShell onClose={onClose}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ticker (e.g. AAPL)"
          maxLength={10}
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        >
          <option value="5min">5 Min</option>
          <option value="15min">15 Min</option>
          <option value="1hr">1 Hour</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <PelicanButton size="sm" onClick={handleSubmit} disabled={!ticker.trim()}>
          <ArrowRight size={14} weight="bold" />
        </PelicanButton>
      </div>
    </ExpanderShell>
  )
}

// ============================================================================
// Scan Expander
// ============================================================================

function ScanExpander({
  onSend,
  onClose,
  openTrades,
}: ExpanderBaseProps & { openTrades: Trade[] }) {
  const handleSelect = (trade: Trade) => {
    const prompt = [
      `Scan my ${trade.direction} position in ${trade.ticker}.`,
      `Entry: $${trade.entry_price}`,
      trade.stop_loss ? `Stop: $${trade.stop_loss}` : null,
      trade.take_profit ? `Target: $${trade.take_profit}` : null,
      trade.thesis ? `Thesis: "${trade.thesis}"` : null,
      "Give me updated analysis: price action, key levels, news catalysts, and whether to hold, trim, or exit.",
    ]
      .filter(Boolean)
      .join(" ")
    onSend(prompt)
    onClose()
  }

  return (
    <ExpanderShell onClose={onClose}>
      <p className="text-xs text-[var(--text-muted)] mb-2">Select a position to scan:</p>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {openTrades.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-surface)] transition-all text-left"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase",
                  t.direction === "long"
                    ? "bg-[var(--data-positive)]/10 text-[var(--data-positive)]"
                    : "bg-[var(--data-negative)]/10 text-[var(--data-negative)]",
                )}
              >
                {t.direction}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{t.ticker}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
              ${t.entry_price.toFixed(2)}
            </span>
          </button>
        ))}
      </div>
    </ExpanderShell>
  )
}

// ============================================================================
// Pre-Trade Check Expander
// ============================================================================

function PreTradeExpander({ onSend, onClose }: ExpanderBaseProps) {
  const [ticker, setTicker] = useState("")
  const [direction, setDirection] = useState<"long" | "short">("long")
  const [warnings, setWarnings] = useState<AntiTradeWarning[]>([])
  const { checkTrade, isReady } = useAntiTradeCheck()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleCheck = useCallback(() => {
    const t = ticker.trim().toUpperCase()
    if (!t) return

    if (isReady) {
      const w = checkTrade(t, direction)
      setWarnings(w)
    }

    const prompt = `Pre-trade check: I want to go ${direction} on ${t}. Check the chart, my history with this ticker, current market conditions, and tell me if this is a good setup. Be honest.`
    onSend(prompt)
    onClose()
  }, [ticker, direction, isReady, checkTrade, onSend, onClose])

  return (
    <ExpanderShell onClose={onClose}>
      <div className="flex items-center gap-2 mb-2">
        <input
          ref={inputRef}
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="Ticker"
          maxLength={10}
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
          <button
            onClick={() => setDirection("long")}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors",
              direction === "long"
                ? "bg-[var(--data-positive)]/15 text-[var(--data-positive)]"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)]",
            )}
          >
            Long
          </button>
          <button
            onClick={() => setDirection("short")}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors",
              direction === "short"
                ? "bg-[var(--data-negative)]/15 text-[var(--data-negative)]"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)]",
            )}
          >
            Short
          </button>
        </div>
        <PelicanButton size="sm" onClick={handleCheck} disabled={!ticker.trim()}>
          <ArrowRight size={14} weight="bold" />
        </PelicanButton>
      </div>
      {warnings.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-2 rounded-lg text-xs",
                w.severity === "critical"
                  ? "bg-[var(--data-negative)]/[0.08]"
                  : "bg-[var(--data-warning)]/[0.08]",
              )}
            >
              <Warning
                size={14}
                weight="bold"
                className={
                  w.severity === "critical"
                    ? "text-[var(--data-negative)] shrink-0 mt-0.5"
                    : "text-[var(--data-warning)] shrink-0 mt-0.5"
                }
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">{w.title}</p>
                <p className="text-[var(--text-muted)] mt-0.5">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpanderShell>
  )
}

// ============================================================================
// Compare Expander
// ============================================================================

function CompareExpander({ onSend, onClose }: ExpanderBaseProps) {
  const [tickerA, setTickerA] = useState("")
  const [tickerB, setTickerB] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const a = tickerA.trim().toUpperCase()
    const b = tickerB.trim().toUpperCase()
    if (!a || !b) return
    onSend(`Compare ${a} vs ${b}. Technicals, fundamentals, momentum, and which is the better trade right now.`)
    onClose()
  }

  return (
    <ExpanderShell onClose={onClose}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={tickerA}
          onChange={(e) => setTickerA(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ticker A"
          maxLength={10}
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <span className="text-xs text-[var(--text-muted)] font-medium">vs</span>
        <input
          type="text"
          value={tickerB}
          onChange={(e) => setTickerB(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ticker B"
          maxLength={10}
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <PelicanButton size="sm" onClick={handleSubmit} disabled={!tickerA.trim() || !tickerB.trim()}>
          <ArrowRight size={14} weight="bold" />
        </PelicanButton>
      </div>
    </ExpanderShell>
  )
}

// ============================================================================
// Learn Expander
// ============================================================================

function LearnExpander({ onSend, onClose }: ExpanderBaseProps) {
  const [topic, setTopic] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const t = topic.trim()
    if (!t) return
    onSend(`Explain ${t} like I'm a beginner trader. Use simple language, give examples, and tell me why it matters.`)
    onClose()
  }

  return (
    <ExpanderShell onClose={onClose}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="What do you want to learn? (e.g. RSI, options Greeks)"
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <PelicanButton size="sm" onClick={handleSubmit} disabled={!topic.trim()}>
          <ArrowRight size={14} weight="bold" />
        </PelicanButton>
      </div>
    </ExpanderShell>
  )
}

// ============================================================================
// Main Expanders Container
// ============================================================================

interface ActionExpandersProps {
  active: ExpanderKey | null
  onClose: () => void
  onSend: (message: string) => void
  openTrades: Trade[]
}

export function ActionExpanders({ active, onClose, onSend, openTrades }: ActionExpandersProps) {
  return (
    <AnimatePresence mode="wait">
      {active === "analyze" && <AnalyzeExpander key="analyze" onSend={onSend} onClose={onClose} />}
      {active === "scan" && (
        <ScanExpander key="scan" onSend={onSend} onClose={onClose} openTrades={openTrades} />
      )}
      {active === "pretrade" && <PreTradeExpander key="pretrade" onSend={onSend} onClose={onClose} />}
      {active === "compare" && <CompareExpander key="compare" onSend={onSend} onClose={onClose} />}
      {active === "learn" && <LearnExpander key="learn" onSend={onSend} onClose={onClose} />}
    </AnimatePresence>
  )
}
