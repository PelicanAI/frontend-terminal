"use client"

import { AnimatePresence, m } from "framer-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useReducedMotion } from "@/lib/motion"

type FlashDirection = "up" | "down" | "neutral"

interface PriceFlashProps {
  value: number
  direction?: FlashDirection
  duration?: number
  children: ReactNode
  className?: string
}

const FLASH_BG: Record<FlashDirection, string> = {
  up: "bg-emerald-500/25",
  down: "bg-red-500/25",
  neutral: "bg-violet-500/20",
}

export function PriceFlash({
  value,
  direction,
  duration = 0.6,
  children,
  className = "",
}: PriceFlashProps) {
  const reducedMotion = useReducedMotion()
  const prev = useRef(value)
  const [flash, setFlash] = useState<{ dir: FlashDirection; id: number } | null>(null)

  useEffect(() => {
    const delta = value - prev.current
    if (delta === 0) return

    const dir: FlashDirection = direction ?? (delta > 0 ? "up" : "down")
    prev.current = value

    if (reducedMotion) return
    setFlash({ dir, id: Date.now() })
  }, [value, direction, reducedMotion])

  return (
    <span className={`relative inline-block ${className}`}>
      <AnimatePresence>
        {flash && (
          <m.div
            key={flash.id}
            aria-hidden
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration, ease: "easeOut" }}
            onAnimationComplete={() => setFlash(null)}
            className={`pointer-events-none absolute inset-0 -mx-1 rounded-sm ${FLASH_BG[flash.dir]}`}
          />
        )}
      </AnimatePresence>
      <span className="relative">{children}</span>
    </span>
  )
}
