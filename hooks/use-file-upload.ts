"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { ChatInputRef } from "@/components/chat/chat-input"
import type { Attachment } from "@/lib/chat-utils"
import { ACCEPTED_FILE_TYPES, LIMITS, API_ENDPOINTS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import { uploadChatImage } from "@/lib/upload-image"

const isAcceptedFileType = (file: File) => {
  const normalizedMime = (file.type.split(";")[0] || file.type).trim().toLowerCase()
  return normalizedMime in ACCEPTED_FILE_TYPES
}

const MAX_CONCURRENT_UPLOADS = 3

interface PendingAttachment {
  file: File
  isError?: boolean
  id: string
  fileId?: string
}

interface ImageMetadata {
  storagePath: string
  name: string
  size: number
}

interface UseFileUploadOptions {
  sendMessage: (content: string, options?: { attachments?: Attachment[]; fileIds?: string[] }) => Promise<void>
  addSystemMessage: (content: string, retryAction?: () => void) => string
  chatInputRef: React.RefObject<ChatInputRef>
}

export function useFileUpload({ sendMessage, addSystemMessage, chatInputRef }: UseFileUploadOptions) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; type: string; name: string; url: string }>>([])

  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const pendingImageMetaRef = useRef<ImageMetadata[]>([])
  const imageFilesRef = useRef<Map<string, File>>(new Map())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Offline check
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addSystemMessage(
          `Cannot upload ${file.name} - you appear to be offline. Check your connection and try again.`,
          () => handleFileUpload(file)
        )
        return
      }

      if (!isAcceptedFileType(file)) {
        addSystemMessage(`${file.name} is not supported. Please upload Excel, CSV, PDF, images, or text files.`)
        chatInputRef.current?.focus()
        return
      }

      const maxSize = LIMITS.FILE_SIZE_MB * 1024 * 1024
      if (file.size > maxSize) {
        addSystemMessage(`${file.name} is too large. Maximum size is ${LIMITS.FILE_SIZE_MB}MB.`)
        chatInputRef.current?.focus()
        return
      }

      const attachmentId = crypto.randomUUID()
      setPendingAttachments((prev) => [...prev, { file, id: attachmentId }])

      try {
        abortControllerRef.current = new AbortController()
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(API_ENDPOINTS.UPLOAD, {
          method: "POST",
          body: formData,
          signal: abortControllerRef.current.signal,
        })

        if (!mountedRef.current) return

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        if (!mountedRef.current) return

        const { id: fileId, url, name, type } = await response.json()
        setUploadedFiles((prev) => [...prev, { id: fileId, type, name, url }])
        setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
        chatInputRef.current?.focus()
      } catch (error) {
        if (!mountedRef.current) return
        if (error instanceof Error && error.name === 'AbortError') return

        setPendingAttachments((prev) => prev.map((a) => (a.id === attachmentId ? { ...a, isError: true } : a)))
        addSystemMessage("Upload failed. Retry?", () => handleRetryUpload(attachmentId))
      }
    },
    [addSystemMessage, chatInputRef],
  )

  const handleRetryUpload = useCallback(
    (attachmentId: string) => {
      const attachment = pendingAttachments.find((a) => a.id === attachmentId)
      if (attachment) {
        setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
        handleFileUpload(attachment.file)
      }
    },
    [pendingAttachments, handleFileUpload],
  )

  const handleRemovePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }, [])

  const handleMultipleFileUpload = useCallback(
    async (files: File[]) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addSystemMessage(`Cannot upload files - you appear to be offline.`)
        return
      }

      // Deduplicate files (paste events can produce duplicates)
      const seen = new Set<string>()
      const dedupedFiles = files.filter((file) => {
        const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const validFiles = dedupedFiles.filter((file) => {
        if (!isAcceptedFileType(file)) {
          addSystemMessage(`${file.name} is not supported and will be skipped.`)
          return false
        }
        if (file.size > LIMITS.FILE_SIZE_MB * 1024 * 1024) {
          addSystemMessage(`${file.name} is too large and will be skipped.`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) {
        chatInputRef.current?.focus()
        return
      }

      const newPending = validFiles.map((file) => ({ file, id: crypto.randomUUID() }))
      setPendingAttachments((prev) => [...prev, ...newPending])

      // Process with concurrency limit
      let activeCount = 0
      let index = 0

      const processNext = async (): Promise<void> => {
        if (index >= newPending.length || !mountedRef.current) return

        const current = newPending[index++]
        if (!current) return // TypeScript safety check
        
        activeCount++

        try {
          const formData = new FormData()
          formData.append("file", current.file)

          const response = await fetch(API_ENDPOINTS.UPLOAD, { method: "POST", body: formData })
          
          if (!mountedRef.current) return

          if (!response.ok) throw new Error("Upload failed")

          const result = await response.json()
          
          if (mountedRef.current) {
            setUploadedFiles((prev) => [...prev, { id: result.id, type: result.type, name: result.name, url: result.url }])
            setPendingAttachments((prev) => prev.filter((a) => a.id !== current.id))
          }
        } catch {
          if (mountedRef.current) {
            setPendingAttachments((prev) => prev.map((a) => a.id === current.id ? { ...a, isError: true } : a))
          }
        } finally {
          activeCount--
          if (mountedRef.current) processNext()
        }
      }

      // Start up to MAX_CONCURRENT_UPLOADS
      const starters = []
      for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, validFiles.length); i++) {
        starters.push(processNext())
      }
      await Promise.all(starters)

      chatInputRef.current?.focus()
    },
    [addSystemMessage, chatInputRef],
  )

  const clearUploadedFiles = useCallback(() => {
    setUploadedFiles([])
    imageFilesRef.current.clear()
  }, [])
  const removeUploadedFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])
  const getUploadedFileIds = useCallback(() => uploadedFiles.map(f => f.id), [uploadedFiles])
  const getUploadedAttachments = useCallback(() => uploadedFiles.map(f => ({ type: f.type, name: f.name, url: f.url })), [uploadedFiles])

  const handleMultipleFileUploadWithCapture = useCallback((files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        imageFilesRef.current.set(`${file.name}:${file.type}`, file)
      }
    }
    void handleMultipleFileUpload(files)
  }, [handleMultipleFileUpload])

  const prepareMessageFiles = useCallback(async (userId?: string | null) => {
    const fileIds = getUploadedFileIds()
    const attachments = getUploadedAttachments()
    const imagesMeta: ImageMetadata[] = []

    if (userId && attachments.length > 0) {
      for (const attachment of attachments) {
        if (!attachment.type?.startsWith("image/")) continue

        const key = `${attachment.name}:${attachment.type}`
        const originalFile = imageFilesRef.current.get(key)
        if (!originalFile) continue

        const result = await uploadChatImage(originalFile, userId)
        if (result) {
          imagesMeta.push({
            storagePath: result.storagePath,
            name: originalFile.name,
            size: originalFile.size,
          })
        }
        imageFilesRef.current.delete(key)
      }
    }

    pendingImageMetaRef.current = imagesMeta

    return {
      fileIds: fileIds.length > 0 ? fileIds : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    }
  }, [getUploadedFileIds, getUploadedAttachments])

  const persistPendingImageMetadata = useCallback(async (conversationId: string | null) => {
    const imagesMeta = pendingImageMetaRef.current
    if (!conversationId || imagesMeta.length === 0) return

    pendingImageMetaRef.current = []

    try {
      const supabase = createClient()
      const { data: recentMsg } = await supabase
        .from("messages")
        .select("id, metadata")
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (recentMsg) {
        const existingMeta = (recentMsg.metadata as Record<string, unknown>) || {}
        await supabase
          .from("messages")
          .update({
            metadata: { ...existingMeta, images: imagesMeta },
          })
          .eq("id", recentMsg.id)
      }
    } catch {
      // Best-effort metadata persistence.
    }
  }, [])

  return {
    pendingAttachments,
    uploadedFiles,
    handleFileUpload,
    handleMultipleFileUpload,
    handleRetryUpload,
    handleRemovePendingAttachment,
    clearUploadedFiles,
    removeUploadedFile,
    getUploadedFileIds,
    getUploadedAttachments,
    handleMultipleFileUploadWithCapture,
    prepareMessageFiles,
    persistPendingImageMetadata,
  }
}
