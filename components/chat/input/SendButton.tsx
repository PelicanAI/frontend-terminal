"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { SentIcon as PaperPlaneRight, Square01Icon as Square } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { m, AnimatePresence } from "framer-motion"
import { IconTooltip } from "@/components/ui/icon-tooltip"

interface SendButtonProps {
  isAIResponding: boolean
  isSendDisabled: boolean
  onStop: (() => void) | undefined
  onSend: () => void
}

export function SendButton({ isAIResponding, isSendDisabled, onStop, onSend }: SendButtonProps) {
  return (
    <IconTooltip label={isAIResponding ? "Stop generation" : "Send message"} side="top" kbd={isAIResponding ? undefined : "↵"}>
      <m.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isAIResponding && onStop ? onStop : onSend}
        disabled={!isAIResponding && isSendDisabled}
        className={cn(
          "flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center",
          "transition-all duration-200",
          isAIResponding
            ? "bg-[var(--data-negative)] hover:bg-red-600 text-white"
            : isSendDisabled
              ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
              : "bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent-primary)]/20",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={isAIResponding ? "stop" : "send"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
          >
            {isAIResponding ? <HugeiconsIcon icon={Square} size={20} strokeWidth={1.5} color="currentColor" /> : <HugeiconsIcon icon={PaperPlaneRight} size={20} strokeWidth={1.5} color="currentColor" />}
          </m.div>
        </AnimatePresence>
      </m.button>
    </IconTooltip>
  )
}
