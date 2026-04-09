"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon as Warning, Delete01Icon as Trash } from "@hugeicons/core-free-icons"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface ConfirmDestructiveActionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  itemCount?: number
  itemType?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  confirmText?: string
  requireTypedConfirmation?: boolean
  typedConfirmationValue?: string
}

export function ConfirmDestructiveAction({
  open,
  onOpenChange,
  title,
  description,
  itemCount,
  itemType,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  requireTypedConfirmation = false,
  typedConfirmationValue = "",
}: ConfirmDestructiveActionProps) {
  const [loading, setLoading] = useState(false)
  const [typedValue, setTypedValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const canConfirm = requireTypedConfirmation
    ? typedValue === typedConfirmationValue
    : true

  // Reset typed value when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTypedValue("")
      // Focus the input after a brief delay for the animation
      if (requireTypedConfirmation) {
        setTimeout(() => inputRef.current?.focus(), 200)
      }
    }
  }, [open, requireTypedConfirmation])

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Error handled by caller via toast
    } finally {
      setLoading(false)
    }
  }, [onConfirm, onOpenChange, canConfirm])

  const handleCancel = useCallback(() => {
    onCancel?.()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  const summaryLine = itemCount && itemType
    ? `${itemCount} ${itemType}${itemCount > 1 ? "" : ""} will be affected.`
    : null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--data-negative)]/10 flex items-center justify-center">
              <HugeiconsIcon icon={Warning} size={20} className="text-[var(--data-negative)]" strokeWidth={2} color="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle className="text-[var(--text-primary)] text-base font-semibold">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--text-secondary)] text-sm leading-relaxed mt-1">
                {description}
              </AlertDialogDescription>
            </div>
          </div>

          {summaryLine && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--data-negative)]/5 border border-[var(--data-negative)]/10">
              <p className="text-xs text-[var(--data-negative)] font-medium font-mono tabular-nums">
                {summaryLine}
              </p>
            </div>
          )}

          {requireTypedConfirmation && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                Type <span className="font-mono text-[var(--text-secondary)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded">{typedConfirmationValue}</span> to confirm:
              </p>
              <input
                ref={inputRef}
                type="text"
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canConfirm) {
                    e.preventDefault()
                    handleConfirm()
                  }
                }}
                placeholder={typedConfirmationValue}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--data-negative)]/50 focus:ring-1 focus:ring-[var(--data-negative)]/20 transition-colors font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={loading}
            className="bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={loading || !canConfirm}
            className={cn(
              "transition-all",
              "bg-[var(--data-negative)] text-white hover:bg-[var(--data-negative)]/90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Trash} size={14} strokeWidth={2} color="currentColor" />
                {confirmText}
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


// ── Hook for managing destructive action confirmation state ────────────

export interface DestructiveActionState {
  isOpen: boolean
  title: string
  description: string
  itemCount?: number
  itemType?: string
  confirmText?: string
  requireTypedConfirmation?: boolean
  typedConfirmationValue?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
}

const INITIAL_STATE: DestructiveActionState = {
  isOpen: false,
  title: "",
  description: "",
  onConfirm: () => {},
}

export function useDestructiveAction() {
  const [state, setState] = useState<DestructiveActionState>(INITIAL_STATE)

  const requestConfirmation = useCallback(
    (config: Omit<DestructiveActionState, "isOpen">) => {
      setState({ ...config, isOpen: true })
    },
    []
  )

  const close = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    state,
    requestConfirmation,
    close,
    setOpen: (open: boolean) => {
      if (!open) close()
    },
  }
}


// ── Destructive action types for AI agent interception ────────────────

const DESTRUCTIVE_ACTION_TYPES = new Set([
  "close_trade",
  "remove_watchlist",
])

/**
 * Check if a message action type is considered destructive
 * and should require user confirmation before executing.
 */
export function isDestructiveAction(actionType: string): boolean {
  return DESTRUCTIVE_ACTION_TYPES.has(actionType)
}
