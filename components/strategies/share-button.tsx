"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Share01Icon as ShareNetwork,
  Link01Icon as LinkIcon,
  TwitterIcon as XLogo,
  Tick01Icon as Check,
} from "@hugeicons/core-free-icons"

interface ShareButtonProps {
  slug: string
  name: string
}

export function ShareButton({ slug, name }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const url = `https://pelicantrading.ai/strategies/${slug}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToX = () => {
    const text = encodeURIComponent(`Check out the "${name}" trading strategy on @PelicanAI_`)
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--bg-elevated)]"
      >
        <HugeiconsIcon icon={ShareNetwork} size={16} strokeWidth={1.5} color="currentColor" />
        Share
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-2 min-w-[160px] z-50">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            {copied ? <HugeiconsIcon icon={Check} size={14} className="text-[var(--data-positive)]" strokeWidth={2} color="currentColor" /> : <HugeiconsIcon icon={LinkIcon} size={14} strokeWidth={1.5} color="currentColor" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={shareToX}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <HugeiconsIcon icon={XLogo} size={14} strokeWidth={1.5} color="currentColor" />
            Share on X
          </button>
        </div>
      )}
    </div>
  )
}
