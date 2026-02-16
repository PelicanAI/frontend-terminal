"use client"

import { Trade } from "@/hooks/use-trades"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { useState } from "react"
import { useLiveQuotes, type Quote } from "@/hooks/use-live-quotes"
import { LogoImg } from "@/components/ui/logo-img"

interface TradesTableProps {
  trades: Trade[]
  onSelectTrade: (trade: Trade) => void
  selectedTradeId?: string | null
  onScanTrade?: (trade: Trade) => void
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

type SortField = 'entry_date' | 'ticker' | 'pnl_amount' | 'pnl_percent'
type SortDirection = 'asc' | 'desc'

export function TradesTable({ trades, onSelectTrade, selectedTradeId, onScanTrade }: TradesTableProps) {
  const [sortField, setSortField] = useState<SortField>('entry_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Get live quotes for open positions
  const openTickersWithTypes = trades
    .filter(t => t.status === 'open')
    .map(t => `${t.ticker}:${t.asset_type}`)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe

  const { quotes } = useLiveQuotes(openTickersWithTypes)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTrades = [...trades].sort((a, b) => {
    let aVal: number | string | null
    let bVal: number | string | null

    switch (sortField) {
      case 'entry_date':
        aVal = new Date(a.entry_date).getTime()
        bVal = new Date(b.entry_date).getTime()
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
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-foreground/30" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-purple-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-purple-400" />
    )
  }

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-foreground/50 text-sm">No trades to display</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
        <thead className="border-b border-white/[0.04]">
          <tr className="text-left">
            <th className="pb-3 px-4">
              <button
                onClick={() => handleSort('ticker')}
                className="flex items-center gap-1 text-[10px] font-semibold text-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors"
              >
                Ticker
                <SortIcon field="ticker" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest">
                Direction
              </span>
            </th>
            <th className="pb-3 px-4">
              <button
                onClick={() => handleSort('entry_date')}
                className="flex items-center gap-1 text-[10px] font-semibold text-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors"
              >
                Entry Date
                <SortIcon field="entry_date" />
              </button>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest">
                Entry
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest">
                Current
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest">
                Exit
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <button
                onClick={() => handleSort('pnl_amount')}
                className="flex items-center gap-1 ml-auto text-[10px] font-semibold text-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors"
              >
                P&L
                <SortIcon field="pnl_amount" />
              </button>
            </th>
            <th className="pb-3 px-4 text-right">
              <button
                onClick={() => handleSort('pnl_percent')}
                className="flex items-center gap-1 ml-auto text-[10px] font-semibold text-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors"
              >
                %
                <SortIcon field="pnl_percent" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest">
                Status
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest">
                Actions
              </span>
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
                onClick={() => onSelectTrade(trade)}
                className={`
                  border-b border-white/[0.04] cursor-pointer transition-colors
                  ${isSelected ? 'bg-purple-600/10' : 'hover:bg-white/[0.03]'}
                  ${trade.is_paper ? 'border-dashed' : ''}
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
                      className="font-mono font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {trade.ticker}
                    </button>
                    {trade.is_paper && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-600/20 text-yellow-400 font-medium">
                        P
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${
                      trade.direction === 'long'
                        ? 'bg-green-500/15 text-green-400 border-green-500/20'
                        : 'bg-red-500/15 text-red-400 border-red-500/20'
                    }`}
                  >
                    {trade.direction}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-foreground/80">
                  {new Date(trade.entry_date).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-foreground">
                  ${trade.entry_price.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-foreground">
                  {trade.status === 'open' && unrealized ? (
                    <span className={unrealized.currentPrice > trade.entry_price ? 'text-green-400' : unrealized.currentPrice < trade.entry_price ? 'text-red-400' : 'text-foreground'}>
                      ${unrealized.currentPrice.toFixed(2)}
                    </span>
                  ) : trade.status === 'open' ? (
                    <span className="text-foreground/30" title="Price unavailable">—</span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-foreground">
                  {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm font-medium tabular-nums">
                  {displayPnL.amount !== null ? (
                    <span className={isWinner ? 'text-green-400' : isLoser ? 'text-red-400' : 'text-foreground/60'}>
                      {displayPnL.amount >= 0 ? '+' : ''}${displayPnL.amount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm font-medium tabular-nums">
                  {displayPnL.percent !== null ? (
                    <span className={isWinner ? 'text-green-400' : isLoser ? 'text-red-400' : 'text-foreground/60'}>
                      {displayPnL.percent >= 0 ? '+' : ''}{displayPnL.percent.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium uppercase ${
                      trade.status === 'open'
                        ? 'bg-blue-600/20 text-blue-400'
                        : trade.status === 'closed'
                        ? 'bg-foreground/10 text-foreground/60'
                        : 'bg-foreground/5 text-foreground/40'
                    }`}
                  >
                    {trade.status === 'open' && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    {trade.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {onScanTrade && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onScanTrade(trade)
                      }}
                      className="rounded border border-[#8b5cf6]/20 bg-[#8b5cf6]/15 px-3 py-1 text-[10px] font-bold text-[#8b5cf6] transition-colors hover:bg-[#8b5cf6]/25"
                    >
                      SCAN
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedTrades.map((trade) => {
          const isSelected = selectedTradeId === trade.id
          const unrealized = getUnrealizedPnL(trade, quotes)

          const displayPnL = trade.status === 'open' && unrealized
            ? { amount: unrealized.pnlAmount, percent: unrealized.pnlPercent }
            : { amount: trade.pnl_amount, percent: trade.pnl_percent }

          const isWinner = displayPnL.amount !== null && displayPnL.amount > 0
          const isLoser = displayPnL.amount !== null && displayPnL.amount < 0

          return (
            <div
              key={trade.id}
              onClick={() => onSelectTrade(trade)}
              className={`
                rounded-lg border cursor-pointer transition-colors p-4 min-h-[44px]
                ${isSelected ? 'bg-purple-600/10 border-purple-500/30' : 'bg-white/[0.03] border-border hover:bg-white/[0.06]'}
                ${trade.is_paper ? 'border-dashed' : ''}
              `}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LogoImg symbol={trade.ticker} size={24} />
                  <span className="font-mono font-semibold text-base text-purple-400">
                    {trade.ticker}
                  </span>
                  {trade.is_paper && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-600/20 text-yellow-400 font-medium">
                      P
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${
                    trade.direction === 'long'
                      ? 'bg-green-500/15 text-green-400 border-green-500/20'
                      : 'bg-red-500/15 text-red-400 border-red-500/20'
                  }`}
                >
                  {trade.direction}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <span className="text-foreground/40 block mb-0.5">Entry</span>
                  <span className="font-mono text-foreground/90">${trade.entry_price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-foreground/40 block mb-0.5">Current</span>
                  {trade.status === 'open' && unrealized ? (
                    <span className={`font-mono ${unrealized.currentPrice > trade.entry_price ? 'text-green-400' : unrealized.currentPrice < trade.entry_price ? 'text-red-400' : 'text-foreground/90'}`}>
                      ${unrealized.currentPrice.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-foreground/40">—</span>
                  )}
                </div>
                <div>
                  <span className="text-foreground/40 block mb-0.5">P&L</span>
                  {displayPnL.amount !== null ? (
                    <span className={`font-mono ${isWinner ? 'text-green-400' : isLoser ? 'text-red-400' : 'text-foreground/60'}`}>
                      {displayPnL.amount >= 0 ? '+' : ''}${displayPnL.amount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-foreground/40">—</span>
                  )}
                </div>
              </div>

              {/* Footer Row */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-foreground/60">{new Date(trade.entry_date).toLocaleDateString()}</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium uppercase ${
                      trade.status === 'open'
                        ? 'bg-blue-600/20 text-blue-400'
                        : trade.status === 'closed'
                        ? 'bg-foreground/10 text-foreground/60'
                        : 'bg-foreground/5 text-foreground/40'
                    }`}
                  >
                    {trade.status === 'open' && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    {trade.status}
                  </span>
                  {onScanTrade && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onScanTrade(trade)
                      }}
                      className="rounded border border-[#8b5cf6]/20 bg-[#8b5cf6]/15 px-3 py-1 text-[10px] font-bold text-[#8b5cf6] transition-colors hover:bg-[#8b5cf6]/25 active:scale-95 min-h-[44px] flex items-center"
                    >
                      SCAN
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
