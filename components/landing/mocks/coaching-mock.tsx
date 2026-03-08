'use client'

import { User, Lightning, Warning, Clock, ShieldCheck } from '@phosphor-icons/react'

export function CoachingMock() {
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
            <p className="text-sm text-slate-900">Should I short TSLA here?</p>
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
          <div className="max-w-[90%] space-y-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2.5 space-y-2.5">
              {/* Warning */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Warning weight="fill" className="w-3 h-3 text-red-600" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-red-600">Warning</p>
                </div>
                <p className="text-xs text-slate-600">
                  Your TSLA record is <span className="font-mono tabular-nums text-red-600">2-6</span> with <span className="font-mono tabular-nums text-red-600">$4,500</span> in losses.
                  That&apos;s a <span className="font-mono tabular-nums text-slate-900">25%</span> win rate vs your <span className="font-mono tabular-nums text-emerald-600">57%</span> average.
                </p>
              </div>

              {/* Context */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock weight="fill" className="w-3 h-3 text-amber-500" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-amber-600">Context</p>
                </div>
                <p className="text-xs text-slate-600">
                  You&apos;re on a <span className="font-mono tabular-nums text-slate-900">2-trade</span> losing streak. After 2+ consecutive losses, your next trade wins only <span className="font-mono tabular-nums text-red-600">25%</span> of the time. Today is Friday — your weakest day at <span className="font-mono tabular-nums text-red-600">17%</span> win rate.
                </p>
              </div>

              {/* Coaching */}
              <div className="pt-1 border-t border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldCheck weight="fill" className="w-3 h-3 text-violet-600" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-violet-600">Coaching</p>
                </div>
                <p className="text-xs text-slate-600 mb-1.5">Before entering, answer three things:</p>
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-500"><span className="font-mono text-slate-400">1.</span> What&apos;s different about this setup?</p>
                  <p className="text-xs text-slate-500"><span className="font-mono text-slate-400">2.</span> Which of your playbooks does this match?</p>
                  <p className="text-xs text-slate-500"><span className="font-mono text-slate-400">3.</span> Where&apos;s your stop?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
