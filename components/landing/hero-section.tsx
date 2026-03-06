'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lightning, ArrowRight } from '@phosphor-icons/react'

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number]

function MockBrowserFrame() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Purple glow behind frame */}
      <div className="absolute -inset-12 bg-purple-600/[0.06] blur-[80px] rounded-full" />

      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl shadow-purple-900/10">
        {/* Browser title bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div className="mx-auto rounded-md bg-white/[0.04] px-12 py-1">
            <span className="text-[10px] text-white/30 font-mono">pelicantrading.ai</span>
          </div>
        </div>

        {/* App content */}
        <div className="aspect-[16/10]">
          {/* Top navigation bar */}
          <div className="flex items-center gap-1 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2">
            {['Brief', 'Chat', 'Positions', 'Journal', 'Heatmap'].map((tab, i) => (
              <span
                key={tab}
                className={`rounded-md px-3 py-1 text-[10px] ${
                  i === 1
                    ? 'bg-[#8b5cf6]/15 text-[#8b5cf6] font-medium'
                    : 'text-white/40'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="flex h-[calc(100%-36px)]">
            {/* Left sidebar - conversations */}
            <div className="hidden w-48 shrink-0 border-r border-white/[0.06] bg-white/[0.01] p-3 sm:block">
              <div className="mb-3 text-[9px] font-medium uppercase tracking-wider text-white/20">
                Conversations
              </div>
              {[
                { title: 'NVDA Earnings Analysis', active: true },
                { title: 'SPY Weekly Review', active: false },
                { title: 'Risk Management Plan', active: false },
              ].map((conv) => (
                <div
                  key={conv.title}
                  className={`mb-1 rounded-lg px-2.5 py-2 text-[10px] ${
                    conv.active
                      ? 'bg-white/[0.05] text-white/80'
                      : 'text-white/30'
                  }`}
                >
                  {conv.title}
                </div>
              ))}
            </div>

            {/* Center - chat area */}
            <div className="flex-1 overflow-hidden p-4">
              <div className="space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-md bg-[#8b5cf6]/20 px-3 py-2">
                    <p className="text-[10px] leading-relaxed text-white/80">
                      Break down NVDA heading into earnings this week
                    </p>
                  </div>
                </div>

                {/* Assistant message */}
                <div className="max-w-[85%] space-y-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8b5cf6]/20">
                      <Lightning weight="fill" className="h-2.5 w-2.5 text-[#8b5cf6]" />
                    </div>
                    <span className="text-[9px] font-medium text-white/40">Pelican</span>
                  </div>

                  {/* Position context card */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <div className="mb-1 text-[9px] font-medium text-[#8b5cf6]/80">
                      Your Position Context
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/60">
                      You&apos;re holding <span className="font-mono text-white/80">250</span> shares of NVDA from{' '}
                      <span className="font-mono text-white/80">$118.40</span> entry.
                      Currently{' '}
                      <span className="font-mono text-[#22c55e]">+13.5%</span>{' '}
                      at <span className="font-mono text-white/80">$134.38</span>.
                    </p>
                  </div>

                  {/* Consensus card */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <div className="mb-1 text-[9px] font-medium text-white/50">
                      Consensus & History
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/60">
                      EPS est: <span className="font-mono text-white/80">$0.89</span> &middot;
                      Revenue: <span className="font-mono text-white/80">$38.2B</span> &middot;
                      Beat last <span className="font-mono text-white/80">6</span> quarters avg{' '}
                      <span className="font-mono text-[#22c55e]">+12%</span>
                    </p>
                  </div>

                  {/* Key levels */}
                  <p className="text-[10px] leading-relaxed text-white/50">
                    <span className="text-white/70 font-medium">Key levels:</span>{' '}
                    Support at <span className="font-mono text-white/70">$124</span>,
                    resistance <span className="font-mono text-white/70">$140</span>.
                    IV crush risk is elevated — consider trimming{' '}
                    <span className="font-mono text-white/70">30-40%</span> pre-earnings.
                  </p>

                  {/* Coaching */}
                  <div className="rounded-lg border border-[#8b5cf6]/20 bg-[#8b5cf6]/[0.04] p-2.5">
                    <div className="mb-1 text-[9px] font-medium text-[#8b5cf6]/70">
                      Coaching
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/50">
                      With <span className="font-mono text-[#22c55e]">+13.5%</span> unrealized,
                      locking in partial gains protects your base while keeping upside exposure.
                      This aligns with your risk rules.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar - market data */}
            <div className="hidden w-40 shrink-0 border-l border-white/[0.06] bg-white/[0.01] p-3 lg:block">
              <div className="mb-3 text-[9px] font-medium uppercase tracking-wider text-white/20">
                Markets
              </div>
              {[
                { ticker: 'SPX', price: '6,909.22', change: '+0.4%', up: true },
                { ticker: 'NVDA', price: '134.55', change: '+2.1%', up: true },
                { ticker: 'QQQ', price: '528.31', change: '+0.6%', up: true },
                { ticker: 'VIX', price: '14.22', change: '-3.1%', up: false },
              ].map((item) => (
                <div
                  key={item.ticker}
                  className="mb-2 flex items-center justify-between"
                >
                  <span className="text-[10px] text-white/50">{item.ticker}</span>
                  <div className="text-right">
                    <div className="font-mono text-[10px] text-white/70">{item.price}</div>
                    <div
                      className={`font-mono text-[9px] ${
                        item.up ? 'text-[#22c55e]' : 'text-[#ef4444]'
                      }`}
                    >
                      {item.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-32 md:pt-40">
      <div className="relative mx-auto max-w-7xl">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-8 flex justify-center"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-xs text-slate-500">
              Now with Forex, Crypto & Futures support
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="mx-auto max-w-4xl text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="text-slate-900">The AI that learns</span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            how you trade
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-slate-500 md:text-lg"
        >
          Pelican analyzes markets, grades your trades, learns your setups, and
          coaches you to trade better. The more you use it, the smarter it gets.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link
            href="/auth/signup"
            className="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all duration-150 hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[0.98]"
          >
            Start Trading Smarter — It&apos;s Free
            <ArrowRight
              weight="bold"
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/how-to-use"
            className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-600 transition-all duration-150 hover:border-slate-400 hover:text-slate-900 active:scale-[0.98]"
          >
            See How It Works
          </Link>
        </motion.div>

        {/* Fine print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease }}
          className="mt-4 text-center text-xs text-slate-400"
        >
          10 free questions, no credit card required
        </motion.p>

        {/* Product screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease }}
          className="mt-16 md:mt-20"
        >
          <MockBrowserFrame />
        </motion.div>
      </div>
    </section>
  )
}
