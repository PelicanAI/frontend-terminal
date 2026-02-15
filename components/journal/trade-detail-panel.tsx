"use client"

import { Trade } from "@/hooks/use-trades"
import { X } from "lucide-react"

interface TradeDetailPanelProps {
  trade: Trade
  onClose: () => void
  onEdit?: (trade: Trade) => void
  onCloseTrade?: (trade: Trade) => void
}

export function TradeDetailPanel({ trade, onClose, onCloseTrade }: TradeDetailPanelProps) {
  const isWinner = trade.pnl_amount !== null && trade.pnl_amount > 0
  const isLoser = trade.pnl_amount !== null && trade.pnl_amount < 0

  return (
    <div className="w-full h-full flex flex-col bg-background md:border-l border-border">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border flex items-center justify-between min-h-[60px]">
        <div className="flex items-center gap-2">
          <div className="font-mono font-bold text-lg text-foreground">{trade.ticker}</div>
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${
              trade.direction === 'long'
                ? 'bg-green-600/20 text-green-400'
                : 'bg-red-600/20 text-red-400'
            }`}
          >
            {trade.direction}
          </span>
          {trade.is_paper && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-400 font-medium">
              PAPER
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/[0.06] rounded transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5 text-foreground/60" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Status */}
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              trade.status === 'open'
                ? 'bg-blue-600/20 text-blue-400'
                : trade.status === 'closed'
                ? isWinner
                  ? 'bg-green-600/20 text-green-400'
                  : isLoser
                  ? 'bg-red-600/20 text-red-400'
                  : 'bg-foreground/10 text-foreground/60'
                : 'bg-foreground/10 text-foreground/40'
            }`}
          >
            {trade.status === 'open' ? (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            ) : null}
            {trade.status.toUpperCase()}
          </span>
        </div>

        {/* P&L (if closed) */}
        {trade.status === 'closed' && trade.pnl_amount !== null && (
          <div className={`p-4 rounded-lg border ${
            isWinner
              ? 'bg-green-600/10 border-green-500/30'
              : 'bg-red-600/10 border-red-500/30'
          }`}>
            <div className="text-xs text-foreground/60 mb-1">Profit/Loss</div>
            <div className={`text-3xl font-bold font-mono tabular-nums ${
              isWinner ? 'text-green-400' : 'text-red-400'
            }`}>
              {trade.pnl_amount >= 0 ? '+' : ''}${trade.pnl_amount.toFixed(2)}
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm">
              {trade.pnl_percent !== null && (
                <span className={isWinner ? 'text-green-400' : 'text-red-400'}>
                  {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                </span>
              )}
              {trade.r_multiple !== null && (
                <span className="text-foreground/60">
                  {trade.r_multiple.toFixed(2)}R
                </span>
              )}
            </div>
          </div>
        )}

        {/* Entry Details */}
        <div className="space-y-2 pb-4 border-b border-border/50">
          <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Entry</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Price</span>
              <span className="font-mono font-medium text-lg text-white">
                ${trade.entry_price.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Quantity</span>
              <span className="font-mono font-medium text-foreground tabular-nums">{trade.quantity}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Date</span>
              <span className="text-foreground">
                {new Date(trade.entry_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Position Size</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                ${(trade.entry_price * trade.quantity).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Exit Details (if closed) */}
        {trade.status === 'closed' && trade.exit_price && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">Exit</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">Price</span>
                <span className="font-mono font-medium text-foreground">
                  ${trade.exit_price.toFixed(2)}
                </span>
              </div>
              {trade.exit_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Date</span>
                  <span className="text-foreground">
                    {new Date(trade.exit_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Management */}
        {(trade.stop_loss || trade.take_profit) && (
          <div className="space-y-2 pb-4 border-b border-border/50">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              Risk Management
            </h3>
            <div className="space-y-2">
              {trade.stop_loss && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Stop Loss</span>
                  <span className="font-mono font-medium text-red-400 tabular-nums">
                    ${trade.stop_loss.toFixed(2)}
                  </span>
                </div>
              )}
              {trade.take_profit && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Take Profit</span>
                  <span className="font-mono font-medium text-green-400 tabular-nums">
                    ${trade.take_profit.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thesis */}
        {trade.thesis && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">Thesis</h3>
            <p className="text-sm text-foreground leading-relaxed">{trade.thesis}</p>
          </div>
        )}

        {/* Notes */}
        {trade.notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">Notes</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{trade.notes}</p>
          </div>
        )}

        {/* Setup Tags */}
        {trade.setup_tags && trade.setup_tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
              Setup Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {trade.setup_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded bg-purple-600/20 text-purple-300 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conviction */}
        {trade.conviction && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              Conviction
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(trade.conviction / 10) * 100}%`,
                    background: trade.conviction <= 3
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : trade.conviction <= 7
                      ? 'linear-gradient(90deg, #eab308, #fbbf24)'
                      : 'linear-gradient(90deg, #22c55e, #4ade80)'
                  }}
                />
              </div>
              <span className="text-sm font-medium text-purple-400 tabular-nums">{trade.conviction}/10</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions (if open trade) */}
      {trade.status === 'open' && onCloseTrade && (
        <div className="flex-shrink-0 p-4 border-t border-border">
          <button
            onClick={() => onCloseTrade(trade)}
            className="w-full py-3 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:scale-95 rounded-xl font-medium transition-colors min-h-[44px]"
          >
            Close Trade
          </button>
        </div>
      )}
    </div>
  )
}
