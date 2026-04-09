"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BarChartIcon as ChartBar, FlashIcon as Lightning } from "@hugeicons/core-free-icons"
import { ShareCardPreviewModal } from "./share-card-preview-modal"
import { extractTickers } from "@/lib/chat/detect-actions"
import type { ShareCardType } from "@/types/share-cards"

/**
 * Quick check: does this text look like a stats table?
 * Returns true if 3+ lines match "Label: Value" or "Label  Value" patterns.
 */
function looksLikeStats(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  let matches = 0
  for (const line of lines) {
    const cleaned = line
      .replace(/^[•\-*]\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/^\d+[.)]\s*/, "")
    if (
      cleaned.match(/^([^:\u2014]+?)[\s]*[:\u2014\u2013]+[\s]*(.+)$/) ||
      cleaned.match(/^(.+?)\s{2,}(.+)$/)
    ) {
      matches++
    }
  }
  return matches >= 3
}

function getSelectionEndPosition(): { x: number; y: number } | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)

  // Collapse to the end of the selection — where the user's cursor actually is
  const endRange = range.cloneRange()
  endRange.collapse(false)
  const endRect = endRange.getBoundingClientRect()

  // Fallback if collapsed range has zero dimensions
  const rect =
    endRect.width === 0 && endRect.height === 0 ? range.getBoundingClientRect() : endRect

  // Clamp to viewport so toolbar never goes off-screen
  const toolbarWidth = 200
  const toolbarHeight = 48
  const clampedLeft = Math.min(Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2), window.innerWidth - toolbarWidth - 8)
  const x = clampedLeft + toolbarWidth / 2
  const clampedTop = Math.min(Math.max(8, rect.top - toolbarHeight - 8), window.innerHeight - toolbarHeight - 8)
  const y = clampedTop + toolbarHeight

  return { x, y }
}

export function TextSelectionToolbar() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCardType, setModalCardType] = useState<ShareCardType>("pelican-insight")
  const [modalData, setModalData] = useState<{ headline: string; tickers: string[] } | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const hideToolbar = useCallback(() => {
    setPosition(null)
    setSelectedText("")
  }, [])

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        const timeout = setTimeout(hideToolbar, 200)
        return () => clearTimeout(timeout)
      }

      const text = selection.toString().trim()
      if (text.length < 20) return

      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer
      const messageEl =
        container instanceof Element
          ? container.closest('[data-message-role="assistant"]')
          : container.parentElement?.closest('[data-message-role="assistant"]')

      if (!messageEl) {
        hideToolbar()
        return
      }

      const pos = getSelectionEndPosition()
      if (pos) {
        setPosition(pos)
        setSelectedText(text)
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [hideToolbar])

  // Reposition toolbar on scroll instead of hiding it
  useEffect(() => {
    if (!position) return

    const handleScroll = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        hideToolbar()
        return
      }
      const pos = getSelectionEndPosition()
      if (pos) {
        setPosition(pos)
      } else {
        hideToolbar()
      }
    }

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true })
    return () => window.removeEventListener("scroll", handleScroll, true)
  }, [position, hideToolbar])

  const openModal = useCallback(
    (cardType: ShareCardType) => {
      if (!selectedText) return
      const tickers = extractTickers(selectedText).slice(0, 5)
      setModalData({ headline: selectedText, tickers })
      setModalCardType(cardType)
      setIsModalOpen(true)
      hideToolbar()
      window.getSelection()?.removeAllRanges()
    },
    [selectedText, hideToolbar]
  )

  return (
    <>
      {position && selectedText ? (
        <div
          ref={toolbarRef}
          className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ left: position.x, top: position.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="flex items-center gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-lg p-1">
            {looksLikeStats(selectedText) ? (
              <button
                onClick={() => openModal("stats-table")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-all active:scale-[0.97]"
                title="Share Trading Stats"
              >
                <HugeiconsIcon icon={ChartBar} size={14} strokeWidth={1.5} color="currentColor" />
                Share Stats
              </button>
            ) : (
              <button
                onClick={() => openModal("pelican-insight")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-all active:scale-[0.97]"
                title="Share as Insight Card"
              >
                <HugeiconsIcon icon={Lightning} size={14} strokeWidth={1.5} color="currentColor" />
                Share Insight
              </button>
            )}
          </div>
        </div>
      ) : null}

      <ShareCardPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cardType={modalCardType}
        headline={modalData?.headline ?? ""}
        tickers={modalData?.tickers ?? []}
      />
    </>
  )
}
