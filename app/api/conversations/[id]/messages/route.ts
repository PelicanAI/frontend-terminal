import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createUserRateLimiter, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const messagesLimiter = createUserRateLimiter('conversation-messages', 30, '1 m')

interface ImageMeta {
  storagePath: string
  name: string
  size: number
}

interface MessageRow {
  id: string
  role: string
  content: string
  created_at: string
  metadata: unknown
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: conversationId } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success: rateLimitOk } = await messagesLimiter.limit(user.id)
    if (!rateLimitOk) return rateLimitResponse()

    // Include metadata to reconstruct image attachments
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at, metadata')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      logger.error('[MESSAGES] Error fetching messages', undefined, { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Resolve signed URLs for any stored images in metadata
    const resolvedMessages = await Promise.all(
      (messages || []).map(async (msg: MessageRow) => {
        const meta = msg.metadata as Record<string, unknown> | null
        const images = meta?.images as ImageMeta[] | undefined

        if (!images || images.length === 0) {
          return msg
        }

        // Generate signed URLs for stored images
        const attachments = await Promise.all(
          images.map(async (img) => {
            const { data } = await supabase.storage
              .from('chat-images')
              .createSignedUrl(img.storagePath, 3600)

            const ext = img.storagePath.split('.').pop()?.toLowerCase() || 'png'
            return {
              type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
              name: img.name,
              url: data?.signedUrl || '',
            }
          })
        )

        return { ...msg, attachments: attachments.filter((a) => a.url) }
      })
    )

    return NextResponse.json({
      messages: resolvedMessages,
      conversationId
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    })

  } catch (error) {
    logger.error('[API] Unexpected error', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
