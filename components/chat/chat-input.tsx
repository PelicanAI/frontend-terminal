"use client"

import type React from "react"
import { useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react"
import { cn } from "@/lib/utils"
import { AnimatePresence } from "framer-motion"
import { useT } from "@/lib/providers/translation-provider"
import {
  AttachButton,
  SendButton,
  InputTextarea,
  DragOverlay,
  AttachmentsPreview,
  DraftIndicator,
} from "./input"
import type { InputTextareaRef } from "./input"

// Re-export types so external consumers are unaffected
export type { ChatInputRef, ChatInputProps } from "./input/types"

import type { ChatInputRef, ChatInputProps } from "./input/types"

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      onSendMessage,
      onFileUpload,
      disabled = false,
      canSend = true,
      disabledSend = false,
      onQueueMessage,
      queueEnabled = false,
      placeholder,
      onTypingDuringResponse,
      isAIResponding = false,
      attachments = [],
      onRemoveAttachment,
      pendingAttachments = [],
      onRetryAttachment,
      pendingDraft,
      onStopResponse,
    },
    ref,
  ) => {
    const t = useT()
    const actualPlaceholder = placeholder || t.chat.messagePlaceholder
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [message, setMessage] = useState("")

    const textareaRef = useRef<InputTextareaRef>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const isProcessingPaste = useRef(false)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }))

    const handleSubmit = () => {
      if (message.trim() && !disabled && !isAIResponding && canSend && !disabledSend) {
        onSendMessage(message)
        setMessage("")
      }
    }

    const handleQueueMessage = () => {
      if (message.trim() && onQueueMessage) {
        onQueueMessage(message.trim())
        setMessage("")
      }
    }

    const handleFileSelect = (files: File[]) => {
      if (onFileUpload) {
        onFileUpload(files)
      }
    }

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      // Prevent double-processing from rapid or duplicate paste events
      if (isProcessingPaste.current) return

      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      const seen = new Set<string>()
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item && item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            const key = `${file.name}:${file.size}:${file.type}`
            if (!seen.has(key)) {
              seen.add(key)
              files.push(file)
            }
          }
        }
      }

      if (files.length > 0 && onFileUpload) {
        e.preventDefault()
        e.stopPropagation()
        isProcessingPaste.current = true
        onFileUpload(files)
        setTimeout(() => { isProcessingPaste.current = false }, 500)
      }
    }, [onFileUpload])

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragOver(false)
      }
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = e.dataTransfer.files
      if (files && files.length > 0 && onFileUpload) {
        onFileUpload(Array.from(files))
      }
    }

    const isSendDisabled = disabled || !message.trim() || !canSend || disabledSend || isAIResponding
    const characterCount = message.length

    return (
      <div className="w-full">
        <div
          ref={containerRef}
          className="relative w-full"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDragOver && <DragOverlay />}
          </AnimatePresence>

          <div
            className={cn(
              "relative flex items-center gap-2 px-4 py-2",
              "bg-card",
              "rounded-2xl",
              "border border-border",
              "transition-all duration-200",
              "shadow-md hover:shadow-lg",
              "min-h-[56px]",
              isFocused && [
                "border-primary/60",
                "shadow-[0_0_0_4px_rgba(168,85,247,0.12)]",
                "dark:shadow-[0_0_0_4px_rgba(168,85,247,0.08)]",
              ],
            )}
          >
            <AttachButton disabled={disabled} onFileSelect={handleFileSelect} />

            <InputTextarea
              ref={textareaRef}
              value={message}
              onChange={setMessage}
              onSubmit={handleSubmit}
              onQueueMessage={handleQueueMessage}
              queueEnabled={queueEnabled}
              disabled={disabled}
              disabledSend={disabledSend}
              isAIResponding={isAIResponding}
              placeholder={actualPlaceholder}
              onTypingDuringResponse={onTypingDuringResponse}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            {characterCount >= 3500 && (
              <div
                className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500"
                title={`${characterCount} characters`}
              />
            )}

            <SendButton
              isAIResponding={isAIResponding}
              isSendDisabled={isSendDisabled}
              onStop={onStopResponse}
              onSend={handleSubmit}
            />
          </div>

          <AnimatePresence mode="wait">
            {(attachments.length > 0 || pendingAttachments.length > 0) && (
              <AttachmentsPreview
                attachments={attachments}
                pendingAttachments={pendingAttachments}
                onRemoveAttachment={onRemoveAttachment}
                onRetryAttachment={onRetryAttachment}
              />
            )}
          </AnimatePresence>

          {pendingDraft && <DraftIndicator pendingDraft={pendingDraft} />}
        </div>

        <div className="hidden sm:flex items-center justify-between px-3 pb-1 pt-0.5">
          <span className="text-[11px] text-muted-foreground/50">
            <kbd className="px-1 py-0.5 rounded bg-muted/30 text-[10px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-muted/30 text-[10px] font-mono">Shift+Enter</kbd> for new line
          </span>
        </div>
      </div>
    )
  },
)

ChatInput.displayName = "ChatInput"
