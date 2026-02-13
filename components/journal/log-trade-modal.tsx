"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { TickerAutocomplete } from "./ticker-autocomplete"
import { TradeFormData } from "@/hooks/use-trades"

interface LogTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TradeFormData) => Promise<void>
  initialTicker?: string
}

export function LogTradeModal({ open, onOpenChange, onSubmit, initialTicker = "" }: LogTradeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticker, setTicker] = useState(initialTicker)
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [quantity, setQuantity] = useState("")
  const [entryPrice, setEntryPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [thesis, setThesis] = useState("")
  const [notes, setNotes] = useState("")
  const [setupTags, setSetupTags] = useState("")
  const [conviction, setConviction] = useState("5")
  const [isPaper, setIsPaper] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ticker || !quantity || !entryPrice || !entryDate) {
      return
    }

    setIsSubmitting(true)

    try {
      const tags = setupTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await onSubmit({
        ticker,
        direction,
        quantity: parseFloat(quantity),
        entry_price: parseFloat(entryPrice),
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        entry_date: entryDate,
        thesis: thesis || null,
        notes: notes || null,
        setup_tags: tags.length > 0 ? tags : undefined,
        conviction: parseInt(conviction),
        is_paper: isPaper,
      })

      // Reset form
      setTicker("")
      setDirection('long')
      setQuantity("")
      setEntryPrice("")
      setStopLoss("")
      setTakeProfit("")
      setEntryDate(new Date().toISOString().split('T')[0])
      setThesis("")
      setNotes("")
      setSetupTags("")
      setConviction("5")
      setIsPaper(false)

      onOpenChange(false)
    } catch (error) {
      console.error('Error logging trade:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Trade</DialogTitle>
          <DialogDescription>
            Record a trade entry with all relevant details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Ticker */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Ticker <span className="text-red-400">*</span>
            </label>
            <TickerAutocomplete
              value={ticker}
              onChange={setTicker}
              placeholder="Search ticker (e.g., AAPL)"
              autoFocus
            />
          </div>

          {/* Direction */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Direction <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors
                  ${
                    direction === 'long'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/[0.06] border border-border text-foreground/70 hover:bg-white/[0.08]'
                  }
                `}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors
                  ${
                    direction === 'short'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/[0.06] border border-border text-foreground/70 hover:bg-white/[0.08]'
                  }
                `}
              >
                Short
              </button>
            </div>
          </div>

          {/* Quantity & Entry Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Quantity <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="any"
                min="0"
                required
                className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Entry Price <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                step="any"
                min="0"
                required
                className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                placeholder="150.00"
              />
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Stop Loss
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                step="any"
                min="0"
                className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                placeholder="140.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Take Profit
              </label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                step="any"
                min="0"
                className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                placeholder="160.00"
              />
            </div>
          </div>

          {/* Entry Date */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Entry Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          {/* Thesis */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Trade Thesis
            </label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
              placeholder="Why are you taking this trade?"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
              placeholder="Additional notes"
            />
          </div>

          {/* Setup Tags */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Setup Tags
            </label>
            <input
              type="text"
              value={setupTags}
              onChange={(e) => setSetupTags(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              placeholder="breakout, momentum, swing (comma-separated)"
            />
          </div>

          {/* Conviction */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Conviction (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={conviction}
              onChange={(e) => setConviction(e.target.value)}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-foreground/50 mt-1">
              <span>Low</span>
              <span className="text-purple-400 font-medium">{conviction}</span>
              <span>High</span>
            </div>
          </div>

          {/* Paper Trading Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-border">
            <input
              type="checkbox"
              id="isPaper"
              checked={isPaper}
              onChange={(e) => setIsPaper(e.target.checked)}
              className="w-4 h-4 rounded border-border text-purple-600 focus:ring-purple-500 focus:ring-offset-0 bg-white/[0.06]"
            />
            <label htmlFor="isPaper" className="text-sm text-foreground cursor-pointer">
              Paper trade (simulated)
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-white/[0.06] border border-border text-foreground hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !ticker || !quantity || !entryPrice}
              className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Logging...' : 'Log Trade'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
