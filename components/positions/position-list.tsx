'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { AnimatePresence, m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Brain01Icon as Brain,
  Cancel01Icon as XIcon,
  FilterIcon as FunnelSimple,
} from '@hugeicons/core-free-icons'
import { listStagger, listItem, backdrop } from '@/components/ui/pelican'
import type { BehavioralInsights } from '@/hooks/use-behavioral-insights'
import type { Quote } from '@/hooks/use-live-quotes'
import type { TickerHistory } from '@/hooks/use-ticker-history'
import { computePositionHealth, computeSmartAlerts, type PositionAlert, type PositionHealth } from '@/lib/position-health'
import { cn } from '@/lib/utils'
import { PortfolioPosition, PortfolioStats } from '@/types/portfolio'

interface PositionListProps {
  positions: PortfolioPosition[]
  portfolioStats: PortfolioStats
  insights: BehavioralInsights | null
  tickerHistory: Record<string, TickerHistory>
  quotes: Record<string, Quote>
  watchlistTickers?: Set<string>
  activeFilter: string
  sortBy: string
  searchQuery: string
  onScanWithPelican: (position: PortfolioPosition) => void
  onEdit: (position: PortfolioPosition) => void
  onClose: (position: PortfolioPosition) => void
  onLogTrade?: () => void
}

export interface PositionData {
  position: PortfolioPosition
  health: PositionHealth
  alerts: PositionAlert[]
  quote: Quote | null
  isWatching: boolean
}

function getQuote(position: PortfolioPosition, quotes: Record<string, Quote>): Quote | null {
  return quotes[position.ticker] ?? quotes[position.ticker.toUpperCase()] ?? null
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (Math.abs(value) >= 1) return value.toFixed(2)
  return value.toFixed(4)
}

