'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChatCircle,
  CaretDown,
  CaretUp,
  CircleNotch,
  Plus,
  Clock,
  Hash,
  CreditCard,
  ArrowUpRight,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { formatLine } from '@/components/chat/message/format-utils'

interface UserDetailProps {
  user: {
    id: string
    displayName: string | null
    email: string
    createdAt: string
    isAdmin: boolean
    plan: string
    creditsBalance: number
    creditsUsed: number
    freeQuestionsRemaining: number
  }
}

interface DetailData {
  totalMessages: number
  totalConversations: number
  lastActive: string | null
  recentConversations: {
    id: string
    title: string
    createdAt: string
    messageCount: number
  }[]
}

interface ConvoMessage {
  id: string
  role: string
  content: string
  created_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
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
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MessageBubble({ msg }: { msg: ConvoMessage }) {
  const [expanded, setExpanded] = useState(false)
  const isUser = msg.role === 'user'
  const isLong = msg.content.length > 500

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-blue-600/20 text-blue-100'
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="text-[10px] text-muted-foreground mb-1">
          {isUser ? 'User' : 'Assistant'} &middot; {formatTime(msg.created_at)}
        </p>
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">
            {isLong && !expanded ? msg.content.slice(0, 500) + '...' : msg.content}
          </p>
        ) : (
          <div
            className="break-words space-y-1"
            dangerouslySetInnerHTML={{
              __html: (() => {
                const text = isLong && !expanded ? msg.content.slice(0, 500) + '...' : msg.content
                return text.split('\n').map((line) => formatLine(line)).join('<br />')
              })(),
            }}
          />
        )}
        {isLong && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  )
}

