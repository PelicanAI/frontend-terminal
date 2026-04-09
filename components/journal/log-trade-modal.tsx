"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { TickerAutocomplete } from "./ticker-autocomplete"
import { Trade, TradeFormData, useTrades } from "@/hooks/use-trades"
import { useTradingPlan } from "@/hooks/use-trading-plan"
import { checkTradeAgainstPlan, deriveComplianceData } from "@/lib/trading/plan-check"
import { PelicanButton } from "@/components/ui/pelican"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert01Icon as Warning,
  Shield01Icon as Shield,
  Tick01Icon as Check,
  Brain01Icon as Brain,
  CheckmarkSquare01Icon as CheckSquare,
} from "@hugeicons/core-free-icons"
import { usePlaybooks } from "@/hooks/use-playbooks"
import { useRiskBudget } from "@/hooks/use-risk-budget"
import { useAntiTradeCheck } from "@/hooks/use-anti-trade-check"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { trackEvent } from "@/lib/tracking"
import { BudgetWarningBanner } from "@/components/risk-budget/budget-warning-banner"

interface LogTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TradeFormData) => Promise<void>
  initialTicker?: string
  editTrade?: Trade | null
  onEditComplete?: () => void
}

export function LogTradeModal({ open, onOpenChange, onSubmit, initialTicker = "", editTrade, onEditComplete }: LogTradeModalProps) {
  const isEditMode = !!editTrade
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticker, setTicker] = useState(initialTicker)
  const [assetType, setAssetType] = useState('stock')
  const [checklistChecked, setChecklistChecked] = useState<boolean[]>([])

  // Plan integration
  const { plan } = useTradingPlan()
  const { trades: existingTrades, updateTrade } = useTrades()
  const { checkTrade, isReady: insightsReady } = useAntiTradeCheck()

  // Playbook integration
  const { playbooks } = usePlaybooks()
  const [playbookId, setPlaybookId] = useState<string | null>(null)
  const [playbookChecklistState, setPlaybookChecklistState] = useState<Record<number, boolean>>({})

  const selectedPlaybook = useMemo(
    () => playbooks.find(pb => pb.id === playbookId) ?? null,
    [playbooks, playbookId]
  )

  // Reset playbook checklist when playbook changes
  useEffect(() => {
    setPlaybookChecklistState({})
  }, [playbookId])

  const togglePlaybookChecklistItem = (index: number) => {
    setPlaybookChecklistState(prev => {
      const next = { ...prev, [index]: !prev[index] }
      // Fire checklist_completed when ALL items are now checked
      if (
        selectedPlaybook?.checklist?.length &&
        selectedPlaybook.checklist.every((_, i) => next[i])
      ) {
        trackEvent({ eventType: 'checklist_completed', feature: 'trade_logging' })
      }
      return next
    })
  }

  const allPlaybookChecked = selectedPlaybook?.checklist?.length
    ? selectedPlaybook.checklist.every((_, i) => playbookChecklistState[i])
    : true

  // Sync ticker when initialTicker changes (e.g., opened from different action buttons)
  useEffect(() => {
    if (open && initialTicker) {
      setTicker(initialTicker)
    }
  }, [open, initialTicker])
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [quantity, setQuantity] = useState("")
  const [forexLotType, setForexLotType] = useState<'standard' | 'mini' | 'micro'>('standard')
  const [forexLotCount, setForexLotCount] = useState("1")
  const [entryPrice, setEntryPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [thesis, setThesis] = useState("")
  const [notes, setNotes] = useState("")
  const [setupTags, setSetupTags] = useState("")
  const [conviction, setConviction] = useState("5")
  const [isPaper, setIsPaper] = useState(false)

  // Pre-fill fields when editing an existing trade
  useEffect(() => {
    if (open && editTrade) {
      setTicker(editTrade.ticker)
      setAssetType(editTrade.asset_type || 'stock')
      setDirection(editTrade.direction)
      setQuantity(String(editTrade.quantity))
      setEntryPrice(String(editTrade.entry_price))
      setStopLoss(editTrade.stop_loss != null ? String(editTrade.stop_loss) : "")
      setTakeProfit(editTrade.take_profit != null ? String(editTrade.take_profit) : "")
      setEntryDate(editTrade.entry_date ? editTrade.entry_date.split('T')[0] : new Date().toISOString().split('T')[0])
      setThesis(editTrade.thesis || "")
      setNotes(editTrade.notes || "")
      setSetupTags(editTrade.setup_tags?.join(', ') || "")
      setConviction(String(editTrade.conviction ?? 5))
      setIsPaper(editTrade.is_paper || false)
      setPlaybookId(editTrade.playbook_id || null)
    }
  }, [open, editTrade])

  // Forex lot sizes
  const FOREX_LOT_SIZES = {
    standard: { label: 'Standard', units: 100_000, shortLabel: '100K' },
    mini: { label: 'Mini', units: 10_000, shortLabel: '10K' },
    micro: { label: 'Micro', units: 1_000, shortLabel: '1K' },
  } as const

  // Auto-calculate quantity from forex lot sizing
  useEffect(() => {
    if (assetType === 'forex' && forexLotCount) {
      const lots = parseFloat(forexLotCount)
      if (!isNaN(lots) && lots > 0) {
        const calculatedQty = lots * FOREX_LOT_SIZES[forexLotType].units
        setQuantity(String(calculatedQty))
      }
    }
  }, [assetType, forexLotType, forexLotCount])

  // Reset forex lot state when switching away from forex
  useEffect(() => {
    if (assetType !== 'forex') {
      setForexLotType('standard')
      setForexLotCount('1')
    }
  }, [assetType])

  // Behavioral pattern warnings
  const antiTradeWarnings = useMemo(() => {
    if (!insightsReady || !ticker) return []
    const positionSize = quantity && entryPrice
      ? parseFloat(quantity) * parseFloat(entryPrice)
      : undefined
    return checkTrade(ticker.toUpperCase(), direction, positionSize)
  }, [insightsReady, ticker, direction, quantity, entryPrice, checkTrade])

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

      // Compute plan compliance data
      let planComplianceData: {
        plan_rules_followed?: string[]
        plan_rules_violated?: string[]
        plan_checklist_completed?: Record<string, boolean>
      } = {}

      if (plan) {
        const planCheckResult = checkTradeAgainstPlan(
          {
            ticker: normalizedTicker,
            asset_type: assetType,
            direction,
            quantity: parseFloat(quantity),
            entry_price: parseFloat(entryPrice),
            stop_loss: stopLoss ? parseFloat(stopLoss) : null,
            take_profit: takeProfit ? parseFloat(takeProfit) : null,
            entry_date: entryDate,
            thesis: thesis || null,
            setup_tags: tags.length > 0 ? tags : undefined,
          },
          plan,
          existingTrades,
        )

        const { followed, violated, checklistCompleted } = deriveComplianceData(
          plan,
          planCheckResult.violations,
          planCheckResult.checklistItems,
          checklistChecked,
        )

        planComplianceData = {
          plan_rules_followed: followed,
          plan_rules_violated: violated,
          plan_checklist_completed: checklistCompleted,
        }
      }

      // Build playbook checklist compliance
      let playbookChecklistCompleted: Record<string, boolean> | undefined
      if (selectedPlaybook?.checklist && selectedPlaybook.checklist.length > 0) {
        playbookChecklistCompleted = {}
        for (let i = 0; i < selectedPlaybook.checklist.length; i++) {
          const itemName = selectedPlaybook.checklist[i]
          if (itemName) {
            playbookChecklistCompleted[itemName] = playbookChecklistState[i] || false
          }
        }
      }

      // Merge plan checklist with playbook checklist
      const mergedChecklist = {
        ...(planComplianceData.plan_checklist_completed || {}),
        ...(playbookChecklistCompleted || {}),
      }

      const formData: TradeFormData = {
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
        playbook_id: playbookId,
        ...planComplianceData,
        plan_checklist_completed: Object.keys(mergedChecklist).length > 0 ? mergedChecklist : undefined,
      }

      if (isEditMode && editTrade) {
        // Update existing trade
        await updateTrade(editTrade.id, {
          ticker: formData.ticker,
          asset_type: formData.asset_type || 'stock',
          direction: formData.direction,
          quantity: formData.quantity,
          entry_price: formData.entry_price,
          stop_loss: formData.stop_loss ?? null,
          take_profit: formData.take_profit ?? null,
          entry_date: formData.entry_date,
          thesis: formData.thesis ?? null,
          notes: formData.notes ?? null,
          setup_tags: formData.setup_tags || [],
          conviction: formData.conviction ?? null,
          is_paper: formData.is_paper ?? false,
          playbook_id: formData.playbook_id || null,
          plan_rules_followed: formData.plan_rules_followed || [],
          plan_rules_violated: formData.plan_rules_violated || [],
          plan_checklist_completed: formData.plan_checklist_completed || {},
        })
        onEditComplete?.()
      } else {
        await onSubmit(formData)
      }

      // Reset form
      setTicker("")
      setAssetType('stock')
      setDirection('long')
      setQuantity("")
      setForexLotType('standard')
      setForexLotCount('1')
      setEntryPrice("")
      setStopLoss("")
      setTakeProfit("")
      setEntryDate(new Date().toISOString().split('T')[0])
      setThesis("")
      setNotes("")
      setSetupTags("")
      setConviction("5")
      setIsPaper(false)
      setPlaybookId(null)
      setPlaybookChecklistState({})

      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log trade. Please try again.'
      setError(errorMessage)
      toast({ title: isEditMode ? "Failed to update trade" : "Failed to log trade", description: errorMessage, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = "w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors min-h-[44px]"
  const labelClass = "text-sm font-medium text-[var(--text-primary)] mb-1.5 block"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--bg-elevated)] border-[var(--border-subtle)] rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.5),0_16px_48px_rgba(0,0,0,0.25)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">{isEditMode ? 'Edit Trade' : 'Log New Position'}</DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            {isEditMode ? 'Update trade details' : 'Record a new position with entry details'}
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

          {/* Quantity / Lot Sizing & Entry Price */}
          {assetType === 'forex' ? (
            <>
              {/* Forex Lot Type Selector */}
              <div>
                <label className={labelClass}>
                  Lot Size <span className="text-[var(--data-negative)]">*</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(FOREX_LOT_SIZES) as [keyof typeof FOREX_LOT_SIZES, typeof FOREX_LOT_SIZES[keyof typeof FOREX_LOT_SIZES]][]).map(([key, { label, shortLabel }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForexLotType(key)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border
                        ${forexLotType === key
                          ? 'bg-[var(--accent-muted)] border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                          : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
                        }
                      `}
                    >
                      {label} ({shortLabel})
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Lots & Entry Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Number of Lots <span className="text-[var(--data-negative)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={forexLotCount}
                    onChange={(e) => setForexLotCount(e.target.value)}
                    step="any"
                    min="0.01"
                    required
                    className={inputClass}
                    placeholder="1"
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
                    placeholder="1.0850"
                  />
                </div>
              </div>

              {/* Position Value for Forex */}
              {forexLotCount && entryPrice && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent-primary)]/10">
                  <span className="text-xs text-[var(--text-muted)]">
                    Position value
                    <span className="text-[var(--text-disabled)] ml-1">
                      ({forexLotCount} {FOREX_LOT_SIZES[forexLotType].label.toLowerCase()} lot{parseFloat(forexLotCount) !== 1 ? 's' : ''} = <span className="font-mono tabular-nums">{Number(quantity).toLocaleString()}</span> units)
                    </span>
                  </span>
                  <span className="text-sm font-mono font-semibold tabular-nums text-[var(--accent-primary)]">
                    ${(parseFloat(quantity) * parseFloat(entryPrice)).toLocaleString(
                      'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
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

          {/* Playbook Selector */}
          {playbooks.length > 0 && (
            <div>
              <label className={labelClass}>Playbook</label>
              <select
                value={playbookId || ''}
                onChange={(e) => setPlaybookId(e.target.value || null)}
                className={inputClass}
              >
                <option value="">No playbook</option>
                {playbooks.map(pb => (
                  <option key={pb.id} value={pb.id}>{pb.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Tag this trade with a playbook to track setup-specific performance.
              </p>

              {/* Pre-Trade Checklist from Playbook */}
              {selectedPlaybook?.checklist && selectedPlaybook.checklist.length > 0 && (
                <div className="p-3 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-primary)]/20 mt-3">
                  <h4 className="text-xs font-medium text-[var(--accent-primary)] mb-2 flex items-center gap-1.5">
                    <HugeiconsIcon icon={CheckSquare} size={14} strokeWidth={2} color="currentColor" />
                    Pre-Trade Checklist: {selectedPlaybook.name}
                  </h4>
                  <div className="space-y-1.5">
                    {selectedPlaybook.checklist.map((item, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={playbookChecklistState[i] || false}
                          onChange={() => togglePlaybookChecklistItem(i)}
                          className="w-3.5 h-3.5 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0 bg-[var(--bg-surface)]"
                        />
                        <span className={`text-xs ${playbookChecklistState[i] ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                          {item}
                        </span>
                      </label>
                    ))}
                  </div>
                  {!allPlaybookChecked && (
                    <p className="text-[10px] text-[var(--data-warning)] mt-2">
                      Not all checklist items are checked.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* Risk Budget Warning */}
          <RiskBudgetWarning />

          {/* Behavioral Pattern Warnings */}
          {antiTradeWarnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <HugeiconsIcon icon={Brain} size={14} strokeWidth={2} color="currentColor" />
                Pelican Pattern Check
              </div>
              {antiTradeWarnings.map((warning, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs",
                    warning.severity === 'critical'
                      ? 'bg-[var(--data-negative)]/10 border border-[var(--data-negative)]/20'
                      : 'bg-[var(--data-warning)]/10 border border-[var(--data-warning)]/20'
                  )}
                >
                  <HugeiconsIcon icon={Warning} size={14} className={cn(
                      "flex-shrink-0 mt-0.5",
                      warning.severity === 'critical' ? 'text-[var(--data-negative)]' : 'text-[var(--data-warning)]'
                    )} strokeWidth={2} color="currentColor" />
                  <div>
                    <div className={cn(
                      "font-medium",
                      warning.severity === 'critical' ? 'text-[var(--data-negative)]' : 'text-[var(--data-warning)]'
                    )}>
                      {warning.title}
                    </div>
                    <div className="text-[var(--text-muted)] mt-0.5">{warning.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Plan Violations & Checklist */}
          <PlanCheckSection
            plan={plan}
            existingTrades={existingTrades}
            ticker={ticker}
            assetType={assetType}
            direction={direction}
            quantity={quantity}
            entryPrice={entryPrice}
            stopLoss={stopLoss}
            takeProfit={takeProfit}
            thesis={thesis}
            setupTags={setupTags}
            checklistChecked={checklistChecked}
            onChecklistChange={setChecklistChecked}
          />

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
              {isSubmitting ? (isEditMode ? 'Saving...' : 'Logging...') : (isEditMode ? 'Save Changes' : 'Log Trade')}
            </PelicanButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Plan Check Section (inline sub-component) ──

function PlanCheckSection({
  plan,
  existingTrades,
  ticker,
  assetType,
  direction,
  quantity,
  entryPrice,
  stopLoss,
  takeProfit,
  thesis,
  setupTags,
  checklistChecked,
  onChecklistChange,
}: {
  plan: ReturnType<typeof useTradingPlan>['plan']
  existingTrades: ReturnType<typeof useTrades>['trades']
  ticker: string
  assetType: string
  direction: 'long' | 'short'
  quantity: string
  entryPrice: string
  stopLoss: string
  takeProfit: string
  thesis: string
  setupTags: string
  checklistChecked: boolean[]
  onChecklistChange: (checked: boolean[]) => void
}) {
  const planCheck = useMemo(() => {
    if (!plan || !ticker || !quantity || !entryPrice) return null

    const tags = setupTags.split(',').map(t => t.trim()).filter(Boolean)

    return checkTradeAgainstPlan(
      {
        ticker,
        asset_type: assetType,
        direction,
        quantity: parseFloat(quantity),
        entry_price: parseFloat(entryPrice),
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        entry_date: new Date().toISOString(),
        thesis: thesis || null,
        setup_tags: tags.length > 0 ? tags : undefined,
      },
      plan,
      existingTrades,
    )
  }, [plan, existingTrades, ticker, assetType, direction, quantity, entryPrice, stopLoss, takeProfit, thesis, setupTags])

  // Initialize checklist state when plan changes
  useEffect(() => {
    if (planCheck?.checklistItems) {
      onChecklistChange(new Array(planCheck.checklistItems.length).fill(false))
    }
  }, [planCheck?.checklistItems.length])

  if (!plan || !planCheck) return null

  const hasViolations = planCheck.violations.length > 0
  const hasChecklist = planCheck.checklistItems.length > 0

  if (!hasViolations && !hasChecklist) return null

  return (
    <>
      {/* Plan Violations */}
      {hasViolations && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <HugeiconsIcon icon={Shield} size={14} strokeWidth={2} color="currentColor" />
            Plan Check: &ldquo;{plan.name}&rdquo;
          </div>
          {planCheck.violations.map((v, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                v.severity === 'violation'
                  ? 'bg-[var(--data-negative)]/10 border border-[var(--data-negative)]/20 text-[var(--data-negative)]'
                  : 'bg-[var(--data-warning)]/10 border border-[var(--data-warning)]/20 text-[var(--data-warning)]'
              }`}
            >
              <HugeiconsIcon icon={Warning} size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} color="currentColor" />
              <span>{v.rule_text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pre-Entry Checklist */}
      {hasChecklist && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <HugeiconsIcon icon={Check} size={14} strokeWidth={2} color="currentColor" />
            Pre-Entry Checklist
          </div>
          <div className="space-y-1.5 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            {planCheck.checklistItems.map((item, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistChecked[i] ?? false}
                  onChange={(e) => {
                    const next = [...checklistChecked]
                    next[i] = e.target.checked
                    onChecklistChange(next)
                  }}
                  className="w-3.5 h-3.5 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0 bg-[var(--bg-surface)]"
                />
                <span className={`text-xs ${checklistChecked[i] ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Risk Budget Warning (inline sub-component) ──

function RiskBudgetWarning() {
  const { budget } = useRiskBudget()
  if (!budget || budget.overallStatus === 'green') return null
  return <BudgetWarningBanner budget={budget} />
}
