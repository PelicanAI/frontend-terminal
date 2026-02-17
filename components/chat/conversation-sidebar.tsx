"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
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
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useConversations } from "@/hooks/use-conversations"
import Link from "next/link"
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
      <div className="px-3 py-2 mx-2">
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
          className="h-8 text-sm"
        />
      </div>
    )
  }

  return (
    <button
      data-conversation-id={conversation.id}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg transition-all duration-150 group relative mx-2",
        isActive && "bg-[rgba(139,92,246,0.10)] border-l-2 border-l-[var(--accent-purple)] border-y border-r border-y-transparent border-r-transparent",
        !isActive && "hover:bg-white/[0.05] border border-transparent",
        isNavigatingToThis && "opacity-50 cursor-wait",
      )}
      onClick={() => {
        if (isNavigatingToThis) return
        onSelect(conversation.id)
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--text-primary)] truncate font-medium">
            {conversation.title || newChatLabel}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {getRelativeTime(conversation.updated_at)}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStartEdit(conversation.id, conversation.title || newChatLabel)
            }}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Rename conversation"
            aria-label="Rename conversation"
          >
            <PencilSimple size={14} weight="regular" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(conversation.id)
            }}
            className="p-1 rounded hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300"
            title="Delete conversation"
            aria-label="Delete conversation"
          >
            <Trash size={14} weight="regular" />
          </button>
        </div>
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
      className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-colors"
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
}: ConversationSidebarProps) {
  const t = useT()
  const { signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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
        "relative z-20",
        isMobileSheet ? "w-full h-full" : "w-[280px] h-screen border-r border-[var(--border-subtle)]",
        "flex flex-col bg-sidebar",
        className,
      )}
    >
      {/* Header */}
      <div className="p-3 space-y-2 border-b border-sidebar-border/30">
        {/* New Chat + Search + Collapse Row */}
        <div className="flex gap-2 items-center">
          <button
            onClick={onNewConversation}
            className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-[var(--accent-purple-muted)] text-[var(--accent-purple-hover)] text-xs font-medium hover:bg-[rgba(139,92,246,0.22)] border border-[rgba(139,92,246,0.15)] hover:border-[rgba(139,92,246,0.30)] transition-all duration-200"
          >
            <Plus size={14} weight="bold" />
            New
          </button>
          <button
            onClick={() => setSearchExpanded(!searchExpanded)}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors",
              searchExpanded ? "bg-[var(--surface-2)] text-[var(--accent-purple)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
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

      {/* Conversations List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2">
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
            <div className="space-y-4">
              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div>
                  <h4 className="px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Today
                  </h4>
                  <div className="space-y-1">
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
                  <h4 className="px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Yesterday
                  </h4>
                  <div className="space-y-1">
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
                  <h4 className="px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Previous 7 Days
                  </h4>
                  <div className="space-y-1">
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
                  <h4 className="px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Previous 30 Days
                  </h4>
                  <div className="space-y-1">
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
                  <h4 className="px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Older
                  </h4>
                  <div className="space-y-1">
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

              {/* Load More */}
              {hasMore && (
                <div className="px-4 py-3">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]/60 transition-colors rounded-md disabled:opacity-50"
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
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 px-3 py-3 border-t border-sidebar-border/30 space-y-1">
        {/* Theme toggle */}
        <ThemeRow />

        {/* Admin panel link — only for admins */}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors duration-150"
          >
            <Shield size={16} weight="regular" />
            <span>Admin Panel</span>
          </Link>
        )}

        {/* User profile row */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-[var(--accent-purple-muted)] flex items-center justify-center text-xs font-medium text-[var(--accent-purple-hover)]">
            <User size={14} weight="regular" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{t.common.account}</p>
          </div>
          <Gear size={14} weight="regular" className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
        </Link>

        {/* Sign out */}
        <button
          onClick={() => setShowSignOutDialog(true)}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.05] transition-colors"
        >
          <SignOut size={14} weight="regular" />
          Sign out
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
