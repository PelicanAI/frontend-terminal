"use client"

import { useState, useMemo, memo } from "react"
import { motion } from "framer-motion"
import { EnhancedTypingDots } from "../enhanced-typing-dots"
import { detectDataTable } from "@/lib/data-parsers"
import { DataTable } from "@/components/chat/data-visualizations/data-table"
import { TradeGradeCard } from "@/components/grading/trade-grade-card"
import type { TradeGrade } from "@/lib/grading/trade-grader"
import { parseContentSegments } from "./format-utils"
import { CodeBlock } from "./code-block"
import { TextSegment } from "./text-segment"

/**
 * Detect raw JSON trade grade in message content.
 * Returns parsed TradeGrade + any surrounding text, or null.
 */
function detectTradeGradeJson(content: string): { grade: TradeGrade; preText: string; postText: string } | null {
  // Look for JSON object with trade grade signature fields
  const jsonMatch = content.match(/(\{[\s\S]*"overall_grade"[\s\S]*"overall_score"[\s\S]*\})/)
  if (!jsonMatch?.[1]) return null

  try {
    const parsed = JSON.parse(jsonMatch[1])
    // Validate it has the required trade grade shape
    if (
      typeof parsed.overall_grade === 'string' &&
      typeof parsed.overall_score === 'number' &&
      typeof parsed.summary === 'string' &&
      parsed.risk_management &&
      parsed.entry_quality &&
      parsed.exit_execution
    ) {
      const matchStart = content.indexOf(jsonMatch[1])
      const matchEnd = matchStart + jsonMatch[1].length
      return {
        grade: parsed as TradeGrade,
        preText: content.slice(0, matchStart).trim(),
        postText: content.slice(matchEnd).trim(),
      }
    }
  } catch {
    // Not valid JSON
  }
  return null
}

interface MessageContentProps {
  content: string
  isStreaming: boolean
  showSkeleton?: boolean
  tickers?: string[]
  economicTerms?: string[]
}

export const MessageContent = memo(function MessageContent({
  content,
  isStreaming,
  showSkeleton,
  tickers,
  economicTerms,
}: MessageContentProps) {
  const [showRawText, setShowRawText] = useState(false)

  // Defensive check - ensure content is always a string
  const safeContent = typeof content === 'string' ? content : String(content || '')

  // Only parse data table when NOT streaming (expensive operation)
  const parsedData = useMemo(
    () => (!isStreaming ? detectDataTable(safeContent) : null),
    [safeContent, isStreaming]
  )

  // Detect raw JSON trade grade responses
  const gradeData = useMemo(
    () => (!isStreaming ? detectTradeGradeJson(safeContent) : null),
    [safeContent, isStreaming]
  )

  // Performance: skip expensive parsing during streaming for large content
  const segments = useMemo(() => {
    if (isStreaming && safeContent.length > 1000) {
      return [{ type: "text" as const, content: safeContent }]
    }
    return parseContentSegments(safeContent)
  }, [safeContent, isStreaming])

  if (showSkeleton && !safeContent) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 bg-current/20 rounded animate-pulse w-24" />
      </div>
    )
  }

  if (!safeContent && isStreaming) {
    return <EnhancedTypingDots variant="thinking" />
  }

  if (!safeContent) {
    return <div className="text-muted-foreground italic">No content</div>
  }

  if (parsedData && !showRawText) {
    const isStructured = "columns" in parsedData

    return (
      <DataTable
        data={parsedData.data}
        title={parsedData.title}
        {...(isStructured && 'columns' in parsedData
          ? {
              columns: parsedData.columns,
              query: parsedData.query,
              summary: parsedData.summary,
            }
          : {})}
        onToggle={() => setShowRawText(true)}
      />
    )
  }

  // Render raw JSON grade responses as structured grade cards
  if (gradeData && !showRawText) {
    return (
      <div className="space-y-3">
        {gradeData.preText && (
          <p className="text-sm text-foreground leading-relaxed">{gradeData.preText}</p>
        )}
        <TradeGradeCard grade={gradeData.grade} />
        {gradeData.postText && (
          <p className="text-sm text-foreground leading-relaxed">{gradeData.postText}</p>
        )}
      </div>
    )
  }

  const isLargeContent = safeContent.length > 2000

  return (
    <motion.div
      className="leading-normal tracking-normal font-normal break-words overflow-wrap-anywhere max-w-full text-rendering-optimizeLegibility"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-1.5">
        {segments.map((segment, index) => {
          if (segment.type === "code") {
            return (
              <CodeBlock
                key={`code-${index}`}
                content={segment.content}
                language={segment.language}
                index={index}
              />
            )
          }

          return (
            <TextSegment
              key={`text-${index}`}
              content={segment.content}
              index={index}
              isStreaming={isStreaming}
              isLargeContent={isLargeContent}
              tickers={tickers}
              economicTerms={economicTerms}
            />
          )
        })}
      </div>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.showSkeleton === nextProps.showSkeleton &&
    prevProps.tickers === nextProps.tickers &&
    prevProps.economicTerms === nextProps.economicTerms
  )
})
