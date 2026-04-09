'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  ClipboardIcon as ClipboardText,
  Add01Icon as Plus,
  Shield01Icon as Shield,
  Alert01Icon as Warning,
  Tick01Icon as Check,
  Delete01Icon as Trash,
  ArrowDown01Icon as CaretDown,
  ArrowRight01Icon as CaretRight,
  SparklesIcon as Sparkle,
  ClockArrowDownIcon as ClockCounterClockwise,
  NoteEditIcon as NotePencil,
} from '@hugeicons/core-free-icons'
import { toast } from '@/hooks/use-toast'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import { ConfirmDestructiveAction, useDestructiveAction } from '@/components/ui/confirm-destructive-action'
import type { Trade } from '@/hooks/use-trades'
import { useTradingPlan, type CreatePlanData } from '@/hooks/use-trading-plan'
import type { TradingPlan, RuleComplianceStat } from '@/types/trading'
import type { TradeStats } from '@/hooks/use-trade-stats'
import type { PlanCompliance } from '@/lib/plan-compliance'
import { buildPlanComplianceSummary, buildPlanReviewPrompt } from '@/lib/trading/plan-check'
import { PelicanButton, PelicanCard, staggerContainer, staggerItem, SkeletonCard } from '@/components/ui/pelican'
import { useAutoSavePlan, type FieldSaveStatus } from '@/hooks/use-auto-save-plan'
import { useLiveCompliance } from '@/hooks/use-live-compliance'
import { PlanComplianceHero } from '@/components/journal/plan-compliance-hero'
import { createClient } from '@/lib/supabase/client'

// ── Constants ──

interface TradingPlanTabProps {
  trades: Trade[]
  onAskPelican: (prompt: string) => void
  complianceStats?: RuleComplianceStat[]
  tradeStats?: TradeStats | null
}

const ASSET_TYPES = ['stock', 'option', 'forex', 'crypto', 'etf']
const STORAGE_KEY = 'pelican_plan_sections'

const DEFAULT_FORM: CreatePlanData = {
  name: '',
  max_risk_per_trade_pct: null,
  max_daily_loss: null,
  max_open_positions: null,
  max_trades_per_day: null,
  min_risk_reward_ratio: null,
  require_stop_loss: false,
  require_take_profit: false,
  require_thesis: false,
  max_consecutive_losses_before_stop: null,
  no_same_ticker_after_loss: false,
  pre_entry_checklist: [],
  allowed_asset_types: [],
  blocked_tickers: [],
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Plan Name',
  max_risk_per_trade_pct: 'Max Risk / Trade',
  max_daily_loss: 'Max Daily Loss',
  max_open_positions: 'Max Open Positions',
  max_trades_per_day: 'Max Trades / Day',
  min_risk_reward_ratio: 'Min R:R Ratio',
  require_stop_loss: 'Require Stop Loss',
  require_take_profit: 'Require Take Profit',
  require_thesis: 'Require Thesis',
  max_consecutive_losses_before_stop: 'Max Consecutive Losses',
  no_same_ticker_after_loss: 'No Same Ticker After Loss',
  pre_entry_checklist: 'Pre-Entry Checklist',
  allowed_asset_types: 'Allowed Asset Types',
  blocked_tickers: 'Blocked Tickers',
  plan_notes: 'Plan Notes',
}

const DEFAULT_SECTIONS: Record<string, boolean> = {
  risk: true, requirements: true, discipline: true, checklist: true, markets: true, history: false,
}

// ── Helpers ──

