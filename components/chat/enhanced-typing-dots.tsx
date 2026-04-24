"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { m, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { messageVariants } from "@/lib/animation-config"

// ─── Category definitions ─────────────────────────────────────
type Category = "backtest" | "technical" | "tick" | "scan" | "macro" | "default"

interface TimedMessage {
  /** Seconds threshold — message shows when elapsed >= this value */
  after: number
  text: string
}

const THINKING_MESSAGES: Record<Category, TimedMessage[]> = {
  backtest: [
    { after: 0, text: "Reading the setup" },
    { after: 2, text: "Finding historical matches" },
    { after: 6, text: "Running the backtest" },
    { after: 12, text: "Computing the stats" },
    { after: 20, text: "Drafting the call" },
    { after: 35, text: "Almost there" },
  ],
  technical: [
    { after: 0, text: "Reading your chart question" },
    { after: 2, text: "Pulling price snapshots" },
    { after: 6, text: "Scanning the tape" },
    { after: 12, text: "Cross-checking levels" },
    { after: 20, text: "Drafting the call" },
    { after: 35, text: "Almost there" },
  ],
  tick: [
    { after: 0, text: "Reading your ticker" },
    { after: 2, text: "Fetching the quote" },
    { after: 6, text: "Checking session data" },
    { after: 12, text: "Comparing recent range" },
    { after: 20, text: "Drafting the snapshot" },
    { after: 35, text: "Almost there" },
  ],
  scan: [
    { after: 0, text: "Reading your scan" },
    { after: 2, text: "Pulling market snapshots" },
    { after: 6, text: "Filtering the tape" },
    { after: 12, text: "Ranking the matches" },
    { after: 20, text: "Drafting the shortlist" },
    { after: 35, text: "Almost there" },
  ],
  macro: [
    { after: 0, text: "Reading the macro question" },
    { after: 2, text: "Checking market pulse" },
    { after: 6, text: "Reading recent headlines" },
    { after: 12, text: "Cross-checking the thesis" },
    { after: 20, text: "Drafting the view" },
    { after: 35, text: "Almost there" },
  ],
  default: [
    { after: 0, text: "Reading your question" },
    { after: 2, text: "Pulling market snapshots" },
    { after: 6, text: "Scanning the tape" },
    { after: 12, text: "Cross-checking the thesis" },
    { after: 20, text: "Drafting the call" },
    { after: 35, text: "Almost there" },
  ],
}

const EXPECTED_DURATION_SECONDS = 25

// ─── Keyword → category mapping (priority: backtest > technical > tick > scan > macro > default) ──
const CATEGORY_KEYWORDS: { category: Category; patterns: RegExp }[] = [
  {
    category: "backtest",
    patterns: /backtest|back\s*test|historical\s*performance|simulate|strategy\s*test/i,
  },
  {
    category: "technical",
    patterns: /technical|support|resistance|rsi|macd|moving\s*average|sma|ema|bollinger|fibonacci|chart|pattern|candlestick|indicator|oversold|overbought/i,
  },
  {
    category: "tick",
    patterns: /price\s*of|how\s*much\s*is|quote|what('s|\s*is)\s*\w{1,5}\s*(at|trading|worth|price)|current\s*price|stock\s*price|ticker/i,
  },
  {
    category: "scan",
    patterns: /top\s*gain|top\s*los|most\s*volatile|scan|screen|filter|best\s*stock|worst\s*stock|biggest\s*mov|trending\s*stock/i,
  },
  {
    category: "macro",
    patterns: /market\s*(down|up|crash|rally)|economy|fed|fomc|cpi|inflation|gdp|jobs\s*report|nfp|interest\s*rate|recession|macro|news|headline|earnings\s*season/i,
  },
]

/** Detect the best category for a user message. */
export function getThinkingCategory(userMessage: string): Category {
  if (!userMessage) return "default"
  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.test(userMessage)) return category
  }
  return "default"
}

/** Get the current thinking message for a category + elapsed seconds. */
function getCurrentMessage(category: Category, elapsedSeconds: number): string {
  const messages = THINKING_MESSAGES[category] ?? THINKING_MESSAGES.default
  let current = messages[0]!.text
  for (const msg of messages) {
    if (elapsedSeconds >= msg.after) current = msg.text
  }
  return current
}

