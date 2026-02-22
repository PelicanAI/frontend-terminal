'use client'

import Link from 'next/link'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

export function FinalCTA() {
  return (
    <Section className="relative">
      {/* Light blue tint overlay */}
      <div className="absolute inset-0 bg-blue-50/50 pointer-events-none" />

      <ScrollReveal>
        <div className="relative text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Stop Searching.
              <br />
              Start Asking.
            </span>
          </h2>

          <p className="text-slate-500 text-lg mb-10 leading-relaxed">
            Stop trading alone. Start trading with an AI that knows your setups,
            learns your patterns, and gets better every day.
          </p>

          <Link
            href="/auth/signup"
            className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-300 active:scale-[0.98]"
          >
            Start Free — No Credit Card Required
          </Link>
        </div>
      </ScrollReveal>
    </Section>
  )
}
