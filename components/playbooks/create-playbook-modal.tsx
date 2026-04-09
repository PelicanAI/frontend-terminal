"use client"

import { useState, useCallback, useEffect, type KeyboardEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PelicanButton } from "@/components/ui/pelican"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon as X } from "@hugeicons/core-free-icons"
import { IconTooltip } from "@/components/ui/icon-tooltip"
import { cn } from "@/lib/utils"

const INPUT_CLASS =
  "w-full px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 focus:border-[var(--accent-primary)] transition-colors min-h-[44px] placeholder:text-[var(--text-disabled)]"

interface CreatePlaybookModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PlaybookFormData) => Promise<void>
  editPlaybook?: Playbook | null
}

export interface PlaybookFormData {
  name: string
  description: string | null
  setup_type: string
  timeframe: string | null
  market_type: string
  instruments: string[] | null
  market_conditions: string | null
  entry_rules: string | null
  exit_rules: string | null
  risk_rules: string | null
  checklist: string[]
  category: string | null
  difficulty: string | null
}

import type { Playbook } from "@/types/trading"

const CATEGORY_OPTIONS = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'trend_following', label: 'Trend Following' },
  { value: 'scalping', label: 'Scalping' },
  { value: 'swing', label: 'Swing' },
  { value: 'position', label: 'Position' },
  { value: 'income', label: 'Income' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const SETUP_SUGGESTIONS = [
  "breakout",
  "reversal",
  "continuation",
  "scalp",
  "trend-follow",
  "mean-reversion",
]

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "daily", "weekly"]

const MARKET_TYPE_OPTIONS = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'options', label: 'Options' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'etf', label: 'ETFs' },
] as const

function getInstrumentsPlaceholder(marketType: string): string {
  switch (marketType) {
    case 'forex': return 'e.g. EURUSD, GBPUSD'
    case 'crypto': return 'e.g. BTCUSD, ETHUSD'
    case 'etf': return 'e.g. SPY, QQQ, IWM'
    case 'options': return 'e.g. SPY, AAPL, TSLA'
    default: return 'e.g. AAPL, TSLA, NVDA'
  }
}

