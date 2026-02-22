'use client'

import { cn } from '@/lib/utils'

const stats = [
  { label: 'Win Rate', value: '64.2%' },
  { label: 'Profit Factor', value: '1.83' },
  { label: 'Avg R', value: '1.42' },
  { label: 'Total Trades', value: '87' },
]

const trades = [
  { ticker: 'NVDA', direction: 'Long', pnl: '+$842', r: '+2.1R', positive: true },
  { ticker: 'EUR/USD', direction: 'Short', pnl: '-$215', r: '-0.8R', positive: false },
  { ticker: 'AAPL', direction: 'Long', pnl: '+$156', r: '+0.6R', positive: true },
]

export function JournalMock() {
  return (
    <div className="bg-[#0a0a0f] rounded-xl border border-white/[0.08] overflow-hidden h-[360px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <span className="text-sm font-medium text-white/90">Trade Journal</span>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#111118] rounded-lg border border-white/[0.06] px-2 py-2 text-center"
            >
              <p className="text-[10px] text-white/40 mb-0.5">{stat.label}</p>
              <p className="text-sm font-mono tabular-nums font-semibold text-white/90">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Mini equity curve */}
        <div className="bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-2">
          <p className="text-[10px] text-white/40 mb-1">Equity Curve</p>
          <svg
            viewBox="0 0 300 60"
            className="w-full h-12"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            <line x1="0" y1="15" x2="300" y2="15" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="0" y1="45" x2="300" y2="45" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Area fill */}
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,50 L20,48 L40,42 L60,44 L80,38 L100,35 L120,40 L140,32 L160,28 L180,30 L200,22 L220,18 L240,20 L260,14 L280,10 L300,8 L300,60 L0,60 Z"
              fill="url(#equityGrad)"
            />
            {/* Line */}
            <path
              d="M0,50 L20,48 L40,42 L60,44 L80,38 L100,35 L120,40 L140,32 L160,28 L180,30 L200,22 L220,18 L240,20 L260,14 L280,10 L300,8"
              fill="none"
              stroke="rgb(139,92,246)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Recent trades */}
        <div>
          <p className="text-[10px] text-white/40 mb-1.5">Recent Trades</p>
          <div className="space-y-1">
            {trades.map((trade) => (
              <div
                key={trade.ticker}
                className="flex items-center justify-between bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-1.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-white/90 w-14">{trade.ticker}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                    trade.direction === 'Long'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  )}>
                    {trade.direction}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-xs font-mono tabular-nums font-medium',
                    trade.positive ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {trade.pnl}
                  </span>
                  <span className={cn(
                    'text-[10px] font-mono tabular-nums',
                    trade.positive ? 'text-emerald-400/60' : 'text-red-400/60'
                  )}>
                    {trade.r}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
