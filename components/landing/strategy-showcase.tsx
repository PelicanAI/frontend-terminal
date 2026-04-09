'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon as ArrowRight,
  ArrowLeft01Icon as ArrowLeft,
  CheckmarkSquare01Icon as CheckSquare,
  FlashIcon as Lightning,
} from '@hugeicons/core-free-icons'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'

// ── Hardcoded showcase strategies (no API dependency) ──

interface ShowcaseStrategy {
  name: string
  description: string
  category: string
  categoryLabel: string
  categoryColor: string
  difficulty: string
  difficultyColor: string
  entryRulesPreview: string
  checklist: string[]
  bestWhen: string
  avoidWhen: string
}

const SHOWCASE_STRATEGIES: ShowcaseStrategy[] = [
  {
    name: 'Breakout Pullback',
    description:
      'Buy the first pullback after a clean breakout above resistance. Targets continuation of the new trend with a tight stop below the breakout zone.',
    category: 'momentum',
    categoryLabel: 'Momentum',
    categoryColor: 'bg-violet-100 text-violet-700',
    difficulty: 'Beginner',
    difficultyColor: 'bg-emerald-100 text-emerald-700',
    entryRulesPreview:
      'Identify a stock that has broken above a clean horizontal resistance level with at least 1.5x average volume. Wait for price to pull back to the breakout level. Enter long when price shows a bullish reversal candle at the pullback level.',
    checklist: [
      'Resistance tested 2-3 times before breaking',
      'Breakout candle closed above resistance with volume',
      'Pullback volume is declining',
      'Market trend supports the trade direction',
      'No major earnings within 24 hours',
      'Risk-reward at least 2:1',
    ],
    bestWhen: 'Trending markets, earnings season momentum',
    avoidWhen: 'Choppy/range-bound conditions, VIX >30',
  },
  {
    name: 'Overextended Fade',
    description:
      'Fade extreme moves away from the mean when indicators reach exhaustion levels. Profits from the inevitable snapback toward fair value.',
    category: 'mean_reversion',
    categoryLabel: 'Mean Reversion',
    categoryColor: 'bg-violet-100 text-violet-700',
    difficulty: 'Advanced',
    difficultyColor: 'bg-red-100 text-red-700',
    entryRulesPreview:
      'Price must be at least 2.5 standard deviations from the 20-period moving average. RSI(14) must be above 80 or below 20. Wait for a reversal candle with volume expansion.',
    checklist: [
      'Move is 2.5+ standard deviations from mean',
      'RSI confirms overbought/oversold',
      'Reversal candle formed with volume',
      'No fundamental catalyst justifying the move',
      'RSI or MACD divergence present',
      'Position size reduced for counter-trend',
    ],
    bestWhen: 'Parabolic spikes on retail hype, no real catalyst',
    avoidWhen: 'Real news-driven moves, strong trend days',
  },
  {
    name: 'Wheel Strategy',
    description:
      'Generate income by selling cash-secured puts, then covered calls if assigned. A systematic, repeatable income strategy for stocks you want to own.',
    category: 'options',
    categoryLabel: 'Options',
    categoryColor: 'bg-purple-100 text-purple-700',
    difficulty: 'Intermediate',
    difficultyColor: 'bg-amber-100 text-amber-700',
    entryRulesPreview:
      'Select a stock you genuinely want to own at a lower price. Sell a cash-secured put at a strike 5-10% below current price, 30-45 days to expiration. Target premium of at least 1-2% of strike price.',
    checklist: [
      'Stock is fundamentally sound at the strike',
      'IV rank is above 30%',
      'No earnings within option expiration',
      'Cash fully reserved for assignment',
      'Premium is at least 1% of strike',
      'Total wheel exposure within limits',
    ],
    bestWhen: 'Range-bound markets, elevated implied volatility',
    avoidWhen: 'Sharp downtrends, binary event risk, low IV',
  },
  {
    name: 'Earnings Momentum Run',
    description:
      'Buy stocks that report strong earnings beats with raised guidance. The best reactions create multi-week momentum runs as analysts upgrade.',
    category: 'event_driven',
    categoryLabel: 'Event-Driven',
    categoryColor: 'bg-emerald-100 text-emerald-700',
    difficulty: 'Advanced',
    difficultyColor: 'bg-red-100 text-red-700',
    entryRulesPreview:
      'Earnings must beat consensus EPS by 10%+ AND revenue must beat estimates. Company must raise forward guidance. Enter on the first pullback after the earnings gap.',
    checklist: [
      'EPS beat by 10%+ above consensus',
      'Revenue exceeded estimates',
      'Forward guidance was raised',
      'Gap is 3%+ on heavy volume',
      'Stock was in uptrend before earnings',
      'Sector is not in heavy distribution',
    ],
    bestWhen: 'Early earnings season, healthy broad market',
    avoidWhen: 'Market fading all gaps, value traps, one-time beats',
  },
  {
    name: 'VWAP Reclaim',
    description:
      'Go long when price reclaims VWAP from below with confirming volume. Signals institutional buying. A high-probability intraday setup used by professional day traders.',
    category: 'momentum',
    categoryLabel: 'Momentum',
    categoryColor: 'bg-violet-100 text-violet-700',
    difficulty: 'Intermediate',
    difficultyColor: 'bg-amber-100 text-amber-700',
    entryRulesPreview:
      'Price must have spent 15-30 minutes below VWAP. Watch for price to push back above with 1.5x volume. Enter on the first pullback to VWAP after the reclaim.',
    checklist: [
      'Price spent meaningful time below VWAP',
      'Reclaim candle has strong volume',
      'SPY is not in freefall',
      'No major news imminent for this stock',
      'Spread is tight (liquid stock)',
      'Risk-reward to HOD at least 2:1',
    ],
    bestWhen: 'Stock opened weak but conditions are improving',
    avoidWhen: 'Heavy distribution day, genuine fundamental deterioration',
  },
  {
    name: 'Iron Condor',
    description:
      'Sell an OTM put spread and call spread simultaneously. Profits when the stock stays within a range. A pure volatility selling strategy for range-bound markets.',
    category: 'options',
    categoryLabel: 'Options',
    categoryColor: 'bg-purple-100 text-purple-700',
    difficulty: 'Advanced',
    difficultyColor: 'bg-red-100 text-red-700',
    entryRulesPreview:
      'Select underlying with IV rank above 50% and defined trading range. Sell put and call spreads at the 16-delta. Total credit should be at least 1/3 of spread width.',
    checklist: [
      'IV rank above 50%',
      'Stock has been range-bound',
      'No earnings within expiration period',
      'Credit is at least 1/3 of spread width',
      'Short strikes at 16-delta or further OTM',
      'Max loss within 2% of account',
    ],
    bestWhen: 'High IV rank, range-bound stock, vol contraction expected',
    avoidWhen: 'Trending markets, low IV, earnings or binary events',
  },
]

