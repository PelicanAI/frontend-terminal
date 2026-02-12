'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Copy,
  Check,
  Clock,
  Maximize2,
  X,
} from 'lucide-react'
import { formatLine } from '@/components/chat/message/format-utils'

// =============================================================================
// TYPES
// =============================================================================

interface ConversationRow {
  id: string
  title: string | null
  userName: string | null
  createdAt: string
  messageCount?: number | null
}

interface ConvoMessage {
  id: string
  role: string
  content: string
  created_at: string
}

interface CachedMessages {
  messages: ConvoMessage[]
  total: number
  loaded: number // how many we've loaded so far
}

// =============================================================================
// HELPERS
// =============================================================================

const MESSAGES_BATCH = 20

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr).getTime()
  const end = new Date(endStr).getTime()
  const diff = Math.abs(end - start)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`
}

function formatCopyThread(messages: ConvoMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const time = formatTime(msg.created_at)
      return `${role} (${time}): ${msg.content}`
    })
    .join('\n\n')
}

// =============================================================================
// COPY EMAIL BUTTON
// =============================================================================

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1 text-muted-foreground/40 hover:text-purple-400 transition-colors inline-flex items-center"
      title="Copy email"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  )
}

// =============================================================================
// MESSAGE ROW
// =============================================================================

/**
 * Render assistant content with basic markdown (bold, italic, headers, links).
 * Uses the same formatLine utility as the main chat.
 */
function renderFormattedContent(content: string): string {
  return content
    .split('\n')
    .map((line) => formatLine(line))
    .join('<br />')
}

function AdminMessageRow({ msg, spacious }: { msg: ConvoMessage; spacious?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(msg.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div
      className={`rounded-lg ${spacious ? 'mb-5 last:mb-0' : 'mb-4 last:mb-0'} ${
        isUser
          ? 'bg-[#1a1a25] border-l-2 border-purple-500/40 pl-4 pr-3 py-3'
          : 'bg-[#13131a] border-l-2 border-blue-500/30 pl-4 pr-3 py-3'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-medium px-3 py-1 rounded-md ${
            isUser
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-blue-500/15 text-blue-300'
          }`}
        >
          {isUser ? 'User' : 'Assistant'}
        </span>
        <div className="flex items-center gap-2">
          {hovered && (
            <button
              onClick={handleCopy}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatTime(msg.created_at)}
          </span>
        </div>
      </div>
      {isUser ? (
        <p className={`${spacious ? 'text-[15px]' : 'text-sm'} text-white whitespace-pre-wrap break-words`}>
          {msg.content}
        </p>
      ) : (
        <div
          className={`${spacious ? 'text-[15px] leading-7' : 'text-sm leading-relaxed'} text-zinc-200 break-words [&_strong]:text-white [&_a]:text-teal-400 [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white`}
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(msg.content) }}
        />
      )}
    </div>
  )
}

// =============================================================================
// CONVERSATION MODAL
// =============================================================================

function ConversationModal({
  conversation,
  open,
  onClose,
}: {
  conversation: ConversationRow | null
  open: boolean
  onClose: () => void
}) {
  const [messages, setMessages] = useState<ConvoMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [copyState, setCopyState] = useState(false)

  // Fetch all messages when modal opens
  useEffect(() => {
    if (!open || !conversation) {
      setMessages([])
      return
    }

    let cancelled = false
    const fetchAll = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/admin/conversations/${conversation.id}/messages?limit=500&offset=0`
        )
        if (res.ok && !cancelled) {
          const data = await res.json()
          setMessages(data.messages ?? [])
        }
      } catch (e) {
        console.error('[ConversationModal] Failed to fetch messages:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [open, conversation])

  const handleCopyAll = async () => {
    if (messages.length === 0) return
    try {
      const formatted = formatCopyThread(messages)
      await navigator.clipboard.writeText(formatted)
      setCopyState(true)
      setTimeout(() => setCopyState(false), 2000)
    } catch {}
  }

  if (!conversation) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0 bg-[#0a0a0f] border-[#1e1e2e]"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-[#1e1e2e]">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base text-white truncate">
                {conversation.title || 'Untitled conversation'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {conversation.userName || 'Unknown user'}
                  {conversation.userName && (
                    <CopyEmailButton email={conversation.userName} />
                  )}
                </span>
                <span>&middot;</span>
                <span className="tabular-nums">{formatDate(conversation.createdAt)}</span>
                <span>&middot;</span>
                <span className="tabular-nums">{messages.length} messages</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
              >
                {copyState ? (
                  <>
                    <Check className="size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy All
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No messages in this conversation
            </p>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg) => (
                <AdminMessageRow key={msg.id} msg={msg} spacious />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RecentConversations({
  conversations: initial,
}: {
  conversations: ConversationRow[]
}) {
  const [conversations, setConversations] = useState<ConversationRow[]>(initial)
  const [hasMore, setHasMore] = useState(initial.length >= 10)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messagesCache, setMessagesCache] = useState<
    Record<string, CachedMessages>
  >({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const [emailFilter, setEmailFilter] = useState('')
  const [contentFilter, setContentFilter] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [debouncedContent, setDebouncedContent] = useState('')
  const [copyAllState, setCopyAllState] = useState<string | null>(null)
  const [modalConv, setModalConv] = useState<ConversationRow | null>(null)

  const expandedRef = useRef<string | null>(null)
  expandedRef.current = expandedId

  // Debounce email filter
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(emailFilter), 300)
    return () => clearTimeout(timer)
  }, [emailFilter])

  // Debounce content filter
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(contentFilter), 300)
    return () => clearTimeout(timer)
  }, [contentFilter])

  // Refetch when debounced filters change
  useEffect(() => {
    if (!debouncedEmail && !debouncedContent) {
      setConversations(initial)
      setHasMore(initial.length >= 10)
      return
    }

    let cancelled = false
    const fetchFiltered = async () => {
      const params = new URLSearchParams({ limit: '10' })
      if (debouncedEmail) params.set('email', debouncedEmail)
      if (debouncedContent) params.set('content', debouncedContent)
      try {
        const res = await fetch(`/api/admin/conversations?${params}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setConversations(data.conversations ?? [])
          setHasMore(data.hasMore === true)
        }
      } catch (e) {
        console.error('[RecentConversations] filter fetch failed:', e)
      }
    }
    fetchFiltered()
    return () => {
      cancelled = true
    }
  }, [debouncedEmail, debouncedContent, initial])

  // Escape key handler for inline expand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedRef.current) {
        setExpandedId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || conversations.length === 0) return
    setLoadingMore(true)
    try {
      const last = conversations[conversations.length - 1]!
      const params = new URLSearchParams({ limit: '10', cursor: last.createdAt })
      if (debouncedEmail) params.set('email', debouncedEmail)
      if (debouncedContent) params.set('content', debouncedContent)
      const res = await fetch(`/api/admin/conversations?${params}`)
      if (res.ok) {
        const data = await res.json()
        const newConvos: ConversationRow[] = data.conversations ?? []
        setConversations((prev) => [...prev, ...newConvos])
        setHasMore(data.hasMore === true)
      }
    } catch (e) {
      console.error('[RecentConversations] Failed to load more:', e)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, conversations, debouncedEmail, debouncedContent])

  const fetchMessages = useCallback(
    async (conversationId: string, offset: number = 0) => {
      const params = new URLSearchParams({
        limit: String(MESSAGES_BATCH),
        offset: String(offset),
      })
      const res = await fetch(
        `/api/admin/conversations/${conversationId}/messages?${params}`
      )
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      return { messages: data.messages ?? [], total: data.total ?? 0 }
    },
    []
  )

  const handleToggle = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        return
      }

      setExpandedId(id)

      // Don't refetch if cached
      if (messagesCache[id]) return

      setLoadingId(id)
      try {
        const { messages, total } = await fetchMessages(id, 0)
        setMessagesCache((prev) => ({
          ...prev,
          [id]: { messages, total, loaded: messages.length },
        }))
      } catch (e) {
        console.error('[RecentConversations] Failed to fetch messages:', e)
      } finally {
        setLoadingId(null)
      }
    },
    [expandedId, messagesCache, fetchMessages]
  )

  const handleLoadMoreMessages = useCallback(
    async (conversationId: string) => {
      const cached = messagesCache[conversationId]
      if (!cached || loadingMoreMessages) return

      setLoadingMoreMessages(true)
      try {
        const { messages: newMsgs } = await fetchMessages(
          conversationId,
          cached.loaded
        )
        setMessagesCache((prev) => {
          const existing = prev[conversationId]
          if (!existing) return prev
          return {
            ...prev,
            [conversationId]: {
              ...existing,
              messages: [...existing.messages, ...newMsgs],
              loaded: existing.loaded + newMsgs.length,
            },
          }
        })
      } catch (e) {
        console.error('[RecentConversations] Failed to load more messages:', e)
      } finally {
        setLoadingMoreMessages(false)
      }
    },
    [messagesCache, loadingMoreMessages, fetchMessages]
  )

  const handleCopyAll = useCallback(
    async (conversationId: string) => {
      const cached = messagesCache[conversationId]
      if (!cached || cached.messages.length === 0) return

      try {
        // If we haven't loaded all messages, fetch them all for copy
        let allMessages = cached.messages
        if (cached.loaded < cached.total) {
          const res = await fetch(
            `/api/admin/conversations/${conversationId}/messages?limit=500&offset=0`
          )
          if (res.ok) {
            const data = await res.json()
            allMessages = data.messages ?? cached.messages
          }
        }

        const formatted = formatCopyThread(allMessages)
        await navigator.clipboard.writeText(formatted)
        setCopyAllState(conversationId)
        setTimeout(() => setCopyAllState(null), 2000)
      } catch {
        console.error('[RecentConversations] Copy all failed')
      }
    },
    [messagesCache]
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter by email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter by content..."
                value={contentFilter}
                onChange={(e) => setContentFilter(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {debouncedEmail || debouncedContent
                ? 'No conversations matching filters'
                : 'No recent conversations'}
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isExpanded = expandedId === conv.id
                const cached = messagesCache[conv.id]
                const messages = cached?.messages ?? []
                const isLoading = loadingId === conv.id
                const hasMoreMsgs =
                  cached && cached.loaded < cached.total

                return (
                  <div key={conv.id}>
                    {/* Conversation header */}
                    <div className="flex items-start gap-3 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => handleToggle(conv.id)}
                        className="flex items-start gap-3 flex-1 text-left min-w-0"
                      >
                        <MessageSquare className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {conv.title || 'Untitled conversation'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <span>{conv.userName || 'Unknown user'}</span>
                            {conv.userName && (
                              <CopyEmailButton email={conv.userName} />
                            )}
                            <span className="mx-1">&middot;</span>
                            <span>{timeAgo(conv.createdAt)}</span>
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setModalConv(conv)
                          }}
                          className="p-1 rounded text-muted-foreground/50 hover:text-purple-400 transition-colors"
                          title="Open in modal"
                        >
                          <Maximize2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(conv.id)}
                          className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded conversation view */}
                    {isExpanded && (
                      <div className="ml-7 mr-2 mb-2 mt-1 border-l-2 border-border pl-3">
                        {/* Loading state */}
                        {isLoading && (
                          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Loading messages...
                          </div>
                        )}

                        {/* Empty state */}
                        {!isLoading && messages.length === 0 && cached && (
                          <p className="text-xs text-muted-foreground py-2">
                            No messages
                          </p>
                        )}

                        {/* Messages loaded */}
                        {!isLoading && messages.length > 0 && (
                          <>
                            {/* Metadata row */}
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground py-2 border-b border-[#1e1e2e]">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="size-3" />
                                {cached!.total} messages
                              </span>
                              {messages.length >= 2 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {formatDuration(
                                    messages[0]!.created_at,
                                    messages[messages.length - 1]!.created_at
                                  )}
                                </span>
                              )}
                              <span>{conv.userName}</span>
                            </div>

                            {/* Copy All button */}
                            <div className="py-1.5">
                              <button
                                onClick={() => handleCopyAll(conv.id)}
                                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                {copyAllState === conv.id ? (
                                  <>
                                    <Check className="size-3" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-3" />
                                    Copy All
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Message list */}
                            <div className="max-h-[500px] overflow-y-auto">
                              {messages.map((msg) => (
                                <AdminMessageRow key={msg.id} msg={msg} />
                              ))}

                              {/* Load more messages */}
                              {hasMoreMsgs && (
                                <button
                                  onClick={() =>
                                    handleLoadMoreMessages(conv.id)
                                  }
                                  disabled={loadingMoreMessages}
                                  className="w-full flex items-center justify-center gap-2 text-xs py-2 text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                  {loadingMoreMessages ? (
                                    <>
                                      <Loader2 className="size-3 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    `Load more (${cached!.total - cached!.loaded} remaining)`
                                  )}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Load more conversations */}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-2 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Show more'
                  )}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full conversation modal */}
      <ConversationModal
        conversation={modalConv}
        open={!!modalConv}
        onClose={() => setModalConv(null)}
      />
    </>
  )
}
