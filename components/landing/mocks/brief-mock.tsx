'use client'

import { motion } from 'framer-motion'
import { Sun, TrendUp, Crosshair } from '@phosphor-icons/react'

export function BriefMock() {
  return (
    <div className="bg-[#0a0a0f] rounded-xl border border-white/[0.08] overflow-hidden h-[360px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sun weight="fill" className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white/90">Pelican Brief</span>
          <span className="text-[10px] text-white/40 font-mono">&mdash; Feb 21, 2026</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-emerald-400">Live</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
        {/* Market Overnight */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendUp weight="bold" className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">Market Overnight</p>
          </div>
          <div className="bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">S&P 500</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-white/90">6,147.20</span>
                <span className="text-xs font-mono tabular-nums text-emerald-400">+0.4%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">NASDAQ</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-white/90">20,024.80</span>
                <span className="text-xs font-mono tabular-nums text-emerald-400">+0.6%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">VIX</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-white/90">14.82</span>
                <span className="text-xs font-mono tabular-nums text-red-400">+1.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Your Positions */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Crosshair weight="bold" className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">Your Positions</p>
          </div>
          <div className="bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/90">NVDA</span>
                <span className="text-[10px] text-white/30">Long 50</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-emerald-400">+$827.50</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/90">EUR/USD</span>
                <span className="text-[10px] text-white/30">Short 10K</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-emerald-400">+$470.00</span>
            </div>
          </div>
        </div>

        {/* Today's Focus */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sun weight="bold" className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">Today&apos;s Focus</p>
          </div>
          <div className="bg-[#111118] rounded-lg border border-white/[0.06] px-3 py-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-xs text-white/70">FOMC minutes release at 2:00 PM ET</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-purple-400" />
              <span className="text-xs text-white/70">NVDA earnings after close &mdash; position sizing</span>
            </div>
          </div>
        </div>

        {/* Streaming dots */}
        <div className="flex items-center gap-1 px-1">
          <motion.div
            className="w-1 h-1 rounded-full bg-white/20"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-1 h-1 rounded-full bg-white/20"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className="w-1 h-1 rounded-full bg-white/20"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          />
        </div>
      </div>
    </div>
  )
}
