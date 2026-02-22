'use client'

import Link from 'next/link'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

export function FinalCTA() {
  return (
    <Section className="relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-600/[0.04] to-transparent pointer-events-none" />

      <ScrollReveal>
        <div className="relative text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Your next trade could be
              <br />
              your best-informed one yet
            </span>
          </h2>

          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            Stop trading alone. Start trading with an AI that knows your setups,
            learns your patterns, and gets better every day.
          </p>

          <Link
            href="/auth/signup"
            className="inline-block px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-lg shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] transition-all duration-300 active:scale-[0.98]"
          >
            Start Free — No Credit Card Required
          </Link>
        </div>
      </ScrollReveal>
    </Section>
  )
}
