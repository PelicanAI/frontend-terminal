'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon as ArrowRight } from '@hugeicons/core-free-icons'
import { HeroChatDemo } from '@/components/landing/hero-chat-demo'

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-32 md:pt-40">
      <div className="relative mx-auto max-w-7xl">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="mx-auto max-w-4xl text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="text-slate-900">The AI that learns</span>
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-purple-400 bg-clip-text text-transparent">
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
            className="group flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition-all duration-150 hover:bg-violet-700 hover:shadow-violet-600/30 active:scale-[0.98]"
          >
            Start Trading Smarter — It&apos;s Free
            <HugeiconsIcon icon={ArrowRight} className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} color="currentColor" />
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
          className="mt-12 md:mt-16"
        >
          <HeroChatDemo />
        </motion.div>
      </div>
    </section>
  )
}
