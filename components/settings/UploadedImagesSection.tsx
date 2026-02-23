"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, ImageIcon } from "lucide-react"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { logger } from "@/lib/logger"

interface FileRecord {
  id: string
  storage_path: string
  mime_type: string
  name: string
  size: number
  created_at: string
}

interface ImageCard {
  file: FileRecord
  signedUrl: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface UploadedImagesSectionProps {
  userId: string
}

export function UploadedImagesSection({ userId }: UploadedImagesSectionProps) {
  const [images, setImages] = useState<ImageCard[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<ImageCard | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: files, error } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", userId)
        .like("mime_type", "image/%")
        .order("created_at", { ascending: false })

      if (error) {
        logger.error("Failed to fetch uploaded images", error)
        setImages([])
        return
      }

      if (!files || files.length === 0) {
        setImages([])
        return
      }

      // Generate signed URLs in parallel
      const cards = await Promise.all(
        files.map(async (file: FileRecord) => {
          const { data } = await supabase.storage
            .from("chat-images")
            .createSignedUrl(file.storage_path, 3600)
          return { file, signedUrl: data?.signedUrl || "" }
        })
      )

      setImages(cards.filter((c) => c.signedUrl))
    } catch (err) {
      logger.error("Error fetching images", err instanceof Error ? err : new Error(String(err)))
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    const { file } = deleteTarget
    // Optimistic removal
    setImages((prev) => prev.filter((img) => img.file.id !== file.id))
    setDeleteTarget(null)

    try {
      const supabase = createClient()

      const { error: storageError } = await supabase.storage
        .from("chat-images")
        .remove([file.storage_path])

      if (storageError) {
        logger.error("Failed to delete from storage", storageError)
      }

      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", file.id)

      if (dbError) {
        logger.error("Failed to delete file record", dbError)
        // Revert optimistic update
        await fetchImages()
        toast({ title: "Failed to delete image", variant: "destructive" })
        return
      }

      toast({ title: "Image deleted" })
    } catch (err) {
      logger.error("Delete error", err instanceof Error ? err : new Error(String(err)))
      await fetchImages()
      toast({ title: "Failed to delete image", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const totalCount = images.length

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Uploaded Images
            {!loading && totalCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalCount})
              </span>
            )}
          </CardTitle>
          <CardDescription>Images you&apos;ve shared in conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img) => (
                <div
                  key={img.file.id}
                  className="group relative rounded-lg border border-border bg-muted/30 overflow-hidden"
                >
                  <div className="aspect-square relative">
                    <Image
                      src={img.signedUrl}
                      alt={img.file.name}
                      fill
                      unoptimized
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <IconTooltip label="Delete image">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        onClick={() => setDeleteTarget(img)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </IconTooltip>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-xs font-medium truncate" title={img.file.name}>
                      {img.file.name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatDate(img.file.created_at)}</span>
                      <span>{formatFileSize(img.file.size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The image will be permanently removed from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
