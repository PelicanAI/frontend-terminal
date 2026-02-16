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
  const [error, setError] = useState<string | null>(null)
  const [ticker, setTicker] = useState(initialTicker)
  const [assetType, setAssetType] = useState('stock')
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

  // Normalize ticker for crypto/forex to ensure valid pairs
  const normalizeTicker = (tickerValue: string, assetTypeValue: string): string => {
    const t = tickerValue.toUpperCase().trim()

    if (assetTypeValue === 'crypto') {
      // BTC → BTCUSD, ETH → ETHUSD (if not already a pair)
      if (!t.endsWith('USD') && !t.endsWith('USDT') && !t.endsWith('BTC') && !t.endsWith('ETH')) {
        return `${t}USD`
      }
    }

    if (assetTypeValue === 'forex') {
      // EUR → EURUSD, GBP → GBPUSD (if only 3 chars)
      if (t.length === 3) {
        return `${t}USD`
      }
    }

    return t
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!ticker || !quantity || !entryPrice || !entryDate) {
      setError("Please fill in all required fields (Ticker, Quantity, Entry Price, Entry Date)")
      return
    }

    setIsSubmitting(true)

    try {
      const tags = setupTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      // Normalize ticker before saving
      const normalizedTicker = normalizeTicker(ticker, assetType)

      await onSubmit({
        ticker: normalizedTicker,
        asset_type: assetType,
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
      setAssetType('stock')
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
    } catch (err) {
      console.error('Error logging trade:', err)
      setError(err instanceof Error ? err.message : 'Failed to log trade. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Log New Position</DialogTitle>
          <DialogDescription>
            Record a new position with entry details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Ticker */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Ticker <span className="text-red-400">*</span>
            </label>
            <TickerAutocomplete
              value={ticker}
              onChange={setTicker}
              onSelect={(result) => {
                let detectedAssetType = 'stock'

                if (result.type === 'CRYPTO' || result.market === 'crypto') {
                  detectedAssetType = 'crypto'
                } else if (result.type === 'FX' || result.market === 'fx') {
                  detectedAssetType = 'forex'
                } else if (result.type === 'FUTURE' || result.market === 'futures') {
                  detectedAssetType = 'future'
                } else if (result.type === 'ETF') {
                  detectedAssetType = 'etf'
                }

                setAssetType(detectedAssetType)

                // Normalize ticker for crypto/forex immediately
                const normalizedTicker = normalizeTicker(result.ticker, detectedAssetType)
                setTicker(normalizedTicker)
              }}
              placeholder="Search by ticker or company name (e.g., AAPL or Apple)"
              autoFocus
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Asset Type
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { type: 'stock', color: 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-purple-300' },
                { type: 'option', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
                { type: 'crypto', color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
                { type: 'etf', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
                { type: 'forex', color: 'bg-green-500/20 border-green-500/40 text-green-300' },
                { type: 'future', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
              ].map(({ type, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAssetType(type)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                    ${assetType === type
                      ? color
                      : 'bg-transparent border-white/[0.06] text-foreground/50 hover:bg-white/[0.03]'
                    }
                  `}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
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
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors border
                  ${
                    direction === 'long'
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : 'bg-transparent border-white/[0.06] text-foreground/70 hover:bg-white/[0.03]'
                  }
                `}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors border
                  ${
                    direction === 'short'
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-transparent border-white/[0.06] text-foreground/70 hover:bg-white/[0.03]'
                  }
                `}
              >
                Short
              </button>
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-t border-white/[0.04] my-2" />

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
                className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 min-h-[44px]"
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
                className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 min-h-[44px]"
                placeholder="150.00"
              />
            </div>
          </div>

          {/* Position Size Calculation */}
          {quantity && entryPrice && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <span className="text-xs text-foreground/60">Position Size</span>
              <span className="text-sm font-mono font-semibold text-purple-300">
                ${(parseFloat(quantity) * parseFloat(entryPrice)).toLocaleString(
                  'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </span>
            </div>
          )}

          {/* Risk at Stop Calculation */}
          {quantity && entryPrice && stopLoss && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <span className="text-xs text-red-300/70 font-medium">Risk at Stop</span>
              <span className="text-sm font-mono font-semibold text-red-400 tabular-nums">
                ${(() => {
                  const qty = parseFloat(quantity)
                  const entry = parseFloat(entryPrice)
                  const stop = parseFloat(stopLoss)
                  const riskAmount = direction === 'short'
                    ? Math.abs(stop - entry) * qty
                    : Math.abs(entry - stop) * qty
                  return riskAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                })()}
              </span>
            </div>
          )}

          {/* Profit at Target Calculation */}
          {quantity && entryPrice && takeProfit && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
              <span className="text-xs text-green-300/70 font-medium">Profit at Target</span>
              <span className="text-sm font-mono font-semibold text-green-400 tabular-nums">
                ${(() => {
                  const qty = parseFloat(quantity)
                  const entry = parseFloat(entryPrice)
                  const target = parseFloat(takeProfit)
                  const profitAmount = direction === 'short'
                    ? Math.abs(entry - target) * qty
                    : Math.abs(target - entry) * qty
                  return profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                })()}
              </span>
            </div>
          )}

          {/* Risk/Reward Ratio */}
          {quantity && entryPrice && stopLoss && takeProfit && (() => {
            const qty = parseFloat(quantity)
            const entry = parseFloat(entryPrice)
            const stop = parseFloat(stopLoss)
            const target = parseFloat(takeProfit)

            const riskAmount = direction === 'short'
              ? Math.abs(stop - entry) * qty
              : Math.abs(entry - stop) * qty

            const profitAmount = direction === 'short'
              ? Math.abs(entry - target) * qty
              : Math.abs(target - entry) * qty

            const ratio = riskAmount > 0 ? profitAmount / riskAmount : 0

            return ratio > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/30">
                <span className="text-xs text-purple-300/70 font-medium">Risk / Reward</span>
                <span className={`text-sm font-mono font-semibold tabular-nums ${
                  ratio >= 2 ? 'text-green-400' :
                  ratio >= 1 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  1:{ratio.toFixed(1)}
                </span>
              </div>
            )
          })()}

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
                className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 min-h-[44px]"
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
                className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 min-h-[44px]"
                placeholder="160.00"
              />
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-t border-white/[0.04] my-2" />

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
              className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 min-h-[44px]"
            />
          </div>

          {/* Section Divider */}
          <div className="border-t border-white/[0.04] my-2" />

          {/* Thesis */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Trade Thesis
            </label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 resize-none"
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
              className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 resize-none"
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
              className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 focus:border-[#8b5cf6]/60 min-h-[44px]"
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
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-border text-foreground hover:bg-white/[0.08] active:scale-95 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !ticker || !quantity || !entryPrice}
              className="flex-1 py-2.5 rounded-lg bg-[#8b5cf6] text-white font-medium transition-all hover:bg-[#7c3aed] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? 'Logging...' : 'Log Trade'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
