"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Search,
  MessageSquare,
  Trash2,
  Edit3,
  Settings,
  User,
  LogOut,
  PanelLeftClose,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useConversations } from "@/hooks/use-conversations"
import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { useT } from "@/lib/providers/translation-provider"
import { useAuth } from "@/lib/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
    <div
      role="button"
      tabIndex={0}
      data-conversation-id={conversation.id}
      className={cn(
        "conversation-item group relative cursor-pointer rounded-lg mx-2",
        "min-h-[48px] px-3 py-2 flex items-center gap-2",
        "transition-[background-color,border-color] duration-150 ease-in-out",
        isActive && "bg-primary/10 border border-primary/20 border-l-2 border-l-primary",
        !isActive && "hover:bg-sidebar-accent/50 border border-transparent",
        isNavigatingToThis && "opacity-50 cursor-wait",
      )}
      onClick={() => {
        if (isNavigatingToThis) return
        onSelect(conversation.id)
      }}
    >
      <div className="flex-1 min-w-0 max-w-[180px]">
        <h3 className="font-medium text-sm truncate text-sidebar-foreground">
          {(conversation.title || newChatLabel).length > 25
            ? `${(conversation.title || newChatLabel).slice(0, 25)}...`
            : conversation.title || newChatLabel}
        </h3>
        <span className="text-[10px] text-muted-foreground/60 leading-none">
          {getRelativeTime(conversation.updated_at)}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit(conversation.id, conversation.title || newChatLabel)
          }}
          className="p-1.5 rounded hover:bg-sidebar-accent transition-colors opacity-70 hover:opacity-100 text-muted-foreground hover:text-sidebar-foreground"
          title="Rename conversation"
          aria-label="Rename conversation"
        >
          <Edit3 className="h-4 w-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(conversation.id)
          }}
          className="p-1.5 rounded hover:bg-red-500/20 transition-colors opacity-70 hover:opacity-100"
          title="Delete conversation"
          aria-label="Delete conversation"
        >
          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
        </button>
      </div>
    </div>
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
        isMobileSheet ? "w-full h-full" : "w-[280px] h-screen border-r",
        "flex flex-col bg-sidebar",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-sidebar-border/30">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-80"
          >
            <Image
              src="/pelican-logo-transparent.webp"
              alt="PelicanAI"
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-base text-primary">
              PelicanAI
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {onToggleCollapse && !isMobileSheet && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8 hover:bg-sidebar-accent/50"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewConversation}
          className="w-full h-10 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-700 hover:via-violet-700 hover:to-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t.common.newChat}
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-sidebar-border/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t.common.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 pr-3 bg-sidebar/50 border-sidebar-border/50"
          />
        </div>
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
              <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground/20" />
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
                  <h4 className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  <h4 className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  <h4 className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  <h4 className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  <h4 className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    {loadingMore ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      "Load more conversations"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border/30 space-y-2">
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Admin Panel</span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex-1 justify-start h-10 px-3 hover:bg-sidebar-accent/50"
          >
            <Link href="/profile" className="flex items-center gap-3">
              <Avatar className="w-8 h-8 ring-2 ring-sidebar-border/50">
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback className="bg-primary/20 text-primary">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{t.common.account}</p>
                <p className="text-[10px] text-muted-foreground">{t.common.viewProfile}</p>
              </div>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-10 w-10 hover:bg-sidebar-accent/50"
          >
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSignOutDialog(true)}
                className="h-10 w-10 hover:bg-sidebar-accent/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
              <Trash2 className="h-5 w-5 text-destructive" />
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
