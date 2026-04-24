"use client"

import { useEffect, useRef, useState } from "react"
import { DURATION, fmt, useReducedMotion } from "@/lib/motion"

type Formatter = (value: number) => string

interface NumberTickerProps {
  value: number
  duration?: number
  format?: Formatter
  className?: string
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function NumberTicker({
  value,
  duration = DURATION.slow,
  format = fmt.integer,
  className = "",
}: NumberTickerProps) {
  const reducedMotion = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | null>(null)
  const displayRef = useRef(value)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    if (value === displayRef.current) return

    if (reducedMotion) {
      setDisplay(value)
      return
    }

    const from = displayRef.current
    const to = value
    const start = performance.now()
    const durationMs = duration * 1000

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1)
      const eased = easeOutCubic(t)
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(to)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, reducedMotion])

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {format(display)}
    </span>
  )
}