function planToForm(plan: TradingPlan): CreatePlanData {
  return {
    name: plan.name,
    max_risk_per_trade_pct: plan.max_risk_per_trade_pct,
    max_daily_loss: plan.max_daily_loss,
    max_open_positions: plan.max_open_positions,
    max_trades_per_day: plan.max_trades_per_day,
    min_risk_reward_ratio: plan.min_risk_reward_ratio,
    require_stop_loss: plan.require_stop_loss,
    require_take_profit: plan.require_take_profit,
    require_thesis: plan.require_thesis,
    max_consecutive_losses_before_stop: plan.max_consecutive_losses_before_stop,
    no_same_ticker_after_loss: plan.no_same_ticker_after_loss,
    pre_entry_checklist: plan.pre_entry_checklist ?? [],
    allowed_asset_types: plan.allowed_asset_types ?? [],
    blocked_tickers: plan.blocked_tickers ?? [],
  }
}

function parsePlanNotes(notes: string | null): Record<string, string> {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
      return parsed as Record<string, string>
    return { general: String(parsed) }
  } catch {
    return notes ? { general: notes } : {}
  }
}

function getSectionStatus(
  sectionKey: string,
  compliance: PlanCompliance | null,
): 'green' | 'amber' | 'red' | 'gray' {
  if (!compliance) return 'gray'
  const { liveMetrics, ruleScores } = compliance
  switch (sectionKey) {
    case 'risk': {
      const statuses = [liveMetrics.tradesToday, liveMetrics.dailyPnl, liveMetrics.openPositions]
      if (statuses.some(m => m.status === 'critical')) return 'red'
      if (statuses.some(m => m.status === 'warning')) return 'amber'
      return 'green'
    }
    case 'requirements': {
      const enabled = ruleScores.filter(r => r.enabled)
      if (enabled.length === 0) return 'gray'
      const avg = enabled.reduce((s, r) => s + r.score, 0) / enabled.length
      if (avg < 50) return 'red'
      if (avg < 80) return 'amber'
      return 'green'
    }
    case 'discipline': {
      if (liveMetrics.consecutiveLosses.status === 'critical') return 'red'
      if (liveMetrics.consecutiveLosses.status === 'warning') return 'amber'
      return 'green'
    }
    default:
      return 'gray'
  }
}

function loadSections(): Record<string, boolean> {
  if (typeof window === 'undefined') return DEFAULT_SECTIONS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_SECTIONS, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_SECTIONS
}

// ── Sub-components ──

function SaveIndicator({ status }: { status: FieldSaveStatus }) {
  if (status === 'idle') return null
  if (status === 'saving')
    return <span className="text-[10px] text-[var(--text-muted)] animate-pulse">saving...</span>
  if (status === 'saved')
    return <span className="text-[10px] text-[var(--data-positive)]">Saved ✓</span>
  return <span className="text-[10px] text-[var(--data-negative)]">Error</span>
}

function GlobalSaveIndicator({ status }: { status: FieldSaveStatus }) {
  if (status === 'idle') return null
  if (status === 'saving')
    return <span className="text-xs text-[var(--text-muted)] animate-pulse font-medium">Saving...</span>
  if (status === 'saved')
    return <span className="text-xs text-[var(--data-positive)] font-medium">All changes saved</span>
  return <span className="text-xs text-[var(--data-negative)] font-medium">Save error</span>
}

const STATUS_COLORS: Record<string, string> = {
  green: 'bg-[var(--data-positive)]',
  amber: 'bg-[var(--data-warning)]',
  red: 'bg-[var(--data-negative)]',
  gray: 'bg-[var(--text-muted)]',
}

