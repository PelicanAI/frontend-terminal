"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, SpinnerGap } from "@phosphor-icons/react"
import { ShareButton } from "./share-button"
import type { ShareFormat, ShareCardType } from "@/types/share-cards"

interface ShareCardPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  cardType: ShareCardType
  headline: string
  tickers: string[]
}

interface ParsedStatRow {
  label: string
  value: string
  color: string
}

function parseTextToStats(text: string): ParsedStatRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const rows: ParsedStatRow[] = []

  for (const line of lines) {
    const cleaned = line
      .replace(/^[•\-*]\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/^\d+[.)]\s*/, "")

    // Split on colon, em-dash, or multiple spaces
    const match =
      cleaned.match(/^([^:\u2014]+?)[\s]*[:\u2014\u2013]+[\s]*(.+)$/) ||
      cleaned.match(/^(.+?)\s{2,}(.+)$/)

    if (match && match[1] && match[2]) {
      const label = match[1].trim()
      const value = match[2].trim()

      let color = "white"
      const numVal = parseFloat(value.replace(/[^0-9.\-+]/g, ""))
      if (value.startsWith("+") || value.startsWith("$")) {
        color = numVal >= 0 ? "green" : "red"
      }
      if (value.startsWith("-")) color = "red"
      if (value.includes("%")) {
        color = numVal >= 50 ? "green" : numVal > 0 ? "white" : "red"
      }
      if (/r$/i.test(value.trim())) {
        color = numVal >= 0 ? "cyan" : "red"
      }

      rows.push({ label, value, color })
    }
  }

  return rows
}

export function ShareCardPreviewModal({
  isOpen,
  onClose,
  cardType,
  headline,
  tickers,
}: ShareCardPreviewModalProps) {
  const [format, setFormat] = useState<ShareFormat>("og")
  const [imageError, setImageError] = useState(false)

  // Parse stats from highlighted text immediately
  const parsedStats = useMemo(() => {
    if (cardType !== "stats-table" || !headline) return []
    return parseTextToStats(headline)
  }, [cardType, headline])

  const noStats = cardType === "stats-table" && parsedStats.length === 0

  // Insight card uses GET URL
  const insightImageUrl = useMemo(() => {
    if (cardType !== "pelican-insight" || !headline) return ""
    const params = new URLSearchParams({
      type: "pelican-insight",
      headline,
      format,
    })
    if (tickers.length > 0) params.set("tickers", tickers.join(","))
    return `/api/share-card?${params.toString()}`
  }, [cardType, headline, tickers, format])

  // Stats card uses POST → blob URL
  const [statsBlobUrl, setStatsBlobUrl] = useState<string>("")
  const blobUrlRef = useRef<string>("")

  useEffect(() => {
    if (cardType !== "stats-table" || parsedStats.length === 0 || !isOpen) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = ""
      }
      setStatsBlobUrl("")
      return
    }

    let cancelled = false
    const generateImage = async () => {
      setImageError(false)
      try {
        const res = await fetch("/api/share-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "stats-table",
            period: "Performance",
            rows: parsedStats,
            format,
          }),
        })
        if (!res.ok) {
          const errText = await res.text()
          console.error("Stats card POST failed:", res.status, errText)
          throw new Error(errText)
        }
        const blob = await res.blob()
        if (!cancelled) {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setStatsBlobUrl(url)
          setImageError(false)
        }
      } catch {
        if (!cancelled) setImageError(true)
      }
    }
    generateImage()
    return () => {
      cancelled = true
    }
  }, [cardType, parsedStats, format, isOpen])

  const effectiveImageUrl =
    cardType === "stats-table" ? statsBlobUrl : insightImageUrl

  const handleClose = useCallback(() => {
    setImageError(false)
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = ""
    }
    setStatsBlobUrl("")
    onClose()
  }, [onClose])

  const filename = useMemo(() => {
    if (cardType === "stats-table") return "pelican-stats.png"
    return `pelican-insight-${tickers[0] || "card"}.png`
  }, [cardType, tickers])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] sm:max-w-2xl"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-[var(--text-primary)]">
            {cardType === "stats-table" ? "Share Stats Card" : "Share Insight Card"}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={18} className="text-[var(--text-muted)]" />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormat("og")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                format === "og"
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Twitter / LinkedIn
            </button>
            <button
              onClick={() => setFormat("square")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                format === "square"
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Square (Instagram)
            </button>
          </div>

          {/* Image preview */}
          <div className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {noStats ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-sm text-[var(--text-muted)]">
                  Could not parse stats from selection.
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Try highlighting text with labeled values like &quot;Win Rate: 72.4%&quot;
                </span>
              </div>
            ) : imageError ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-sm text-[var(--data-negative)]">
                  Failed to load card preview
                </span>
              </div>
            ) : effectiveImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectiveImageUrl}
                alt="Share card preview"
                className="w-full h-auto"
                style={{
                  aspectRatio: format === "square" ? "1/1" : "1200/630",
                }}
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <SpinnerGap
                  size={24}
                  weight="regular"
                  className="animate-spin text-[var(--text-muted)]"
                />
              </div>
            )}
          </div>

          {/* Share actions */}
          {effectiveImageUrl && !imageError && !noStats ? (
            <div className="flex items-center justify-end">
              <ShareButton imageUrl={effectiveImageUrl} filename={filename} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
