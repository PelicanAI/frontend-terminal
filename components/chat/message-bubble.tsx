"use client"

import type React from "react"
import Image from "next/image"

import { MessageActions } from "./message-actions"
import { motion } from "framer-motion"
import { useState, useCallback, useMemo } from "react"
import { Copy, Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getMessageAnimationVariant } from "@/lib/animation-config"
import type { Message } from "@/lib/chat-utils"
import { MessageContent } from "./message/message-content"
import { AttachmentDisplay } from "./message/attachment-display"
import { extractTradingMetadata } from "@/lib/trading-metadata"

function formatMessageTime(date: Date): string {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (isToday) return time
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ` ${time}`
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  isGlobalLoading?: boolean
  showSkeleton?: boolean
  isDarkMode?: boolean
  onRegenerate?: () => void
  isRegenerating?: boolean
  onStop?: () => void
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
  onPin?: (id: string) => void
}

export function MessageBubble({
  message,
  isStreaming = false,
  isGlobalLoading = false,
  showSkeleton = false,
  isDarkMode = false,
  onRegenerate,
  isRegenerating = false,
  onStop,
  onEdit,
  onDelete,
  onPin,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const { toast } = useToast()
  const isUser = message.role === "user"

  const tradingMeta = useMemo(
    () => (!isUser && !isStreaming ? extractTradingMetadata(message.content) : null),
    [message.content, isUser, isStreaming]
  )

  const triggerHapticFeedback = useCallback(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  const handleQuickCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      triggerHapticFeedback()

      try {
        const contentToCopy = typeof message.content === 'string' ? message.content : String(message.content || '')
        await navigator.clipboard.writeText(contentToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)

        toast({
          title: "Copied!",
          description: "Message copied to clipboard",
          duration: 2000,
        })
      } catch {
        toast({
          title: "Copy failed",
          description: "Could not copy message",
          variant: "destructive",
        })
      }
    },
    [message.content, triggerHapticFeedback, toast],
  )

  const animationVariant = getMessageAnimationVariant(message.role)

  if (isUser) {
    const handleStartEdit = () => {
      setEditContent(message.content)
      setIsEditing(true)
    }

    const handleSubmitEdit = () => {
      const trimmed = editContent.trim()
      if (trimmed && trimmed !== message.content) {
        onEdit?.(message.id, trimmed)
      }
      setIsEditing(false)
    }

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        setIsEditing(false)
      }
    }

    return (
      <motion.div
        {...animationVariant}
        className="w-full py-4 group/ts"
        role="article"
        aria-label="Your message"
        data-message-id={message.id}
        data-message-role="user"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-8">
          <div className="flex gap-4 sm:gap-6 items-start justify-end relative">
            <span className="absolute -top-4 right-0 text-[10px] text-muted-foreground/60 opacity-0 group-hover/ts:opacity-100 transition-opacity duration-150 pointer-events-none">
              {formatMessageTime(message.timestamp)}
            </span>
            <div className={isEditing ? "w-full max-w-[85%] sm:max-w-[70%] md:max-w-[60%]" : "max-w-[85%] sm:max-w-[70%] md:max-w-[60%] overflow-hidden"}>
              {isEditing ? (
                <div className="w-full">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    className="w-full bg-white/[0.06] border border-border rounded-2xl px-4 py-3 text-[15px] sm:text-base leading-relaxed text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                    rows={Math.min(10, Math.max(2, editContent.split('\n').length + 1))}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitEdit}
                      disabled={!editContent.trim() || editContent.trim() === message.content}
                      className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                      Send
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
                    <div className="text-[15px] sm:text-base leading-relaxed break-words text-foreground">
                      <AttachmentDisplay attachments={message.attachments} />
                      {message.content}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-2 justify-end">
                    {onEdit && !isGlobalLoading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEdit}
                        className="h-11 sm:h-7 px-3 sm:px-2 min-h-[44px] sm:min-h-0 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover/ts:opacity-100 transition-opacity"
                        title="Edit message"
                      >
                        <Pencil className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleQuickCopy}
                      className="h-11 sm:h-7 px-3 sm:px-2 min-h-[44px] sm:min-h-0 text-xs text-muted-foreground hover:text-foreground"
                      title="Copy message"
                    >
                      {copied ? <Check className="h-4 w-4 sm:h-3 sm:w-3 mr-1" /> : <Copy className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...animationVariant}
      className="w-full py-4 group/ts"
      role="article"
      aria-label="Assistant message"
      data-message-id={message.id}
      data-message-role="assistant"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <div className="flex gap-3 sm:gap-6 items-start relative">
          <span className="absolute -top-4 left-0 text-[10px] text-muted-foreground/60 opacity-0 group-hover/ts:opacity-100 transition-opacity duration-150 pointer-events-none">
            {formatMessageTime(message.timestamp)}
          </span>
          <div className="flex-shrink-0">
            <Image
              src="/pelican-logo-transparent.webp"
              alt="Pelican AI"
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
          </div>

          <div className="flex-1 min-w-0 max-w-[90%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[700px] overflow-hidden">
            <AttachmentDisplay attachments={message.attachments} />
            <div className="text-[16px] sm:text-base leading-relaxed text-foreground">
              <MessageContent
                content={message.content}
                isStreaming={isStreaming}
                showSkeleton={showSkeleton}
                tickers={tradingMeta?.tickers}
                economicTerms={tradingMeta?.economicTerms}
              />
            </div>

            <div className="flex items-center gap-2 mt-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickCopy}
                className="h-11 sm:h-7 px-3 sm:px-2 min-h-[44px] sm:min-h-0 text-xs text-muted-foreground hover:text-foreground"
                title="Copy message"
              >
                {copied ? <Check className="h-4 w-4 sm:h-3 sm:w-3 mr-1" /> : <Copy className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>

              {onRegenerate && (
                <MessageActions
                  message={message}
                  onStop={onStop}
                  onRegenerate={onRegenerate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPin={onPin}
                  isRegenerating={isRegenerating}
                  canDelete={true}
                  variant="minimal"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
