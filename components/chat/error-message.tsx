"use client"

import { motion } from "framer-motion"
import { Warning, ArrowsClockwise } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  variant?: "message" | "banner"
}

export function ErrorMessage({ message, onRetry, variant = "message" }: ErrorMessageProps) {
  if (variant === "banner") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 px-4 py-3"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-red-800">
            <Warning size={16} weight="regular" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
            >
              <ArrowsClockwise size={12} weight="regular" className="mr-1" />
              Retry
            </Button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{
        opacity: 1,
        x: 0,
        rotate: [0, -1, 1, -1, 0],
      }}
      transition={{
        duration: 0.3,
        rotate: { duration: 0.5, ease: "easeInOut" },
      }}
      className="flex gap-3 w-full mb-6"
    >
      <div className="flex-shrink-0">
        <div className="h-9 w-9 bg-red-100 rounded-full flex items-center justify-center">
          <Warning size={16} weight="regular" className="text-red-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <motion.div
          className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3 relative group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-red-800 text-sm">{message}</div>

          {onRetry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="border-red-300 text-red-700 hover:bg-red-100 h-7 bg-transparent"
              >
                <ArrowsClockwise size={12} weight="regular" className="mr-1" />
                Retry
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
