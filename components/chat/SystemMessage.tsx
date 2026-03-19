"use client"

import { Button } from "@/components/ui/button"
import { Warning, ArrowCounterClockwise } from "@phosphor-icons/react"
import type { Message } from "@/lib/chat-utils"

interface SystemMessageProps {
  message: Message & { retryAction?: () => void }
}

export function SystemMessage({ message }: SystemMessageProps) {
  // Defensive check - ensure content is always a string
  const safeContent = typeof message.content === 'string' ? message.content : String(message.content || '')
  
  return (
    <div className="flex justify-center w-full" role="alert" aria-live="polite">
      <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg text-sm text-amber-800 dark:text-amber-200 max-w-md">
        <Warning size={16} weight="regular" className="shrink-0" />
        <span className="flex-1">{safeContent}</span>
        {message.retryAction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={message.retryAction}
            className="h-6 px-2 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <ArrowCounterClockwise size={12} weight="regular" className="mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
