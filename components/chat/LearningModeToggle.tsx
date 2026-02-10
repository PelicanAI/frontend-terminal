"use client"

import React from "react"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLearningMode } from "@/providers/learning-mode-provider"
import { cn } from "@/lib/utils"

export const LearningModeToggle = React.memo(function LearningModeToggle() {
  const { enabled, setEnabled } = useLearningMode()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setEnabled(!enabled)}
      className={cn(
        "h-8 px-2 gap-1.5 text-xs font-medium transition-colors",
        enabled
          ? "text-[#8b5cf6] bg-purple-500/10 hover:bg-purple-500/20"
          : "text-muted-foreground hover:text-foreground"
      )}
      title="Highlight trading terms in chat responses"
    >
      <GraduationCap className="h-4 w-4" />
      <span className="hidden sm:inline">Learn</span>
    </Button>
  )
})
