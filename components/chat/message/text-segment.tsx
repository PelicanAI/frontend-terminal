"use client"

import { useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { formatLine, applyTickerLinks } from "./format-utils"
import { useChart } from "@/providers/chart-provider"
import { useLearningMode } from "@/providers/learning-mode-provider"
import { applyLearningHighlights } from "@/lib/glossary/term-matcher"
import { trackEvent } from "@/lib/tracking"

interface TextSegmentProps {
  content: string
  index: number
  isStreaming: boolean
  isLargeContent: boolean
  tickers?: string[]
  economicTerms?: string[]
}

export function TextSegment({ content, index, isStreaming, isLargeContent, tickers, economicTerms }: TextSegmentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { showChart, showCalendar } = useChart()
  const { enabled: learningEnabled, selectTerm } = useLearningMode()

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Handle learning term clicks
      const learningTerm = target.getAttribute("data-learning-term")
      if (learningTerm) {
        e.preventDefault()
        trackEvent({ eventType: 'learning_term_clicked', feature: 'chat', data: { term: learningTerm } })
        const fullName = target.getAttribute("data-term-full") || ""
        const shortDef = target.getAttribute("data-term-def") || ""
        selectTerm({ term: learningTerm, fullName, shortDef, category: "" })
        return
      }

      if (!target.classList.contains("ticker-link")) return

      e.preventDefault()
      const econTerm = target.getAttribute("data-economic-term")
      if (econTerm) {
        showCalendar()
        return
      }
      const ticker = target.getAttribute("data-ticker")
      if (ticker) {
        showChart(ticker)
      }
    },
    [showChart, showCalendar, selectTerm]
  )

  const hasLinks = (tickers && tickers.length > 0) || (economicTerms && economicTerms.length > 0)

  const hasClickables = hasLinks || learningEnabled

  useEffect(() => {
    const el = containerRef.current
    if (!el || !hasClickables) return
    el.addEventListener("click", handleClick)
    return () => el.removeEventListener("click", handleClick)
  }, [handleClick, hasClickables])

  // Performance: skip expensive formatting during streaming for large content
  if (isStreaming && isLargeContent) {
    return (
      <motion.div
        key={`text-${index}`}
        className="space-y-1 whitespace-pre-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {content}
      </motion.div>
    )
  }

  // Normalize literal \n escape sequences and Windows line-endings to actual newlines
  const normalized = content.replace(/\r\n/g, "\n").replace(/\\n/g, "\n")

  let safeLines = normalized
    .split("\n")
    .map((line) => formatLine(line))
    .join("<br />")

  // Apply ticker + economic term highlighting for non-streaming assistant messages
  if (hasLinks && !isStreaming) {
    safeLines = applyTickerLinks(safeLines, tickers ?? [], economicTerms)
  }

  // Apply learning mode highlights
  if (learningEnabled && !isStreaming) {
    safeLines = applyLearningHighlights(safeLines)
  }

  return (
    <motion.div
      ref={containerRef}
      key={`text-${index}`}
      className="space-y-1"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      dangerouslySetInnerHTML={{ __html: safeLines }}
    />
  )
}