export function CreatePlaybookModal({
  open,
  onOpenChange,
  onSubmit,
  editPlaybook,
}: CreatePlaybookModalProps) {
  const isEditMode = !!editPlaybook
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [setupType, setSetupType] = useState("")
  const [timeframe, setTimeframe] = useState("")
  const [marketConditions, setMarketConditions] = useState("")
  const [entryRules, setEntryRules] = useState("")
  const [exitRules, setExitRules] = useState("")
  const [riskRules, setRiskRules] = useState("")
  const [marketType, setMarketType] = useState("stocks")
  const [instruments, setInstruments] = useState<string[]>([])
  const [instrumentInput, setInstrumentInput] = useState("")
  const [checklist, setChecklist] = useState<string[]>([])
  const [checklistInput, setChecklistInput] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")

  // Pre-populate form when editing
  useEffect(() => {
    if (editPlaybook) {
      setName(editPlaybook.name || '')
      setDescription(editPlaybook.description || '')
      setSetupType(editPlaybook.setup_type || '')
      setTimeframe(editPlaybook.timeframe || '')
      setMarketType(editPlaybook.market_type || 'stocks')
      setInstruments(editPlaybook.instruments || [])
      setMarketConditions(editPlaybook.market_conditions || '')
      setEntryRules(editPlaybook.entry_rules || '')
      setExitRules(editPlaybook.exit_rules || '')
      setRiskRules(editPlaybook.risk_rules || '')
      setChecklist(editPlaybook.checklist || [])
      setCategory(editPlaybook.category || '')
      setDifficulty(editPlaybook.difficulty || '')
    }
  }, [editPlaybook])

  const resetForm = useCallback(() => {
    setName("")
    setDescription("")
    setSetupType("")
    setTimeframe("")
    setMarketType("stocks")
    setInstruments([])
    setInstrumentInput("")
    setMarketConditions("")
    setEntryRules("")
    setExitRules("")
    setRiskRules("")
    setChecklist([])
    setChecklistInput("")
    setCategory("")
    setDifficulty("")
    setError(null)
  }, [])

  const handleAddChecklistItem = useCallback(() => {
    const trimmed = checklistInput.trim()
    if (!trimmed) return
    setChecklist((prev) => [...prev, trimmed])
    setChecklistInput("")
  }, [checklistInput])

  const handleChecklistKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleAddChecklistItem()
      }
    },
    [handleAddChecklistItem]
  )

  const handleRemoveChecklistItem = useCallback((index: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddInstruments = useCallback(() => {
    const raw = instrumentInput.trim()
    if (!raw) return
    const newItems = raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)
    setInstruments((prev) => {
      const existing = new Set(prev)
      const unique = newItems.filter((item) => !existing.has(item))
      return unique.length > 0 ? [...prev, ...unique] : prev
    })
    setInstrumentInput("")
  }, [instrumentInput])

  const handleInstrumentKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleAddInstruments()
      }
    },
    [handleAddInstruments]
  )

  const handleRemoveInstrument = useCallback((index: number) => {
    setInstruments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!setupType.trim()) {
      setError("Setup type is required")
      return
    }
    if (!entryRules.trim()) {
      setError("Entry rules are required")
      return
    }
    if (!exitRules.trim()) {
      setError("Exit rules are required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        setup_type: setupType.trim().toLowerCase(),
        timeframe: timeframe || null,
        market_type: marketType,
        instruments: instruments.length > 0 ? instruments : null,
        market_conditions: marketConditions.trim() || null,
        entry_rules: entryRules.trim(),
        exit_rules: exitRules.trim(),
        risk_rules: riskRules.trim() || null,
        checklist,
        category: category || null,
        difficulty: difficulty || null,
      })
      if (!isEditMode) resetForm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? "Failed to save changes" : "Failed to create playbook")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && !isEditMode) resetForm()
      onOpenChange(v)
    }}>
      <DialogContent
        className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] sm:max-w-xl max-h-[85vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">
            {isEditMode ? "Edit Playbook" : "New Playbook"}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            {isEditMode
              ? "Update your trading strategy rules."
              : "Define your trading strategy with specific rules."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. M15 Breakout"
              className={INPUT_CLASS}
              maxLength={100}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this strategy..."
              className={cn(INPUT_CLASS, "resize-none")}
              rows={2}
            />
          </FormField>

          {/* Setup Type + Timeframe + Market Type row */}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Setup Type" required>
              <input
                type="text"
                value={setupType}
                onChange={(e) => setSetupType(e.target.value)}
                placeholder="e.g. breakout"
                className={INPUT_CLASS}
                list="setup-suggestions"
              />
              <datalist id="setup-suggestions">
                {SETUP_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Timeframe">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select...</option>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Market Type">
              <select
                value={marketType}
                onChange={(e) => setMarketType(e.target.value)}
                className={INPUT_CLASS}
              >
                {MARKET_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Instruments */}
          <FormField label="Instruments" subtitle="Optional — leave empty for broad universe">
            <div className="space-y-2">
              {instruments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {instruments.map((ticker, i) => (
                    <span
                      key={ticker}
                      className="inline-flex items-center gap-1.5 text-sm font-mono tabular-nums text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg px-3 py-1.5"
                    >
                      {ticker}
                      <IconTooltip label="Remove" side="top">
                        <button
                          type="button"
                          onClick={() => handleRemoveInstrument(i)}
                          className="text-[var(--text-muted)] hover:text-[var(--data-negative)] transition-colors p-0.5"
                        >
                          <HugeiconsIcon icon={X} size={14} strokeWidth={2} color="currentColor" />
                        </button>
                      </IconTooltip>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={instrumentInput}
                  onChange={(e) => setInstrumentInput(e.target.value.toUpperCase())}
                  onKeyDown={handleInstrumentKeyDown}
                  placeholder={getInstrumentsPlaceholder(marketType)}
                  className={cn(INPUT_CLASS, "flex-1 font-mono")}
                />
                <PelicanButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={handleAddInstruments}
                  disabled={!instrumentInput.trim()}
                >
                  Add
                </PelicanButton>
              </div>
            </div>
          </FormField>

          {/* Category + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select...</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select...</option>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Market Conditions */}
          <FormField label="Market Conditions">
            <textarea
              value={marketConditions}
              onChange={(e) => setMarketConditions(e.target.value)}
              placeholder="Only trade during London/NY overlap..."
              className={cn(INPUT_CLASS, "resize-none")}
              rows={2}
            />
          </FormField>

          {/* Entry Rules */}
          <FormField label="Entry Rules" required>
            <textarea
              value={entryRules}
              onChange={(e) => setEntryRules(e.target.value)}
              placeholder="Wait for FVG on M15, confirm with divergence..."
              className={cn(INPUT_CLASS, "resize-none")}
              rows={3}
            />
          </FormField>

          {/* Exit Rules */}
          <FormField label="Exit Rules" required>
            <textarea
              value={exitRules}
              onChange={(e) => setExitRules(e.target.value)}
              placeholder="TP at next liquidity pool, SL above wick..."
              className={cn(INPUT_CLASS, "resize-none")}
              rows={3}
            />
          </FormField>

          {/* Risk Rules */}
          <FormField label="Risk Rules">
            <textarea
              value={riskRules}
              onChange={(e) => setRiskRules(e.target.value)}
              placeholder="Max 1% risk per trade, max 2 trades per day..."
              className={cn(INPUT_CLASS, "resize-none")}
              rows={2}
            />
          </FormField>

          {/* Checklist builder */}
          <FormField label="Pre-Trade Checklist">
            <div className="space-y-2">
              {checklist.length > 0 && (
                <ol className="space-y-1.5">
                  {checklist.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg px-3 py-2"
                    >
                      <span className="font-mono tabular-nums text-[var(--text-muted)] text-xs w-4 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <span className="flex-1">{item}</span>
                      <IconTooltip label="Remove item" side="left">
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(i)}
                          className="text-[var(--text-muted)] hover:text-[var(--data-negative)] transition-colors p-0.5"
                        >
                          <HugeiconsIcon icon={X} size={14} strokeWidth={2} color="currentColor" />
                        </button>
                      </IconTooltip>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={handleChecklistKeyDown}
                  placeholder="Add checklist item + Enter"
                  className={cn(INPUT_CLASS, "flex-1")}
                />
                <PelicanButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!checklistInput.trim()}
                >
                  Add
                </PelicanButton>
              </div>
            </div>
          </FormField>

          {/* Error */}
          {error && (
            <p className="text-sm text-[var(--data-negative)]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <PelicanButton
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </PelicanButton>
            <PelicanButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (isEditMode ? "Saving..." : "Creating...")
                : (isEditMode ? "Save Changes" : "Create Playbook")}
            </PelicanButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Reusable form field wrapper ──

function FormField({
  label,
  required,
  subtitle,
  children,
}: {
  label: string
  required?: boolean
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
        {label}
        {required && <span className="text-[var(--data-negative)] ml-0.5">*</span>}
        {subtitle && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--text-disabled)]">
            {subtitle}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}
