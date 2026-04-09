'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon as ArrowLeft,
  Copy01Icon as Copy,
  Tick01Icon as Check,
  UserIcon as User,
  Robot01Icon as Robot,
  Clock01Icon as Clock,
  Chat01Icon as ChatCircle,
  Loading03Icon as CircleNotch,
  FileCodeIcon as FileCode,
  ArrowDown01Icon as CaretDown,
  ArrowUp01Icon as CaretUp,
} from '@hugeicons/core-free-icons'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { formatLine } from '@/components/chat/message/format-utils'
import type { ConvoTag } from '@/lib/admin/classify-conversation'

// =============================================================================
// TYPES
// =============================================================================

interface FullConversation {
  conversation: {
    id: string
    title: string | null
    user_id: string
    user_email: string | null
    metadata: Record<string, unknown> | null
    created_at: string
    updated_at: string | null
  }
  messages: Array<{
    id: string
    role: string
    content: string
    timestamp: string
    metadata: Record<string, unknown> | null
  }>
  classification: ConvoTag
  stats: {
    total_messages: number
    user_messages: number
    assistant_messages: number
    first_message_at: string
    last_message_at: string
    duration_minutes: number
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(minutes: number) {
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function renderFormattedContent(content: string): string {
  return content
    .split('\n')
    .map((line) => formatLine(line))
    .join('<br />')
}

function ownerBadge(owner: string) {
  if (owner === 'team') {
    return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">TEAM</Badge>
  }
  return <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">USER</Badge>
}

function typeBadge(classification: string, source?: string) {
  switch (classification) {
    case 'action':
      return (
        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
          ACTION{source ? ` / ${source}` : ''}
        </Badge>
      )
    case 'brief':
      return <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">BRIEF</Badge>
    default:
      return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">ORGANIC</Badge>
  }
}

// =============================================================================
// COPY BUTTON
// =============================================================================

function CopyButton({ label, text, icon }: { label: string; text: string; icon?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
    >
      {copied ? (
        <HugeiconsIcon icon={Check} size={12} className="text-green-400" strokeWidth={1.5} color="currentColor" />
      ) : (
        icon ?? <HugeiconsIcon icon={Copy} size={12} strokeWidth={1.5} color="currentColor" />
      )}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// =============================================================================
// MESSAGE COMPONENT
// =============================================================================

function MessageBlock({ msg, index, total }: { msg: FullConversation['messages'][0]; index: number; total: number }) {
  const isUser = msg.role === 'user'

  return (
    <div
      className={`rounded-lg mb-4 last:mb-0 ${
        isUser
          ? 'bg-blue-500/5 border-l-2 border-blue-500/40 pl-4 pr-4 py-3'
          : 'bg-muted/30 border-l-2 border-muted-foreground/20 pl-4 pr-4 py-3'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isUser ? (
            <HugeiconsIcon icon={User} size={14} className="text-blue-400" strokeWidth={1.5} color="currentColor" />
          ) : (
            <HugeiconsIcon icon={Robot} size={14} className="text-muted-foreground" strokeWidth={1.5} color="currentColor" />
          )}
          <span className={`text-xs font-medium ${isUser ? 'text-blue-400' : 'text-muted-foreground'}`}>
            {isUser ? 'User' : 'Pelican'}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {formatTimestamp(msg.timestamp)}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {index + 1}/{total}
        </span>
      </div>

      {isUser ? (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{msg.content}</p>
      ) : (
        <div
          className="text-sm leading-relaxed text-foreground/80 break-words [&_strong]:text-foreground [&_a]:text-blue-400 [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_pre]:overflow-x-auto [&_pre]:bg-muted/50 [&_pre]:rounded [&_pre]:p-2 [&_pre]:my-2 [&_code]:text-xs [&_code]:font-mono"
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(msg.content) }}
        />
      )}
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ConversationFullPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<FullConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metadataOpen, setMetadataOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/conversations/${id}/full`)
        if (!res.ok) throw new Error('Failed to fetch')
        setData(await res.json())
      } catch {
        setError('Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <HugeiconsIcon icon={CircleNotch} size={24} className="animate-spin text-muted-foreground" strokeWidth={1.5} color="currentColor" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={1.5} color="currentColor" />
          Back
        </button>
        <p className="text-sm text-red-400">{error || 'Conversation not found'}</p>
      </div>
    )
  }

  const { conversation: convo, messages, classification, stats } = data

  // Build copy texts
  const copyAll = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'User' : 'Pelican'} (${formatTimestamp(m.timestamp)}): ${m.content}`)
    .join('\n\n')

  const copyUserOnly = messages
    .filter((m) => m.role === 'user')
    .map((m) => `User (${formatTimestamp(m.timestamp)}): ${m.content}`)
    .join('\n\n')

  const copyAssistantOnly = messages
    .filter((m) => m.role === 'assistant')
    .map((m) => `Pelican (${formatTimestamp(m.timestamp)}): ${m.content}`)
    .join('\n\n')

  const copyRaw = JSON.stringify(
    messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      metadata: m.metadata,
    })),
    null,
    2
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <HugeiconsIcon icon={ArrowLeft} size={16} strokeWidth={1.5} color="currentColor" />
          Back to Conversations
        </button>

        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-xl font-bold flex-1 min-w-0">
            {convo.title || 'Untitled conversation'}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {ownerBadge(classification.owner)}
            {typeBadge(classification.classification, classification.source)}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span>{convo.user_email || 'Unknown user'}</span>
          <span>&middot;</span>
          <span className="font-mono tabular-nums">{stats.total_messages} messages</span>
          <span>&middot;</span>
          <span>{formatFullDate(convo.created_at)}</span>
        </div>
      </div>

      {/* Copy buttons */}
      <div className="flex flex-wrap gap-2">
        <CopyButton label="Copy All" text={copyAll} />
        <CopyButton label="Copy User Only" text={copyUserOnly} icon={<HugeiconsIcon icon={User} size={12} strokeWidth={1.5} color="currentColor" />} />
        <CopyButton label="Copy Assistant Only" text={copyAssistantOnly} icon={<HugeiconsIcon icon={Robot} size={12} strokeWidth={1.5} color="currentColor" />} />
        <CopyButton label="Copy Raw JSON" text={copyRaw} icon={<HugeiconsIcon icon={FileCode} size={12} strokeWidth={1.5} color="currentColor" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Messages */}
        <Card>
          <CardContent className="pt-4 pb-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No messages</p>
            ) : (
              <div>
                {messages
                  .filter((m) => m.role !== 'system')
                  .map((msg, i, arr) => (
                    <MessageBlock key={msg.id} msg={msg} index={i} total={arr.length} />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          {/* Classification */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Owner</span>
                {ownerBadge(classification.owner)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                {typeBadge(classification.classification, classification.source)}
              </div>
              {classification.source && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-mono text-xs">{classification.source}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={ChatCircle} size={12} strokeWidth={1.5} color="currentColor" /> Total
                </span>
                <span className="font-mono tabular-nums">{stats.total_messages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={User} size={12} strokeWidth={1.5} color="currentColor" /> User
                </span>
                <span className="font-mono tabular-nums">{stats.user_messages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={Robot} size={12} strokeWidth={1.5} color="currentColor" /> Assistant
                </span>
                <span className="font-mono tabular-nums">{stats.assistant_messages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={Clock} size={12} strokeWidth={1.5} color="currentColor" /> Duration
                </span>
                <span className="font-mono tabular-nums">{formatDuration(stats.duration_minutes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">First message</span>
                <span className="text-xs">{formatFullDate(stats.first_message_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last message</span>
                <span className="text-xs">{formatFullDate(stats.last_message_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* User link */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <Link
                href={`/admin/users?search=${encodeURIComponent(convo.user_email || '')}`}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View user profile &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Raw metadata */}
          <Card>
            <CardHeader className="pb-2">
              <button
                onClick={() => setMetadataOpen(!metadataOpen)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-sm font-medium">Raw Metadata</CardTitle>
                <IconTooltip label={metadataOpen ? 'Collapse metadata' : 'Expand metadata'}>
                  <span className="shrink-0">
                    {metadataOpen ? <HugeiconsIcon icon={CaretUp} size={16} strokeWidth={1.5} color="currentColor" /> : <HugeiconsIcon icon={CaretDown} size={16} strokeWidth={1.5} color="currentColor" />}
                  </span>
                </IconTooltip>
              </button>
            </CardHeader>
            {metadataOpen && (
              <CardContent>
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto bg-muted/30 rounded-md p-3 max-h-[400px] overflow-y-auto">
                  {JSON.stringify(convo.metadata, null, 2) || 'null'}
                </pre>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