function SectionHeader({
  icon: Icon,
  title,
  status,
  expanded,
  onToggle,
  noteExists,
  onToggleNote,
  unconfigured,
}: {
  icon: IconSvgElement
  title: string
  status?: 'green' | 'amber' | 'red' | 'gray'
  expanded: boolean
  onToggle: () => void
  noteExists?: boolean
  onToggleNote?: () => void
  unconfigured?: boolean
}) {
  return (
    <button type="button" className="flex items-center justify-between w-full mb-1 appearance-none bg-transparent border-none p-0 m-0 cursor-pointer text-left" onClick={onToggle} aria-expanded={expanded} aria-label={`${title} section`}>
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Icon} size={18} className="text-[var(--accent-primary)]" strokeWidth={2} color="currentColor" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">{title}</h3>
        {status && <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />}
      </div>
      <div className="flex items-center gap-1.5">
        {onToggleNote && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleNote() }}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors appearance-none bg-transparent border-none m-0 cursor-pointer"
            aria-label={noteExists ? 'Edit note' : 'Add note'}
          >
            <HugeiconsIcon icon={NotePencil} size={14} strokeWidth={1.5} color="currentColor" />
          </button>
        )}
        {!expanded && unconfigured && (
          <span className="text-[10px] text-[var(--text-muted)] italic mr-1">Click to configure</span>
        )}
        {expanded
          ? <HugeiconsIcon icon={CaretDown} size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />
          : <HugeiconsIcon icon={CaretRight} size={14} className="text-[var(--text-muted)]" strokeWidth={1.5} color="currentColor" />}
      </div>
    </button>
  )
}

