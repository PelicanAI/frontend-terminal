'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon as MagnifyingGlass,
  Chat01Icon as ChatCircle,
  ArrowDown01Icon as CaretDown,
  ArrowUp01Icon as CaretUp,
  Loading03Icon as CircleNotch,
  UserIcon as User,
  Robot01Icon as Robot,
  FilterIcon as Funnel,
  ArrowUpRight01Icon as ArrowUpRight,
} from '@hugeicons/core-free-icons'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { formatLine } from '@/components/chat/message/format-utils'
import type { ConvoTag } from '@/lib/admin/classify-conversation'

// =============================================================================
// TYPES
// =============================================================================

interface ConversationRow {
  id: string
  title: string | null
  userName: string | null
  createdAt: string
  messageCount?: number | null
  metadata?: Record<string, unknown> | null
  tag?: ConvoTag
}

interface ConvoMessage {
  id: string
  role: string
  content: string
  created_at: string
}

interface CachedConvo {
  messages: ConvoMessage[]
  total: number
  loaded: number
}

// =============================================================================
// HELPERS
// =============================================================================

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function renderFormattedContent(content: string): string {
  return content
    .split('\n')
    .map((line) => formatLine(line))
    .join('<br />')
}

function OwnerBadge({ owner }: { owner: string }) {
  if (owner === 'team') {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">TEAM</Badge>
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">USER</Badge>
}

function TypeBadge({ classification, source }: { classification: string; source?: string }) {
  switch (classification) {
    case 'action':
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/20">
          {source || 'ACTION'}
        </Badge>
      )
    case 'brief':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-400 border-orange-500/20">BRIEF</Badge>
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">ORGANIC</Badge>
  }
}

// =============================================================================
// MESSAGE COMPONENT
// =============================================================================

