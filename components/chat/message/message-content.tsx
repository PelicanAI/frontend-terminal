"use client"

import { useState, useMemo, memo, useCallback } from "react"
import { m } from "framer-motion"
import { EnhancedTypingDots } from "../enhanced-typing-dots"
import { detectDataTable, detectLabelValueList, type LabelValueTableResult } from "@/lib/data-parsers"
import { DataTable } from "@/components/chat/data-visualizations/data-table"
import { TradeGradeCard } from "@/components/grading/trade-grade-card"
import type { TradeGrade } from "@/lib/grading/trade-grader"
import { parseContentSegments, formatLine } from "./format-utils"
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
  const [shareCopied, setShareCopied] = useState(false)

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

  // Detect label:value lists (numbered/bulleted data like price lists, stats)
  const labelValueData = useMemo(
    () => (!isStreaming && !parsedData && !gradeData ? detectLabelValueList(safeContent) : null),
    [safeContent, isStreaming, parsedData, gradeData]
  )

  // Share handler: generate share card image via API and copy to clipboard
  const handleShareTable = useCallback(async () => {
    if (!labelValueData) return

    const { table } = labelValueData

    // Build stats rows for the share card API
    const rows = table.data.map((row) => {
      const label = String(row[table.columns[0]?.key ?? ''] ?? '')
      const value = String(row[table.columns[1]?.key ?? ''] ?? '')

      // Detect color from value
      let color = 'default'
      const cleaned = value.replace(/[,$%+]/g, '').trim()
      if (cleaned.startsWith('-') || cleaned.startsWith('(')) color = 'red'
      else if (/^\+?\d/.test(cleaned) && parseFloat(cleaned) > 0) color = 'green'
      else if (/\$/.test(value)) color = 'cyan'

      return { label, value, color }
    })

    try {
      const res = await fetch('/api/share-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stats-table',
          format: 'square',
          period: table.title || 'Performance',
          rows,
        }),
      })

      if (!res.ok) throw new Error('Share card generation failed')

      const blob = await res.blob()

      // Try to copy image to clipboard (modern browsers)
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': blob })
        await navigator.clipboard.write([item])
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pelican-stats-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch {
      // Share card generation failed — fallback: copy as text
      const header = table.columns.map(c => c.label).join('\t')
      const textRows = table.data.map((row) =>
        table.columns.map(c => String(row[c.key] ?? '')).join('\t')
      )
      const text = [table.title, '', header, ...textRows].join('\n')
      try {
        await navigator.clipboard.writeText(text)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch {
        // Silent fail
      }
    }
  }, [labelValueData])

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

  // Render label:value list as table with surrounding text preserved
  if (labelValueData && !showRawText) {
    const hasPreText = labelValueData.preText.length > 0
    const hasPostText = labelValueData.postText.length > 0

    const preSegments = hasPreText ? parseContentSegments(labelValueData.preText) : []
    const postSegments = hasPostText ? parseContentSegments(labelValueData.postText) : []

    return (
      <div className="leading-normal tracking-normal font-normal break-words overflow-wrap-anywhere max-w-full">
        {hasPreText && (
          <div className="space-y-1.5 mb-2">
            {preSegments.map((segment, index) =>
              segment.type === "code" ? (
                <CodeBlock
                  key={`pre-code-${index}`}
                  content={segment.content}
                  language={segment.language}
                  index={index}
                />
              ) : (
                <TextSegment
                  key={`pre-text-${index}`}
                  content={segment.content}
                  index={index}
                  isStreaming={false}
                  isLargeContent={false}
                  tickers={tickers}
                  economicTerms={economicTerms}
                />
              )
            )}
          </div>
        )}

        <DataTable
          data={labelValueData.table.data}
          title={labelValueData.table.title}
          columns={labelValueData.table.columns}
          onToggle={() => setShowRawText(true)}
          onShare={handleShareTable}
          shareCopied={shareCopied}
          compact
        />

        {hasPostText && (
          <div className="space-y-1.5 mt-4 pt-4 border-t border-border/30">
            {postSegments.length > 0 ? (
              postSegments.map((segment, index) =>
                segment.type === "code" ? (
                  <CodeBlock
                    key={`post-code-${index}`}
                    content={segment.content}
                    language={segment.language}
                    index={index}
                  />
                ) : (
                  <TextSegment
                    key={`post-text-${index}`}
                    content={segment.content}
                    index={index}
                    isStreaming={false}
                    isLargeContent={false}
                    tickers={tickers}
                    economicTerms={economicTerms}
                  />
                )
              )
            ) : (
              <div
                className="text-[15px] leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: labelValueData.postText.split('\n').map(line => formatLine(line)).join('<br/>') }}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  const isLargeContent = safeContent.length > 2000

  return (
    <m.div
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
    </m.div>
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
