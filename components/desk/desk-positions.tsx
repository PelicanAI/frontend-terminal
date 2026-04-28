"use client"

import { useMemo } from "react"
import { useTrades } from "@/hooks/use-trades"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { usePortfolioSummary } from "@/hooks/use-portfolio-summary"
import { NumberTicker } from "@/components/motion/number-ticker"
import { PriceFlash } from "@/components/motion/price-flash"
import { SkeletonRow } from "@/components/motion/shimmer-skeleton"
import { hasMarketData } from "@/lib/config/asset-coverage"
import { fmt } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface DeskPositionsProps {
  onTickerClick: (ticker: string) => void
  onAnalyze: (ticker: string, prompt: string) => void
}

function formatSignedCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function DeskPositions({ onTickerClick, onAnalyze }: DeskPositionsProps) {
  const { openTrades, isLoading } = useTrades()
  const { data: portfolio } = usePortfolioSummary()
  const tickers = useMemo(() => [...new Set(openTrades.map((trade) => `${trade.ticker}:${trade.asset_type}`))], [openTrades])
  const { quotes } = useLiveQuotes(tickers)

  const rows = useMemo(() => {
    return openTrades
      .map((trade) => {
        const marketDataAvailable = hasMarketData(trade.asset_type)
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
          marketDataAvailable,
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
      <div className="flex h-full min-h-[180px] flex-col justify-center gap-3 bg-[var(--bg-surface)]/40 px-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonRow key={index} cells={[{ width: "7ch" }, { width: "7ch" }, { width: "8ch" }, { width: "6ch" }, { width: "8ch" }]} />
        ))}
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
            <NumberTicker value={totalExposure} format={(value) => fmt.currency(value)} />
          </span>
        </span>
        <span>
          P&amp;L:{" "}
          <span className={cn(
            "font-[var(--font-geist-mono)] tabular-nums",
            totalPnl >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
          )}>
            <PriceFlash value={totalPnl} direction={totalPnl >= 0 ? "up" : "down"}>
              <NumberTicker value={totalPnl} format={fmt.pnl} />
            </PriceFlash>
          </span>
        </span>
        <span>
          <span className="font-[var(--font-geist-mono)] tabular-nums text-[var(--text-secondary)]">
            <NumberTicker value={rows.length} format={fmt.integer} />
          </span> open
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
                  {row.marketDataAvailable ? (
                    <PriceFlash value={row.last}>
                      <NumberTicker value={row.last} format={(value) => fmt.price(value)} />
                    </PriceFlash>
                  ) : (
                    <span className="inline-flex flex-col items-end leading-tight">
                      <NumberTicker value={row.last} format={(value) => fmt.price(value)} />
                      <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Manual</span>
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-secondary)]">
                  <NumberTicker value={row.marketValue} format={(value) => fmt.currency(value)} />
                </td>
                <td
                  className={cn(
                    "px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums",
                    (row.todayChangePercent ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                  )}
                >
                  {row.todayChangePercent == null ? "—" : (
                    <PriceFlash value={row.todayChangePercent} direction={row.todayChangePercent >= 0 ? "up" : "down"}>
                      <NumberTicker value={row.todayChangePercent} format={(value) => fmt.percent(value)} />
                    </PriceFlash>
                  )}
                </td>
                <td
                  className={cn(
                    "px-2 py-1.5 text-right font-[var(--font-geist-mono)] text-xs tabular-nums",
                    (row.todayPnl ?? 0) >= 0 ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"
                  )}
                >
                  {row.todayPnl == null ? "—" : (
                    <PriceFlash value={row.todayPnl} direction={row.todayPnl >= 0 ? "up" : "down"}>
                      <NumberTicker value={row.todayPnl} format={fmt.pnl} />
                    </PriceFlash>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
