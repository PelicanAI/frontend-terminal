"use client"

import { Trade } from "@/hooks/use-trades"
import { CaretUp, CaretDown, CaretUpDown, PlayCircle } from "@phosphor-icons/react"
import { useState } from "react"
import { motion } from "framer-motion"
import { useLiveQuotes, type Quote } from "@/hooks/use-live-quotes"
import { LogoImg } from "@/components/ui/logo-img"
import { PelicanCard, PelicanButton, staggerContainer, staggerItem } from "@/components/ui/pelican"
import { GradeBadge } from "@/components/grading/trade-grade-card"

interface TradesTableProps {
  trades: Trade[]
  onSelectTrade: (trade: Trade) => void
  selectedTradeId?: string | null
  onScanTrade?: (trade: Trade) => void
  onAskPelican?: (prompt: string) => void
  onReplayTrade?: (trade: Trade) => void
}

function getUnrealizedPnL(trade: Trade, quotes: Record<string, Quote>) {
  if (trade.status !== 'open') return null
  const quote = quotes[trade.ticker]
  if (!quote) return null

  const currentPrice = quote.price
  const direction = trade.direction === 'long' ? 1 : -1
  const pnlAmount = (currentPrice - trade.entry_price) * trade.quantity * direction
  const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100 * direction

  // R-multiple (if stop loss set)
  let rMultiple: number | null = null
  if (trade.stop_loss) {
    const riskPerShare = Math.abs(trade.entry_price - trade.stop_loss)
    if (riskPerShare > 0) {
      rMultiple = ((currentPrice - trade.entry_price) * direction) / riskPerShare
    }
  }

  return { currentPrice, pnlAmount, pnlPercent, rMultiple }
}

type SortField = 'entry_date' | 'exit_date' | 'ticker' | 'pnl_amount' | 'pnl_percent'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'open' | 'closed' | 'cancelled'

