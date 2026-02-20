"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import {
  Plus,
  MagnifyingGlass,
  ChatCircle,
  Trash,
  PencilSimple,
  Gear,
  User,
  SignOut,
  Shield,
  CaretLeft,
  Sun,
  Moon,
  BookmarkSimple,
  CaretDown,
  CaretUp,
  ArrowLeft,
  DotsThree,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useConversations } from "@/hooks/use-conversations"
import { useSavedInsights } from "@/hooks/use-saved-insights"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/providers/translation-provider"
import { useAuth } from "@/lib/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  archived?: boolean
}

interface ConversationSidebarProps {
  currentConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onNewConversation: () => void
  className?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isMobileSheet?: boolean
  isNavigating?: boolean
  navigatingToId?: string
  width?: number
  onWidthChange?: (width: number) => void
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  isEditing: boolean
  isNavigatingToThis: boolean
  editTitle: string
  onSelect: (id: string) => void
  onStartEdit: (id: string, currentTitle: string) => void
  onCancelEdit: () => void
  onConfirmEdit: (id: string, newTitle: string) => void
  onEditTitleChange: (title: string) => void
  onDelete: (id: string) => void
  newChatLabel: string
}

const ConversationItem = React.memo(function ConversationItem({
  conversation,
  isActive,
  isEditing,
  isNavigatingToThis,
  editTitle,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onEditTitleChange,
  onDelete,
  newChatLabel,
}: ConversationItemProps) {
  if (isEditing) {
    return (
      <div className="px-2 py-1.5 mx-1">
        <Input
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onConfirmEdit(conversation.id, editTitle)
            } else if (e.key === 'Escape') {
              onCancelEdit()
            }
          }}
          onBlur={() => {
            if (editTitle.trim()) {
              onConfirmEdit(conversation.id, editTitle)
            } else {
              onCancelEdit()
            }
          }}
          autoFocus
          className="h-7 text-sm"
        />
      </div>
    )
  }

  return (
    <button
      data-conversation-id={conversation.id}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded-lg transition-all duration-150 group relative mx-1 overflow-hidden",
        isActive && "bg-black/[0.08] dark:bg-white/[0.12] text-foreground",
        !isActive && "hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground",
        isNavigatingToThis && "opacity-50 cursor-wait",
      )}
      onClick={() => {
        if (isNavigatingToThis) return
        onSelect(conversation.id)
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground truncate font-medium">
            {conversation.title || newChatLabel}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation() }}
              className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent/10 text-muted-foreground transition-opacity shrink-0"
            >
              <DotsThree size={16} weight="bold" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onStartEdit(conversation.id, conversation.title || newChatLabel)
              }}
            >
              <PencilSimple size={14} weight="regular" className="mr-2" />
              Rename
            </DropdownMenuItem>
            {/* TODO: Pin Chat — add pin functionality */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conversation.id)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash size={14} weight="regular" className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>
  )
})

const getRelativeTime = (date: string): string => {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const isDark = resolvedTheme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
    >
      {isDark ? <Sun size={14} weight="regular" /> : <Moon size={14} weight="regular" />}
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}

