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
      onCancelDraft,
      onStopResponse,
    },
    ref,
  ) => {
    const t = useT()
    const streamingPlaceholder = "Type to queue next message..."
    const actualPlaceholder = isAIResponding && queueEnabled
      ? streamingPlaceholder
      : (placeholder || t.chat.messagePlaceholder)
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [message, setMessage] = useState("")

    const textareaRef = useRef<InputTextareaRef>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const isProcessingPaste = useRef(false)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      setMessage: (text: string) => {
        setMessage(text)
        // Focus after state update
        setTimeout(() => textareaRef.current?.focus(), 0)
      },
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

    const handleEditDraft = () => {
      if (pendingDraft && onCancelDraft) {
        const content = pendingDraft
        onCancelDraft()
        setMessage(content)
        textareaRef.current?.focus()
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

          {/* Queued message banner — above input */}
          <AnimatePresence mode="wait">
            {pendingDraft && (
              <div className="mb-2 flex justify-center">
                <DraftIndicator
                  pendingDraft={pendingDraft}
                  onCancel={onCancelDraft}
                  onEdit={handleEditDraft}
                />
              </div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "relative flex items-center gap-2 px-4 py-2",
              "bg-card dark:bg-[oklch(0.25_0_0)]",
              "rounded-[28px]",
              "border border-black/10 dark:border-border",
              "shadow-[0_1px_3px_rgba(0,0,0,0.15)]",
              "transition-all duration-200",
              "min-h-[56px]",
              isFocused && "border-black/20 dark:border-border shadow-[0_1px_4px_rgba(0,0,0,0.2)]",
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
        </div>

      </div>
    )
  },
)

ChatInput.displayName = "ChatInput"
