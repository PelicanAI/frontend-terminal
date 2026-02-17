"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import {
  Copy,
  ArrowsClockwise,
  Square,
  ShareNetwork,
  DotsThree,
  Check,
  GitBranch,
  PencilSimple,
  Trash,
  Star,
  SpinnerGap,
  X,
  FloppyDisk,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import { useToast } from "@/hooks/use-toast"
import { useConversations } from "@/hooks/use-conversations"
import type { Message } from "@/lib/chat-utils"
import { cn, safeTrim } from "@/lib/utils"

interface MessageActionsProps {
  message: Message
  onStop?: () => void
  onRegenerate?: () => void
  onEdit?: (id: string, newContent: string) => void
  onDelete?: (id: string) => void
  onPin?: (id: string) => void
  isRegenerating?: boolean
  canDelete?: boolean
  variant?: "full" | "minimal"
}

export function MessageActions({
  message,
  onStop,
  onRegenerate,
  onEdit,
  onDelete,
  onPin,
  isRegenerating = false,
  canDelete = true,
  variant = "full",
}: MessageActionsProps) {
  // Defensive check - ensure content is always a string
  const safeContent = typeof message.content === 'string' ? message.content : String(message.content || '')
  
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(safeContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { create } = useConversations()

  const handlePin = () => {
    onPin?.(message.id)
  }

  const handleDelete = () => {
    onDelete?.(message.id)
    setShowDeleteDialog(false)
    toast({
      title: "Message deleted",
      description: "Your message has been deleted successfully.",
      variant: "destructive",
    })
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [isEditing])

  const handleCopy = async () => {
    try {
      const markdownContent = `**${message.role === "user" ? "You" : "Pelican AI"}:** ${safeContent}`
      await navigator.clipboard.writeText(markdownContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied with formatting.",
      })
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pelican AI Chat",
          text: safeContent,
        })
      } catch {
        // User cancelled or error occurred
      }
    } else {
      handleCopy()
    }
  }

  const handleBranchChat = async () => {
    try {
      const conversation = await create("Branched Chat")
      if (conversation) {
        router.push(`/chat?conversation=${conversation.id}&branch=${message.id}`)
        toast({
          title: "New chat created",
          description: "Started a new conversation from this message.",
        })
      }
    } catch {
      toast({
        title: "Failed to branch chat",
        description: "Could not create a new conversation.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = () => {
    if (message.role === "user" && onEdit) {
      setIsEditing(true)
      setEditContent(safeContent)
    }
  }

  const handleSaveEdit = () => {
    const trimmedContent = safeTrim(editContent)
    if (trimmedContent !== "" && onEdit) {
      onEdit(message.id, trimmedContent)
      setIsEditing(false)
      toast({
        title: "Message updated",
        description: "Your message has been edited successfully.",
      })
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(safeContent)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancelEdit()
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSaveEdit()
    }
  }

  if (isEditing && message.role === "user") {
    return (
      <div className="w-full max-w-md ml-auto">
        <Textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none"
          placeholder="Edit your message..."
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
            <X size={12} weight="bold" className="mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={!safeTrim(editContent)}>
            <FloppyDisk size={12} weight="regular" className="mr-1" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1 min-h-[28px]">
          {message.isStreaming && onStop && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onStop} className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
                  <Square size={16} weight="fill" className="sm:!w-3 sm:!h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop generation</TooltipContent>
            </Tooltip>
          )}

          {message.role === "assistant" && onRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={isRegenerating || message.isStreaming}
                  className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 group/regen"
                >
                  {isRegenerating ? <SpinnerGap size={16} weight="regular" className="sm:!w-3 sm:!h-3 animate-spin" /> : <ArrowsClockwise size={16} weight="regular" className="sm:!w-3 sm:!h-3 transition-transform duration-200 group-hover/regen:-rotate-45" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRegenerating ? "Regenerating..." : "Regenerate response"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 min-h-[28px]">
        {message.isStreaming && onStop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onStop} className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
                <Square size={16} weight="fill" className="sm:!w-3 sm:!h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop generation</TooltipContent>
          </Tooltip>
        )}

        {/* Always show copy button, just disable it during streaming */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              disabled={message.isStreaming}
            >
              {copied ? <Check size={16} weight="regular" className="sm:!w-3 sm:!h-3" /> : <Copy size={16} weight="regular" className="sm:!w-3 sm:!h-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>

        {onPin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePin}
                    className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                    disabled={message.isStreaming}
                  >
                    <Star size={16} weight={message.isPinned ? "fill" : "regular"} className={cn("sm:!w-3 sm:!h-3", message.isPinned && "text-yellow-500")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{message.isPinned ? "Unpin message" : "Pin message"}</TooltipContent>
              </Tooltip>
            )}

        {message.role === "user" && onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                    disabled={message.isStreaming}
                  >
                    <PencilSimple size={16} weight="regular" className="sm:!w-3 sm:!h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit message</TooltipContent>
              </Tooltip>
            )}

        {message.role === "assistant" && onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRegenerate}
                    disabled={isRegenerating || message.isStreaming}
                    className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 group/regen"
                  >
                    {isRegenerating ? <SpinnerGap size={16} weight="regular" className="sm:!w-3 sm:!h-3 animate-spin" /> : <ArrowsClockwise size={16} weight="regular" className="sm:!w-3 sm:!h-3 transition-transform duration-200 group-hover/regen:-rotate-45" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRegenerating ? "Regenerating..." : "Regenerate response"}</TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 sm:h-7 sm:w-7 p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  disabled={message.isStreaming}
                >
                  <DotsThree size={16} weight="bold" className="sm:!w-3 sm:!h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {message.role === "assistant" && (
                  <DropdownMenuItem onClick={handleBranchChat}>
                    <GitBranch size={16} weight="regular" className="mr-2" />
                    Branch into new chat
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={handleShare}>
                  <ShareNetwork size={16} weight="regular" className="mr-2" />
                  Share
                </DropdownMenuItem>

                {canDelete && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash size={16} weight="regular" className="mr-2" />
                      Delete message
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
