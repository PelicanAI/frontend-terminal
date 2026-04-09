"use client"

import { useState, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon as DownloadSimple,
  Copy01Icon as CopySimple,
  Share01Icon as ShareNetwork,
  Tick01Icon as Check,
  Loading03Icon as SpinnerGap,
} from "@hugeicons/core-free-icons"
import { useToast } from "@/hooks/use-toast"

interface ShareButtonProps {
  imageUrl: string
  filename?: string
  compact?: boolean
}

export function ShareButton({ imageUrl, filename = "pelican-card.png", compact = false }: ShareButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const { toast } = useToast()

  const fetchBlob = useCallback(async () => {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error("Failed to fetch card image")
    return res.blob()
  }, [imageUrl])

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    try {
      const blob = await fetchBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Downloaded!", duration: 2000 })
    } catch {
      toast({ title: "Download failed", variant: "destructive", duration: 2000 })
    } finally {
      setIsDownloading(false)
    }
  }, [fetchBlob, filename, toast])

  const handleCopy = useCallback(async () => {
    try {
      const blob = await fetchBlob()
      const pngBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" })
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })])
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast({ title: "Copied to clipboard!", duration: 2000 })
    } catch {
      toast({ title: "Copy failed — try downloading instead", variant: "destructive", duration: 2000 })
    }
  }, [fetchBlob, toast])

  const handleNativeShare = useCallback(async () => {
    try {
      const blob = await fetchBlob()
      const file = new File([blob], filename, { type: "image/png" })
      await navigator.share({ files: [file] })
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handleDownload()
      }
    }
  }, [fetchBlob, filename, handleDownload])

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {canNativeShare ? (
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors"
            title="Share"
          >
            <HugeiconsIcon icon={ShareNetwork} size={16} strokeWidth={1.5} color="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-50"
            title="Download card"
          >
            {isDownloading ? (
              <HugeiconsIcon icon={SpinnerGap} size={16} className="animate-spin" strokeWidth={1.5} color="currentColor" />
            ) : (
              <HugeiconsIcon icon={DownloadSimple} size={16} strokeWidth={1.5} color="currentColor" />
            )}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors"
          title={isCopied ? "Copied!" : "Copy image"}
        >
          {isCopied ? (
            <HugeiconsIcon icon={Check} size={16} className="text-[var(--data-positive)]" strokeWidth={1.5} color="currentColor" />
          ) : (
            <HugeiconsIcon icon={CopySimple} size={16} strokeWidth={1.5} color="currentColor" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={canNativeShare ? handleNativeShare : handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50"
      >
        {isDownloading ? (
          <HugeiconsIcon icon={SpinnerGap} size={16} className="animate-spin" strokeWidth={1.5} color="currentColor" />
        ) : canNativeShare ? (
          <HugeiconsIcon icon={ShareNetwork} size={16} strokeWidth={1.5} color="currentColor" />
        ) : (
          <HugeiconsIcon icon={DownloadSimple} size={16} strokeWidth={1.5} color="currentColor" />
        )}
        {isDownloading ? "Generating..." : canNativeShare ? "Share" : "Download PNG"}
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-2 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-sm rounded-lg transition-colors active:scale-[0.98]"
        title="Copy to clipboard"
      >
        {isCopied ? (
          <>
            <HugeiconsIcon icon={Check} size={16} className="text-[var(--data-positive)]" strokeWidth={1.5} color="currentColor" />
            Copied
          </>
        ) : (
          <>
            <HugeiconsIcon icon={CopySimple} size={16} strokeWidth={1.5} color="currentColor" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}
