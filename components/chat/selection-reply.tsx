"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { QuotesIcon as Quotes } from "@hugeicons/core-free-icons"
import { m, AnimatePresence } from "framer-motion"

interface SelectionReplyProps {
  containerRef: React.RefObject<HTMLElement | null>
  onReply: (quotedText: string) => void
}

export function SelectionReply({ containerRef, onReply }: SelectionReplyProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()

    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      // Delay before hiding to prevent flicker when clicking the button
      hideTimeoutRef.current = setTimeout(() => {
        const current = window.getSelection()
        if (!current || current.isCollapsed) {
          setPosition(null)
          setSelectedText("")
        }
      }, 200)
      return
    }

    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    const text = selection.toString().trim()
    if (text.length < 3) return

    const range = selection.getRangeAt(0)
    const container = containerRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) return

    // Only show for assistant messages
    const ancestor = range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
    const messageEl = ancestor?.closest?.('[data-message-role="assistant"]')
    if (!messageEl) return

    // Position above the selection end
    const rect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    setPosition({
      x: Math.min(
        rect.right - containerRect.left + container.scrollLeft - 40,
        container.clientWidth - 100
      ),
      y: rect.top - containerRect.top + container.scrollTop - 44,
    })
    setSelectedText(text)
  }, [containerRef])

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [handleSelectionChange])

  // Hide on scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const hide = () => {
      setPosition(null)
      setSelectedText("")
    }
    container.addEventListener("scroll", hide)
    return () => container.removeEventListener("scroll", hide)
  }, [containerRef])

  const handleReply = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!selectedText) return

      const maxLen = 500
      const text =
        selectedText.length > maxLen
          ? selectedText.substring(0, maxLen) + "..."
          : selectedText

      const quoted = `> ${text.replace(/\n/g, "\n> ")}\n\n`
      onReply(quoted)

      window.getSelection()?.removeAllRanges()
      setPosition(null)
      setSelectedText("")
    },
    [selectedText, onReply]
  )

  return (
    <AnimatePresence>
      {position && selectedText && (
        <m.button
          initial={{ opacity: 0, scale: 0.9, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 4 }}
          transition={{ duration: 0.15 }}
          onMouseDown={handleReply}
          className="absolute z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium shadow-lg shadow-black/30 border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-hover)] active:scale-95 transition-colors duration-100 cursor-pointer select-none"
          style={{
            left: `${Math.max(8, position.x)}px`,
            top: `${Math.max(8, position.y)}px`,
          }}
        >
          <HugeiconsIcon icon={Quotes} size={12} strokeWidth={2} color="currentColor" />
          Reply
        </m.button>
      )}
    </AnimatePresence>
  )
}
