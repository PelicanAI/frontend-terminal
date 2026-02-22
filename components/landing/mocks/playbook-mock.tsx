'use client'

import { cn } from '@/lib/utils'
import { CheckSquare, Square } from '@phosphor-icons/react'

const stats = [
  { label: 'Win Rate', value: '67%' },
  { label: 'Trades', value: '34' },
  { label: 'Avg R', value: '1.8' },
  { label: 'Profit Factor', value: '2.4' },
]

const entryRules = [
  'Inverse FVG forms on 15m chart during session open',
  'Price taps into premium/discount zone (above 70% or below 30%)',
  'Displacement candle confirms with body close through FVG',
]

const checklist = [
  { label: 'HTF bias confirmed (1H/4H trend)', checked: true },
  { label: 'iFVG present in kill zone', checked: true },
  { label: 'Risk-to-reward minimum 2:1', checked: false },
  { label: 'No major news within 30 min', checked: false },
]

export function PlaybookMock() {
  return (
    <div className="bg-[#0a0a0f] rounded-xl border border-white/[0.08] overflow-hidden h-[360px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/90">iFVG Reversal</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Active
          </span>
        </div>
        <span className="text-[10px] text-white/30">Last trade: 2d ago</span>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {/* Stats */}
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

        {/* Entry Rules */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80 mb-1.5">Entry Rules</p>
          <div className="bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-2 space-y-1.5">
            {entryRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-white/70 leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pre-Trade Checklist */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80 mb-1.5">Pre-Trade Checklist</p>
          <div className="bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-2 space-y-1.5">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.checked ? (
                  <CheckSquare weight="fill" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Square weight="regular" className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                )}
                <p className={cn(
                  'text-xs',
                  item.checked ? 'text-white/70' : 'text-white/40'
                )}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
