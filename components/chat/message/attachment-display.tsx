"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { AttachmentChip } from "../attachment-chip"
import type { Attachment } from "@/lib/chat-utils"

interface AttachmentDisplayProps {
  attachments: Attachment[] | undefined
}

function ImageLightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt={alt}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export function AttachmentDisplay({ attachments }: AttachmentDisplayProps) {
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; alt: string } | null>(null)

  const closeLightbox = useCallback(() => setLightboxUrl(null), [])

  if (!attachments || attachments.length === 0) return null

  return (
    <>
      <div className="attachments-container mb-3">
        {attachments.map((attachment, index) => {
          const isImage =
            attachment.type?.toLowerCase().includes("image") ||
            !!attachment.name?.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i)

          if (isImage) {
            return (
              <motion.div
                key={index}
                className="my-2"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div
                  className="max-w-[320px] rounded-xl overflow-hidden border border-[#1e1e2e] cursor-pointer hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
                  onClick={() => setLightboxUrl({ url: attachment.url, alt: attachment.name || "Image" })}
                >
                  <img
                    src={attachment.url || "/placeholder.svg"}
                    alt={attachment.name || "Image"}
                    className="w-full h-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                    loading="lazy"
                  />
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={index}
              className="flex flex-wrap gap-2 mb-2"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <AttachmentChip
                name={attachment.name || "Attachment"}
                type={attachment.type || "application/octet-stream"}
                onClick={() => window.open(attachment.url, "_blank")}
              />
            </motion.div>
          )
        })}
      </div>

      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl.url} alt={lightboxUrl.alt} onClose={closeLightbox} />
      )}
    </>
  )
}