// ─── Component ────────────────────────────────────────────────
interface EnhancedTypingDotsProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "thinking" | "processing"
  /** The user's last message — used for context-aware thinking text */
  userMessage?: string
  /** Elapsed seconds from the response timer */
  elapsedSeconds?: number
  /** Hide the Pelican sigil if the surrounding row already renders it. */
  hideSigil?: boolean
  /** Hide the timer in compact inline contexts. */
  hideTimer?: boolean
}

export function EnhancedTypingDots({
  className,
  size = "md",
  variant = "default",
  userMessage = "",
  elapsedSeconds = 0,
  hideSigil = false,
  hideTimer = false,
}: EnhancedTypingDotsProps) {
  const shouldReduceMotion = useReducedMotion()
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }

  // Determine category once when userMessage changes
  const categoryRef = useRef<Category>("default")
  const prevMessageRef = useRef(userMessage)
  if (userMessage !== prevMessageRef.current) {
    categoryRef.current = getThinkingCategory(userMessage)
    prevMessageRef.current = userMessage
  }

  const [displayText, setDisplayText] = useState(() =>
    getCurrentMessage(categoryRef.current, elapsedSeconds)
  )

  // Update displayed text as elapsed seconds change
  useEffect(() => {
    const next = getCurrentMessage(categoryRef.current, elapsedSeconds)
    setDisplayText(next)
  }, [elapsedSeconds])

  // Fallback for non-context-aware usage
  const fallbackMessages: Record<NonNullable<EnhancedTypingDotsProps["variant"]>, string> = {
    default: "Pelican is typing",
    thinking: "Pelican is thinking",
    processing: "Processing your request",
  }

  const showContextAware = variant === "thinking" && userMessage
  const text = showContextAware ? displayText : fallbackMessages[variant]
  const progressPct = Math.min(elapsedSeconds / EXPECTED_DURATION_SECONDS, 1)
  const displaySeconds = elapsedSeconds.toFixed(1)
  const statusLabel = text.toLowerCase().startsWith("pelican")
    ? text
    : `Pelican is ${text.toLowerCase()}`

  return (
    <m.div
      initial={messageVariants.thinkingIndicator.initial}
      animate={messageVariants.thinkingIndicator.animate}
      exit={messageVariants.thinkingIndicator.exit}
      transition={messageVariants.thinkingIndicator.transition}
      className={cn("flex items-center gap-3", className)}
      aria-label={statusLabel}
      aria-live="polite"
      role="status"
    >
      {!hideSigil && (
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <m.div
            aria-hidden
            className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/25 blur-md"
            animate={shouldReduceMotion ? undefined : { scale: [0.95, 1.18, 0.95], opacity: [0.25, 0.65, 0.25] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <Image
            src="/pelican-logo-transparent.webp"
            alt=""
            aria-hidden
            width={32}
            height={32}
            className="relative h-7 w-7 object-contain opacity-90"
          />
        </div>
      )}

      <div className="relative flex min-h-10 min-w-[min(280px,calc(100vw-6rem))] items-center gap-2.5 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <m.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--accent-primary)]/12 to-transparent"
          animate={shouldReduceMotion ? undefined : { x: ["-130%", "380%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <m.div
              key={index}
              className={cn("rounded-full bg-current text-[var(--accent-primary)]", sizeClasses[size])}
              animate={shouldReduceMotion ? { opacity: 0.75 } : {
                opacity: [0.35, 1, 0.35],
                y: [0, -3, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.16,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative flex min-h-5 min-w-0 flex-1 items-center">
          <AnimatePresence mode="wait">
            <m.span
              key={text}
              className="block truncate text-sm font-medium text-[var(--text-primary)]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {text}...
            </m.span>
          </AnimatePresence>
        </div>

        {!hideTimer && (
          <span className="relative shrink-0 font-mono text-xs tabular-nums text-[var(--text-secondary)]/70">
            {displaySeconds}s
          </span>
        )}

        <m.div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent"
          animate={{ scaleX: progressPct }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>
    </m.div>
  )
}
