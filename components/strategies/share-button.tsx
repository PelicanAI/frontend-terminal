"use client"

import { useState } from "react"
import { ShareNetwork, Link as LinkIcon, XLogo, Check } from "@phosphor-icons/react"

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
        <ShareNetwork size={16} weight="regular" />
        Share
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-2 min-w-[160px] z-50">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            {copied ? <Check size={14} weight="bold" className="text-[var(--data-positive)]" /> : <LinkIcon size={14} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={shareToX}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <XLogo size={14} />
            Share on X
          </button>
        </div>
      )}
    </div>
  )
}
