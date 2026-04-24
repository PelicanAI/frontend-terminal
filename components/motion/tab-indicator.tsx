"use client"

import { m } from "framer-motion"
import { useId, useRef, type KeyboardEvent } from "react"
import { DURATION, EASING, useReducedMotion } from "@/lib/motion"

interface Tab {
  id: string
  label: string
}

interface TabIndicatorProps {
  tabs: Tab[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function TabIndicator({
  tabs,
  activeId,
  onChange,
  className = "",
}: TabIndicatorProps) {
  const instanceId = useId()
  const reducedMotion = useReducedMotion()
  const listRef = useRef<HTMLDivElement | null>(null)

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return

    event.preventDefault()
    const direction = event.key === "ArrowRight" ? 1 : -1
    const next = (index + direction + tabs.length) % tabs.length
    onChange(tabs[next]!.id)
    const nextButton = listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]')[next]
    nextButton?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      className={`relative flex items-center gap-1 border-b border-[var(--border)] ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKey(event, index)}
            className={`
              relative px-4 py-2.5 text-sm transition-colors
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:ring-offset-0
              ${isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
            `}
          >
            <span className="relative z-10">{tab.label}</span>
            {isActive && (
              <m.div
                layoutId={`tab-indicator-${instanceId}`}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-violet-500"
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: DURATION.small, ease: EASING.standard }
                }
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
