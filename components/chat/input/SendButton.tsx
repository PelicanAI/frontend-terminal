"use client"

import { PaperPlaneRight, Square } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface SendButtonProps {
  isAIResponding: boolean
  isSendDisabled: boolean
  onStop: (() => void) | undefined
  onSend: () => void
}

export function SendButton({ isAIResponding, isSendDisabled, onStop, onSend }: SendButtonProps) {
  return (
    <motion.button
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
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent-primary)]/20",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isAIResponding ? "stop" : "send"}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
        >
          {isAIResponding ? <Square size={20} weight="fill" /> : <PaperPlaneRight size={20} weight="fill" />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}