export function TradesTable({ trades, onSelectTrade, selectedTradeId, onScanTrade, onAskPelican, onReplayTrade }: TradesTableProps) {
  const [sortField, setSortField] = useState<SortField>('entry_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Get live quotes for open positions
  const openTickersWithTypes = trades
    .filter(t => t.status === 'open')
    .map(t => `${t.ticker}:${t.asset_type}`)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe

  const { quotes } = useLiveQuotes(openTickersWithTypes)

  // Status counts from unfiltered trades
  const statusCounts = {
    all: trades.length,
    open: trades.filter(t => t.status === 'open').length,
    closed: trades.filter(t => t.status === 'closed').length,
    cancelled: trades.filter(t => t.status === 'cancelled').length,
  }

  // Apply status filter
  const statusFilteredTrades = statusFilter === 'all'
    ? trades
    : trades.filter(t => t.status === statusFilter)

  // When switching status filter, adjust default sort
  const handleStatusFilter = (filter: StatusFilter) => {
    setStatusFilter(filter)
    if (filter === 'closed') {
      setSortField('exit_date')
      setSortDirection('desc')
    } else if (filter === 'open') {
      setSortField('entry_date')
      setSortDirection('desc')
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTrades = [...statusFilteredTrades].sort((a, b) => {
    let aVal: number | string | null
    let bVal: number | string | null

    switch (sortField) {
      case 'entry_date':
        aVal = new Date(a.entry_date).getTime()
        bVal = new Date(b.entry_date).getTime()
        break
      case 'exit_date':
        aVal = a.exit_date ? new Date(a.exit_date).getTime() : 0
        bVal = b.exit_date ? new Date(b.exit_date).getTime() : 0
        break
      case 'ticker':
        aVal = a.ticker
        bVal = b.ticker
        break
      case 'pnl_amount':
        aVal = a.pnl_amount ?? 0
        bVal = b.pnl_amount ?? 0
        break
      case 'pnl_percent':
        aVal = a.pnl_percent ?? 0
        bVal = b.pnl_percent ?? 0
        break
      default:
        return 0
    }

    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <CaretUpDown size={12} className="text-[var(--text-disabled)]" />
    return sortDirection === 'asc' ? (
      <CaretUp size={12} weight="bold" className="text-[var(--accent-primary)]" />
    ) : (
      <CaretDown size={12} weight="bold" className="text-[var(--accent-primary)]" />
    )
  }

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--text-muted)] text-sm">No trades to display</p>
      </div>
    )
  }

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'closed', label: 'Closed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const thClass = "text-[var(--text-muted)] uppercase text-xs tracking-wider font-medium"

  return (
    <>
      {/* Status Filter Pills */}
      <div className="flex items-center gap-1 mb-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5 w-fit">
        {statusFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleStatusFilter(key)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5
              ${
                statusFilter === key
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'bg-transparent text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }
            `}
          >
            {label}
            <span className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
              statusFilter === key
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}>
              {statusCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
        <thead>
          <tr className="text-left">
            <th className="pb-3 px-4">
              <button
                onClick={() => handleSort('ticker')}
                className={`flex items-center gap-1 ${thClass} hover:text-[var(--text-secondary)] transition-colors`}
              >
                Ticker
                <SortIcon field="ticker" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <span className={thClass}>Direction</span>
            </th>
            <th className="pb-3 px-4">
              <button
                onClick={() => handleSort('entry_date')}
                className={`flex items-center gap-1 ${thClass} hover:text-[var(--text-secondary)] transition-colors`}
              >
                Entry Date
                <SortIcon field="entry_date" />
              </button>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className={thClass}>Entry</span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className={thClass}>Current</span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className={thClass}>Exit</span>
            </th>
            {statusFilter === 'closed' && (
              <th className="pb-3 px-4">
                <button
                  onClick={() => handleSort('exit_date')}
                  className={`flex items-center gap-1 ${thClass} hover:text-[var(--text-secondary)] transition-colors`}
                >
                  Exit Date
                  <SortIcon field="exit_date" />
                </button>
              </th>
            )}
            <th className="pb-3 px-4 text-right">
              <button
                onClick={() => handleSort('pnl_amount')}
                className={`flex items-center gap-1 ml-auto ${thClass} hover:text-[var(--text-secondary)] transition-colors`}
              >
                P&L
                <SortIcon field="pnl_amount" />
              </button>
            </th>
            <th className="pb-3 px-4 text-right">
              <button
                onClick={() => handleSort('pnl_percent')}
                className={`flex items-center gap-1 ml-auto ${thClass} hover:text-[var(--text-secondary)] transition-colors`}
              >
                %
                <SortIcon field="pnl_percent" />
              </button>
            </th>
            {statusFilter === 'closed' && (
              <th className="pb-3 px-4 text-right">
                <span className={thClass}>R</span>
              </th>
            )}
            <th className="pb-3 px-4">
              <span className={thClass}>Status</span>
            </th>
            <th className="pb-3 px-4 text-center">
              <span className={thClass}>Grade</span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className={thClass}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTrades.map((trade) => {
            const isSelected = selectedTradeId === trade.id
            const unrealized = getUnrealizedPnL(trade, quotes)

            // For closed trades, use actual P&L; for open trades with quote, use unrealized
            const displayPnL = trade.status === 'open' && unrealized
              ? { amount: unrealized.pnlAmount, percent: unrealized.pnlPercent }
              : { amount: trade.pnl_amount, percent: trade.pnl_percent }

            const isWinner = displayPnL.amount !== null && displayPnL.amount > 0
            const isLoser = displayPnL.amount !== null && displayPnL.amount < 0

            return (
              <tr
                key={trade.id}
                data-trade-id={trade.id}
                onClick={() => onSelectTrade(trade)}
                className={`
                  cursor-pointer transition-colors duration-150
                  ${isSelected ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--bg-elevated)]'}
                  ${trade.is_paper ? 'border-b border-dashed border-[var(--border-subtle)]' : ''}
                `}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <LogoImg symbol={trade.ticker} size={20} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onScanTrade?.(trade)
                      }}
                      className="font-mono font-semibold text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent-primary)] hover:underline"
                    >
                      {trade.ticker}
                    </button>
                    {trade.is_paper && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--data-warning)]/20 text-[var(--data-warning)] font-medium">
                        P
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${
                      trade.direction === 'long'
                        ? 'bg-[var(--data-positive)]/15 text-[var(--data-positive)] border border-[var(--data-positive)]/20'
                        : 'bg-[var(--data-negative)]/15 text-[var(--data-negative)] border border-[var(--data-negative)]/20'
                    }`}
                  >
                    {trade.direction}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm font-mono tabular-nums text-[var(--text-secondary)]">
                  {new Date(trade.entry_date).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-sm text-[var(--text-primary)]">
                  ${trade.entry_price.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-sm">
                  {trade.status === 'open' && unrealized ? (
                    <span className={unrealized.currentPrice > trade.entry_price ? 'text-[var(--data-positive)]' : unrealized.currentPrice < trade.entry_price ? 'text-[var(--data-negative)]' : 'text-[var(--text-primary)]'}>
                      ${unrealized.currentPrice.toFixed(2)}
                    </span>
                  ) : trade.status === 'open' ? (
                    <span className="text-[var(--text-disabled)]" title="Price unavailable">—</span>
                  ) : (
                    <span className="text-[var(--text-disabled)]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-sm text-[var(--text-primary)]">
                  {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : <span className="text-[var(--text-disabled)]">—</span>}
                </td>
                {statusFilter === 'closed' && (
                  <td className="py-3 px-4 text-sm font-mono tabular-nums text-[var(--text-secondary)]">
                    {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : <span className="text-[var(--text-disabled)]">—</span>}
                  </td>
                )}
                <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-medium">
                  {displayPnL.amount !== null ? (
                    <span className={isWinner ? 'text-[var(--data-positive)]' : isLoser ? 'text-[var(--data-negative)]' : 'text-[var(--text-muted)]'}>
                      {displayPnL.amount >= 0 ? '+' : ''}${displayPnL.amount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[var(--text-disabled)]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-medium">
                  {displayPnL.percent !== null ? (
                    <span className={isWinner ? 'text-[var(--data-positive)]' : isLoser ? 'text-[var(--data-negative)]' : 'text-[var(--text-muted)]'}>
                      {displayPnL.percent >= 0 ? '+' : ''}{displayPnL.percent.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[var(--text-disabled)]">—</span>
                  )}
                </td>
                {statusFilter === 'closed' && (
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-sm">
                    {trade.r_multiple != null ? (
                      <span className={trade.r_multiple > 0 ? 'text-[var(--data-positive)]' : trade.r_multiple < 0 ? 'text-[var(--data-negative)]' : 'text-[var(--text-muted)]'}>
                        {trade.r_multiple >= 0 ? '+' : ''}{trade.r_multiple.toFixed(2)}R
                      </span>
                    ) : (
                      <span className="text-[var(--text-disabled)]">—</span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium uppercase ${
                      trade.status === 'open'
                        ? 'bg-[var(--status-open)]/15 text-[var(--status-open)]'
                        : trade.status === 'closed'
                        ? 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]'
                        : 'bg-[var(--text-disabled)]/10 text-[var(--text-disabled)]'
                    }`}
                  >
                    {trade.status === 'open' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-open)] animate-pulse" />}
                    {trade.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {trade.ai_grade && (trade.ai_grade as Record<string, unknown>).overall_grade ? (
                    <GradeBadge grade={String((trade.ai_grade as Record<string, unknown>).overall_grade)} />
                  ) : trade.status === 'closed' && onAskPelican ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAskPelican(
                          `Grade my ${trade.ticker} ${trade.direction.toUpperCase()} trade. ` +
                          `Entry: $${trade.entry_price}, Exit: $${trade.exit_price}. ` +
                          `P&L: ${trade.pnl_amount != null ? `$${trade.pnl_amount.toFixed(2)}` : 'N/A'}. ` +
                          (trade.thesis ? `Thesis: "${trade.thesis}". ` : '') +
                          (trade.r_multiple != null ? `R-Multiple: ${trade.r_multiple.toFixed(2)}. ` : '') +
                          `Grade this trade A through F. What did I do right? What should I improve?`
                        )
                      }}
                      className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors whitespace-nowrap"
                    >
                      Grade &rarr;
                    </button>
                  ) : (
                    <span className="text-[var(--text-disabled)]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {trade.status === 'open' ? (
                    <a
                      href="/positions"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors whitespace-nowrap"
                    >
                      Monitor &rarr;
                    </a>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      {onReplayTrade && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onReplayTrade(trade)
                          }}
                          className="p-1.5 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors active:scale-95"
                          title="Replay trade"
                        >
                          <PlayCircle size={16} weight="fill" />
                        </button>
                      )}
                      {onScanTrade && (
                        <PelicanButton
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onScanTrade(trade)
                          }}
                          className="text-[10px] font-bold"
                        >
                          SCAN
                        </PelicanButton>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      {/* Empty state after status filter */}
      {sortedTrades.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-[var(--text-muted)] text-sm">No {statusFilter} trades</p>
        </div>
      )}

      {/* Mobile Card View */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="md:hidden space-y-3"
      >
        {sortedTrades.map((trade) => {
          const isSelected = selectedTradeId === trade.id
          const unrealized = getUnrealizedPnL(trade, quotes)

          const displayPnL = trade.status === 'open' && unrealized
            ? { amount: unrealized.pnlAmount, percent: unrealized.pnlPercent }
            : { amount: trade.pnl_amount, percent: trade.pnl_percent }

          const isWinner = displayPnL.amount !== null && displayPnL.amount > 0
          const isLoser = displayPnL.amount !== null && displayPnL.amount < 0

          return (
            <motion.div key={trade.id} variants={staggerItem} data-trade-id={trade.id}>
              <PelicanCard
                interactive
                onClick={() => onSelectTrade(trade)}
                className={`
                  cursor-pointer min-h-[44px]
                  ${isSelected ? 'ring-1 ring-[var(--accent-primary)]/30 bg-[var(--accent-muted)]' : ''}
                  ${trade.is_paper ? 'border-dashed' : ''}
                `}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <LogoImg symbol={trade.ticker} size={24} />
                    <span className="font-mono font-semibold text-base text-[var(--text-primary)]">
                      {trade.ticker}
                    </span>
                    {trade.is_paper && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--data-warning)]/20 text-[var(--data-warning)] font-medium">
                        P
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium uppercase ${
                      trade.direction === 'long'
                        ? 'bg-[var(--data-positive)]/15 text-[var(--data-positive)] border-[var(--data-positive)]/20'
                        : 'bg-[var(--data-negative)]/15 text-[var(--data-negative)] border-[var(--data-negative)]/20'
                    }`}
                  >
                    {trade.direction}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Entry</span>
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">${trade.entry_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Current</span>
                    {trade.status === 'open' && unrealized ? (
                      <span className={`font-mono tabular-nums ${unrealized.currentPrice > trade.entry_price ? 'text-[var(--data-positive)]' : unrealized.currentPrice < trade.entry_price ? 'text-[var(--data-negative)]' : 'text-[var(--text-primary)]'}`}>
                        ${unrealized.currentPrice.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-disabled)]">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">P&L</span>
                    {displayPnL.amount !== null ? (
                      <span className={`font-mono tabular-nums ${isWinner ? 'text-[var(--data-positive)]' : isLoser ? 'text-[var(--data-negative)]' : 'text-[var(--text-muted)]'}`}>
                        {displayPnL.amount >= 0 ? '+' : ''}${displayPnL.amount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-disabled)]">—</span>
                    )}
                  </div>
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono tabular-nums text-[var(--text-muted)]">{new Date(trade.entry_date).toLocaleDateString()}</div>
                  <div className="flex items-center gap-2">
                    {trade.ai_grade && String((trade.ai_grade as Record<string, unknown>).overall_grade || '') !== '' ? (
                      <GradeBadge grade={String((trade.ai_grade as Record<string, unknown>).overall_grade)} />
                    ) : trade.status === 'closed' && onAskPelican ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAskPelican(
                            `Grade my ${trade.ticker} ${trade.direction.toUpperCase()} trade. ` +
                            `Entry: $${trade.entry_price}, Exit: $${trade.exit_price}. ` +
                            `P&L: ${trade.pnl_amount != null ? `$${trade.pnl_amount.toFixed(2)}` : 'N/A'}. ` +
                            `Grade this trade A through F.`
                          )
                        }}
                        className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                      >
                        Grade &rarr;
                      </button>
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium uppercase ${
                        trade.status === 'open'
                          ? 'bg-[var(--status-open)]/15 text-[var(--status-open)]'
                          : trade.status === 'closed'
                          ? 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]'
                          : 'bg-[var(--text-disabled)]/10 text-[var(--text-disabled)]'
                      }`}
                    >
                      {trade.status === 'open' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-open)] animate-pulse" />}
                      {trade.status}
                    </span>
                    {trade.status === 'open' ? (
                      <a
                        href="/positions"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                      >
                        Monitor &rarr;
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {onReplayTrade && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onReplayTrade(trade)
                            }}
                            className="p-1.5 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Replay trade"
                          >
                            <PlayCircle size={16} weight="fill" />
                          </button>
                        )}
                        {onScanTrade && (
                          <PelicanButton
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onScanTrade(trade)
                            }}
                            className="text-[10px] font-bold min-h-[44px]"
                          >
                            SCAN
                          </PelicanButton>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </PelicanCard>
            </motion.div>
          )
        })}
      </motion.div>
    </>
  )
}