// ── Carousel state ──

const AUTOPLAY_INTERVAL = 5000
const VISIBLE_DESKTOP = 3
const VISIBLE_TABLET = 2

export function StrategyShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalStrategies = SHOWCASE_STRATEGIES.length

  // Number of "pages" depends on viewport — we just track index 0-based
  const maxIndex = totalStrategies - 1

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const card = container.children[index] as HTMLElement | undefined
    if (card) {
      container.scrollTo({ left: card.offsetLeft - container.offsetLeft, behavior: 'smooth' })
    }
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev >= maxIndex ? 0 : prev + 1
      return next
    })
  }, [maxIndex])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev <= 0 ? maxIndex : prev - 1
      return next
    })
  }, [maxIndex])

  // Scroll when index changes
  useEffect(() => {
    scrollToIndex(currentIndex)
  }, [currentIndex, scrollToIndex])

  // Auto-advance (disabled on mobile/touch devices)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(goNext, AUTOPLAY_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, goNext])

  // Sync scroll position to currentIndex on manual scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    let scrollTimeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth ?? 1
        const gap = 16
        const rawIndex = Math.round(container.scrollLeft / (cardWidth + gap))
        setCurrentIndex(Math.min(rawIndex, maxIndex))
      }, 100)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [maxIndex])

  return (
    <Section id="strategies">
      {/* Header */}
      <ScrollReveal>
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-xs font-semibold tracking-wide uppercase mb-6">
            <HugeiconsIcon icon={Lightning} className="w-3.5 h-3.5" strokeWidth={1.5} color="currentColor" />
            Strategy Library
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
            Professional Trading Strategies, Built In
          </h2>
          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Every strategy comes with detailed entry rules, exit rules, risk management, and a pre-trade checklist.
            Adopt one in seconds, customize it to your style, or build your own from scratch.
          </p>
        </div>
      </ScrollReveal>

      {/* Carousel */}
      <ScrollReveal delay={0.1}>
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Arrow buttons — desktop only */}
          <button
            onClick={goPrev}
            className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-500 hover:text-slate-900 hover:shadow-lg transition-all active:scale-95"
            aria-label="Previous strategy"
          >
            <HugeiconsIcon icon={ArrowLeft} className="w-4 h-4" strokeWidth={2} color="currentColor" />
          </button>
          <button
            onClick={goNext}
            className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-500 hover:text-slate-900 hover:shadow-lg transition-all active:scale-95"
            aria-label="Next strategy"
          >
            <HugeiconsIcon icon={ArrowRight} className="w-4 h-4" strokeWidth={2} color="currentColor" />
          </button>

          {/* Scrollable card container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {SHOWCASE_STRATEGIES.map((strategy, i) => (
              <StrategyCard key={i} strategy={strategy} />
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {SHOWCASE_STRATEGIES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'w-6 h-2 bg-violet-600'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                style={{ minWidth: i === currentIndex ? 24 : 8, minHeight: 8 }}
                aria-label={`Go to strategy ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Summary + CTA */}
      <ScrollReveal delay={0.2}>
        <div className="text-center mt-12 md:mt-16">
          <p className="text-sm text-slate-500 mb-6">
            18 strategies across momentum, mean reversion, options, and event-driven categories
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all duration-150 active:scale-[0.98]"
          >
            Try It Free
            <HugeiconsIcon icon={ArrowRight} className="w-4 h-4" strokeWidth={2} color="currentColor" />
          </Link>
          <p className="text-sm text-slate-400 mt-4">
            Create and share your own strategies with verified performance stats
          </p>
        </div>
      </ScrollReveal>
    </Section>
  )
}

