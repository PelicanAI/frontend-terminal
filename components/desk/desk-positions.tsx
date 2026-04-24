"use client"

import { useMemo } from "react"
import { useTrades } from "@/hooks/use-trades"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { usePortfolioSummary } from "@/hooks/use-portfolio-summary"
import { cn } from "@/lib/utils"

interface DeskPositionsProps {
  onTickerClick: (ticker: string) => void
  onAnalyze: (ticker: string, prompt: string) => void
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatSignedCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatSignedPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export default function DeskPositions({ onTickerClick, onAnalyze }: DeskPositionsProps) {
  const { openTrades, isLoading } = useTrades()
  const { data: portfolio } = usePortfolioSummary()
  const tickers = useMemo(() => [...new Set(openTrades.map((trade) => trade.ticker))], [openTrades])
  const { quotes } = useLiveQuotes(tickers)

  const rows = useMemo(() => {
    return openTrades
      .map((trade) => {
        const quote = quotes[trade.ticker]
        const last = quote?.price ?? trade.entry_price
        const direction = trade.direction === "long" ? 1 : -1
        const marketValue = last * trade.quantity
        const totalPnl = quote?.price != null
          ? (quote.price - trade.entry_price) * trade.quantity * direction
          : trade.pnl_amount
        const todayChangePercent = quote?.changePercent ?? null
        const todayPnl = quote?.change != null
          ? quote.change * trade.quantity * direction
          : null

        const promptParts = [
          `Scan my ${trade.ticker} ${trade.direction.toUpperCase()} position.`,
          `Entry: $${trade.entry_price}.`,
          `Size: $${(trade.entry_price * trade.quantity).toLocaleString()}.`,
          trade.stop_loss ? `Stop: $${trade.stop_loss}.` : "No stop loss set.",
          trade.take_profit ? `Target: $${trade.take_profit}.` : "No target set.",
          trade.thesis ? `My thesis: "${trade.thesis}".` : "",
          `Quantity: ${trade.quantity}.`,
          `Current price: $${last.toFixed(2)}.`,
          totalPnl != null ? `Open P&L: ${formatSignedCurrency(totalPnl)}.` : "",
          "Give me current technicals, whether the thesis is still valid, the key levels to watch, and your honest recommendation: hold, add, trim, or exit.",
        ]

        return {
          trade,
          last,
          marketValue,
          totalPnl,
          todayChangePercent,
          todayPnl,
          prompt: promptParts.filter(Boolean).join(" "),
        }
      })
      .sort((a, b) => b.marketValue - a.marketValue)
  }, [openTrades, quotes])

  const totalExposure = useMemo(() => {
    if (portfolio?.portfolio.total_exposure != null) {
      return portfolio.portfolio.total_exposure
    }

    return rows.reduce((sum, row) => sum + row.marketValue, 0)
  }, [portfolio?.portfolio.total_exposure, rows])

  const totalPnl = useMemo(() => {
    return rows.reduce((sum, row) => sum + (row.totalPnl ?? 0), 0)
  }, [rows])

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center bg-[var(--bg-surface)]/40 text-xs text-[var(--text-muted)]">
        Loading positions...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
        No open positions — log a trade or connect a broker.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-base)]">
      <div className="flex flex-wrap items-center gap-4 px-2 py-1.5 text-[10px] text-[var(--text-muted)]">
        <span>
          Exposure:{" "}
          <span className="font-[var(--font-geist-mono)] tabular-nums text-[var(--text-secondary)]">
            {formatCurrency(totalExposure)}
          </span>
        </span>
        <span>
          P&amp;L:{" "}
          <span className={cn(
            "font-[var(--font-geist-mono)] tabular-nums",
            totalPnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
          )}>
            {formatSignedCurrency(totalPnl)}
          </span>
        </span>
        <span>
          <span className="font-[var(--font-geist-mono)] tabular-nums text-[var(--text-secondary)]">{rows.length}</span> open
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[620px] w-full">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Symbol</th>
              <th className="px-2 py-1 text-right text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Price</th>
              <th className="px-2 py-1 text-right text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Mkt val</th>
              <th className="px-2 py-1 text-right text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Today %</th>
              <th className="px-2 py-1 text-right text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Today P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.trade.id}
                onClick={() => {
                  onTickerClick(row.trade.ticker)
                  onAnalyze(row.trade.ticker, row.prompt)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onTickerClick(row.trade.ticker)
                    onAnalyze(row.trade.ticker, row.prompt)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Analyze ${row.trade.ticker} position`}
                className="cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <td className="px-2 py-1.5 font-[var(--font-geist-mono)] text-xs font-semibold text-[var(--text-primary)]">
                  {row.trade.ticker}
                </td>
                <td className="px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-primary)]">
                  {formatCurrency(row.last)}
                </td>
                <td className="px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-secondary)]">
                  {formatCurrency(row.marketValue)}
                </td>
                <td
                  className={cn(
                    "px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums",
                    (row.todayChangePercent ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                  )}
                >
                  {formatSignedPercent(row.todayChangePercent)}
                </td>
                <td
                  className={cn(
                    "px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums",
                    (row.todayPnl ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                  )}
                >
                  {row.todayPnl == null ? "—" : formatSignedCurrency(row.todayPnl).replace("+", "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
