"use client"

import { cn } from "@/lib/utils"

export function PelicanContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#0a0a0f]", className)}>
      <div className="chat-background-gradient pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  )
}
