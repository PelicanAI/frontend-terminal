'use client'

import { User, Lightning, Warning, Clock, ShieldCheck } from '@phosphor-icons/react'

export function CoachingMock() {
  return (
    <div className="bg-[#0a0a0f] rounded-xl border border-white/[0.08] overflow-hidden h-[360px] flex flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Lightning weight="fill" className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <span className="text-xs font-medium text-white/60">Pelican AI</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-white/40">GPT-5</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {/* User message */}
        <div className="flex gap-2.5 justify-end">
          <div className="max-w-[85%] bg-purple-500/15 border border-purple-500/20 rounded-xl rounded-tr-sm px-3 py-2">
            <p className="text-sm text-white/90">Should I short TSLA here?</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <User weight="regular" className="w-3.5 h-3.5 text-white/50" />
          </div>
        </div>

        {/* Assistant message */}
        <div className="flex gap-2.5">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightning weight="fill" className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="max-w-[90%] space-y-2">
            <div className="bg-[#111118] border border-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2.5 space-y-2.5">
              {/* Warning */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Warning weight="fill" className="w-3 h-3 text-red-400" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-red-400/90">Warning</p>
                </div>
                <p className="text-xs text-white/70">
                  Your TSLA record is <span className="font-mono tabular-nums text-red-400">2-6</span> with <span className="font-mono tabular-nums text-red-400">$4,500</span> in losses.
                  That&apos;s a <span className="font-mono tabular-nums text-white/90">25%</span> win rate vs your <span className="font-mono tabular-nums text-emerald-400">57%</span> average.
                </p>
              </div>

              {/* Context */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock weight="fill" className="w-3 h-3 text-amber-400" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/90">Context</p>
                </div>
                <p className="text-xs text-white/70">
                  You&apos;re on a <span className="font-mono tabular-nums text-white/90">2-trade</span> losing streak. After 2+ consecutive losses, your next trade wins only <span className="font-mono tabular-nums text-red-400">25%</span> of the time. Today is Friday — your weakest day at <span className="font-mono tabular-nums text-red-400">17%</span> win rate.
                </p>
              </div>

              {/* Coaching */}
              <div className="pt-1 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldCheck weight="fill" className="w-3 h-3 text-purple-400" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">Coaching</p>
                </div>
                <p className="text-xs text-white/70 mb-1.5">Before entering, answer three things:</p>
                <div className="space-y-0.5">
                  <p className="text-xs text-white/60"><span className="font-mono text-white/40">1.</span> What&apos;s different about this setup?</p>
                  <p className="text-xs text-white/60"><span className="font-mono text-white/40">2.</span> Which of your playbooks does this match?</p>
                  <p className="text-xs text-white/60"><span className="font-mono text-white/40">3.</span> Where&apos;s your stop?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
