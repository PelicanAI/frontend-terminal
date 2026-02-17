"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { TickerAutocomplete } from "./ticker-autocomplete"
import { TradeFormData } from "@/hooks/use-trades"
import { PelicanButton } from "@/components/ui/pelican"

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

  const inputClass = "w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors min-h-[44px]"
  const labelClass = "text-sm font-medium text-[var(--text-primary)] mb-1.5 block"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--bg-elevated)] border-[var(--border-default)] backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Log New Position</DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Record a new position with entry details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-[var(--data-negative)]/10 border border-[var(--data-negative)]/30 px-4 py-3 text-sm text-[var(--data-negative)]">
              {error}
            </div>
          )}

          {/* Ticker */}
          <div>
            <label className={labelClass}>
              Ticker <span className="text-[var(--data-negative)]">*</span>
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
            <label className={labelClass}>Asset Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { type: 'stock', label: 'Stock' },
                { type: 'option', label: 'Option' },
                { type: 'crypto', label: 'Crypto' },
                { type: 'etf', label: 'ETF' },
                { type: 'forex', label: 'Forex' },
                { type: 'future', label: 'Future' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAssetType(type)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border
                    ${assetType === type
                      ? 'bg-[var(--accent-muted)] border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                      : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className={labelClass}>
              Direction <span className="text-[var(--data-negative)]">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-150 border
                  ${
                    direction === 'long'
                      ? 'bg-[var(--data-positive)]/20 border-[var(--data-positive)]/40 text-[var(--data-positive)]'
                      : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                  }
                `}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-150 border
                  ${
                    direction === 'short'
                      ? 'bg-[var(--data-negative)]/20 border-[var(--data-negative)]/40 text-[var(--data-negative)]'
                      : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                  }
                `}
              >
                Short
              </button>
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-t border-[var(--border-subtle)] my-2" />

          {/* Quantity & Entry Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Quantity <span className="text-[var(--data-negative)]">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="any"
                min="0"
                required
                className={inputClass}
                placeholder="100"
              />
            </div>
            <div>
              <label className={labelClass}>
                Entry Price <span className="text-[var(--data-negative)]">*</span>
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                step="any"
                min="0"
                required
                className={inputClass}
                placeholder="150.00"
              />
            </div>
          </div>

          {/* Position Size Calculation */}
          {quantity && entryPrice && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent-primary)]/10">
              <span className="text-xs text-[var(--text-muted)]">Position Size</span>
              <span className="text-sm font-mono font-semibold tabular-nums text-[var(--accent-primary)]">
                ${(parseFloat(quantity) * parseFloat(entryPrice)).toLocaleString(
                  'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </span>
            </div>
          )}

          {/* Risk at Stop Calculation */}
          {quantity && entryPrice && stopLoss && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--data-negative)]/5 border border-[var(--data-negative)]/10">
              <span className="text-xs text-[var(--data-negative)]/70 font-medium">Risk at Stop</span>
              <span className="text-sm font-mono font-semibold text-[var(--data-negative)] tabular-nums">
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
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--data-positive)]/10 border border-[var(--data-positive)]/30">
              <span className="text-xs text-[var(--data-positive)]/70 font-medium">Profit at Target</span>
              <span className="text-sm font-mono font-semibold text-[var(--data-positive)] tabular-nums">
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
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-primary)]/30">
                <span className="text-xs text-[var(--accent-primary)]/70 font-medium">Risk / Reward</span>
                <span className={`text-sm font-mono font-semibold tabular-nums ${
                  ratio >= 2 ? 'text-[var(--data-positive)]' :
                  ratio >= 1 ? 'text-[var(--data-warning)]' :
                  'text-[var(--data-negative)]'
                }`}>
                  1:{ratio.toFixed(1)}
                </span>
              </div>
            )
          })()}

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                step="any"
                min="0"
                className={inputClass}
                placeholder="140.00"
              />
            </div>
            <div>
              <label className={labelClass}>Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                step="any"
                min="0"
                className={inputClass}
                placeholder="160.00"
              />
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-t border-[var(--border-subtle)] my-2" />

          {/* Entry Date */}
          <div>
            <label className={labelClass}>
              Entry Date <span className="text-[var(--data-negative)]">*</span>
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {/* Section Divider */}
          <div className="border-t border-[var(--border-subtle)] my-2" />

          {/* Thesis */}
          <div>
            <label className={labelClass}>Trade Thesis</label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors resize-none"
              placeholder="Why are you taking this trade?"
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors resize-none"
              placeholder="Additional notes"
            />
          </div>

          {/* Setup Tags */}
          <div>
            <label className={labelClass}>Setup Tags</label>
            <input
              type="text"
              value={setupTags}
              onChange={(e) => setSetupTags(e.target.value)}
              className={inputClass}
              placeholder="breakout, momentum, swing (comma-separated)"
            />
          </div>

          {/* Conviction */}
          <div>
            <label className={labelClass}>Conviction (1-10)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={conviction}
              onChange={(e) => setConviction(e.target.value)}
              className="w-full accent-[var(--accent-primary)]"
            />
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
              <span>Low</span>
              <span className="text-[var(--accent-primary)] font-mono font-medium tabular-nums">{conviction}</span>
              <span>High</span>
            </div>
          </div>

          {/* Paper Trading Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <input
              type="checkbox"
              id="isPaper"
              checked={isPaper}
              onChange={(e) => setIsPaper(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0 bg-[var(--bg-surface)]"
            />
            <label htmlFor="isPaper" className="text-sm text-[var(--text-primary)] cursor-pointer">
              Paper trade (simulated)
            </label>
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
              disabled={isSubmitting || !ticker || !quantity || !entryPrice}
              className="flex-1"
            >
              {isSubmitting ? 'Logging...' : 'Log Trade'}
            </PelicanButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
