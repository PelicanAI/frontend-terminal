"use client"

import React, { useRef, useEffect, useCallback } from "react"

interface HighlightedMessageProps {
  content: string
  learningMode: boolean
  onTermClick: (term: string, fullName: string, shortDef: string) => void
  children: React.ReactNode
}

/**
 * Wrapper component that provides click handling for learning-term highlights.
 * When learningMode is false, renders children as-is (passthrough).
 * When true, attaches a delegated click handler that catches clicks on
 * `.learning-term` elements and extracts their data attributes.
 *
 * The actual HTML injection of learning-term spans happens in
 * term-matcher.ts's applyLearningHighlights function.
 */
export const HighlightedMessage = React.memo(function HighlightedMessage({
  learningMode,
  onTermClick,
  children,
}: HighlightedMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.classList.contains("learning-term")) return

      e.preventDefault()
      e.stopPropagation()

      const term = target.getAttribute("data-learning-term")
      const fullName = target.getAttribute("data-term-full")
      const shortDef = target.getAttribute("data-term-def")

      if (term && fullName && shortDef) {
        onTermClick(term, fullName, shortDef)
      }
    },
    [onTermClick]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el || !learningMode) return

    el.addEventListener("click", handleClick)
    return () => el.removeEventListener("click", handleClick)
  }, [handleClick, learningMode])

  if (!learningMode) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="highlighted-message-wrapper">
      {children}
    </div>
  )
})