export function UserDetail({ user }: UserDetailProps) {
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)

  const [expandedConvoId, setExpandedConvoId] = useState<string | null>(null)
  const [messagesCache, setMessagesCache] = useState<Record<string, ConvoMessage[]>>({})
  const [messagesLoading, setMessagesLoading] = useState<string | null>(null)

  const [grantAmount, setGrantAmount] = useState('')
  const [granting, setGranting] = useState(false)
  const [grantResult, setGrantResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [currentBalance, setCurrentBalance] = useState(user.creditsBalance)

  // Fetch enhanced detail on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${user.id}/detail`)
        if (res.ok && !cancelled) {
          setDetail(await res.json())
        }
      } catch {

      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user.id])

  // Toggle conversation messages
  const handleConvoToggle = useCallback(async (id: string) => {
    if (expandedConvoId === id) {
      setExpandedConvoId(null)
      return
    }
    setExpandedConvoId(id)
    if (messagesCache[id]) return

    setMessagesLoading(id)
    try {
      const res = await fetch(`/api/admin/conversations/${id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessagesCache((prev) => ({ ...prev, [id]: data.messages ?? [] }))
      }
    } catch {

    } finally {
      setMessagesLoading(null)
    }
  }, [expandedConvoId, messagesCache])

  // Grant credits
  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(grantAmount)
    if (!amount || amount <= 0 || amount >= 10000) {
      setGrantResult({ ok: false, msg: 'Enter a number between 1 and 9999' })
      return
    }
    setGranting(true)
    setGrantResult(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/grant-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentBalance(data.credits_balance)
        setGrantAmount('')
        setGrantResult({ ok: true, msg: `Granted ${amount} credits. New balance: ${data.credits_balance}` })
      } else {
        const data = await res.json().catch(() => null)
        setGrantResult({ ok: false, msg: data?.error ?? 'Failed to grant credits' })
      }
    } catch {
      setGrantResult({ ok: false, msg: 'Network error' })
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="p-4 space-y-5">
      {/* Basic info grid */}
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
        <div>
          <p className="text-muted-foreground">User ID</p>
          <p className="font-mono text-xs break-all mt-0.5">{user.id}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p className="mt-0.5">{user.email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Signed Up</p>
          <p className="mt-0.5">{formatDate(user.createdAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Role</p>
          <p className="mt-0.5">
            {user.isAdmin ? (
              <Badge variant="destructive">Admin</Badge>
            ) : (
              <Badge variant="outline">User</Badge>
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Plan</p>
          <p className="mt-0.5 capitalize">{user.plan}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Credits Balance</p>
          <p className="mt-0.5 font-medium">{currentBalance.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Credits Used (Month)</p>
          <p className="mt-0.5">{user.creditsUsed.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Free Questions Left</p>
          <p className="mt-0.5">{user.freeQuestionsRemaining}</p>
        </div>
      </div>

      {/* Enhanced stats from API */}
      {detailLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleNotch size={12} weight="regular" className="animate-spin" />
          Loading activity data...
        </div>
      ) : detail ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Hash size={12} weight="regular" /> Total Messages
            </div>
            <p className="text-lg font-semibold">{detail.totalMessages.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ChatCircle size={12} weight="regular" /> Conversations
            </div>
            <p className="text-lg font-semibold">{detail.totalConversations.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock size={12} weight="regular" /> Last Active
            </div>
            <p className="text-lg font-semibold">
              {detail.lastActive ? timeAgo(detail.lastActive) : 'Never'}
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CreditCard size={12} weight="regular" /> Avg Msgs/Convo
            </div>
            <p className="text-lg font-semibold">
              {detail.totalConversations > 0
                ? Math.round(detail.totalMessages / detail.totalConversations)
                : 0}
            </p>
          </div>
        </div>
      ) : null}

      {/* Recent conversations */}
      {detail && detail.recentConversations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Conversations</h4>
          <div className="space-y-1">
            {detail.recentConversations.map((conv) => {
              const isExpanded = expandedConvoId === conv.id
              const messages = messagesCache[conv.id]
              const isLoading = messagesLoading === conv.id

              return (
                <div key={conv.id}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConvoToggle(conv.id) }}
                      className="flex-1 flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors text-left min-w-0"
                    >
                      <ChatCircle size={14} weight="regular" className="shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1 font-medium">{conv.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {conv.messageCount} msgs &middot; {formatShortDate(conv.createdAt)}
                      </span>
                      {isExpanded ? (
                        <CaretUp size={14} weight="regular" className="shrink-0 text-muted-foreground" />
                      ) : (
                        <CaretDown size={14} weight="regular" className="shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    <IconTooltip label="Open full view">
                      <Link
                        href={`/admin/conversations/${conv.id}`}
                        className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ArrowUpRight size={14} weight="regular" />
                      </Link>
                    </IconTooltip>
                  </div>

                  {isExpanded && (
                    <div className="ml-6 mr-2 mb-2 mt-1 border-l-2 border-border pl-3 space-y-2">
                      {isLoading && (
                        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                          <CircleNotch size={12} weight="regular" className="animate-spin" />
                          Loading messages...
                        </div>
                      )}
                      {!isLoading && messages && messages.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">No messages</p>
                      )}
                      {!isLoading && messages && messages.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {messages.map((msg) => (
                            <MessageBubble key={msg.id} msg={msg} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Grant Credits */}
      <div>
        <h4 className="text-sm font-medium mb-2">Grant Credits</h4>
        <form onSubmit={handleGrant} className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Amount"
            value={grantAmount}
            onChange={(e) => setGrantAmount(e.target.value)}
            className="w-28"
            min={1}
            max={9999}
          />
          <Button type="submit" size="sm" disabled={granting} onClick={(e) => e.stopPropagation()}>
            {granting ? (
              <CircleNotch size={12} weight="regular" className="animate-spin mr-1" />
            ) : (
              <Plus size={12} weight="regular" className="mr-1" />
            )}
            Grant
          </Button>
          {grantResult && (
            <span className={`text-xs ${grantResult.ok ? 'text-green-400' : 'text-red-400'}`}>
              {grantResult.msg}
            </span>
          )}
        </form>
      </div>
    </div>
  )
}