export function ConversationSidebar({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  className,
  isCollapsed = false,
  onToggleCollapse,
  isMobileSheet = false,
  isNavigating = false,
  navigatingToId,
  width,
  onWidthChange,
}: ConversationSidebarProps) {
  const t = useT()
  const router = useRouter()
  const { signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sidebarView, setSidebarView] = useState<'conversations' | 'insights'>('conversations')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const { items: savedInsights, deleteInsight } = useSavedInsights()

  // Drag-to-resize
  const MIN_WIDTH = 220
  const MAX_WIDTH = 480
  const DEFAULT_WIDTH = 280
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onWidthChange) return
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startWidth = width ?? DEFAULT_WIDTH

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
      onWidthChange(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, onWidthChange])

  const handleDoubleClick = useCallback(() => {
    onWidthChange?.(DEFAULT_WIDTH)
  }, [onWidthChange])

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  // Close profile menu on click outside
  useEffect(() => {
    if (!showProfileMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_credits')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true)
        })
    })
  }, [])

  const { list: conversations, loading, remove, rename, hasMore, loadingMore, loadMore } = useConversations()

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch && !conv.archived
    })
  }, [conversations, searchQuery])

  // Group conversations by time
  const groupedConversations = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const groups = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      previous7Days: [] as Conversation[],
      previous30Days: [] as Conversation[],
      older: [] as Conversation[],
    }

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.updated_at)
      if (convDate >= today) {
        groups.today.push(conv)
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv)
      } else if (convDate >= sevenDaysAgo) {
        groups.previous7Days.push(conv)
      } else if (convDate >= thirtyDaysAgo) {
        groups.previous30Days.push(conv)
      } else {
        groups.older.push(conv)
      }
    })

    return groups
  }, [filteredConversations])

  const handleDeleteConversation = async () => {
    if (!deletingId) return
    
    const success = await remove(deletingId)
    if (success && currentConversationId === deletingId) {
      onNewConversation()
    }
    setDeletingId(null)
  }

  const handleRenameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    if (newTitle && newTitle.trim()) {
      await rename(conversationId, newTitle.trim())
      setEditingId(null)
      setEditTitle("")
    }
  }, [rename])

  const handleStartEdit = useCallback((id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle("")
  }, [])

  const handleEditTitleChange = useCallback((title: string) => {
    setEditTitle(title)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id)
  }, [])

  const handleSelect = useCallback((id: string) => {
    onConversationSelect?.(id)
  }, [onConversationSelect])

  if (isCollapsed && !isMobileSheet) {
    return null
  }

  return (
    <div
      className={cn(
        "relative z-20 overflow-hidden",
        isMobileSheet ? "w-full h-full" : "h-full border-r border-[var(--border-subtle)]",
        "flex flex-col bg-sidebar",
        className,
      )}
      style={!isMobileSheet ? { width: width ?? DEFAULT_WIDTH } : undefined}
    >
      {/* Drag handle for resize */}
      {!isMobileSheet && onWidthChange && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-30"
        >
          <div
            className={cn(
              "w-full h-full transition-colors",
              isDragging
                ? "bg-[var(--accent-indigo)]"
                : "bg-transparent group-hover:bg-[var(--border-default)]"
            )}
          />
        </div>
      )}
      {/* Header */}
      <div className="p-3 space-y-2 border-b border-sidebar-border/30">
        {/* New Chat + Search + Collapse Row */}
        <div className="flex gap-2 items-center">
          <button
            onClick={onNewConversation}
            className="flex items-center gap-1.5 h-7 px-3 rounded-md text-muted-foreground text-xs font-medium hover:text-foreground hover:bg-accent/10 border border-border/30 hover:border-border/50 transition-all duration-150"
          >
            <Plus size={14} weight="bold" />
            New
          </button>
          <button
            onClick={() => setSearchExpanded(!searchExpanded)}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors",
              searchExpanded ? "bg-[var(--surface-2)] text-[var(--accent-indigo)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
            )}
          >
            <MagnifyingGlass size={14} weight="regular" />
          </button>
          {onToggleCollapse && !isMobileSheet && (
            <button
              onClick={onToggleCollapse}
              className="h-7 w-7 flex items-center justify-center rounded-md flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors ml-auto"
              title="Collapse sidebar"
            >
              <CaretLeft size={14} weight="regular" />
            </button>
          )}
        </div>

        {/* Expandable Search Input */}
        {searchExpanded && (
          <div className="relative">
            <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-10 pr-3 bg-sidebar/50 border-sidebar-border/50 text-sm"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Saved Insights toggle */}
      {savedInsights.length > 0 && (
        <div className="border-b border-sidebar-border/30">
          <button
            onClick={() => setSidebarView(sidebarView === 'insights' ? 'conversations' : 'insights')}
            className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-[var(--surface-hover)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BookmarkSimple size={12} weight={sidebarView === 'insights' ? 'fill' : 'bold'} />
              Saved Insights
              <span className="text-[10px] text-muted-foreground">
                {savedInsights.length}
              </span>
            </span>
            <CaretDown
              size={10}
              style={{
                transform: sidebarView === 'insights' ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 150ms ease',
                color: 'var(--text-muted)',
              }}
            />
          </button>
        </div>
      )}

      {/* Main content area — conversations or saved insights */}
      <ScrollArea className="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]>div]:!min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!block">
        {sidebarView === 'conversations' ? (
          <div className="py-2 overflow-hidden">
            {loading ? (
              <div className="space-y-1 px-2 py-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 rounded shimmer" style={{ width: `${65 + (i * 7) % 30}%` }} />
                      <div className="h-2.5 rounded shimmer" style={{ width: `${40 + (i * 11) % 35}%`, animationDelay: `${i * 150}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
                <ChatCircle size={32} weight="regular" className="mb-2 text-muted-foreground/20" />
                <p className="text-xs font-medium text-muted-foreground/60">
                  {t.chat.emptyConversations}
                </p>
                <p className="text-xs mt-1 text-muted-foreground/40">
                  Click &quot;{t.common.newChat}&quot; to start
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Today */}
                {groupedConversations.today.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Today
                    </h4>
                    <div className="space-y-0.5">
                      {groupedConversations.today.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={currentConversationId === conv.id}
                          isEditing={editingId === conv.id}
                          isNavigatingToThis={isNavigating && navigatingToId === conv.id}
                          editTitle={editTitle}
                          onSelect={handleSelect}
                          onStartEdit={handleStartEdit}
                          onCancelEdit={handleCancelEdit}
                          onConfirmEdit={handleRenameConversation}
                          onEditTitleChange={handleEditTitleChange}
                          onDelete={handleDelete}
                          newChatLabel={t.common.newChat}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {groupedConversations.yesterday.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Yesterday
                    </h4>
                    <div className="space-y-0.5">
                      {groupedConversations.yesterday.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={currentConversationId === conv.id}
                          isEditing={editingId === conv.id}
                          isNavigatingToThis={isNavigating && navigatingToId === conv.id}
                          editTitle={editTitle}
                          onSelect={handleSelect}
                          onStartEdit={handleStartEdit}
                          onCancelEdit={handleCancelEdit}
                          onConfirmEdit={handleRenameConversation}
                          onEditTitleChange={handleEditTitleChange}
                          onDelete={handleDelete}
                          newChatLabel={t.common.newChat}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous 7 Days */}
                {groupedConversations.previous7Days.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Previous 7 Days
                    </h4>
                    <div className="space-y-0.5">
                      {groupedConversations.previous7Days.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={currentConversationId === conv.id}
                          isEditing={editingId === conv.id}
                          isNavigatingToThis={isNavigating && navigatingToId === conv.id}
                          editTitle={editTitle}
                          onSelect={handleSelect}
                          onStartEdit={handleStartEdit}
                          onCancelEdit={handleCancelEdit}
                          onConfirmEdit={handleRenameConversation}
                          onEditTitleChange={handleEditTitleChange}
                          onDelete={handleDelete}
                          newChatLabel={t.common.newChat}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous 30 Days */}
                {groupedConversations.previous30Days.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Previous 30 Days
                    </h4>
                    <div className="space-y-0.5">
                      {groupedConversations.previous30Days.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={currentConversationId === conv.id}
                          isEditing={editingId === conv.id}
                          isNavigatingToThis={isNavigating && navigatingToId === conv.id}
                          editTitle={editTitle}
                          onSelect={handleSelect}
                          onStartEdit={handleStartEdit}
                          onCancelEdit={handleCancelEdit}
                          onConfirmEdit={handleRenameConversation}
                          onEditTitleChange={handleEditTitleChange}
                          onDelete={handleDelete}
                          newChatLabel={t.common.newChat}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Older */}
                {groupedConversations.older.length > 0 && (
                  <div>
                    <h4 className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Older
                    </h4>
                    <div className="space-y-0.5">
                      {groupedConversations.older.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={currentConversationId === conv.id}
                          isEditing={editingId === conv.id}
                          isNavigatingToThis={isNavigating && navigatingToId === conv.id}
                          editTitle={editTitle}
                          onSelect={handleSelect}
                          onStartEdit={handleStartEdit}
                          onCancelEdit={handleCancelEdit}
                          onConfirmEdit={handleRenameConversation}
                          onEditTitleChange={handleEditTitleChange}
                          onDelete={handleDelete}
                          newChatLabel={t.common.newChat}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Load More — centered */}
                {hasMore && (
                  <div className="flex justify-center py-3 px-2">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {loadingMore ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        'Load older conversations'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Saved Insights view */
          <div className="py-2 px-2">
            {/* Back button */}
            <button
              onClick={() => setSidebarView('conversations')}
              className="flex items-center gap-1 px-2 py-2 mb-2 text-xs transition-colors rounded-md hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={14} />
              Back to conversations
            </button>

            {savedInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookmarkSimple size={28} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                  No saved insights yet
                </p>
                <p className="text-xs mt-1 text-center px-4" style={{ color: 'var(--text-muted)' }}>
                  Click &quot;Save Insight&quot; on any Pelican response to save it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedInsights.map(insight => (
                  <div
                    key={insight.id}
                    className="group relative rounded-lg p-3 cursor-pointer transition-colors hover:border-[var(--border-hover)]"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onClick={() => {
                      if (insight.conversation_id) {
                        onConversationSelect(insight.conversation_id)
                      }
                      setSidebarView('conversations')
                    }}
                  >
                    {/* Ticker badges */}
                    {insight.tickers?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {insight.tickers.map(ticker => (
                          <span
                            key={ticker}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                            style={{
                              background: 'rgba(34,197,94,0.1)',
                              color: 'rgb(34,197,94)',
                            }}
                          >
                            ${ticker}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Content preview */}
                    <p className="text-xs leading-relaxed line-clamp-4" style={{ color: 'var(--text-primary)' }}>
                      {insight.content}
                    </p>

                    {/* Footer: date + delete */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {getRelativeTime(insight.created_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteInsight(insight.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                        style={{ color: 'var(--text-muted)' }}
                        title="Remove"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer — Profile dropdown */}
      <div className="shrink-0 border-t border-sidebar-border/30 relative" ref={profileMenuRef}>
        {/* Profile menu popover */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-border/30 bg-popover shadow-lg py-1 z-50">
            <ThemeRow />
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors duration-150"
                onClick={() => setShowProfileMenu(false)}
              >
                <Shield size={14} weight="regular" />
                <span>Admin Panel</span>
              </Link>
            )}
            <Link
              href="/settings"
              className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              onClick={() => setShowProfileMenu(false)}
            >
              <Gear size={14} weight="regular" />
              Settings
            </Link>
            <button
              onClick={() => {
                setShowProfileMenu(false)
                setShowSignOutDialog(true)
              }}
              className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <SignOut size={14} weight="regular" />
              Sign out
            </button>
          </div>
        )}

        {/* Account button */}
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2.5 w-full px-3 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
        >
          <User size={14} weight="regular" />
          <span className="flex-1 text-left font-medium">{t.common.account}</span>
          <CaretUp
            size={12}
            weight="regular"
            className={cn(
              "transition-transform duration-150",
              showProfileMenu ? "rotate-180" : "rotate-0"
            )}
          />
        </button>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="sm:max-w-[425px] border-border/50 shadow-xl bg-background/95 backdrop-blur-md antialiased">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                signOut()
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash size={20} weight="regular" className="text-destructive" />
              Delete Conversation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete this conversation? All messages will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-muted">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConversation()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
