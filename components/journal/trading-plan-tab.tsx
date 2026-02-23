'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardText,
  Plus,
  Shield,
  Warning,
  Check,
  Pencil,
  Trash,
  CaretDown,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react'
import { toast } from '@/hooks/use-toast'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import type { Trade } from '@/hooks/use-trades'
import { useTradingPlan, type CreatePlanData } from '@/hooks/use-trading-plan'
import type { TradingPlan, RuleComplianceStat } from '@/types/trading'
import type { TradeStats } from '@/hooks/use-trade-stats'
import { buildPlanComplianceSummary, buildPlanReviewPrompt } from '@/lib/trading/plan-check'
import { PelicanButton, PelicanCard, staggerContainer, staggerItem, SkeletonCard } from '@/components/ui/pelican'

interface TradingPlanTabProps {
  trades: Trade[]
  onAskPelican: (prompt: string) => void
  complianceStats?: RuleComplianceStat[]
  tradeStats?: TradeStats | null
}

const ASSET_TYPES = ['stock', 'option', 'future', 'forex', 'crypto', 'etf']

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

// ── Shared sub-components ──

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={18} weight="bold" className="text-[var(--accent-primary)]" />
      <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function RuleValue({ label, value, status }: { label: string; value: string; status?: 'ok' | 'warn' | 'danger' }) {
  const color = status === 'danger' ? 'text-[var(--data-negative)]'
    : status === 'warn' ? 'text-[var(--data-warning)]'
    : status === 'ok' ? 'text-[var(--data-positive)]'
    : 'text-[var(--text-primary)]'
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className={`text-sm font-mono tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

function Toggle({ enabled }: { enabled: boolean }) {
  return enabled
    ? <Check size={16} weight="bold" className="text-[var(--data-positive)]" />
    : <span className="w-4 text-center text-[var(--text-muted)]">—</span>
}

function Pill({ text, variant = 'default' }: { text: string; variant?: 'default' | 'danger' }) {
  const base = variant === 'danger'
    ? 'bg-[var(--data-negative)]/10 text-[var(--data-negative)] border-[var(--data-negative)]/20'
    : 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${base}`}>
      {text}
    </span>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  suffix?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--text-muted)] mb-1 block">{label}</span>
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

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
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

// ── Main Component ──

