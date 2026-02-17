"use client"

import type React from "react"
import { useRef } from "react"
import { Paperclip } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useT } from "@/lib/providers/translation-provider"

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
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center",
          "transition-all duration-200",
          "hover:bg-[var(--bg-elevated)]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        title={t.chat.attachFile}
      >
        <Paperclip size={20} weight="regular" className="text-muted-foreground" />
      </motion.button>

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
