"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const SUGGESTED_PROMPTS = [
  "What are the top gaining stocks today?",
  "Analyze AAPL's technical setup",
  "Why is the market down today?",
]

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {SUGGESTED_PROMPTS.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 + index * 0.04 }}
          onClick={() => !disabled && onSelect(prompt)}
          whileHover={disabled ? undefined : { scale: 1.02 }}
          disabled={disabled}
          className={cn(
            "px-4 py-2 rounded-full text-sm border transition-all duration-150",
            disabled
              ? "border-border/30 text-muted-foreground/50 cursor-not-allowed"
              : "border-border/40 text-foreground/70 hover:border-border/60 hover:text-foreground hover:bg-accent/5 cursor-pointer"
          )}
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  )
}

export { SUGGESTED_PROMPTS }
