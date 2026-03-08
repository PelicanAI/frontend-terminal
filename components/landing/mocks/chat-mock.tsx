'use client'

import { motion } from 'framer-motion'
import { User, Lightning } from '@phosphor-icons/react'

export function ChatMock() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[360px] flex flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center">
          <Lightning weight="fill" className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <span className="text-xs font-medium text-slate-500">Pelican AI</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />

        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {/* User message */}
        <div className="flex gap-2.5 justify-end">
          <div className="max-w-[85%] bg-violet-500/10 border border-violet-500/20 rounded-xl rounded-tr-sm px-3 py-2">
            <p className="text-sm text-slate-900">Analyze NVDA before earnings</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <User weight="regular" className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Assistant message */}
        <div className="flex gap-2.5">
          <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightning weight="fill" className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="max-w-[90%] space-y-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2.5 space-y-2">
              {/* Technical Setup */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-600 mb-1">Technical Setup</p>
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-600">
                    Support at <span className="font-mono tabular-nums text-emerald-600">$124.20</span> (20-day MA)
                  </p>
                  <p className="text-xs text-slate-600">
                    Resistance at <span className="font-mono tabular-nums text-red-600">$140.00</span> (prior ATH)
                  </p>
                  <p className="text-xs text-slate-600">
                    RSI <span className="font-mono tabular-nums text-slate-900">62.4</span> — neutral-bullish
                  </p>
                </div>
              </div>

              {/* Implied Move */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-600 mb-1">Implied Move</p>
                <p className="text-xs text-slate-600">
                  Options pricing <span className="font-mono tabular-nums text-slate-900">&plusmn;8.2%</span> ($11.40) through Friday
                </p>
              </div>

              {/* Consensus */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-600 mb-1">Consensus Estimates</p>
                <div className="flex gap-4">
                  <p className="text-xs text-slate-600">
                    EPS <span className="font-mono tabular-nums text-slate-900">$0.89</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Rev <span className="font-mono tabular-nums text-slate-900">$38.2B</span>
                  </p>
                </div>
              </div>

              {/* Recommendation */}
              <div className="pt-1 border-t border-slate-200">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-600 mb-1">Recommendation</p>
                <p className="text-xs text-slate-600">
                  Wait for post-earnings reaction. If holds <span className="font-mono tabular-nums">$124</span>, long with <span className="font-mono tabular-nums">2:1</span> R:R targeting <span className="font-mono tabular-nums">$140</span>.
                </p>
              </div>
            </div>

            {/* Typing indicator */}
            <div className="flex items-center gap-1 px-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-violet-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-violet-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-violet-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
