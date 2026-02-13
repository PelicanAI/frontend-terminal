"use client"

import { cn } from "@/lib/utils"

export function PelicanCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08]",
        "bg-[oklch(0.18_0.015_280)] backdrop-blur-md transition-all duration-300",
        hover && "hover:border-primary/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:scale-[1.01]",
        className
      )}
    >
      {children}
    </div>
  )
}