export function TradingPlanTab({ trades, onAskPelican, complianceStats, tradeStats }: TradingPlanTabProps) {
  const { plan, isLoading, createPlan, updatePlan, deletePlan } = useTradingPlan()
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [form, setForm] = useState<CreatePlanData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newBlockedTicker, setNewBlockedTicker] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    risk: true, requirements: true, discipline: true, checklist: true, markets: true,
  })

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  // Compliance summary
  const compliance = useMemo(() => {
    if (!plan) return null
    const todayStr = new Date().toISOString().split('T')[0] as string
    const openCount = trades.filter(t => t.status === 'open').length
    const todayTrades = trades.filter(t => t.entry_date.startsWith(todayStr))
    const todaysClosed = trades.filter(t => t.status === 'closed' && t.exit_date?.startsWith(todayStr))
    const todayPnl = todaysClosed.reduce((sum, t) => sum + (t.pnl_amount ?? 0), 0)

    return {
      openCount,
      openMax: plan.max_open_positions,
      openStatus: plan.max_open_positions
        ? openCount >= plan.max_open_positions ? 'danger' as const
          : openCount >= plan.max_open_positions * 0.8 ? 'warn' as const
          : 'ok' as const
        : undefined,
      todayTradeCount: todayTrades.length,
      todayTradeMax: plan.max_trades_per_day,
      todayTradeStatus: plan.max_trades_per_day
        ? todayTrades.length >= plan.max_trades_per_day ? 'danger' as const
          : todayTrades.length >= plan.max_trades_per_day * 0.8 ? 'warn' as const
          : 'ok' as const
        : undefined,
      todayPnl,
      dailyLossMax: plan.max_daily_loss,
      dailyLossStatus: plan.max_daily_loss
        ? todayPnl < 0 && Math.abs(todayPnl) >= plan.max_daily_loss ? 'danger' as const
          : todayPnl < 0 && Math.abs(todayPnl) >= plan.max_daily_loss * 0.7 ? 'warn' as const
          : 'ok' as const
        : undefined,
    }
  }, [plan, trades])

  const startCreate = () => {
    setForm(DEFAULT_FORM)
    setMode('create')
  }

  const startEdit = () => {
    if (plan) {
      setForm(planToForm(plan))
      setMode('edit')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Plan name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        await createPlan(form)
        toast({ title: 'Trading plan created', description: `"${form.name}" is now active.` })
      } else if (mode === 'edit' && plan) {
        await updatePlan(plan.id, form as Partial<TradingPlan>)
        toast({ title: 'Trading plan updated' })
      }
      setMode('view')
    } catch (err) {
      toast({ title: 'Failed to save plan', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!plan) return
    try {
      await deletePlan(plan.id)
      toast({ title: 'Trading plan deleted' })
      setMode('view')
    } catch (err) {
      toast({ title: 'Failed to delete plan', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const addChecklistItem = () => {
    const item = newChecklistItem.trim()
    if (!item) return
    setForm(f => ({ ...f, pre_entry_checklist: [...(f.pre_entry_checklist ?? []), item] }))
    setNewChecklistItem('')
  }

  const removeChecklistItem = (idx: number) =>
    setForm(f => ({ ...f, pre_entry_checklist: (f.pre_entry_checklist ?? []).filter((_, i) => i !== idx) }))

  const toggleAssetType = (type: string) =>
    setForm(f => {
      const current = f.allowed_asset_types ?? []
      return {
        ...f,
        allowed_asset_types: current.includes(type) ? current.filter(t => t !== type) : [...current, type],
      }
    })

  const addBlockedTicker = () => {
    const ticker = newBlockedTicker.trim().toUpperCase()
    if (!ticker) return
    setForm(f => ({ ...f, blocked_tickers: [...(f.blocked_tickers ?? []), ticker] }))
    setNewBlockedTicker('')
  }

  const removeBlockedTicker = (idx: number) =>
    setForm(f => ({ ...f, blocked_tickers: (f.blocked_tickers ?? []).filter((_, i) => i !== idx) }))

  const updateForm = <K extends keyof CreatePlanData>(key: K, value: CreatePlanData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  // ── Create / Edit Form ──
  if (mode === 'create' || mode === 'edit') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
        {/* Plan name */}
        <PelicanCard>
          <label className="block">
            <span className="text-xs text-[var(--text-muted)] mb-1 block">Plan Name</span>
            <input
              type="text"
              value={form.name}
              onChange={e => updateForm('name', e.target.value)}
              placeholder="My Trading Plan"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </label>
        </PelicanCard>

        {/* Risk Management */}
        <PelicanCard>
          <SectionHeader icon={Shield} title="Risk Management" />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Max Risk / Trade" value={form.max_risk_per_trade_pct} onChange={v => updateForm('max_risk_per_trade_pct', v)} suffix="%" />
            <NumberInput label="Max Daily Loss" value={form.max_daily_loss} onChange={v => updateForm('max_daily_loss', v)} suffix="$" />
            <NumberInput label="Max Open Positions" value={form.max_open_positions} onChange={v => updateForm('max_open_positions', v)} />
            <NumberInput label="Max Trades / Day" value={form.max_trades_per_day} onChange={v => updateForm('max_trades_per_day', v)} />
            <NumberInput label="Min R:R Ratio" value={form.min_risk_reward_ratio} onChange={v => updateForm('min_risk_reward_ratio', v)} />
          </div>
        </PelicanCard>

        {/* Requirements */}
        <PelicanCard>
          <SectionHeader icon={ClipboardText} title="Requirements" />
          <div className="space-y-1">
            <ToggleSwitch label="Require stop loss" checked={form.require_stop_loss ?? false} onChange={v => updateForm('require_stop_loss', v)} />
            <ToggleSwitch label="Require take profit" checked={form.require_take_profit ?? false} onChange={v => updateForm('require_take_profit', v)} />
            <ToggleSwitch label="Require thesis" checked={form.require_thesis ?? false} onChange={v => updateForm('require_thesis', v)} />
          </div>
        </PelicanCard>

        {/* Discipline */}
        <PelicanCard>
          <SectionHeader icon={Warning} title="Discipline" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <NumberInput label="Max Consecutive Losses" value={form.max_consecutive_losses_before_stop} onChange={v => updateForm('max_consecutive_losses_before_stop', v)} />
          </div>
          <ToggleSwitch label="No same ticker after loss" checked={form.no_same_ticker_after_loss ?? false} onChange={v => updateForm('no_same_ticker_after_loss', v)} />
        </PelicanCard>

        {/* Pre-Entry Checklist */}
        <PelicanCard>
          <SectionHeader icon={Check} title="Pre-Entry Checklist" />
          <div className="space-y-2">
            {(form.pre_entry_checklist ?? []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Check size={14} weight="bold" className="text-[var(--data-positive)] shrink-0" />
                <span className="flex-1">{item}</span>
                <button type="button" onClick={() => removeChecklistItem(i)} className="text-[var(--text-muted)] hover:text-[var(--data-negative)] transition-colors">
                  <Trash size={14} />
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
                  <Plus size={18} weight="bold" />
                </button>
              </IconTooltip>
            </div>
          </div>
        </PelicanCard>

        {/* Markets & Assets */}
        <PelicanCard>
          <SectionHeader icon={ClipboardText} title="Markets & Assets" />
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
                <button type="button" onClick={() => removeBlockedTicker(i)} className="hover:text-white transition-colors">
                  <Trash size={12} />
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
                <Plus size={18} weight="bold" />
              </button>
            </IconTooltip>
          </div>
        </PelicanCard>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <PelicanButton onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : mode === 'create' ? 'Create Plan' : 'Save Changes'}
          </PelicanButton>
          <PelicanButton onClick={() => setMode('view')} variant="secondary">
            Cancel
          </PelicanButton>
        </div>
      </motion.div>
    )
  }

  // ── Empty State ──
  if (!plan) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center py-16 text-center">
        <ClipboardText size={48} weight="thin" className="text-[var(--text-muted)] mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Trading Plan Yet</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
          Define your risk rules, requirements, and discipline guidelines to keep yourself accountable.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <PelicanButton onClick={startCreate} variant="primary">
            <Plus size={16} weight="bold" />
            Create Trading Plan
          </PelicanButton>
          <PelicanButton
            onClick={() => onAskPelican(
              'Help me build a trading plan. Ask me about my experience level, risk tolerance, account size, ' +
              'preferred asset types, and trading style. Then create a comprehensive plan with: max risk per trade, ' +
              'daily loss limit, max positions, R:R requirements, and discipline rules. Be specific with numbers.'
            )}
            variant="secondary"
          >
            Build My Plan with Pelican
          </PelicanButton>
        </div>
      </motion.div>
    )
  }

  // ── View Mode ──
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
      {/* Plan Header */}
      <motion.div variants={staggerItem}>
        <PelicanCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{plan.name}</h2>
              {plan.is_active && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--data-positive)]/15 text-[var(--data-positive)] border border-[var(--data-positive)]/20">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <IconTooltip label="Edit plan" side="top">
                <button onClick={startEdit} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <Pencil size={16} />
                </button>
              </IconTooltip>
              <IconTooltip label="Delete plan" side="top">
                <button onClick={handleDelete} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--data-negative)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <Trash size={16} />
                </button>
              </IconTooltip>
            </div>
          </div>
        </PelicanCard>
      </motion.div>

      {/* Risk Rules */}
      <motion.div variants={staggerItem}>
        <PelicanCard>
          <button onClick={() => toggleSection('risk')} className="flex items-center justify-between w-full mb-1">
            <SectionHeader icon={Shield} title="Risk Rules" />
            {expandedSections.risk ? <CaretDown size={14} className="text-[var(--text-muted)]" /> : <CaretRight size={14} className="text-[var(--text-muted)]" />}
          </button>
          <AnimatePresence>
            {expandedSections.risk && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {plan.max_risk_per_trade_pct != null && (
                    <RuleValue label="Max Risk / Trade" value={`${plan.max_risk_per_trade_pct}%`} />
                  )}
                  {plan.max_daily_loss != null && (
                    <RuleValue label="Max Daily Loss" value={`$${plan.max_daily_loss}`} status={compliance?.dailyLossStatus} />
                  )}
                  {plan.max_open_positions != null && (
                    <RuleValue label="Max Open Positions" value={`${compliance?.openCount ?? 0} / ${plan.max_open_positions}`} status={compliance?.openStatus} />
                  )}
                  {plan.max_trades_per_day != null && (
                    <RuleValue label="Max Trades / Day" value={`${compliance?.todayTradeCount ?? 0} / ${plan.max_trades_per_day}`} status={compliance?.todayTradeStatus} />
                  )}
                  {plan.min_risk_reward_ratio != null && (
                    <RuleValue label="Min R:R Ratio" value={`${plan.min_risk_reward_ratio}:1`} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PelicanCard>
      </motion.div>

      {/* Requirements */}
      <motion.div variants={staggerItem}>
        <PelicanCard>
          <button onClick={() => toggleSection('requirements')} className="flex items-center justify-between w-full mb-1">
            <SectionHeader icon={ClipboardText} title="Requirements" />
            {expandedSections.requirements ? <CaretDown size={14} className="text-[var(--text-muted)]" /> : <CaretRight size={14} className="text-[var(--text-muted)]" />}
          </button>
          <AnimatePresence>
            {expandedSections.requirements && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-[var(--text-secondary)]">Stop loss required</span>
                    <Toggle enabled={plan.require_stop_loss} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-[var(--text-secondary)]">Take profit required</span>
                    <Toggle enabled={plan.require_take_profit} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-[var(--text-secondary)]">Thesis required</span>
                    <Toggle enabled={plan.require_thesis} />
                  </div>
                  {plan.min_risk_reward_ratio != null && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-[var(--text-secondary)]">Min R:R ratio</span>
                      <span className="text-sm font-mono tabular-nums text-[var(--text-primary)]">{plan.min_risk_reward_ratio}:1</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PelicanCard>
      </motion.div>

      {/* Discipline */}
      <motion.div variants={staggerItem}>
        <PelicanCard>
          <button onClick={() => toggleSection('discipline')} className="flex items-center justify-between w-full mb-1">
            <SectionHeader icon={Warning} title="Discipline Rules" />
            {expandedSections.discipline ? <CaretDown size={14} className="text-[var(--text-muted)]" /> : <CaretRight size={14} className="text-[var(--text-muted)]" />}
          </button>
          <AnimatePresence>
            {expandedSections.discipline && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="space-y-2">
                  {plan.max_consecutive_losses_before_stop != null && (
                    <RuleValue label="Stop after consecutive losses" value={`${plan.max_consecutive_losses_before_stop}`} />
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-[var(--text-secondary)]">No same ticker after loss</span>
                    <Toggle enabled={plan.no_same_ticker_after_loss} />
                  </div>
                  {plan.cooldown_after_max_loss_hours != null && (
                    <RuleValue label="Cooldown after max loss" value={`${plan.cooldown_after_max_loss_hours}h`} />
                  )}
                  {plan.min_time_between_trades_minutes != null && (
                    <RuleValue label="Min time between trades" value={`${plan.min_time_between_trades_minutes}m`} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PelicanCard>
      </motion.div>

      {/* Pre-Entry Checklist */}
      {(plan.pre_entry_checklist?.length ?? 0) > 0 && (
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <button onClick={() => toggleSection('checklist')} className="flex items-center justify-between w-full mb-1">
              <SectionHeader icon={Check} title="Pre-Entry Checklist" />
              {expandedSections.checklist ? <CaretDown size={14} className="text-[var(--text-muted)]" /> : <CaretRight size={14} className="text-[var(--text-muted)]" />}
            </button>
            <AnimatePresence>
              {expandedSections.checklist && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="space-y-2">
                    {plan.pre_entry_checklist!.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 py-0.5">
                        <div className="w-4 h-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0 mt-0.5 flex items-center justify-center">
                          <Check size={10} weight="bold" className="text-[var(--text-muted)]" />
                        </div>
                        <span className="text-sm text-[var(--text-secondary)]">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </motion.div>
      )}

      {/* Markets & Assets */}
      {((plan.allowed_asset_types?.length ?? 0) > 0 || (plan.blocked_tickers?.length ?? 0) > 0) && (
        <motion.div variants={staggerItem}>
          <PelicanCard>
            <button onClick={() => toggleSection('markets')} className="flex items-center justify-between w-full mb-1">
              <SectionHeader icon={ClipboardText} title="Markets & Assets" />
              {expandedSections.markets ? <CaretDown size={14} className="text-[var(--text-muted)]" /> : <CaretRight size={14} className="text-[var(--text-muted)]" />}
            </button>
            <AnimatePresence>
              {expandedSections.markets && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {(plan.allowed_asset_types?.length ?? 0) > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-[var(--text-muted)] block mb-2">Allowed Assets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.allowed_asset_types!.map(type => (
                          <Pill key={type} text={type} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(plan.blocked_tickers?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-xs text-[var(--text-muted)] block mb-2">Blocked Tickers</span>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.blocked_tickers!.map(ticker => (
                          <Pill key={ticker} text={ticker} variant="danger" />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </PelicanCard>
        </motion.div>
      )}

      {/* Compliance Summary */}
      <motion.div variants={staggerItem}>
        <PelicanCard>
          <SectionHeader icon={Shield} title="Today's Compliance" />
          <div className="divide-y divide-[var(--border-subtle)] mb-4">
            {compliance?.openMax != null && (
              <RuleValue label="Open Positions" value={`${compliance.openCount} / ${compliance.openMax}`} status={compliance.openStatus} />
            )}
            {compliance?.todayTradeMax != null && (
              <RuleValue label="Trades Today" value={`${compliance.todayTradeCount} / ${compliance.todayTradeMax}`} status={compliance.todayTradeStatus} />
            )}
            {compliance?.dailyLossMax != null && (
              <RuleValue label="Daily P&L" value={`$${compliance.todayPnl.toFixed(2)} / -$${compliance.dailyLossMax}`} status={compliance.dailyLossStatus} />
            )}
          </div>
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
              <Sparkle size={14} weight="bold" />
              Review my plan
            </PelicanButton>
          </div>
        </PelicanCard>
      </motion.div>
    </motion.div>
  )
}
