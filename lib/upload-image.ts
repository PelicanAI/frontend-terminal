import { createClient } from '@/lib/supabase/client'

/**
 * Upload an image to the chat-images Supabase Storage bucket.
 * Also inserts a record into the public.files table.
 */
export async function uploadChatImage(
  file: File,
  userId: string
): Promise<{ storagePath: string; fileId: string } | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('chat-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[upload-image] Storage upload failed:', uploadError)
    return null
  }

  // Insert into files table for tracking
  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      storage_path: path,
      mime_type: file.type,
      name: file.name,
      size: file.size,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('[upload-image] Files table insert failed:', dbError)
    // Still return the storage path even if DB insert fails
    return { storagePath: path, fileId: '' }
  }

  return { storagePath: path, fileId: fileRecord.id }
}

/**
 * Generate a signed URL for a chat image stored in the chat-images bucket.
 * Returns a 1-hour signed URL, or null on failure.
 */
export async function getSignedImageUrl(
  storagePath: string
): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from('chat-images')
    .createSignedUrl(storagePath, 3600) // 1 hour

  if (error) {
    console.error('[upload-image] Signed URL failed:', error)
    return null
  }
  return data.signedUrl
}
