"use client"

import React from "react"
import { GraduationCap } from "@phosphor-icons/react"
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
        "relative h-9 w-9 min-w-[36px] min-h-[36px] p-0 rounded-full flex items-center justify-center transition-colors",
        enabled
          ? "text-[var(--accent-primary)] bg-[var(--accent-muted)] hover:bg-[var(--accent-glow)]"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      title={enabled ? "Learning Mode on — click to disable" : "Learning Mode — highlight trading terms"}
    >
      <GraduationCap size={18} weight={enabled ? "fill" : "regular"} />
      {enabled && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
      )}
    </Button>
  )
})
