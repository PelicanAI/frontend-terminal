"use client"

import { Trade } from "@/hooks/use-trades"
import { X, PlayCircle } from "@phosphor-icons/react"
import { PelicanCard, PelicanButton, DataCell } from "@/components/ui/pelican"
import { TradeGradeCard } from "@/components/grading/trade-grade-card"
import type { TradeGrade } from "@/lib/grading/trade-grader"

interface TradeDetailPanelProps {
  trade: Trade
  onClose: () => void
  onEdit?: (trade: Trade) => void
  onCloseTrade?: (trade: Trade) => void
  onReplay?: (trade: Trade) => void
}

export function TradeDetailPanel({ trade, onClose, onCloseTrade, onReplay }: TradeDetailPanelProps) {
  const isWinner = trade.pnl_amount !== null && trade.pnl_amount > 0
  const isLoser = trade.pnl_amount !== null && trade.pnl_amount < 0

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-base)] md:border-l border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between min-h-[60px]">
        <div className="flex items-center gap-2">
          <div className="font-mono font-bold text-lg text-[var(--text-primary)]">{trade.ticker}</div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${
              trade.direction === 'long'
                ? 'bg-[var(--data-positive)]/20 text-[var(--data-positive)]'
                : 'bg-[var(--data-negative)]/20 text-[var(--data-negative)]'
            }`}
          >
            {trade.direction}
          </span>
          {trade.is_paper && (
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--data-warning)]/20 text-[var(--data-warning)] font-medium">
              PAPER
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X size={20} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Status */}
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              trade.status === 'open'
                ? 'bg-[var(--status-open)]/15 text-[var(--status-open)]'
                : trade.status === 'closed'
                ? isWinner
                  ? 'bg-[var(--data-positive)]/15 text-[var(--data-positive)]'
                  : isLoser
                  ? 'bg-[var(--data-negative)]/15 text-[var(--data-negative)]'
                  : 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]'
                : 'bg-[var(--text-disabled)]/10 text-[var(--text-disabled)]'
            }`}
          >
            {trade.status === 'open' ? (
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-open)] animate-pulse" />
            ) : null}
            {trade.status.toUpperCase()}
          </span>
        </div>

        {/* P&L (if closed) */}
        {trade.status === 'closed' && trade.pnl_amount !== null && (
          <PelicanCard className={`${
            isWinner
              ? 'bg-[var(--data-positive)]/10 border-[var(--data-positive)]/30'
              : 'bg-[var(--data-negative)]/10 border-[var(--data-negative)]/30'
          }`}>
            <div className="text-xs text-[var(--text-muted)] mb-1">Profit/Loss</div>
            <div className={`text-3xl font-bold font-mono tabular-nums ${
              isWinner ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
            }`}>
              {trade.pnl_amount >= 0 ? '+' : ''}${trade.pnl_amount.toFixed(2)}
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm font-mono tabular-nums">
              {trade.pnl_percent !== null && (
                <span className={isWinner ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'}>
                  {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                </span>
              )}
              {trade.r_multiple !== null && (
                <span className="text-[var(--text-muted)]">
                  {trade.r_multiple.toFixed(2)}R
                </span>
              )}
            </div>
          </PelicanCard>
        )}

        {/* AI Grade */}
        {trade.status === 'closed' && trade.ai_grade && (trade.ai_grade as Record<string, unknown>).overall_score != null && (
          <TradeGradeCard grade={trade.ai_grade as unknown as TradeGrade} />
        )}

        {/* Entry Details */}
        <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Entry</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Price</span>
              <span className="font-mono font-medium text-lg tabular-nums text-[var(--text-primary)]">
                ${trade.entry_price.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Quantity</span>
              <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">{trade.quantity}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Date</span>
              <span className="font-mono tabular-nums text-[var(--text-primary)]">
                {new Date(trade.entry_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Position Size</span>
              <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">
                ${(trade.entry_price * trade.quantity).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Exit Details (if closed) */}
        {trade.status === 'closed' && trade.exit_price && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Exit</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Price</span>
                <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">
                  ${trade.exit_price.toFixed(2)}
                </span>
              </div>
              {trade.exit_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Date</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {new Date(trade.exit_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Management */}
        {(trade.stop_loss || trade.take_profit) && (
          <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Risk Management
            </h3>
            <div className="space-y-2">
              {trade.stop_loss && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Stop Loss</span>
                  <span className="font-mono font-medium tabular-nums text-[var(--data-negative)]">
                    ${trade.stop_loss.toFixed(2)}
                  </span>
                </div>
              )}
              {trade.take_profit && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Take Profit</span>
                  <span className="font-mono font-medium tabular-nums text-[var(--data-positive)]">
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
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Thesis</h3>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{trade.thesis}</p>
          </div>
        )}

        {/* Notes */}
        {trade.notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Notes</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{trade.notes}</p>
          </div>
        )}

        {/* Setup Tags */}
        {trade.setup_tags && trade.setup_tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Setup Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {trade.setup_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium"
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
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Conviction
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(trade.conviction / 10) * 100}%`,
                    background: trade.conviction <= 3
                      ? 'linear-gradient(90deg, var(--data-negative), #f87171)'
                      : trade.conviction <= 7
                      ? 'linear-gradient(90deg, var(--data-warning), #fbbf24)'
                      : 'linear-gradient(90deg, var(--data-positive), #4ade80)'
                  }}
                />
              </div>
              <span className="text-sm font-mono font-medium tabular-nums text-[var(--accent-primary)]">{trade.conviction}/10</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle)] space-y-2">
        {/* Replay button for closed trades */}
        {trade.status === 'closed' && onReplay && (
          <button
            onClick={() => onReplay(trade)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--accent-muted)] text-[var(--accent-primary)] text-sm font-medium hover:bg-[var(--accent-primary)]/20 transition-colors active:scale-[0.98]"
          >
            <PlayCircle size={16} weight="fill" />
            Replay Trade
          </button>
        )}

        {/* Close trade button for open trades */}
        {trade.status === 'open' && onCloseTrade && (
          <PelicanButton
            variant="danger"
            size="lg"
            onClick={() => onCloseTrade(trade)}
            className="w-full"
          >
            Close Trade
          </PelicanButton>
        )}
      </div>
    </div>
  )
}
