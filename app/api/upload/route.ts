import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { createHash } from "crypto"
import { sanitizeFilename } from "@/lib/sanitize"
import { captureException, addBreadcrumb } from "@/lib/sentry"
import { createUserRateLimiter, rateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const uploadLimiter = createUserRateLimiter('upload', 20, '1 h')

// =============================================================================
// Configuration
// =============================================================================

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB - generous for trading data files

// Comprehensive MIME type support for trading AI platform
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  images: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
  ],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/rtf",
    "text/rtf",
  ],
  spreadsheets: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.oasis.opendocument.spreadsheet",
  ],
  data: [
    "text/csv",
    "application/csv",
    "text/comma-separated-values",
    "text/plain",
    "text/tab-separated-values",
    "application/json",
    "text/json",
    "application/xml",
    "text/xml",
  ],
  archives: [
    "application/zip",
    "application/x-zip-compressed",
    "application/gzip",
    "application/x-gzip",
  ],
}

const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat()

const EXTENSION_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".rtf": "application/rtf",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".txt": "text/plain",
  ".json": "application/json",
  ".xml": "application/xml",
  ".zip": "application/zip",
  ".gz": "application/gzip",
}

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/jpg": [0xff, 0xd8, 0xff],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "image/bmp": [0x42, 0x4d],
  "image/tiff": [],
  "image/heic": [],
  "image/heif": [],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "application/msword": [0xd0, 0xcf, 0x11, 0xe0],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [0x50, 0x4b, 0x03, 0x04],
  "application/rtf": [0x7b, 0x5c, 0x72, 0x74, 0x66],
  "text/rtf": [0x7b, 0x5c, 0x72, 0x74, 0x66],
  "application/vnd.ms-excel": [0xd0, 0xcf, 0x11, 0xe0],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [0x50, 0x4b, 0x03, 0x04],
  "application/vnd.oasis.opendocument.spreadsheet": [0x50, 0x4b, 0x03, 0x04],
  "text/csv": [],
  "application/csv": [],
  "text/comma-separated-values": [],
  "text/plain": [],
  "text/tab-separated-values": [],
  "application/json": [],
  "text/json": [],
  "application/xml": [],
  "text/xml": [],
  "application/zip": [0x50, 0x4b, 0x03, 0x04],
  "application/x-zip-compressed": [0x50, 0x4b, 0x03, 0x04],
  "application/gzip": [0x1f, 0x8b],
  "application/x-gzip": [0x1f, 0x8b],
}

// =============================================================================
// Helper Functions
// =============================================================================

function normalizeMimeType(mimeType: string): string {
  const parts = mimeType.split(";")
  return (parts[0] || mimeType).trim().toLowerCase()
}

function inferMimeType(filename: string, declaredType: string): string {
  const normalized = normalizeMimeType(declaredType)
  if (ALL_ALLOWED_MIME_TYPES.includes(normalized)) {
    return normalized
  }
  const ext = "." + filename.split(".").pop()?.toLowerCase()
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext]
  }
  return normalized
}

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const magicBytes = MAGIC_BYTES[mimeType]
  if (!magicBytes || magicBytes.length === 0) return true
  const fileBytes = new Uint8Array(buffer.slice(0, Math.max(16, magicBytes.length)))
  return magicBytes.every((byte, index) => fileBytes[index] === byte)
}

function computeChecksum(buffer: ArrayBuffer): string {
  const hash = createHash("sha256")
  hash.update(new Uint8Array(buffer))
  return hash.digest("hex")
}

function getFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (types.includes(mimeType)) return category
  }
  return "unknown"
}

// =============================================================================
// Main Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const requestId = uuidv4()
  let fileMeta: { name: string; type: string; size: number; checksum?: string; category?: string } | undefined

  try {
    addBreadcrumb("Upload request started", { requestId })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { success } = await uploadLimiter.limit(user.id)
    if (!success) return rateLimitResponse()

    const userId = user.id

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const sanitizedFilename = sanitizeFilename(file.name)
    const mimeType = inferMimeType(sanitizedFilename, file.type)
    const category = getFileCategory(mimeType)

    fileMeta = { name: sanitizedFilename, type: mimeType, size: file.size, category }
    addBreadcrumb("File received", { requestId, fileMeta })

    // Block SVG uploads entirely (XSS risk via embedded scripts)
    if (mimeType === "image/svg+xml" || mimeType === "image/svg") {
      return NextResponse.json(
        { error: "SVG uploads are not allowed for security reasons", code: "svg_blocked" },
        { status: 400 }
      )
    }

    if (!ALL_ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}`, code: "unsupported_type" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, code: "file_too_large" },
        { status: 413 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Empty files not allowed", code: "empty_file" }, { status: 400 })
    }

    const fileBuffer = await file.arrayBuffer()

    if (!validateMagicBytes(fileBuffer, mimeType)) {
      return NextResponse.json(
        { error: "File content doesn't match declared type", code: "mime_mismatch" },
        { status: 400 }
      )
    }

    const checksum = computeChecksum(fileBuffer)
    fileMeta.checksum = checksum

    const now = new Date()
    const storageKey = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${uuidv4()}.${sanitizedFilename.split(".").pop()?.toLowerCase() || "bin"}`

    const { error: uploadError } = await supabase.storage
      .from("pelican")
      .upload(storageKey, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      logger.error(`[${requestId}] Storage error`, uploadError instanceof Error ? uploadError : undefined)
      captureException(new Error(`Upload failed: ${uploadError.message}`), { reqId: requestId, userId, fileMeta })
      return NextResponse.json({ error: "Failed to upload file", code: "storage_error" }, { status: 500 })
    }

    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        user_id: userId,
        storage_path: storageKey,
        mime_type: mimeType,
        name: sanitizedFilename,
        size: file.size,
      })
      .select()
      .single()

    if (dbError || !fileRecord) {
      logger.error(`[${requestId}] DB error`, dbError instanceof Error ? dbError : undefined)
      await supabase.storage.from("pelican").remove([storageKey])
      captureException(new Error(`DB insert failed: ${dbError?.message}`), { reqId: requestId, userId, fileMeta })
      return NextResponse.json({ error: "Failed to save file metadata", code: "database_error" }, { status: 500 })
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("pelican")
      .createSignedUrl(storageKey, 7 * 24 * 60 * 60)

    if (signedUrlError) {
      logger.error(`[${requestId}] Signed URL error`, signedUrlError instanceof Error ? signedUrlError : undefined)
      return NextResponse.json({ error: "Failed to generate access URL", code: "signed_url_error" }, { status: 500 })
    }

    return NextResponse.json({
      id: fileRecord.id,
      url: signedUrlData.signedUrl,
      key: storageKey,
      name: sanitizedFilename,
      type: mimeType,
      size: file.size,
      checksum,
      public: false,
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    })

  } catch (error) {
    logger.error(`[${requestId}] Upload error`, error instanceof Error ? error : undefined)
    captureException(error instanceof Error ? error : new Error(String(error)), { reqId: requestId, fileMeta })
    return NextResponse.json({ error: "Internal server error", code: "internal_error" }, { status: 500 })
  }
}
