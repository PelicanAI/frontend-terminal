"use client"

import { m } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon as Warning, Refresh01Icon as ArrowsClockwise } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  variant?: "message" | "banner"
}

export function ErrorMessage({ message, onRetry, variant = "message" }: ErrorMessageProps) {
  if (variant === "banner") {
    return (
      <m.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 px-4 py-3"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-red-800">
            <HugeiconsIcon icon={Warning} size={16} strokeWidth={1.5} color="currentColor" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
            >
              <HugeiconsIcon icon={ArrowsClockwise} size={12} className="mr-1" strokeWidth={1.5} color="currentColor" />
              Retry
            </Button>
          )}
        </div>
      </m.div>
    )
  }

  return (
    <m.div
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
          <HugeiconsIcon icon={Warning} size={16} className="text-red-600" strokeWidth={1.5} color="currentColor" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <m.div
          className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3 relative group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-red-800 text-sm">{message}</div>

          {onRetry && (
            <m.div
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
                <HugeiconsIcon icon={ArrowsClockwise} size={12} className="mr-1" strokeWidth={1.5} color="currentColor" />
                Retry
              </Button>
            </m.div>
          )}
        </m.div>
      </div>
    </m.div>
  )
}