// ── Strategy Card ──

function StrategyCard({ strategy }: { strategy: ShowcaseStrategy }) {
  const VISIBLE_CHECKLIST = 4
  const remaining = strategy.checklist.length - VISIBLE_CHECKLIST

  return (
    <div
      className="flex-shrink-0 snap-start w-[calc(100vw-3rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="p-6 flex flex-col h-full">
        {/* Name */}
        <h3 className="text-lg font-bold text-slate-900 mb-2.5">
          {strategy.name}
        </h3>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${strategy.categoryColor}`}>
            {strategy.categoryLabel}
          </span>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${strategy.difficultyColor}`}>
            {strategy.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 leading-relaxed mb-5">
          {strategy.description}
        </p>

        {/* Entry rules preview */}
        <div className="relative mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Entry Rules
          </p>
          <div className="relative overflow-hidden" style={{ maxHeight: '4.5rem' }}>
            <p className="text-sm text-slate-600 leading-relaxed">
              {strategy.entryRulesPreview}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
          </div>
        </div>

        {/* Checklist */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Pre-Trade Checklist
          </p>
          <ul className="space-y-1.5">
            {strategy.checklist.slice(0, VISIBLE_CHECKLIST).map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <HugeiconsIcon icon={CheckSquare} className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} color="currentColor" />
                <span className="text-sm text-slate-600 leading-snug">{item}</span>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <p className="text-xs text-slate-400 mt-1.5 ml-6">
              +{remaining} more items
            </p>
          )}
        </div>

        {/* Best when / Avoid when */}
        <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
          <div>
            <span className="text-xs font-medium text-emerald-600">Best when: </span>
            <span className="text-xs text-slate-500">{strategy.bestWhen}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-red-500">Avoid when: </span>
            <span className="text-xs text-slate-500">{strategy.avoidWhen}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
