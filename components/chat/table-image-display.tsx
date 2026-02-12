"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Loader2 } from "lucide-react"
import type { Attachment } from "@/lib/chat-utils"

interface TableImageDisplayProps {
  attachment: Attachment
}

export function TableImageDisplay({ attachment }: TableImageDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [lightboxOpen, closeLightbox])

  if (error) {
    return (
      <div className="my-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive text-sm">Failed to load table image</p>
      </div>
    )
  }

  return (
    <>
      <div className="my-2">
        <div
          className="max-w-[320px] rounded-xl overflow-hidden border border-[#1e1e2e] cursor-pointer hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
          onClick={() => imageLoaded && setLightboxOpen(true)}
        >
          {!imageLoaded && (
            <div className="h-48 bg-muted animate-pulse flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={attachment.url}
            alt={attachment.name || "Pelican Analysis Table"}
            className={`w-full h-auto ${!imageLoaded ? "hidden" : ""}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setError(true)}
          />
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={attachment.url}
            alt={attachment.name || "Pelican Analysis Table"}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
