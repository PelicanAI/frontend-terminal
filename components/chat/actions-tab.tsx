"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { m, AnimatePresence } from "framer-motion"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ChartLineData01Icon as ChartLineUp,
  Briefcase01Icon as Briefcase,
  SecurityCheckIcon as ShieldCheck,
  BalanceScaleIcon as Scales,
  Mortarboard01Icon as GraduationCap,
  BarChartIcon as ChartBar,
  ArrowDown01Icon as CaretDown,
  ArrowRight01Icon as CaretRight,
  ArrowRight01Icon as ArrowRight,
  Alert01Icon as Warning,
} from "@hugeicons/core-free-icons"
import { PelicanButton } from "@/components/ui/pelican"
import { useAntiTradeCheck, type AntiTradeWarning } from "@/hooks/use-anti-trade-check"
import { cn } from "@/lib/utils"
import type { Trade } from "@/hooks/use-trades"

// ============================================================================
// Types
// ============================================================================

type ActionKey = "analyze" | "scan" | "pretrade" | "compare" | "learn" | "review"

interface ActionDef {
  key: ActionKey
  icon: IconSvgElement
  label: string
  description: string
  requiresTrades?: boolean
}

interface ActionsTabProps {
  onSend: (message: string) => void
  onFocusInput?: () => void
  openTrades: Trade[]
  disabled?: boolean
}

// ============================================================================
// Action definitions
// ============================================================================

const ACTIONS: ActionDef[] = [
  {
    key: "analyze",
    icon: ChartLineUp,
    label: "Analyze",
    description: "Technical analysis on any ticker",
  },
  {
    key: "scan",
    icon: Briefcase,
    label: "Scan Position",
    description: "Review an open position",
    requiresTrades: true,
  },
  {
    key: "pretrade",
    icon: ShieldCheck,
    label: "Pre-Trade Check",
    description: "Validate before you enter",
  },
  {
    key: "compare",
    icon: Scales,
    label: "Compare",
    description: "Head-to-head ticker comparison",
  },
  {
    key: "learn",
    icon: GraduationCap,
    label: "Learn",
    description: "Explain any trading concept",
  },
  {
    key: "review",
    icon: ChartBar,
    label: "Review My Trading",
    description: "Analyze your patterns and performance",
  },
]

// ============================================================================
// Main component
// ============================================================================

export function ActionsTab({ onSend, onFocusInput, openTrades, disabled = false }: ActionsTabProps) {
  const [expanded, setExpanded] = useState<ActionKey | null>(null)

  const visibleActions = ACTIONS.filter(
    (a) => !a.requiresTrades || openTrades.length > 0
  )

  const handleSend = useCallback((message: string) => {
    onSend(message)
    setExpanded(null)
  }, [onSend])

  return (
    <div className="p-3 space-y-2 overflow-y-auto h-full">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 px-1">
        Pelican Actions
      </h4>
      {visibleActions.map((action) => (
        <ActionCard
          key={action.key}
          action={action}
          isExpanded={expanded === action.key}
          onToggle={() => setExpanded(expanded === action.key ? null : action.key)}
          onSend={handleSend}
          onFocusInput={onFocusInput}
          openTrades={openTrades}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

// ============================================================================
// ActionCard
// ============================================================================

function ActionCard({
  action,
  isExpanded,
  onToggle,
  onSend,
  onFocusInput,
  openTrades,
  disabled,
}: {
  action: ActionDef
  isExpanded: boolean
  onToggle: () => void
  onSend: (message: string) => void
  onFocusInput?: () => void
  openTrades: Trade[]
  disabled: boolean
}) {
  const Icon = action.icon

  const handleClick = () => {
    if (disabled) return

    if (action.key === "review") {
      onSend('Analyze my recent trading behavior. Look at my win rate, risk management, streaks, and any patterns you notice. Give me specific, actionable feedback.')
      return
    }
    onToggle()
  }

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        isExpanded
          ? "bg-[var(--bg-elevated)] border-[var(--accent-primary)]/20 shadow-sm"
          : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
      >
        <div
          className={cn(
            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200",
            isExpanded
              ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
              : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
          )}
        >
          <HugeiconsIcon icon={Icon} size={16} strokeWidth={isExpanded ? 2 : 1.5} color="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium transition-colors duration-200",
              isExpanded ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
            )}
          >
            {action.label}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] leading-snug mt-0.5 truncate">
            {action.description}
          </p>
        </div>
        {action.key !== "review" && (
          <div className="shrink-0 text-[var(--text-muted)]">
            {isExpanded ? (
              <HugeiconsIcon icon={CaretDown} size={14} strokeWidth={1.5} color="currentColor" />
            ) : (
              <HugeiconsIcon icon={CaretRight} size={14} strokeWidth={1.5} color="currentColor" />
            )}
          </div>
        )}
      </button>

      <AnimatePresence mode="wait">
        {isExpanded && action.key !== "review" && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <ExpanderContent
                  actionKey={action.key}
                  onSend={onSend}
                  openTrades={openTrades}
                />
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// ExpanderContent router
// ============================================================================

function ExpanderContent({
  actionKey,
  onSend,
  openTrades,
}: {
  actionKey: ActionKey
  onSend: (message: string) => void
  openTrades: Trade[]
}) {
  switch (actionKey) {
    case "analyze":
      return <AnalyzeForm onSend={onSend} />
    case "scan":
      return <ScanForm onSend={onSend} openTrades={openTrades} />
    case "pretrade":
      return <PreTradeForm onSend={onSend} />
    case "compare":
      return <CompareForm onSend={onSend} />
    case "learn":
      return <LearnForm onSend={onSend} />
    default:
      return null
  }
}

// ============================================================================
// Shared input class
// ============================================================================

const inputClass =
  "w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"

// ============================================================================
// AnalyzeForm
// ============================================================================

function AnalyzeForm({ onSend }: { onSend: (msg: string) => void }) {
  const [ticker, setTicker] = useState("")
  const [timeframe, setTimeframe] = useState("daily")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    onSend(`Analyze ${t} on the ${timeframe} chart. Key levels, trend, and setup quality.`)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Ticker (e.g. AAPL)"
        maxLength={10}
        className={inputClass}
      />
      <select
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value)}
        className={inputClass}
      >
        <option value="5min">5 Min</option>
        <option value="15min">15 Min</option>
        <option value="1hr">1 Hour</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      <PelicanButton className="w-full" size="sm" onClick={handleSubmit} disabled={!ticker.trim()}>
        <span className="flex items-center justify-center gap-1.5">
          Analyze <HugeiconsIcon icon={ArrowRight} size={14} strokeWidth={2} color="currentColor" />
        </span>
      </PelicanButton>
    </div>
  )
}

// ============================================================================
// ScanForm
// ============================================================================

function ScanForm({ onSend, openTrades }: { onSend: (msg: string) => void; openTrades: Trade[] }) {
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
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[var(--text-muted)]">Select a position to scan:</p>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {openTrades.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase",
                  t.direction === "long"
                    ? "bg-[var(--data-positive)]/10 text-[var(--data-positive)]"
                    : "bg-[var(--data-negative)]/10 text-[var(--data-negative)]"
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
    </div>
  )
}

