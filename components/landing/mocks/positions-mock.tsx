'use client'

import { cn } from '@/lib/utils'

const positions = [
  {
    ticker: 'NVDA',
    direction: 'Long',
    quantity: '50 shares',
    entry: '$118.00',
    current: '$134.55',
    pnl: '+$827.50',
    pnlPct: '+14.0%',
    positive: true,
    session: 'NY Session',
    sessionColor: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
  {
    ticker: 'EUR/USD',
    direction: 'Short',
    quantity: '10K',
    entry: '1.0892',
    current: '1.0845',
    pnl: '+$470.00',
    pnlPct: '+0.43%',
    positive: true,
    session: 'London',
    sessionColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  {
    ticker: 'BTC',
    direction: 'Long',
    quantity: '0.5',
    entry: '$67,200',
    current: '$66,150',
    pnl: '-$525.00',
    pnlPct: '-1.56%',
    positive: false,
    session: '24/7',
    sessionColor: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
]

export function PositionsMock() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[360px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">Open Positions</span>
          <span className="text-xs text-slate-400 font-mono">(3)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Total P&L</span>
          <span className="text-sm font-mono tabular-nums font-semibold text-emerald-600">+$1,247.30</span>
        </div>
      </div>

      {/* Positions */}
      <div className="flex-1 overflow-hidden px-4 py-3 space-y-2">
        {positions.map((pos) => (
          <div
            key={pos.ticker}
            className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2.5 space-y-2"
          >
            {/* Top row: ticker, direction, session */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{pos.ticker}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                  pos.direction === 'Long'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-red-500/10 text-red-600'
                )}>
                  {pos.direction}
                </span>
                <span className="text-[10px] text-slate-300">{pos.quantity}</span>
              </div>
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                pos.sessionColor
              )}>
                {pos.session}
              </span>
            </div>

            {/* Bottom row: entry, current, P&L */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-slate-300">Entry</p>
                  <p className="text-xs font-mono tabular-nums text-slate-600">{pos.entry}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-300">Current</p>
                  <p className="text-xs font-mono tabular-nums text-slate-900">{pos.current}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-mono tabular-nums font-semibold',
                  pos.positive ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {pos.pnl}
                </p>
                <p className={cn(
                  'text-[10px] font-mono tabular-nums',
                  pos.positive ? 'text-emerald-600/60' : 'text-red-600/60'
                )}>
                  {pos.pnlPct}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