function MessageRow({ msg }: { msg: ConvoMessage }) {
  const [expanded, setExpanded] = useState(false)
  const isUser = msg.role === 'user'
  const isLong = msg.content.length > 500

  return (
    <div
      className={`rounded-lg mb-3 last:mb-0 ${
        isUser
          ? 'bg-blue-500/5 border-l-2 border-blue-500/40 pl-4 pr-3 py-3'
          : 'bg-muted/30 border-l-2 border-muted-foreground/20 pl-4 pr-3 py-3'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isUser ? (
            <HugeiconsIcon icon={User} size={14} className="text-blue-400" strokeWidth={1.5} color="currentColor" />
          ) : (
            <HugeiconsIcon icon={Robot} size={14} className="text-muted-foreground" strokeWidth={1.5} color="currentColor" />
          )}
          <span className={`text-xs font-medium ${isUser ? 'text-blue-400' : 'text-muted-foreground'}`}>
            {isUser ? 'User' : 'Assistant'}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
      </div>

      {isUser ? (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
          {isLong && !expanded ? msg.content.slice(0, 500) + '...' : msg.content}
        </p>
      ) : (
        <div
          className="text-sm leading-relaxed text-foreground/80 break-words [&_strong]:text-foreground [&_a]:text-blue-400 [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium"
          dangerouslySetInnerHTML={{
            __html: renderFormattedContent(
              isLong && !expanded ? msg.content.slice(0, 500) + '...' : msg.content
            ),
          }}
        />
      )}

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300 mt-1.5 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

type SortOption = 'newest' | 'oldest' | 'most_messages'
type PeriodOption = 'all' | 'today' | '7d' | '30d'
type OwnerOption = '' | 'user' | 'team'
type TypeOption = '' | 'organic' | 'action' | 'brief'

export default function AdminConversationsPage() {
  // Data
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [period, setPeriod] = useState<PeriodOption>('all')
  const [ownerFilter, setOwnerFilter] = useState<OwnerOption>('user')
  const [typeFilter, setTypeFilter] = useState<TypeOption>('')

  // Expansion
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messagesCache, setMessagesCache] = useState<Record<string, CachedConvo>>({})
  const [loadingMsgId, setLoadingMsgId] = useState<string | null>(null)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)

  const expandedRef = useRef<string | null>(null)
  expandedRef.current = expandedId

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Debounce email
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(emailFilter), 300)
    return () => clearTimeout(timer)
  }, [emailFilter])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedRef.current) setExpandedId(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const fetchConversations = useCallback(
    async (cursor?: string) => {
      const isLoadMore = !!cursor
      if (isLoadMore) setLoadingMore(true)
      else setLoading(true)

      try {
        const params = new URLSearchParams({ limit: '20' })
        if (cursor) params.set('cursor', cursor)
        if (debouncedSearch) params.set('content', debouncedSearch)
        if (debouncedEmail) params.set('email', debouncedEmail)
        if (ownerFilter) params.set('owner', ownerFilter)
        if (typeFilter) params.set('type', typeFilter)

        const res = await fetch(`/api/admin/conversations?${params}`)
        if (!res.ok) throw new Error('Failed to fetch')

        const data = await res.json()
        const newConvos: ConversationRow[] = data.conversations ?? []

        if (isLoadMore) {
          setConversations((prev) => [...prev, ...newConvos])
        } else {
          setConversations(newConvos)
        }
        setHasMore(data.hasMore === true)
      } catch (err) {
        console.error('[Conversations] fetch error:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [debouncedSearch, debouncedEmail, ownerFilter, typeFilter]
  )

  // Initial load + refetch on filter changes
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || conversations.length === 0) return
    const last = conversations[conversations.length - 1]!
    fetchConversations(last.createdAt)
  }, [loadingMore, hasMore, conversations, fetchConversations])

  // Filter and sort client-side
  const displayConversations = useMemo(() => {
    let filtered = [...conversations]

    // Period filter (client-side)
    if (period !== 'all') {
      const now = Date.now()
      const cutoff =
        period === 'today'
          ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
          : period === '7d'
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000
      filtered = filtered.filter((c) => new Date(c.createdAt).getTime() >= cutoff)
    }

    // Sort
    switch (sort) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'most_messages':
        filtered.sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
        break
      default: // newest
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return filtered
  }, [conversations, period, sort])

  // Message fetching
  const fetchMessages = useCallback(async (conversationId: string, offset: number) => {
    const params = new URLSearchParams({ limit: '20', offset: String(offset) })
    const res = await fetch(`/api/admin/conversations/${conversationId}/messages?${params}`)
    if (!res.ok) throw new Error('Failed to fetch messages')
    const data = await res.json()
    return { messages: data.messages ?? [], total: data.total ?? 0 }
  }, [])

  const handleToggle = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        return
      }
      setExpandedId(id)
      if (messagesCache[id]) return

      setLoadingMsgId(id)
      try {
        const { messages, total } = await fetchMessages(id, 0)
        setMessagesCache((prev) => ({
          ...prev,
          [id]: { messages, total, loaded: messages.length },
        }))
      } catch {
        // ignore
      } finally {
        setLoadingMsgId(null)
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
        const { messages: newMsgs } = await fetchMessages(conversationId, cached.loaded)
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
      } catch {
        // ignore
      } finally {
        setLoadingMoreMessages(false)
      }
    },
    [messagesCache, loadingMoreMessages, fetchMessages]
  )

  const isFiltered = !!(debouncedSearch || debouncedEmail || period !== 'all' || ownerFilter || typeFilter)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversations</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <HugeiconsIcon icon={MagnifyingGlass} size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} color="currentColor" />
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* Email filter */}
            <div className="relative flex-1 min-w-[200px]">
              <HugeiconsIcon icon={User} size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} color="currentColor" />
              <Input
                placeholder="Filter by email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* Owner filter */}
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value as OwnerOption)}
              className="h-9 text-sm rounded-md border border-border bg-background text-foreground px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Users</option>
              <option value="user">Real Users Only</option>
              <option value="team">Team Only</option>
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeOption)}
              className="h-9 text-sm rounded-md border border-border bg-background text-foreground px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="organic">Organic</option>
              <option value="action">Actions</option>
              <option value="brief">Briefs</option>
            </select>

            {/* Period */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodOption)}
              className="h-9 text-sm rounded-md border border-border bg-background text-foreground px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-9 text-sm rounded-md border border-border bg-background text-foreground px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_messages">Most Messages</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Conversation list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HugeiconsIcon icon={ChatCircle} size={16} strokeWidth={1.5} color="currentColor" />
              {loading ? 'Loading...' : `${displayConversations.length} conversations`}
            </CardTitle>
            {isFiltered && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Funnel} size={12} strokeWidth={1.5} color="currentColor" />
                Filtered
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayConversations.length === 0 ? (
            <div className="text-center py-8">
              <HugeiconsIcon icon={ChatCircle} size={32} className="mx-auto text-muted-foreground/50 mb-2" strokeWidth={1.5} color="currentColor" />
              <p className="text-sm text-muted-foreground">
                {isFiltered
                  ? 'No conversations match your filters'
                  : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {displayConversations.map((conv) => {
                const isExpanded = expandedId === conv.id
                const cached = messagesCache[conv.id]
                const messages = cached?.messages ?? []
                const isLoadingMsg = loadingMsgId === conv.id
                const hasMoreMsgs = cached && cached.loaded < cached.total

                return (
                  <div key={conv.id} className="py-1">
                    {/* Row */}
                    <div className="flex items-center gap-3 w-full p-3 rounded-md hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => handleToggle(conv.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <HugeiconsIcon icon={ChatCircle} size={16} className="text-muted-foreground shrink-0" strokeWidth={1.5} color="currentColor" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {conv.title || 'Untitled conversation'}
                            </p>
                            {conv.tag && (
                              <div className="flex items-center gap-1 shrink-0">
                                <OwnerBadge owner={conv.tag.owner} />
                                <TypeBadge classification={conv.tag.classification} source={conv.tag.source} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate">{conv.userName || 'Unknown user'}</span>
                            {conv.messageCount != null && (
                              <>
                                <span>&middot;</span>
                                <span className="font-mono tabular-nums shrink-0">
                                  {conv.messageCount} msgs
                                </span>
                              </>
                            )}
                            <span>&middot;</span>
                            <span className="font-mono tabular-nums shrink-0">
                              {timeAgo(conv.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isExpanded ? (
                            <HugeiconsIcon icon={CaretUp} size={16} className="text-muted-foreground" strokeWidth={1.5} color="currentColor" />
                          ) : (
                            <HugeiconsIcon icon={CaretDown} size={16} className="text-muted-foreground" strokeWidth={1.5} color="currentColor" />
                          )}
                        </div>
                      </button>

                      {/* Open Full link */}
                      <IconTooltip label="Open full view">
                        <Link
                          href={`/admin/conversations/${conv.id}`}
                          className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HugeiconsIcon icon={ArrowUpRight} size={16} strokeWidth={1.5} color="currentColor" />
                        </Link>
                      </IconTooltip>
                    </div>

                    {/* Expanded messages */}
                    {isExpanded && (
                      <div className="ml-7 mr-3 mb-3 mt-1">
                        {isLoadingMsg && (
                          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground justify-center">
                            <HugeiconsIcon icon={CircleNotch} size={16} className="animate-spin" strokeWidth={1.5} color="currentColor" />
                            Loading messages...
                          </div>
                        )}

                        {!isLoadingMsg && messages.length === 0 && cached && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No messages in this conversation
                          </p>
                        )}

                        {!isLoadingMsg && messages.length > 0 && (
                          <>
                            <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                              <span className="font-mono tabular-nums">{cached!.total}</span> total messages
                              {messages.length >= 2 && (
                                <>
                                  <span>&middot;</span>
                                  <span>
                                    {new Date(messages[0]!.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    {' - '}
                                    {new Date(messages[messages.length - 1]!.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </>
                              )}
                              <span>&middot;</span>
                              <Link
                                href={`/admin/conversations/${conv.id}`}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Open full view &rarr;
                              </Link>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto">
                              {messages.map((msg) => (
                                <MessageRow key={msg.id} msg={msg} />
                              ))}

                              {hasMoreMsgs && (
                                <button
                                  onClick={() => handleLoadMoreMessages(conv.id)}
                                  disabled={loadingMoreMessages}
                                  className="w-full flex items-center justify-center gap-2 text-xs py-3 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {loadingMoreMessages ? (
                                    <>
                                      <HugeiconsIcon icon={CircleNotch} size={12} className="animate-spin" strokeWidth={1.5} color="currentColor" />
                                      Loading...
                                    </>
                                  ) : (
                                    `Load earlier (${cached!.total - cached!.loaded} remaining)`
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
                <div className="pt-3">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full flex items-center justify-center gap-2 text-sm py-3 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    {loadingMore ? (
                      <>
                        <HugeiconsIcon icon={CircleNotch} size={16} className="animate-spin" strokeWidth={1.5} color="currentColor" />
                        Loading more...
                      </>
                    ) : (
                      'Load more conversations'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
