"use client"

import { Trade } from "@/hooks/use-trades"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { useState } from "react"

interface TradesTableProps {
  trades: Trade[]
  onSelectTrade: (trade: Trade) => void
  selectedTradeId?: string | null
  onScanTrade?: (trade: Trade) => void
}

type SortField = 'entry_date' | 'ticker' | 'pnl_amount' | 'pnl_percent'
type SortDirection = 'asc' | 'desc'

export function TradesTable({ trades, onSelectTrade, selectedTradeId, onScanTrade }: TradesTableProps) {
  const [sortField, setSortField] = useState<SortField>('entry_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left">
            <th className="pb-3 px-4">
              <button
                onClick={() => handleSort('ticker')}
                className="flex items-center gap-1 text-xs font-semibold text-foreground/60 uppercase tracking-wide hover:text-foreground transition-colors"
              >
                Ticker
                <SortIcon field="ticker" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Direction
              </span>
            </th>
            <th className="pb-3 px-4">
              <button
                onClick={() => handleSort('entry_date')}
                className="flex items-center gap-1 text-xs font-semibold text-foreground/60 uppercase tracking-wide hover:text-foreground transition-colors"
              >
                Entry Date
                <SortIcon field="entry_date" />
              </button>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Entry
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Exit
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <button
                onClick={() => handleSort('pnl_amount')}
                className="flex items-center gap-1 ml-auto text-xs font-semibold text-foreground/60 uppercase tracking-wide hover:text-foreground transition-colors"
              >
                P&L
                <SortIcon field="pnl_amount" />
              </button>
            </th>
            <th className="pb-3 px-4 text-right">
              <button
                onClick={() => handleSort('pnl_percent')}
                className="flex items-center gap-1 ml-auto text-xs font-semibold text-foreground/60 uppercase tracking-wide hover:text-foreground transition-colors"
              >
                %
                <SortIcon field="pnl_percent" />
              </button>
            </th>
            <th className="pb-3 px-4">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Status
              </span>
            </th>
            <th className="pb-3 px-4 text-right">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTrades.map((trade) => {
            const isSelected = selectedTradeId === trade.id
            const isWinner = trade.pnl_amount !== null && trade.pnl_amount > 0
            const isLoser = trade.pnl_amount !== null && trade.pnl_amount < 0

            return (
              <tr
                key={trade.id}
                onClick={() => onSelectTrade(trade)}
                className={`
                  border-b border-border cursor-pointer transition-colors
                  ${isSelected ? 'bg-purple-600/10' : 'hover:bg-white/[0.03]'}
                  ${trade.is_paper ? 'border-dashed' : ''}
                `}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
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
                    className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${
                      trade.direction === 'long'
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-red-600/20 text-red-400'
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
                  {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm font-medium tabular-nums">
                  {trade.pnl_amount !== null ? (
                    <span className={isWinner ? 'text-green-400' : isLoser ? 'text-red-400' : 'text-foreground/60'}>
                      {trade.pnl_amount >= 0 ? '+' : ''}${trade.pnl_amount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm font-medium tabular-nums">
                  {trade.pnl_percent !== null ? (
                    <span className={isWinner ? 'text-green-400' : isLoser ? 'text-red-400' : 'text-foreground/60'}>
                      {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex text-[10px] px-2 py-1 rounded-full font-medium uppercase ${
                      trade.status === 'open'
                        ? 'bg-blue-600/20 text-blue-400'
                        : trade.status === 'closed'
                        ? 'bg-foreground/10 text-foreground/60'
                        : 'bg-foreground/5 text-foreground/40'
                    }`}
                  >
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
                      className="rounded border border-primary/30 bg-primary/20 px-3 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/30"
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
  )
}
