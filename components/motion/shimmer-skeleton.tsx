"use client"

import { m } from "framer-motion"
import type { CSSProperties } from "react"
import { useReducedMotion } from "@/lib/motion"

type Rounded = "sm" | "md" | "lg" | "full"

const ROUNDED_CLASS: Record<Rounded, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
}

interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: Rounded
  className?: string
  style?: CSSProperties
}

export function ShimmerSkeleton({
  width = "100%",
  height = "1em",
  rounded = "md",
  className = "",
  style,
}: SkeletonProps) {
  const reducedMotion = useReducedMotion()

  const resolvedStyle: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  }

  return (
    <span
      className={`relative inline-block overflow-hidden bg-[var(--bg-elevated)] ${ROUNDED_CLASS[rounded]} ${className}`}
      style={resolvedStyle}
      aria-hidden
    >
      {!reducedMotion && (
        <m.div
          className="pointer-events-none absolute inset-y-0"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
            width: "50%",
          }}
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
    </span>
  )
}

interface SkeletonRowProps {
  cells: Array<{ width: string | number; rounded?: Rounded }>
  gap?: number
  className?: string
}

export function SkeletonRow({ cells, gap = 12, className = "" }: SkeletonRowProps) {
  return (
    <div className={`flex items-center ${className}`} style={{ gap: `${gap}px` }}>
      {cells.map((cell, index) => (
        <ShimmerSkeleton
          key={index}
          width={cell.width}
          height="1em"
          rounded={cell.rounded ?? "md"}
        />
      ))}
    </div>
  )
}

export function SkeletonCell({
  width = "6ch",
  rounded = "md",
  className = "",
}: {
  width?: string | number
  rounded?: Rounded
  className?: string
}) {
  return (
    <ShimmerSkeleton
      width={width}
      height="1em"
      rounded={rounded}
      className={className}
    />
  )
}

export function SkeletonNumberTicker({
  width = "6ch",
  className = "",
}: {
  width?: string | number
  className?: string
}) {
  return (
    <ShimmerSkeleton
      width={width}
      height="1em"
      rounded="md"
      className={`font-mono tabular-nums ${className}`}
    />
  )
}
