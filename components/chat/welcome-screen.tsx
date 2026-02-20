"use client"

import Link from "next/link"
import { SuggestedPrompts } from "./SuggestedPrompts"

interface WelcomeScreenProps {
  onQuickStart: (message: string) => void
  onSettingsClick?: () => void
  disabled?: boolean
}

export function WelcomeScreen({ onQuickStart, disabled }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 pb-8 sm:p-8 bg-transparent">
      <div className="max-w-2xl mx-auto text-center space-y-5 px-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-balance text-foreground tracking-tight h-auto">
          Welcome to Pelican
        </h1>

        <SuggestedPrompts onSelect={onQuickStart} disabled={disabled} />

        <Link
          href="/guide"
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          See how to get the most from Pelican →
        </Link>
      </div>
    </div>
  )
}
