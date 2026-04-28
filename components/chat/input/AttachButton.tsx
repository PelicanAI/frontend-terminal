"use client"

import type React from "react"
import { useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Attachment01Icon as Paperclip } from "@hugeicons/core-free-icons"
import { PressScale } from "@/components/motion/press-scale"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/providers/translation-provider"
import { IconTooltip } from "@/components/ui/icon-tooltip"

interface AttachButtonProps {
  disabled: boolean
  onFileSelect: (files: File[]) => void
}

export function AttachButton({ disabled, onFileSelect }: AttachButtonProps) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(Array.from(files))
    }
    e.target.value = ""
  }

  return (
    <>
      <IconTooltip label={t.chat.attachFile} side="top">
        <PressScale disabled={disabled}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              "flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center",
              "transition-all duration-200",
              "hover:bg-[var(--bg-elevated)]",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <HugeiconsIcon icon={Paperclip} size={20} className="text-muted-foreground" strokeWidth={1.5} color="currentColor" />
          </button>
        </PressScale>
      </IconTooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt,.csv,.xlsx,.xls"
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />
    </>
  )
}