function formatQuantity(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function formatMoney(value: number | null | undefined, options?: { signed?: boolean; compact?: boolean }): string {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = options?.signed && value > 0 ? '+' : value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const prefix = `${sign}$`
  if (options?.compact) {
    if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(2)}M`
    if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(1)}K`
  }
  return `${prefix}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatOpened(position: PortfolioPosition): string {
  const date = new Date(position.entry_date)
  const datePart = Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
  return `${datePart} · ${position.days_held}d`
}

function computePnl(position: PortfolioPosition, quote: Quote | null) {
  if (!quote || !position.entry_price || !position.quantity) {
    return {
      currentPrice: null,
      priceChange: null,
      pnlAmount: null,
      pnlPercent: null,
      marketValue: position.position_size_usd,
      rMultiple: null,
      hasQuote: false,
    }
  }

  const direction = position.direction === 'long' ? 1 : -1
  const currentPrice = quote.price
  const rawMove = currentPrice - position.entry_price
  const priceChange = rawMove * direction
  const pnlAmount = priceChange * position.quantity
  const pnlPercent = (rawMove / position.entry_price) * 100 * direction
  const marketValue = currentPrice * position.quantity
  let rMultiple: number | null = null

  if (position.stop_loss != null) {
    const riskPerUnit = Math.abs(position.entry_price - position.stop_loss)
    if (riskPerUnit > 0) rMultiple = priceChange / riskPerUnit
  }

  return { currentPrice, priceChange, pnlAmount, pnlPercent, marketValue, rMultiple, hasQuote: true }
}

function DataValue({
  children,
  tone,
  className,
}: {
  children: ReactNode
  tone?: 'positive' | 'negative' | 'muted'
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        tone === 'positive' && 'text-[var(--data-positive)]',
        tone === 'negative' && 'text-[var(--data-negative)]',
        tone === 'muted' && 'text-[var(--text-muted)]',
        className,
      )}
    >
      {children}
    </span>
  )
}

function SheetCell({ label, value, tone }: { label: string; value: ReactNode; tone?: 'positive' | 'negative' | 'muted' }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 truncate text-sm text-[var(--text-primary)]">
        <DataValue tone={tone}>{value}</DataValue>
      </div>
    </div>
  )
}

export function PositionList({
  positions,
  portfolioStats,
  insights,
  tickerHistory,
  quotes,
  watchlistTickers,
  activeFilter,
  sortBy,
  searchQuery,
  onScanWithPelican,
  onEdit,
  onClose,
}: PositionListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredPositions = useMemo(() => {
    let result = [...positions]

    if (activeFilter === 'long') result = result.filter((position) => position.direction === 'long')
    else if (activeFilter === 'short') result = result.filter((position) => position.direction === 'short')
    else if (['stock', 'crypto', 'forex', 'option'].includes(activeFilter)) {
      result = result.filter((position) => position.asset_type === activeFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((position) => position.ticker.toLowerCase().includes(query))
    }

    switch (sortBy) {
      case 'size_desc':
        result.sort((a, b) => b.position_size_usd - a.position_size_usd)
        break
      case 'size_asc':
        result.sort((a, b) => a.position_size_usd - b.position_size_usd)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
        break
      case 'conviction':
        result.sort((a, b) => (b.conviction || 0) - (a.conviction || 0))
        break
      case 'rr':
        result.sort((a, b) => (b.risk_reward_ratio || 0) - (a.risk_reward_ratio || 0))
        break
      default:
        break
    }

    return result
  }, [positions, activeFilter, sortBy, searchQuery])

  const positionData = useMemo<PositionData[]>(() => {
    const data = filteredPositions.map((position) => ({
      position,
      health: computePositionHealth(position, insights, portfolioStats),
      alerts: computeSmartAlerts(position, portfolioStats),
      quote: getQuote(position, quotes),
      isWatching: watchlistTickers?.has(position.ticker.toUpperCase()) ?? false,
    }))

    if (sortBy === 'health') {
      data.sort((a, b) => b.health.score - a.health.score)
    }

    return data
  }, [filteredPositions, insights, portfolioStats, quotes, sortBy, watchlistTickers])

  const selected = useMemo(
    () => positionData.find((data) => data.position.id === selectedId) ?? null,
    [positionData, selectedId],
  )

  useEffect(() => {
    if (!selectedId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId])

  if (positionData.length === 0 && positions.length > 0) {
    return (
      <div className="border-b border-[var(--border-default)] py-10 text-center">
        <HugeiconsIcon icon={FunnelSimple} size={24} className="mx-auto text-[var(--text-muted)]" strokeWidth={1.25} color="currentColor" />
        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
          No positions match the active filter set
        </p>
        <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
          Adjust the blotter tabs or search query to widen the feed.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
        <table className="w-full min-w-[1180px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <th className="px-3 py-2.5 text-left">Symbol</th>
              <th className="px-3 py-2.5 text-left">Side</th>
              <th className="px-3 py-2.5 text-right">Qty</th>
              <th className="px-3 py-2.5 text-right">Avg</th>
              <th className="px-3 py-2.5 text-right">Last</th>
              <th className="px-3 py-2.5 text-right">Chg</th>
              <th className="px-3 py-2.5 text-right">%Chg</th>
              <th className="px-3 py-2.5 text-right">Mkt value</th>
              <th className="px-3 py-2.5 text-right">Unrealized</th>
              <th className="px-3 py-2.5 text-right">R</th>
              <th className="px-3 py-2.5 text-right">Stop</th>
              <th className="px-3 py-2.5 text-right">Target</th>
              <th className="px-3 py-2.5 text-left">Opened</th>
              <th className="px-3 py-2.5 text-left">ID</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <m.tbody variants={listStagger} initial="hidden" animate="visible">
            {positionData.map((data) => {
              const { position, quote } = data
              const pnl = computePnl(position, quote)
              const pnlPositive = (pnl.pnlAmount ?? 0) >= 0
              const rowTone = pnl.hasQuote ? (pnlPositive ? 'positive' : 'negative') : 'muted'
              const sideTone = position.direction === 'long' ? 'positive' : 'negative'
              const symbolMeta = [
                position.asset_type.toUpperCase(),
                data.isWatching ? 'WATCH' : null,
                data.health.label.toUpperCase(),
              ].filter(Boolean).join(' · ')

              return (
                <m.tr
                  key={position.id}
                  variants={listItem}
                  onClick={() => setSelectedId(position.id)}
                  aria-selected={selectedId === position.id}
                  className={cn(
                    'group h-10 cursor-pointer border-b border-[var(--border-subtle)] transition-colors duration-150 hover:bg-[var(--surface-hover)]',
                    selectedId === position.id && 'bg-[var(--surface-active)]/40',
                  )}
                >
                  <td className={cn('border-l-2 px-3 py-0 text-left', pnlPositive ? 'border-l-[var(--data-positive)]/40' : 'border-l-[var(--data-negative)]/40')}>
                    <div className="flex min-w-[150px] flex-col py-1.5">
                      <span className="font-semibold tracking-tight text-[var(--text-primary)]">{position.ticker}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">{symbolMeta}</span>
                    </div>
                  </td>
                  <td className="px-3 py-0 text-left">
                    <DataValue tone={sideTone} className="uppercase tracking-[0.06em]">
                      {position.direction === 'long' ? 'L' : 'S'} · {position.direction}
                    </DataValue>
                  </td>
                  <td className="px-3 py-0 text-right"><DataValue>{formatQuantity(position.quantity)}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue>{formatPrice(position.entry_price)}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={pnl.hasQuote ? rowTone : 'muted'}>{formatPrice(pnl.currentPrice)}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={rowTone}>{pnl.priceChange == null ? '—' : `${pnl.priceChange > 0 ? '+' : ''}${formatPrice(pnl.priceChange)}`}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={rowTone}>{formatPercent(pnl.pnlPercent)}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue>{formatMoney(pnl.marketValue)}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={rowTone}>{formatMoney(pnl.pnlAmount, { signed: true })}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={pnl.rMultiple == null ? 'muted' : pnl.rMultiple >= 0 ? 'positive' : 'negative'}>{pnl.rMultiple == null ? '—' : `${pnl.rMultiple >= 0 ? '+' : ''}${pnl.rMultiple.toFixed(1)}R`}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={position.stop_loss == null ? 'muted' : 'negative'}>{formatPrice(position.stop_loss)}</DataValue></td>
                  <td className="px-3 py-0 text-right"><DataValue tone={position.take_profit == null ? 'muted' : 'positive'}>{formatPrice(position.take_profit)}</DataValue></td>
                  <td className="px-3 py-0 text-left"><DataValue tone="muted">{formatOpened(position)}</DataValue></td>
                  <td className="px-3 py-0 text-left"><DataValue tone="muted">{position.id.slice(0, 8)}</DataValue></td>
                  <td className="px-3 py-0 text-right">
                    <div className="flex justify-end gap-2 opacity-60 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onEdit(position)
                        }}
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onClose(position)
                        }}
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--data-negative)] transition-colors hover:text-red-400"
                      >
                        Close
                      </button>
                    </div>
                  </td>
                </m.tr>
              )
            })}
          </m.tbody>
        </table>
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <m.div
              variants={backdrop}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 bg-[var(--bg-overlay)] backdrop-blur-sm"
              onClick={() => setSelectedId(null)}
            />
            <PositionSheet
              data={selected}
              portfolioStats={portfolioStats}
              tickerHistory={tickerHistory[selected.position.ticker] ?? null}
              onCloseSheet={() => setSelectedId(null)}
              onScan={() => onScanWithPelican(selected.position)}
              onEdit={() => onEdit(selected.position)}
              onClosePosition={() => onClose(selected.position)}
            />
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function PositionSheet({
  data,
  portfolioStats,
  tickerHistory,
  onCloseSheet,
  onScan,
  onEdit,
  onClosePosition,
}: {
  data: PositionData
  portfolioStats: PortfolioStats
  tickerHistory: TickerHistory | null
  onCloseSheet: () => void
  onScan: () => void
  onEdit: () => void
  onClosePosition: () => void
}) {
  const { position, quote, alerts } = data
  const pnl = computePnl(position, quote)
  const pnlPositive = (pnl.pnlAmount ?? 0) >= 0
  const tone = pnl.hasQuote ? (pnlPositive ? 'positive' : 'negative') : 'muted'
  const exposurePct = portfolioStats.total_exposure > 0
    ? (position.position_size_usd / portfolioStats.total_exposure) * 100
    : null

  return (
    <m.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-[var(--border-default)] bg-[var(--bg-base)] shadow-[-30px_0_60px_rgba(0,0,0,0.55)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${position.ticker} position scan`}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Image src="/pelican-logo-transparent.webp" alt="Pelican" width={24} height={24} className="h-6 w-6 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Pelican</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Scan</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onScan}
            className="h-8 border border-[var(--border-default)] px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-glow)]"
          >
            Run scan
          </button>
          <button
            type="button"
            onClick={onCloseSheet}
            className="flex h-8 w-8 items-center justify-center text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            aria-label="Close position sheet"
          >
            <HugeiconsIcon icon={XIcon} size={16} strokeWidth={1.8} color="currentColor" />
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--border-default)] px-4 py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{position.ticker}</h2>
          <span className="text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">{position.asset_type}</span>
          <span className={cn('ml-auto font-mono text-xs uppercase tracking-[0.08em]', position.direction === 'long' ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]')}>
            {position.direction}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <DataValue className="text-xl font-semibold">{formatPrice(pnl.currentPrice ?? position.entry_price)}</DataValue>
          <DataValue tone={tone}>{formatMoney(pnl.pnlAmount, { signed: true })}</DataValue>
          <DataValue tone={tone}>{formatPercent(pnl.pnlPercent)}</DataValue>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Position <span className="font-mono text-[var(--text-ghost)]">#{position.id.slice(0, 8)}</span>
            </div>
            <DataValue tone={data.health.color === 'red' ? 'negative' : data.health.color === 'emerald' ? 'positive' : 'muted'}>
              {data.health.label.toUpperCase()} · {data.health.score}
            </DataValue>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <SheetCell label="Qty" value={formatQuantity(position.quantity)} />
            <SheetCell label="Side" value={position.direction} tone={position.direction === 'long' ? 'positive' : 'negative'} />
            <SheetCell label="Avg price" value={formatPrice(position.entry_price)} />
            <SheetCell label="Market value" value={formatMoney(pnl.marketValue)} />
            <SheetCell label="Unrealized" value={formatMoney(pnl.pnlAmount, { signed: true })} tone={tone} />
            <SheetCell label="Return" value={formatPercent(pnl.pnlPercent)} tone={tone} />
            <SheetCell label="Stop" value={formatPrice(position.stop_loss)} tone={position.stop_loss == null ? 'muted' : 'negative'} />
            <SheetCell label="Target" value={formatPrice(position.take_profit)} tone={position.take_profit == null ? 'muted' : 'positive'} />
            <SheetCell label="Opened" value={formatOpened(position)} tone="muted" />
            <SheetCell
              label="Exposure"
              value={`${formatMoney(position.position_size_usd, { compact: true })}${exposurePct == null ? '' : ` · ${exposurePct.toFixed(1)}%`}`}
            />
          </div>
        </div>

        <div className="border-b border-[var(--border-subtle)] py-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Thesis</div>
          <p className="mt-3 border-l-2 border-[var(--border-default)] pl-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {position.thesis || '—'}
          </p>
        </div>

        <div className="border-b border-[var(--border-subtle)] py-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Pelican scan</div>
          <div className="mt-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Recommendation</span>
              <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">—</span>
            </div>
            <button
              type="button"
              onClick={onScan}
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-primary)] transition-colors hover:text-[var(--accent-hover)]"
            >
              <HugeiconsIcon icon={Brain} size={14} strokeWidth={1.8} color="currentColor" />
              Send position to Pelican
            </button>
            {alerts.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                {alerts.slice(0, 3).map((alert, index) => (
                  <li key={`${alert.type}-${index}`}>{alert.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-b border-[var(--border-subtle)] py-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">Levels · day</div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <SheetCell label="Day high" value={formatPrice(quote?.dayHigh)} />
            <SheetCell label="Day low" value={formatPrice(quote?.dayLow)} />
            <SheetCell label="50 DMA" value="—" tone="muted" />
            <SheetCell label="200 DMA" value="—" tone="muted" />
            <SheetCell label="ATR (14)" value="—" tone="muted" />
            <SheetCell label="Volume" value={quote?.volume == null ? '—' : quote.volume.toLocaleString('en-US')} />
          </div>
        </div>

        <div className="py-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">History</div>
          <div className="mt-2 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
            {tickerHistory && tickerHistory.times_traded > 0
              ? `${tickerHistory.wins}W-${tickerHistory.losses}L · ${tickerHistory.win_rate.toFixed(0)}% WR · ${formatMoney(tickerHistory.total_pnl, { signed: true })}`
              : `No closed trade history for ${position.ticker}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-default)] p-3">
        <button
          type="button"
          onClick={onClosePosition}
          className="h-10 border border-[var(--data-negative)]/30 font-semibold uppercase tracking-[0.08em] text-[10px] text-[var(--data-negative)] transition-colors hover:border-[var(--data-negative)] hover:bg-[var(--data-negative)]/10"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-10 border border-[var(--border-default)] font-semibold uppercase tracking-[0.08em] text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        >
          Edit SL/TP
        </button>
        <button
          type="button"
          onClick={onScan}
          className="h-10 border border-[var(--border-active)] bg-[var(--accent-glow)] font-semibold uppercase tracking-[0.08em] text-[10px] text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)]"
        >
          Monitor
        </button>
      </div>
    </m.aside>
  )
}