// ============================================================================
// PreTradeForm
// ============================================================================

function PreTradeForm({ onSend }: { onSend: (msg: string) => void }) {
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
  }, [ticker, direction, isReady, checkTrade, onSend])

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleCheck()}
        placeholder="Ticker"
        maxLength={10}
        className={inputClass}
      />
      <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
        <button
          onClick={() => setDirection("long")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
            direction === "long"
              ? "bg-[var(--data-positive)]/15 text-[var(--data-positive)]"
              : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
          )}
        >
          Long
        </button>
        <button
          onClick={() => setDirection("short")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
            direction === "short"
              ? "bg-[var(--data-negative)]/15 text-[var(--data-negative)]"
              : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
          )}
        >
          Short
        </button>
      </div>
      <PelicanButton className="w-full" size="sm" onClick={handleCheck} disabled={!ticker.trim()}>
        <span className="flex items-center justify-center gap-1.5">
          Check <HugeiconsIcon icon={ArrowRight} size={14} strokeWidth={2} color="currentColor" />
        </span>
      </PelicanButton>
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-2 rounded-lg text-xs",
                w.severity === "critical"
                  ? "bg-[var(--data-negative)]/[0.08]"
                  : "bg-[var(--data-warning)]/[0.08]"
              )}
            >
              <HugeiconsIcon icon={Warning} size={14} className={
                  w.severity === "critical"
                    ? "text-[var(--data-negative)] shrink-0 mt-0.5"
                    : "text-[var(--data-warning)] shrink-0 mt-0.5"
                } strokeWidth={2} color="currentColor" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">{w.title}</p>
                <p className="text-[var(--text-muted)] mt-0.5">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CompareForm
// ============================================================================

function CompareForm({ onSend }: { onSend: (msg: string) => void }) {
  const [tickerA, setTickerA] = useState("")
  const [tickerB, setTickerB] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const a = tickerA.trim().toUpperCase()
    const b = tickerB.trim().toUpperCase()
    if (!a || !b) return
    onSend(`Compare ${a} vs ${b}. Technicals, fundamentals, momentum, and which is the better trade right now.`)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={tickerA}
        onChange={(e) => setTickerA(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Ticker A"
        maxLength={10}
        className={inputClass}
      />
      <p className="text-xs text-[var(--text-muted)] font-medium text-center">vs</p>
      <input
        type="text"
        value={tickerB}
        onChange={(e) => setTickerB(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Ticker B"
        maxLength={10}
        className={inputClass}
      />
      <PelicanButton className="w-full" size="sm" onClick={handleSubmit} disabled={!tickerA.trim() || !tickerB.trim()}>
        <span className="flex items-center justify-center gap-1.5">
          Compare <HugeiconsIcon icon={ArrowRight} size={14} strokeWidth={2} color="currentColor" />
        </span>
      </PelicanButton>
    </div>
  )
}

// ============================================================================
// LearnForm
// ============================================================================

function LearnForm({ onSend }: { onSend: (msg: string) => void }) {
  const [topic, setTopic] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = () => {
    const t = topic.trim()
    if (!t) return
    onSend(`Explain ${t} like I'm a beginner trader. Use simple language, give examples, and tell me why it matters.`)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="What do you want to learn? (e.g. RSI, options Greeks)"
        className={inputClass}
      />
      <PelicanButton className="w-full" size="sm" onClick={handleSubmit} disabled={!topic.trim()}>
        <span className="flex items-center justify-center gap-1.5">
          Learn <HugeiconsIcon icon={ArrowRight} size={14} strokeWidth={2} color="currentColor" />
        </span>
      </PelicanButton>
    </div>
  )
}
