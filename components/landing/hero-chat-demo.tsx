'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// Animation phases
type Phase = 'idle' | 'user-typing' | 'thinking' | 'block-1' | 'block-2' | 'block-3' | 'hold' | 'fade-out'

const USER_PROMPT = "How does NVDA look heading into earnings?"
const TYPING_SPEED = 40 // ms per character
const THINKING_DURATION = 1500
const BLOCK_DELAY = 400
const HOLD_DURATION = 4000
const FADE_DURATION = 600
const RESTART_DELAY = 1000

export function HeroChatDemo() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [typedChars, setTypedChars] = useState(0)
  const [visible, setVisible] = useState(true)

  const runSequence = useCallback(async () => {
    // Helper to wait
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

    setVisible(true)
    setTypedChars(0)

    // Phase: type user message
    setPhase('user-typing')
    for (let i = 1; i <= USER_PROMPT.length; i++) {
      setTypedChars(i)
      await wait(TYPING_SPEED)
    }
    await wait(300)

    // Phase: thinking
    setPhase('thinking')
    await wait(THINKING_DURATION)

    // Phase: blocks appear
    setPhase('block-1')
    await wait(BLOCK_DELAY)
    setPhase('block-2')
    await wait(BLOCK_DELAY)
    setPhase('block-3')
    await wait(HOLD_DURATION)

    // Fade out
    setPhase('fade-out')
    setVisible(false)
    await wait(FADE_DURATION + RESTART_DELAY)

    // Restart
    setPhase('idle')
  }, [])

  useEffect(() => {
    // Start after a short mount delay
    const timer = setTimeout(() => {
      const loop = async () => {
        while (true) {
          await runSequence()
        }
      }
      loop()
    }, 800)
    return () => clearTimeout(timer)
  }, [runSequence])

  const showUser = phase !== 'idle'
  const showThinking = phase === 'thinking'
  const showBlock1 = ['block-1', 'block-2', 'block-3', 'hold', 'fade-out'].includes(phase)
  const showBlock2 = ['block-2', 'block-3', 'hold', 'fade-out'].includes(phase)
  const showBlock3 = ['block-3', 'hold', 'fade-out'].includes(phase)

  return (
    <div className={cn(
      "relative mx-auto w-full max-w-2xl transition-opacity duration-500",
      visible ? "opacity-100" : "opacity-0"
    )}>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image
              src="/pelican-logo-transparent.webp"
              alt="Pelican"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <span className="text-sm font-semibold text-slate-800">Pelican AI</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />

          </div>
        </div>

        {/* Chat area */}
        <div className="px-4 py-4 space-y-3 min-h-[320px] sm:min-h-[360px]">
          {/* User message */}
          {showUser && (
            <div className="flex justify-end animate-fade-in">
              <div className="bg-violet-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                {USER_PROMPT.substring(0, typedChars)}
                {phase === 'user-typing' && (
                  <span className="inline-block w-0.5 h-4 bg-white/70 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {showThinking && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                <Image
                  src="/pelican-logo-transparent.webp"
                  alt="Pelican"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="thinking-dot" style={{ animationDelay: '0ms' }} />
                <div className="thinking-dot" style={{ animationDelay: '150ms' }} />
                <div className="thinking-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Response blocks */}
          {(showBlock1 || showBlock2 || showBlock3) && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                <Image
                  src="/pelican-logo-transparent.webp"
                  alt="Pelican"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="space-y-2.5 flex-1 min-w-0">
                {/* Block 1: Position Context */}
                {showBlock1 && (
                  <div className="animate-fade-slide-up rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-violet-600 mb-1.5">
                      Your Position
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You&apos;re holding <span className="font-mono font-medium text-slate-900">250</span> shares
                      from <span className="font-mono font-medium text-slate-900">$118.40</span>.
                      Currently <span className="font-mono font-medium text-emerald-600">+13.5%</span> at
                      <span className="font-mono font-medium text-slate-900"> $134.38</span>.
                    </p>
                  </div>
                )}

                {/* Block 2: Technical Setup */}
                {showBlock2 && (
                  <div className="animate-fade-slide-up rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-violet-600 mb-1.5">
                      Technical Setup
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-600">
                        Support at <span className="font-mono font-medium text-slate-900">$124</span> (20-day MA)
                        · Resistance <span className="font-mono font-medium text-slate-900">$140</span> (prior ATH)
                      </p>
                      <p className="text-xs text-slate-600">
                        RSI <span className="font-mono font-medium text-slate-900">62.4</span> — neutral-bullish
                        · IV crush risk elevated
                      </p>
                    </div>
                  </div>
                )}

                {/* Block 3: Recommendation */}
                {showBlock3 && (
                  <div className="animate-fade-slide-up rounded-xl bg-violet-50 border border-violet-200/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-violet-600 mb-1.5">
                      Recommendation
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      With <span className="font-mono font-medium text-emerald-600">+13.5%</span> unrealized,
                      consider trimming <span className="font-mono font-medium text-slate-900">30-40%</span> pre-earnings
                      to lock in gains. If it holds <span className="font-mono font-medium text-slate-900">$124</span> post-reaction,
                      re-enter targeting <span className="font-mono font-medium text-slate-900">$140</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
