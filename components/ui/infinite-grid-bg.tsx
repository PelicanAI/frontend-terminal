'use client'

import React, { useRef, useId, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface InfiniteGridBgProps {
  children?: React.ReactNode
  className?: string
  gridColorClass?: string
  speed?: number
  spotlightRadius?: number
}

export function InfiniteGridBg({
  children,
  className,
  gridColorClass = 'text-slate-400',
  speed = 0.3,
  spotlightRadius = 350,
}: InfiniteGridBgProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const basePatternRef = useRef<SVGPatternElement>(null)
  const revealPatternRef = useRef<SVGPatternElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)
  const patternId = useId()

  const animate = useCallback(() => {
    offsetRef.current.x = (offsetRef.current.x + speed) % 40
    offsetRef.current.y = (offsetRef.current.y + speed) % 40
    const x = String(offsetRef.current.x)
    const y = String(offsetRef.current.y)
    basePatternRef.current?.setAttribute('x', x)
    basePatternRef.current?.setAttribute('y', y)
    revealPatternRef.current?.setAttribute('x', x)
    revealPatternRef.current?.setAttribute('y', y)
    rafRef.current = requestAnimationFrame(animate)
  }, [speed])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!revealRef.current || !containerRef.current) return
    const { left, top } = containerRef.current.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    const grad = `radial-gradient(${spotlightRadius}px circle at ${x}px ${y}px, black, transparent)`
    revealRef.current.style.maskImage = grad
    revealRef.current.style.webkitMaskImage = grad
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn('relative w-full overflow-hidden', className)}
    >
      {/* Base grid */}
      <div className="absolute inset-0 z-0 opacity-[0.15]">
        <GridPattern
          ref={basePatternRef}
          id={`${patternId}-base`}
          colorClass={gridColorClass}
        />
      </div>

      {/* Mouse-reveal grid */}
      <div
        ref={revealRef}
        className="absolute inset-0 z-0 opacity-50"
      >
        <GridPattern
          ref={revealPatternRef}
          id={`${patternId}-reveal`}
          colorClass={gridColorClass}
        />
      </div>

      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute right-[-15%] top-[-15%] w-[35%] h-[35%] rounded-full bg-blue-500/[0.15] blur-[120px]" />
        <div className="absolute right-[5%] top-[-5%] w-[20%] h-[20%] rounded-full bg-cyan-400/[0.12] blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[-15%] w-[35%] h-[35%] rounded-full bg-blue-600/[0.12] blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

const GridPattern = React.forwardRef<
  SVGPatternElement,
  { id: string; colorClass: string }
>(({ id, colorClass }, ref) => (
  <svg className="w-full h-full">
    <defs>
      <pattern
        ref={ref}
        id={id}
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className={colorClass}
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
))
GridPattern.displayName = 'GridPattern'
