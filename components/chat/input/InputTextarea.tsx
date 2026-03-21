"use client"

import type React from "react"
import { useRef, useEffect, forwardRef, useImperativeHandle, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { UI } from "@/lib/constants"

interface InputTextareaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onQueueMessage?: () => void
  queueEnabled: boolean
  disabled: boolean
  disabledSend: boolean
  isAIResponding: boolean
  placeholder: string
  onTypingDuringResponse?: () => void
  onPaste: (e: React.ClipboardEvent) => void
  onFocus: () => void
  onBlur: () => void
  onKeyDownCapture?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export interface InputTextareaRef {
  focus: () => void
  textareaElement: HTMLTextAreaElement | null
}

export const InputTextarea = forwardRef<InputTextareaRef, InputTextareaProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onQueueMessage,
      queueEnabled,
      disabled,
      disabledSend,
      isAIResponding,
      placeholder,
      onTypingDuringResponse,
      onPaste,
      onFocus,
      onBlur,
      onKeyDownCapture,
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const showThinkingNoteRef = useRef(false)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      textareaElement: textareaRef.current,
    }))

    const adjustTextareaHeight = () => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = "auto"
        const newHeight = Math.max(
          UI.TEXTAREA_MIN_HEIGHT,
          Math.min(textarea.scrollHeight, UI.TEXTAREA_MAX_HEIGHT),
        )
        textarea.style.height = `${newHeight}px`
      }
    }

    useEffect(() => {
      adjustTextareaHeight()
    }, [value])

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        // During streaming: Enter queues the message instead of blocking
        if ((isAIResponding || disabledSend) && queueEnabled) {
          onQueueMessage?.()
          return
        }
        if (isAIResponding || disabledSend) {
          showThinkingNoteRef.current = true
          setTimeout(() => {
            showThinkingNoteRef.current = false
          }, UI.THINKING_NOTE_DURATION_MS)
          return
        }
        onSubmit()
      }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (isAIResponding && newValue.length > value.length && onTypingDuringResponse) {
        onTypingDuringResponse()
      }
      onChange(newValue)
    }

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDownCapture={onKeyDownCapture}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 bg-transparent outline-none resize-none whitespace-pre-wrap",
          "text-[15px] leading-relaxed font-[var(--font-sans)]",
          "placeholder:text-muted-foreground",
          "text-[var(--foreground)]",
          "py-2 px-2",
          "h-[40px] max-h-[168px] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        )}
        rows={1}
      />
    )
  },
)

InputTextarea.displayName = "InputTextarea"
