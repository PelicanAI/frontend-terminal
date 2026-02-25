"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trade, CloseTradeData } from "@/hooks/use-trades"
import { PelicanButton } from "@/components/ui/pelican"
import { toast } from "@/hooks/use-toast"

interface CloseTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: Trade | null
  onSubmit: (data: CloseTradeData) => Promise<void>
}

export function CloseTradeModal({ open, onOpenChange, trade, onSubmit }: CloseTradeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exitPrice, setExitPrice] = useState("")
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState("")
  const [mistakes, setMistakes] = useState("")

  if (!trade) return null

  const calculatePnL = () => {
    if (!exitPrice) return null

    const exit = parseFloat(exitPrice)
    const entry = trade.entry_price
    const qty = trade.quantity

    let pnlAmount: number
    let pnlPercent: number

    if (trade.direction === 'long') {
      pnlAmount = (exit - entry) * qty
      pnlPercent = ((exit - entry) / entry) * 100
    } else {
      // Short
      pnlAmount = (entry - exit) * qty
      pnlPercent = ((entry - exit) / entry) * 100
    }

    const rMultiple = trade.stop_loss
      ? pnlAmount / (Math.abs(entry - trade.stop_loss) * qty)
      : null

    return { pnlAmount, pnlPercent, rMultiple }
  }

  const pnl = calculatePnL()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!exitPrice || !exitDate) return

    setIsSubmitting(true)

    try {
      await onSubmit({
        exit_price: parseFloat(exitPrice),
        exit_date: exitDate,
        notes: notes || null,
        mistakes: mistakes || null,
      })

      // Reset form
      setExitPrice("")
      setExitDate(new Date().toISOString().split('T')[0])
      setNotes("")
      setMistakes("")

      onOpenChange(false)
    } catch (error) {
      toast({ title: "Failed to close trade", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = "w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[var(--bg-elevated)] border-[var(--border-subtle)] rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.5),0_16px_48px_rgba(0,0,0,0.25)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Close Trade</DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Close {trade.ticker} {trade.direction} position
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Trade Summary */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Entry Price</span>
              <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">
                ${trade.entry_price.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Quantity</span>
              <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">{trade.quantity}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Direction</span>
              <span
                className={`font-medium uppercase text-xs px-2 py-0.5 rounded-full ${
                  trade.direction === 'long'
                    ? 'bg-[var(--data-positive)]/20 text-[var(--data-positive)]'
                    : 'bg-[var(--data-negative)]/20 text-[var(--data-negative)]'
                }`}
              >
                {trade.direction}
              </span>
            </div>
          </div>

          {/* Exit Price */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
              Exit Price <span className="text-[var(--data-negative)]">*</span>
            </label>
            <input
              type="number"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              step="any"
              min="0"
              required
              autoFocus
              className={`${inputClass} font-mono tabular-nums`}
              placeholder="155.00"
            />
          </div>

          {/* Exit Date */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
              Exit Date <span className="text-[var(--data-negative)]">*</span>
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {/* P&L Preview */}
          {pnl && (
            <div
              className={`p-3 rounded-xl border ${
                pnl.pnlAmount >= 0
                  ? 'bg-[var(--data-positive)]/10 border-[var(--data-positive)]/30'
                  : 'bg-[var(--data-negative)]/10 border-[var(--data-negative)]/30'
              }`}
            >
              <div className="text-xs text-[var(--text-muted)] mb-1">Projected P&L</div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums ${
                  pnl.pnlAmount >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
                }`}
              >
                {pnl.pnlAmount >= 0 ? '+' : ''}${pnl.pnlAmount.toFixed(2)}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm font-mono tabular-nums">
                <span className={pnl.pnlPercent >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}>
                  {pnl.pnlPercent >= 0 ? '+' : ''}
                  {pnl.pnlPercent.toFixed(2)}%
                </span>
                {pnl.rMultiple !== null && (
                  <span className="text-[var(--text-muted)]">
                    {pnl.rMultiple.toFixed(2)}R
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Exit Notes */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
              Exit Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors resize-none"
              placeholder="Why did you exit? What did you learn?"
            />
          </div>

          {/* Mistakes / Lessons */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
              Mistakes / Lessons
            </label>
            <textarea
              value={mistakes}
              onChange={(e) => setMistakes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors resize-none"
              placeholder="What would you do differently?"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <PelicanButton
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </PelicanButton>
            <PelicanButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || !exitPrice}
              className="flex-1"
            >
              {isSubmitting ? 'Closing...' : 'Close Trade'}
            </PelicanButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