function NumberInput({
  label, value, onChange, suffix, placeholder, saveStatus,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  suffix?: string
  placeholder?: string
  saveStatus?: FieldSaveStatus
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        {saveStatus && <SaveIndicator status={saveStatus} />}
      </div>
      <div className="relative">
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={placeholder ?? '—'}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">{suffix}</span>
        )}
      </div>
    </label>
  )
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : ''
        }`} />
      </button>
    </label>
  )
}


// ── Plan Change History ──

interface PlanChange {
  id: string
  field_changed: string
  old_value: string
  new_value: string
  created_at: string
}

function HistoryItem({ change }: { change: PlanChange }) {
  const label = FIELD_LABELS[change.field_changed] ?? change.field_changed
  const dateStr = new Date(change.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-sm">
      <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums w-14 shrink-0 pt-0.5">{dateStr}</span>
      <span className="text-[var(--text-secondary)]">
        {label}: <span className="text-[var(--text-muted)] line-through">{change.old_value || '—'}</span>{' '}
        → <span className="text-[var(--text-primary)] font-medium">{change.new_value || '—'}</span>
      </span>
    </div>
  )
}

// ── Main Component ──

export function TradingPlanTab({ trades, onAskPelican, complianceStats, tradeStats }: TradingPlanTabProps) {
  const { plan, isLoading, createPlan, deletePlan } = useTradingPlan()
  const destructive = useDestructiveAction()
  const { saveField, fieldStatus, globalStatus } = useAutoSavePlan(plan?.id ?? null)
  const { compliance: liveCompliance } = useLiveCompliance()
  const supabase = useMemo(() => createClient(), [])

  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<CreatePlanData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newBlockedTicker, setNewBlockedTicker] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(loadSections)
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({})
  const [openNoteSection, setOpenNoteSection] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Sync form from plan
  useEffect(() => {
    if (plan && !isCreating) {
      setForm(planToForm(plan))
      setSectionNotes(parsePlanNotes(plan.plan_notes))
    }
  }, [plan, isCreating])

  // Plan changes history
  const { data: historyData, mutate: mutateHistory } = useSWR<PlanChange[]>(
    plan ? ['plan-changes', plan.id] : null,
    async () => {
      const { data } = await supabase
        .from('plan_changes')
        .select('*')
        .eq('plan_id', plan!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      return (data as PlanChange[]) || []
    },
    { revalidateOnFocus: false },
  )

  // Error toast on auto-save failure
  useEffect(() => {
    if (globalStatus === 'error') {
      toast({ title: 'Failed to save change', description: 'Please try again.', variant: 'destructive' })
    }
  }, [globalStatus])

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const updateForm = useCallback(<K extends keyof CreatePlanData>(key: K, value: CreatePlanData[K]) => {
    setForm(f => {
      const oldValue = f[key]
      if (plan && !isCreating) {
        saveField(String(key), value, oldValue)
        setTimeout(() => mutateHistory(), 2000)
      }
      return { ...f, [key]: value }
    })
  }, [plan, isCreating, saveField, mutateHistory])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Plan name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createPlan(form)
      toast({ title: 'Trading plan created', description: `"${form.name}" is now active.` })
      setIsCreating(false)
    } catch (err) {
      toast({ title: 'Failed to create plan', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!plan) return
    destructive.requestConfirmation({
      title: `Delete "${plan.name}"?`,
      description: 'This will permanently remove your trading plan and all its rules. This cannot be undone.',
      itemCount: 1,
      itemType: 'trading plan',
      confirmText: 'Delete Plan',
      requireTypedConfirmation: true,
      typedConfirmationValue: plan.name,
      onConfirm: async () => {
        await deletePlan(plan.id)
        toast({ title: 'Trading plan deleted' })
        setIsCreating(false)
      },
    })
  }

  const addChecklistItem = () => {
    const item = newChecklistItem.trim()
    if (!item) return
    updateForm('pre_entry_checklist', [...(form.pre_entry_checklist ?? []), item])
    setNewChecklistItem('')
  }

  const removeChecklistItem = (idx: number) =>
    updateForm('pre_entry_checklist', (form.pre_entry_checklist ?? []).filter((_, i) => i !== idx))

  const toggleAssetType = (type: string) => {
    const current = form.allowed_asset_types ?? []
    updateForm('allowed_asset_types', current.includes(type) ? current.filter(t => t !== type) : [...current, type])
  }

  const addBlockedTicker = () => {
    const ticker = newBlockedTicker.trim().toUpperCase()
    if (!ticker) return
    updateForm('blocked_tickers', [...(form.blocked_tickers ?? []), ticker])
    setNewBlockedTicker('')
  }

  const removeBlockedTicker = (idx: number) =>
    updateForm('blocked_tickers', (form.blocked_tickers ?? []).filter((_, i) => i !== idx))

  const updateSectionNote = (section: string, text: string) => {
    setSectionNotes(prev => {
      const next = { ...prev, [section]: text }
      if (plan && !isCreating) {
        saveField('plan_notes', JSON.stringify(next), JSON.stringify(prev))
      }
      return next
    })
  }

  const isSectionUnconfigured = (key: string): boolean => {
    switch (key) {
      case 'risk':
        return form.max_risk_per_trade_pct == null && form.max_daily_loss == null
          && form.max_open_positions == null && form.max_trades_per_day == null
          && form.min_risk_reward_ratio == null
      case 'requirements':
        return !form.require_stop_loss && !form.require_take_profit && !form.require_thesis
      case 'discipline':
        return form.max_consecutive_losses_before_stop == null && !form.no_same_ticker_after_loss
      case 'checklist':
        return (form.pre_entry_checklist ?? []).length === 0
      case 'markets':
        return (form.allowed_asset_types ?? []).length === 0 && (form.blocked_tickers ?? []).length === 0
      default:
        return false
    }
  }

  const renderNote = (section: string) => {
    if (openNoteSection !== section) return null
    return (
      <div className="mb-3">
        <textarea
          value={sectionNotes[section] || ''}
          onChange={e => updateSectionNote(section, e.target.value)}
          placeholder="Notes for this section..."
          rows={2}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
        />
      </div>
    )
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  // ── Empty State ──
  if (!plan && !isCreating) {
    return (
      <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center py-16 text-center">
        <HugeiconsIcon icon={ClipboardText} size={48} className="text-[var(--text-muted)] mb-4" strokeWidth={1} color="currentColor" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Trading Plan Yet</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
          Define your risk rules, requirements, and discipline guidelines to keep yourself accountable.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <PelicanButton onClick={() => { setForm(DEFAULT_FORM); setIsCreating(true) }} variant="primary">
            <HugeiconsIcon icon={Plus} size={16} strokeWidth={2} color="currentColor" />
            Create Trading Plan
          </PelicanButton>
          <PelicanButton
            onClick={() => onAskPelican(
              'Help me build a trading plan. Ask me about my experience level, risk tolerance, account size, ' +
              'preferred asset types, and trading style. Then create a comprehensive plan with: max risk per trade, ' +
              'daily loss limit, max positions, R:R requirements, and discipline rules. Be specific with numbers.',
            )}
            variant="secondary"
          >
            Build My Plan with Pelican
          </PelicanButton>
        </div>
      </m.div>
    )
  }

  // ── Plan Form (create mode OR always-editable existing plan) ──
  return (
    <>
      <m.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {/* Compliance Hero */}
        {plan && liveCompliance && (
          <m.div variants={staggerItem}>
            <PlanComplianceHero
              compliance={liveCompliance}
              trades={trades}
              plan={plan}
              onScrollToForm={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          </m.div>
        )}

        {/* Plan Header */}
        <m.div variants={staggerItem}>
          <PelicanCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isCreating ? (
                  <label className="block flex-1">
                    <span className="text-xs text-[var(--text-muted)] mb-1 block">Plan Name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => updateForm('name', e.target.value)}
                      placeholder="My Trading Plan"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                  </label>
                ) : (
                  <>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => updateForm('name', e.target.value)}
                      className="text-lg font-semibold text-[var(--text-primary)] bg-transparent border-none outline-none focus:ring-0 p-0 min-w-0 flex-1"
                    />
                    {plan?.is_active && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--data-positive)]/15 text-[var(--data-positive)] border border-[var(--data-positive)]/20 shrink-0">
                        Active
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {!isCreating && <GlobalSaveIndicator status={globalStatus} />}
                {plan && (
                  <IconTooltip label="Delete plan" side="top">
                    <button onClick={handleDelete} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--data-negative)] hover:bg-[var(--bg-elevated)] transition-colors" aria-label="Delete plan">
                      <HugeiconsIcon icon={Trash} size={16} strokeWidth={1.5} color="currentColor" />
                    </button>
                  </IconTooltip>
                )}
              </div>
            </div>
          </PelicanCard>
        </m.div>

        {/* Risk Management */}
        <m.div variants={staggerItem} ref={formRef}>
          <PelicanCard>
            <SectionHeader
              icon={Shield}
              title="Risk Management"
              status={plan ? getSectionStatus('risk', liveCompliance) : undefined}
              expanded={expandedSections.risk ?? true}
              onToggle={() => toggleSection('risk')}
              noteExists={!!sectionNotes.risk}
              onToggleNote={() => setOpenNoteSection(p => p === 'risk' ? null : 'risk')}
              unconfigured={isSectionUnconfigured('risk')}
            />
            <AnimatePresence>
              {(expandedSections.risk ?? true) && (
                <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {renderNote('risk')}
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Max Risk / Trade" value={form.max_risk_per_trade_pct} onChange={v => updateForm('max_risk_per_trade_pct', v)} suffix="%" saveStatus={fieldStatus.max_risk_per_trade_pct} />
                    <NumberInput label="Max Daily Loss" value={form.max_daily_loss} onChange={v => updateForm('max_daily_loss', v)} suffix="$" saveStatus={fieldStatus.max_daily_loss} />
                    <NumberInput label="Max Open Positions" value={form.max_open_positions} onChange={v => updateForm('max_open_positions', v)} saveStatus={fieldStatus.max_open_positions} />
                    <NumberInput label="Max Trades / Day" value={form.max_trades_per_day} onChange={v => updateForm('max_trades_per_day', v)} saveStatus={fieldStatus.max_trades_per_day} />
                    <NumberInput label="Min R:R Ratio" value={form.min_risk_reward_ratio} onChange={v => updateForm('min_risk_reward_ratio', v)} saveStatus={fieldStatus.min_risk_reward_ratio} />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </m.div>

        {/* Requirements */}
        <m.div variants={staggerItem}>
          <PelicanCard>
            <SectionHeader
              icon={ClipboardText}
              title="Requirements"
              status={plan ? getSectionStatus('requirements', liveCompliance) : undefined}
              expanded={expandedSections.requirements ?? true}
              onToggle={() => toggleSection('requirements')}
              noteExists={!!sectionNotes.requirements}
              onToggleNote={() => setOpenNoteSection(p => p === 'requirements' ? null : 'requirements')}
              unconfigured={isSectionUnconfigured('requirements')}
            />
            <AnimatePresence>
              {(expandedSections.requirements ?? true) && (
                <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {renderNote('requirements')}
                  <div className="space-y-1">
                    <ToggleSwitch label="Require stop loss" checked={form.require_stop_loss ?? false} onChange={v => updateForm('require_stop_loss', v)} />
                    <ToggleSwitch label="Require take profit" checked={form.require_take_profit ?? false} onChange={v => updateForm('require_take_profit', v)} />
                    <ToggleSwitch label="Require thesis" checked={form.require_thesis ?? false} onChange={v => updateForm('require_thesis', v)} />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </m.div>

        {/* Discipline */}
        <m.div variants={staggerItem}>
          <PelicanCard>
            <SectionHeader
              icon={Warning}
              title="Discipline"
              status={plan ? getSectionStatus('discipline', liveCompliance) : undefined}
              expanded={expandedSections.discipline ?? true}
              onToggle={() => toggleSection('discipline')}
              noteExists={!!sectionNotes.discipline}
              onToggleNote={() => setOpenNoteSection(p => p === 'discipline' ? null : 'discipline')}
              unconfigured={isSectionUnconfigured('discipline')}
            />
            <AnimatePresence>
              {(expandedSections.discipline ?? true) && (
                <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {renderNote('discipline')}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <NumberInput label="Max Consecutive Losses" value={form.max_consecutive_losses_before_stop} onChange={v => updateForm('max_consecutive_losses_before_stop', v)} saveStatus={fieldStatus.max_consecutive_losses_before_stop} />
                  </div>
                  <ToggleSwitch label="No same ticker after loss" checked={form.no_same_ticker_after_loss ?? false} onChange={v => updateForm('no_same_ticker_after_loss', v)} />
                </m.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </m.div>

        {/* Pre-Entry Checklist */}
        <m.div variants={staggerItem}>
          <PelicanCard>
            <SectionHeader
              icon={Check}
              title="Pre-Entry Checklist"
              expanded={expandedSections.checklist ?? true}
              onToggle={() => toggleSection('checklist')}
              noteExists={!!sectionNotes.checklist}
              onToggleNote={() => setOpenNoteSection(p => p === 'checklist' ? null : 'checklist')}
              unconfigured={isSectionUnconfigured('checklist')}
            />
            <AnimatePresence>
              {(expandedSections.checklist ?? true) && (
                <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {renderNote('checklist')}
                  <div className="space-y-2">
                    {(form.pre_entry_checklist ?? []).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <HugeiconsIcon icon={Check} size={14} className="text-[var(--data-positive)] shrink-0" strokeWidth={2} color="currentColor" />
                        <span className="flex-1">{item}</span>
                        <button type="button" onClick={() => removeChecklistItem(i)} className="text-[var(--text-muted)] hover:text-[var(--data-negative)] transition-colors" aria-label="Remove checklist item">
                          <HugeiconsIcon icon={Trash} size={14} strokeWidth={1.5} color="currentColor" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newChecklistItem}
                        onChange={e => setNewChecklistItem(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                        placeholder="Add checklist item..."
                        className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                      />
                      <IconTooltip label="Add item" side="top">
                        <button type="button" onClick={addChecklistItem} className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors">
                          <HugeiconsIcon icon={Plus} size={18} strokeWidth={2} color="currentColor" />
                        </button>
                      </IconTooltip>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </m.div>

        {/* Markets & Assets */}
        <m.div variants={staggerItem}>
          <PelicanCard>
            <SectionHeader
              icon={ClipboardText}
              title="Markets & Assets"
              expanded={expandedSections.markets ?? true}
              onToggle={() => toggleSection('markets')}
              noteExists={!!sectionNotes.markets}
              onToggleNote={() => setOpenNoteSection(p => p === 'markets' ? null : 'markets')}
              unconfigured={isSectionUnconfigured('markets')}
            />
            <AnimatePresence>
              {(expandedSections.markets ?? true) && (
                <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {renderNote('markets')}
                  <span className="text-xs text-[var(--text-muted)] mb-2 block">Allowed Asset Types</span>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ASSET_TYPES.map(type => {
                      const selected = (form.allowed_asset_types ?? []).includes(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleAssetType(type)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                            selected
                              ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          {type}
                        </button>
                      )
                    })}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] mb-2 block">Blocked Tickers</span>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(form.blocked_tickers ?? []).map((ticker, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-[var(--data-negative)]/10 text-[var(--data-negative)] border-[var(--data-negative)]/20">
                        {ticker}
                        <button type="button" onClick={() => removeBlockedTicker(i)} className="hover:text-white transition-colors" aria-label="Remove ticker">
                          <HugeiconsIcon icon={Trash} size={12} strokeWidth={1.5} color="currentColor" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBlockedTicker}
                      onChange={e => setNewBlockedTicker(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBlockedTicker())}
                      placeholder="e.g. MEME"
                      className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                    <IconTooltip label="Add ticker" side="top">
                      <button type="button" onClick={addBlockedTicker} className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors">
                        <HugeiconsIcon icon={Plus} size={18} strokeWidth={2} color="currentColor" />
                      </button>
                    </IconTooltip>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </m.div>

        {/* Pelican Actions */}
        {plan && (
          <m.div variants={staggerItem}>
            <div className="flex items-center gap-2">
              <PelicanButton
                onClick={() => onAskPelican(buildPlanComplianceSummary(plan, trades) + '\n\nAm I following my trading plan today? Analyze my compliance and give me feedback.')}
                variant="secondary"
                size="sm"
              >
                Ask about today
              </PelicanButton>
              <PelicanButton
                onClick={() => onAskPelican(buildPlanReviewPrompt(plan, complianceStats || null, tradeStats || null))}
                variant="secondary"
                size="sm"
              >
                <HugeiconsIcon icon={Sparkle} size={14} strokeWidth={2} color="currentColor" />
                Review my plan
              </PelicanButton>
            </div>
          </m.div>
        )}

        {/* Plan History */}
        {plan && historyData && historyData.length > 0 && (
          <m.div variants={staggerItem}>
            <PelicanCard>
              <SectionHeader
                icon={ClockCounterClockwise}
                title="Plan History"
                expanded={expandedSections.history ?? false}
                onToggle={() => toggleSection('history')}
              />
              <AnimatePresence>
                {(expandedSections.history ?? false) && (
                  <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {historyData.map(change => (
                        <HistoryItem key={change.id} change={change} />
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </PelicanCard>
          </m.div>
        )}

        {/* Create Actions */}
        {isCreating && (
          <div className="flex items-center gap-3 pt-2">
            <PelicanButton onClick={handleCreate} disabled={saving} variant="primary">
              {saving ? 'Creating...' : 'Create Plan'}
            </PelicanButton>
            <PelicanButton onClick={() => setIsCreating(false)} variant="secondary">
              Cancel
            </PelicanButton>
          </div>
        )}
      </m.div>

      <ConfirmDestructiveAction
        open={destructive.state.isOpen}
        onOpenChange={destructive.setOpen}
        title={destructive.state.title}
        description={destructive.state.description}
        itemCount={destructive.state.itemCount}
        itemType={destructive.state.itemType}
        confirmText={destructive.state.confirmText}
        requireTypedConfirmation={destructive.state.requireTypedConfirmation}
        typedConfirmationValue={destructive.state.typedConfirmationValue}
        onConfirm={destructive.state.onConfirm}
        onCancel={destructive.state.onCancel}
      />
    </>
  )
}
