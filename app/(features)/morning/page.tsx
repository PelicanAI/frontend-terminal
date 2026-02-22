"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useTrades } from "@/hooks/use-trades"
import { usePlaybooks } from "@/hooks/use-playbooks"
import { useMorningBrief } from "@/hooks/use-morning-brief"
import { usePelicanPanelContext } from "@/providers/pelican-panel-provider"
import { useLiveQuotes } from "@/hooks/use-live-quotes"
import { useWatchlist } from "@/hooks/use-watchlist"
import { createClient } from "@/lib/supabase/client"
import {
  PelicanCard,
  PageHeader,
  PelicanButton,
  DataCell,
  staggerContainer,
  staggerItem,
} from "@/components/ui/pelican"
import {
  ArrowsClockwise,
  Lightning,
  Briefcase,
} from "@phosphor-icons/react"
import { getMarketStatus } from "@/hooks/use-market-data"
import { LogoImg } from "@/components/ui/logo-img"
import { MarketPulseStrip } from "@/components/morning/market-pulse-strip"
import { TodaysPlaybook } from "@/components/morning/todays-playbook"
import { InteractiveBrief } from "@/components/morning/interactive-brief"
import { WatchlistRadar } from "@/components/morning/watchlist-radar"
import { RiskDashboard } from "@/components/morning/risk-dashboard"
import { SectorMiniHeatmap } from "@/components/morning/sector-mini-heatmap"
import { NewsHeadlines } from "@/components/morning/news-headlines"
import { Sparkline } from "@/components/morning/sparkline"
import { useTodaysWarnings } from "@/hooks/use-todays-warnings"
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights"
import { WarningBanner } from "@/components/insights/warning-banner"
import { EdgeSummary } from "@/components/insights/edge-summary"
import { useToast } from "@/hooks/use-toast"
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress"
import { useMarketData } from "@/hooks/use-market-data"
import { useSparklineData } from "@/hooks/use-sparkline-data"
import { useTraderProfile } from "@/hooks/use-trader-profile"
import type { Mover } from "@/hooks/use-morning-brief"
import {
  MAG7,
  SP500_TICKERS,
  NASDAQ_100,
  CRYPTO_TOP_20,
  CRYPTO_TOP_100,
} from "@/lib/trading/ticker-lists"

type MoversTab = "gainers" | "losers"
type AssetClass = "stocks" | "crypto" | "forex"
type StockFilter = 'all' | 'mag7' | 'sp500' | 'nasdaq' | 'price100plus' | 'price10to100' | 'penny'

const STOCK_FILTERS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mag7', label: 'Mag 7' },
  { key: 'sp500', label: 'S&P 500' },
  { key: 'nasdaq', label: 'Nasdaq' },
  { key: 'price100plus', label: '$100+' },
  { key: 'price10to100', label: '$10\u2013$100' },
  { key: 'penny', label: 'Penny Stocks' },
]

const CRYPTO_CATEGORIES: Record<string, string[]> = {
  'DeFi': ['UNI', 'AAVE', 'MKR', 'COMP', 'CRV', 'SNX', 'SUSHI', 'YFI', 'DYDX', 'LDO'],
  'L1/L2': ['ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'ATOM', 'APT', 'SUI', 'SEI', 'MATIC', 'ARB', 'OP'],
  'Meme': ['DOGE', 'SHIB', 'PEPE', 'WIF', 'FLOKI', 'BONK'],
}

const FOREX_CATEGORIES: Record<string, string[]> = {
  'Majors': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'],
  'Crosses': ['EURGBP', 'EURJPY', 'GBPJPY', 'AUDNZD', 'EURCHF', 'CADJPY', 'AUDJPY'],
  'Exotic': ['USDMXN', 'USDZAR', 'USDTRY', 'USDBRL', 'USDSGD', 'USDHKD'],
}

const ASSET_FILTER_OPTIONS: Record<Exclude<AssetClass, 'stocks'>, string[]> = {
  crypto: ['All', 'Top 20', 'Top 100', 'DeFi', 'L1/L2', 'Meme'],
  forex: ['All', 'Majors', 'Crosses', 'Exotic'],
}

// Market-adaptive morning brief prompt configurations
type MarketType = 'stocks' | 'forex' | 'crypto' | 'futures' | 'options'

interface BriefConfig {
  overnightRecap: string
  keyLevels: string
  sectorRotation: string
  gamePlan: string
}

const BRIEF_CONFIGS: Record<MarketType, BriefConfig> = {
  stocks: {
    overnightRecap: `**1. MARKET OVERNIGHT RECAP**
- How did futures trade overnight? Where are S&P, Nasdaq, Dow futures right now?
- What happened in Asia and Europe sessions?
- Any overnight gaps or significant moves?`,
    keyLevels: `**2. KEY LEVELS TODAY**
- S&P 500: support, resistance, and pivot levels
- Nasdaq: support, resistance, and pivot levels
- VIX: current level and what it signals
- DXY (dollar index): direction and impact`,
    sectorRotation: `**6. SECTOR ROTATION**
- Which sectors are showing relative strength/weakness?
- Any notable sector divergences from the broad market?
- Money flow signals`,
    gamePlan: `**10. GAME PLAN**
- Summarize: what am I doing today?
- Key price alerts to set
- Times to pay attention to (data releases, market open, power hour)`,
  },
  forex: {
    overnightRecap: `**1. SESSION RECAP**
- How did the Asian session trade? Any significant moves in JPY, AUD, NZD crosses?
- European session open outlook — what's the tone?
- Any overnight gaps or central bank interventions?`,
    keyLevels: `**2. KEY LEVELS TODAY**
- EUR/USD: support, resistance, and pivot levels
- GBP/USD: support, resistance, and pivot levels
- USD/JPY: support, resistance, and pivot levels
- DXY (dollar index): current direction and momentum`,
    sectorRotation: `**6. CURRENCY STRENGTH**
- Which currencies are showing relative strength/weakness today?
- Any notable divergences between correlated pairs?
- Central bank policy outlook and rate differential shifts`,
    gamePlan: `**10. GAME PLAN**
- Summarize: what am I doing today?
- Key price alerts to set on major pairs
- Times to pay attention to (London open, NY overlap, key economic releases)`,
  },
  crypto: {
    overnightRecap: `**1. MARKET RECAP (24H)**
- How did BTC and ETH trade over the last 24 hours? Any significant moves?
- What happened during the Asia and US sessions?
- Any notable liquidation events or large whale movements?`,
    keyLevels: `**2. KEY LEVELS TODAY**
- BTC: support, resistance, and pivot levels
- ETH: support, resistance, and pivot levels
- BTC dominance (BTC.D): current level and trend
- Total crypto market cap direction`,
    sectorRotation: `**6. CATEGORY ROTATION**
- Which categories are leading? (Layer 1, DeFi, Meme, AI, Gaming)
- Any notable rotation between categories?
- Funding rates and sentiment across major exchanges`,
    gamePlan: `**10. GAME PLAN**
- Summarize: what am I doing today?
- Key price alerts to set
- Volume pattern analysis (when are the highest-volume windows?)
- On-chain metrics to watch (exchange flows, stablecoin mints)`,
  },
  futures: {
    overnightRecap: `**1. OVERNIGHT SESSION RECAP**
- How did ES, NQ, and YM trade overnight? Key levels hit?
- Globex session volume and range — was it trending or range-bound?
- Any overnight gaps or significant moves? Gap fill probability?`,
    keyLevels: `**2. KEY LEVELS TODAY**
- ES (S&P 500 futures): support, resistance, VPOC, and value area
- NQ (Nasdaq futures): support, resistance, and pivot levels
- VIX: current level and term structure
- Any rollover/expiration considerations?`,
    sectorRotation: `**6. SECTOR ROTATION**
- Which sectors are showing relative strength/weakness?
- COT (Commitment of Traders) positioning — any notable shifts?
- Institutional vs retail positioning signals`,
    gamePlan: `**10. GAME PLAN**
- Summarize: what am I doing today?
- Key price alerts to set on ES, NQ, CL, GC
- Times to pay attention to (data releases, RTH open, power hour, settlement)
- Overnight session levels to reference for RTH trading`,
  },
  options: {
    overnightRecap: `**1. MARKET OVERNIGHT RECAP**
- How did futures trade overnight? Where are S&P, Nasdaq, Dow futures right now?
- What happened in Asia and Europe sessions?
- Any overnight gaps or significant moves affecting implied volatility?`,
    keyLevels: `**2. KEY LEVELS TODAY**
- S&P 500: support, resistance, and gamma exposure flip levels
- VIX: current level, term structure (contango/backwardation)
- Put/Call ratio: current reading and 5-day trend
- Max pain levels for major indices and my positions`,
    sectorRotation: `**6. VOLATILITY & FLOW ANALYSIS**
- Implied volatility regime — are we in high or low IV?
- Notable unusual options activity across sectors
- Gamma exposure levels — where are dealer hedging flows concentrated?
- Skew analysis — is put skew elevated?`,
    gamePlan: `**10. GAME PLAN**
- Summarize: what am I doing today?
- Key volatility alerts to set
- Times to pay attention to (data releases, market open, OPEX dates)
- Position Greeks summary — any adjustments needed?`,
  },
}

// Market-adaptive prompts for MarketPulseStrip clicks
const PULSE_STRIP_PROMPTS: Record<MarketType, Record<string, string>> = {
  stocks: {
    SPX: `What's driving the S&P 500 today? Key levels, sentiment, and what to watch.`,
    COMP: `What's moving the Nasdaq today? Tech sector analysis, key levels, and outlook.`,
    DJI: `Analyze the Dow Jones today. What sectors are leading/lagging and why?`,
    VIX: `VIX analysis: what is volatility signaling right now? Should I be hedging?`,
  },
  forex: {
    SPX: `How is equity market performance affecting currency pairs today? Risk-on or risk-off?`,
    COMP: `How is tech sector performance influencing USD and risk currencies today?`,
    DJI: `How is the Dow's performance reflecting on USD strength and safe-haven flows?`,
    VIX: `VIX analysis: what is volatility signaling for FX carry trades and risk currencies?`,
  },
  crypto: {
    SPX: `How is S&P 500 performance correlating with crypto today? Risk-on or risk-off impact on BTC?`,
    COMP: `How is Nasdaq performance affecting crypto sentiment today? Tech-crypto correlation analysis.`,
    DJI: `How are traditional markets influencing crypto flows today?`,
    VIX: `VIX analysis: what does equity volatility signal for crypto? Historical correlation check.`,
  },
  futures: {
    SPX: `ES futures analysis: key levels, value area, VPOC, and overnight session recap.`,
    COMP: `NQ futures analysis: key levels, relative strength vs ES, and tech sector leadership.`,
    DJI: `YM futures analysis: Dow futures levels and sector rotation signals.`,
    VIX: `VIX futures analysis: term structure, contango/backwardation, and hedging signals.`,
  },
  options: {
    SPX: `SPX options analysis: implied volatility, gamma exposure, max pain, and notable flow.`,
    COMP: `Nasdaq options analysis: IV rank, put/call skew, and unusual activity.`,
    DJI: `Dow options analysis: current implied move, notable institutional positioning.`,
    VIX: `VIX term structure deep dive: front-month vs back-month, VIX options flow, and what it signals for hedging.`,
  },
}

interface EconomicEvent {
  event: string
  country: string
  date: string
  time: string
  impact: "low" | "medium" | "high"
  actual: number | null
  estimate: number | null
  prior: number | null
  unit: string
}

export default function MorningPage() {
  const [moversTab, setMoversTab] = useState<MoversTab>("gainers")
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [economicLoading, setEconomicLoading] = useState(true)
  const [briefContent, setBriefContent] = useState<string>('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [assetClass, setAssetClass] = useState<AssetClass>('stocks')
  const [activeFilter, setActiveFilter] = useState('All')
  const [cryptoMovers, setCryptoMovers] = useState<Mover[]>([])
  const [forexMovers, setForexMovers] = useState<Mover[]>([])
  const [assetLoading, setAssetLoading] = useState(false)

  const router = useRouter()
  const { openTrades, closedTrades, isLoading: tradesLoading } = useTrades()
  const { movers, isLoading: moversLoading, refetch: refetchMovers } = useMorningBrief()
  const { openWithPrompt } = usePelicanPanelContext()
  const { items: watchlistItems } = useWatchlist()
  const { activePlaybooks } = usePlaybooks()
  const { toast } = useToast()

  // Onboarding milestone
  const { completeMilestone } = useOnboardingProgress()
  useEffect(() => { completeMilestone("visited_brief") }, [completeMilestone])
  const { warnings: todaysWarnings, warningCount } = useTodaysWarnings()
  const { data: behavioralInsights } = useBehavioralInsights()
  const { primaryMarket } = useTraderProfile()
  const marketType = (primaryMarket as MarketType) || 'stocks'
  const briefConfig = BRIEF_CONFIGS[marketType] ?? BRIEF_CONFIGS.stocks

  // Get live quotes for open positions to calculate unrealized P&L
  const openTickersWithTypes = openTrades
    .map(t => `${t.ticker}:${t.asset_type}`)
  // Also get quotes for watchlist tickers (default to stock type)
  const watchlistTickersWithTypes = watchlistItems
    .map(w => `${w.ticker}:stock`)
  const allTickersWithTypes = [...new Set([...openTickersWithTypes, ...watchlistTickersWithTypes])]
  const { quotes } = useLiveQuotes(allTickersWithTypes)

  // Sector data for mini heatmap (reuses sidebar data source)
  const { sectors } = useMarketData({ refreshInterval: 60000, autoRefresh: true })

  // Sparkline data for open positions (5-day price history)
  const sparklineTickers = openTrades.map(t => t.ticker)
  const { sparklines } = useSparklineData(sparklineTickers)

  const marketStatus = getMarketStatus()
  const isMarketOpen = marketStatus === 'open'

  // Load cached brief on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const cached = localStorage.getItem(`pelican-brief-${today}`)
    if (cached) {
      setBriefContent(cached)
    }
  }, [])

  // Fetch economic calendar
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    setEconomicLoading(true)
    fetch(`/api/economic-calendar?from=${today}&to=${nextWeek}`)
      .then(r => r.json())
      .then(data => {
        setEconomicEvents(data.events || [])
        setEconomicLoading(false)
      })
      .catch(() => {
        setEconomicLoading(false)
      })
  }, [])

  // Reset filter when switching asset class
  useEffect(() => {
    setStockFilter('all')
    setActiveFilter('All')
  }, [assetClass])

  // Fetch non-stock movers when asset class changes
  useEffect(() => {
    if (assetClass === 'stocks') return

    const endpoint = assetClass === 'crypto' ? '/api/movers/crypto' : '/api/movers/forex'

    setAssetLoading(true)
    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        const tickers = data.tickers || []
        if (assetClass === 'crypto') setCryptoMovers(tickers)
        else setForexMovers(tickers)
      })
      .catch(() => {})
      .finally(() => setAssetLoading(false))
  }, [assetClass])

  // Sort and filter movers by asset class, direction, and category
  const currentMovers = useMemo(() => {
    let data: Mover[] = []

    if (assetClass === 'stocks') {
      data = moversTab === 'gainers' ? [...movers.gainers] : [...movers.losers]
      // Apply stock filter
      switch (stockFilter) {
        case 'mag7':
          data = data.filter(m => MAG7.has(m.ticker))
          break
        case 'sp500':
          data = data.filter(m => SP500_TICKERS.has(m.ticker))
          break
        case 'nasdaq':
          data = data.filter(m => NASDAQ_100.has(m.ticker))
          break
        case 'price100plus':
          data = data.filter(m => m.price >= 100)
          break
        case 'price10to100':
          data = data.filter(m => m.price >= 10 && m.price < 100)
          break
        case 'penny':
          data = data.filter(m => m.price < 5)
          break
        // 'all' — no filter
      }
    } else {
      const source = assetClass === 'crypto' ? cryptoMovers : forexMovers
      data = [...source]

      // Apply category filter
      if (activeFilter !== 'All') {
        const categories = assetClass === 'crypto' ? CRYPTO_CATEGORIES : FOREX_CATEGORIES

        if (activeFilter === 'Top 20') {
          data = data.filter(m => CRYPTO_TOP_20.has(m.ticker))
        } else if (activeFilter === 'Top 100') {
          data = data.filter(m => CRYPTO_TOP_100.has(m.ticker))
        } else if (categories[activeFilter]) {
          data = data.filter(m => categories[activeFilter]!.includes(m.ticker))
        }
      }

      // For non-stock assets, filter by direction
      if (moversTab === 'gainers') {
        data = data.filter(m => m.changePercent >= 0)
      } else {
        data = data.filter(m => m.changePercent < 0)
      }
    }

    // Sort by change percent
    if (moversTab === 'gainers') {
      data.sort((a, b) => b.changePercent - a.changePercent)
    } else {
      data.sort((a, b) => a.changePercent - b.changePercent)
    }

    return data.slice(0, 10)
  }, [assetClass, moversTab, movers.gainers, movers.losers, cryptoMovers, forexMovers, stockFilter, activeFilter])

  const handleAnalyzePosition = async (trade: typeof openTrades[0]) => {
    const quote = quotes[trade.ticker]
    const currentPrice = quote?.price
    const direction = trade.direction === 'long' ? 1 : -1
    let unrealizedPnL: number | null = null
    if (currentPrice) {
      unrealizedPnL = (currentPrice - trade.entry_price) * trade.quantity * direction
    }
    const pnl = unrealizedPnL ?? trade.pnl_amount ?? null

    const prompt = `Analyze my ${trade.direction} position in ${trade.ticker}: Entry $${trade.entry_price.toFixed(2)}, Qty ${trade.quantity}${currentPrice ? `, Current $${currentPrice.toFixed(2)}` : ''}${pnl != null ? `, P&L ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : ''}${trade.stop_loss ? `, Stop $${trade.stop_loss}` : ''}${trade.take_profit ? `, Target $${trade.take_profit}` : ''}${trade.thesis ? `\nThesis: ${trade.thesis}` : ''}. What's the current technical setup? Any upcoming catalysts or risks I should watch?`
    await openWithPrompt(trade.ticker, prompt, "morning", 'brief_action')
  }

  const handleShareBrief = useCallback((format: 'full' | 'summary' | 'twitter') => {
    if (!briefContent) return
    let text = ''
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    if (format === 'full') {
      text = `Pelican Daily Brief — ${dateStr}\n\n${briefContent}`
    } else if (format === 'summary') {
      // Extract first 2 sections or first 500 chars
      const lines = briefContent.split('\n')
      const summaryLines: string[] = []
      let sectionCount = 0
      for (const line of lines) {
        if (/^(?:#{1,3}\s*)?(?:\*\*)?\d+\./.test(line)) sectionCount++
        if (sectionCount > 2) break
        summaryLines.push(line)
      }
      text = `Pelican Brief Summary — ${dateStr}\n\n${summaryLines.join('\n').trim()}`
    } else {
      // Twitter: ultra-short, first 240 chars of content
      const clean = briefContent.replace(/[#*_]/g, '').slice(0, 240).trim()
      text = `${clean}…\n\n📊 via Pelican Trading AI`
    }

    navigator.clipboard.writeText(text).then(() => {
      toast({ description: 'Brief copied to clipboard' })
    }).catch(() => {
      toast({ description: 'Failed to copy', variant: 'destructive' })
    })
  }, [briefContent, toast])

  const buildMorningBriefPrompt = useCallback(() => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

    const positionsSummary = openTrades.length > 0
      ? openTrades.map(t =>
          `${t.direction.toUpperCase()} ${t.ticker} @ ${t.entry_price}${t.stop_loss ? ` (stop: ${t.stop_loss})` : ''}${t.take_profit ? ` (target: ${t.take_profit})` : ''}${t.pnl_percent != null ? ` P&L: ${t.pnl_percent >= 0 ? '+' : ''}${t.pnl_percent.toFixed(1)}%` : ''}`
        ).join('\n')
      : 'No open positions'

    const watchlistSummary = watchlistItems.length > 0
      ? watchlistItems.map(w => w.ticker).join(', ')
      : 'No watchlist items'

    const topMovers = [...movers.gainers, ...movers.losers]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    const moversSummary = topMovers.slice(0, 10).map(m =>
      `${m.ticker}: ${m.changePercent >= 0 ? '+' : ''}${m.changePercent.toFixed(1)}%`
    ).join(', ')

    const marketLabel: Record<MarketType, string> = {
      stocks: 'equities/stock',
      forex: 'forex/currency',
      crypto: 'cryptocurrency',
      futures: 'futures',
      options: 'options',
    }

    let prompt = `You are Pelican, an institutional-grade AI trading assistant delivering a comprehensive daily briefing. My primary market is ${marketLabel[marketType] ?? 'equities/stock'}.

Date: ${dateStr}
Time: ${timeStr}

MY OPEN POSITIONS:
${positionsSummary}

MY WATCHLIST:
${watchlistSummary}

TODAY'S TOP MOVERS:
${moversSummary || 'Loading...'}

Generate my personalized daily brief covering ALL of the following sections. Be specific with numbers, levels, and tickers. No fluff — write like a Goldman Sachs morning note meets a trading desk briefing.

${briefConfig.overnightRecap}

${briefConfig.keyLevels}

**3. MY POSITIONS UPDATE**
- For each of my open positions: current price vs my entry, how far from stop/target, any overnight news affecting them
- Risk assessment: which positions need attention today?
- Any positions approaching stop loss or take profit?

**4. WATCHLIST OPPORTUNITIES**
- For each ticker on my watchlist: current setup, key levels to watch, any catalysts today
- Which watchlist items have the best risk/reward for entry today?

**5. MACRO & CATALYSTS**
- Economic data releases today (times, consensus, potential impact)
- Fed speakers or central bank events
- Earnings reports today (pre-market and after-hours)
- Any geopolitical developments affecting markets

${briefConfig.sectorRotation}

**7. TOP MOVERS ANALYSIS**
- Why are today's biggest movers moving? (earnings, news, technical breakouts)
- Any of these relevant to my positions or watchlist?

**8. TRADE IDEAS**
- 1-2 high-conviction trade ideas based on today's setup
- Entry, stop, target for each
- Thesis and catalyst

**9. RISK WARNINGS**
- What could go wrong today? Key risk events
- Unusual options activity or volatility signals
- Any signs of market stress?

${briefConfig.gamePlan}

Keep it dense, actionable, and personalized to MY positions and watchlist. Use markdown headers for each section.`

    if (todaysWarnings.length > 0) {
      prompt += `\n\nIMPORTANT CONTEXT — MY ACTIVE TRADING WARNINGS (based on my historical patterns):\n`
      todaysWarnings.forEach(w => {
        prompt += `- [${w.severity.toUpperCase()}] ${w.title}: ${w.message}\n`
      })
      prompt += `\nPlease acknowledge these warnings in my brief and factor them into your risk assessment and game plan sections.`
    }

    // Setups for You — only if user has active playbooks
    if (activePlaybooks.length > 0) {
      const playbookSummaries = activePlaybooks
        .slice(0, 5)
        .map(p => `- "${p.name}" (${p.timeframe || 'any timeframe'}): ${p.entry_rules || 'no entry rules defined'}`)
        .join('\n')

      const watchlistTickers = watchlistItems.slice(0, 20).map(w => w.ticker).join(', ')

      prompt += `\n\n**11. SETUPS FOR YOU**\n`
      prompt += `I have these active playbook setups:\n${playbookSummaries}\n\n`
      prompt += `My watchlist: ${watchlistTickers || 'No watchlist tickers'}\n\n`
      prompt += `Based on current market conditions, are any of my watchlist tickers showing patterns `
      prompt += `that match my playbook setups? Be specific — name the ticker, the playbook it matches, `
      prompt += `and why. Only mention genuine matches, not stretches. If nothing matches today, say so.`
    }

    return prompt
  }, [openTrades, watchlistItems, movers.gainers, movers.losers, todaysWarnings, marketType, briefConfig, activePlaybooks])

  const supabase = useMemo(() => createClient(), [])
  const briefAbortRef = useRef<AbortController | null>(null)

  const handleGenerateBrief = useCallback(async () => {
    // Abort any in-flight brief request
    briefAbortRef.current?.abort()
    briefAbortRef.current = new AbortController()
    const { signal } = briefAbortRef.current

    setBriefLoading(true)
    setBriefError(null)
    setBriefContent('')

    const prompt = buildMorningBriefPrompt()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://pelican-backend.fly.dev'

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`${backendUrl}/api/pelican_stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
          conversation_history: [],
          conversationId: null,
          files: [],
          timestamp: new Date().toISOString(),
          stream: true,
        }),
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const jsonStr = trimmed.slice(6).trim()
          if (!jsonStr) continue

          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.error) {
              throw new Error(parsed.message || parsed.error)
            }
            // Backend sends "delta" for content chunks
            const chunk = parsed.delta || parsed.content
            if (chunk) {
              fullContent += chunk
              setBriefContent(fullContent)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
          }
        }
      }

      // Cache for today
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem(`pelican-brief-${today}`, fullContent)
    } catch (err) {
      if (signal.aborted) return // Intentional abort, no error
      console.error('Brief generation error:', err)
      setBriefError('Failed to generate brief. Please try again.')
    } finally {
      setBriefLoading(false)
    }
  }, [buildMorningBriefPrompt, supabase])

  // Auto-generate brief if no cache exists (runs once on mount)
  const [autoGenTriggered, setAutoGenTriggered] = useState(false)
  useEffect(() => {
    if (autoGenTriggered || briefLoading || briefContent) return
    const today = new Date().toISOString().split('T')[0]
    const cached = localStorage.getItem(`pelican-brief-${today}`)
    if (!cached) {
      setAutoGenTriggered(true)
      handleGenerateBrief()
    }
  }, [autoGenTriggered, briefLoading, briefContent, handleGenerateBrief])

  // Calculate total unrealized P&L for Active Exposure header
  const totalPnl = useMemo(() => {
    if (openTrades.length === 0) return null
    let total = 0
    let hasAnyPnl = false
    for (const trade of openTrades) {
      const quote = quotes[trade.ticker]
      const currentPrice = quote?.price
      const direction = trade.direction === 'long' ? 1 : -1
      if (currentPrice) {
        total += (currentPrice - trade.entry_price) * trade.quantity * direction
        hasAnyPnl = true
      } else if (trade.pnl_amount != null) {
        total += trade.pnl_amount
        hasAnyPnl = true
      }
    }
    return hasAnyPnl ? total : null
  }, [openTrades, quotes])

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      {/* Page Header */}
      <PageHeader
        title="Daily Brief"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        actions={
          <div className="flex items-center gap-2">
            <PelicanButton
              variant="secondary"
              size="sm"
              onClick={() => refetchMovers()}
              disabled={moversLoading}
              aria-label="Refresh movers"
            >
              <ArrowsClockwise className={`h-4 w-4 ${moversLoading ? "animate-spin" : ""}`} weight="bold" />
            </PelicanButton>
          </div>
        }
      />

      {/* Market Pulse Strip — vital signs bar */}
      <div className="mt-6">
        <MarketPulseStrip
          onIndexClick={(symbol, label) => {
            const prompts = PULSE_STRIP_PROMPTS[marketType] ?? PULSE_STRIP_PROMPTS.stocks
            openWithPrompt(null, prompts[symbol] || `Analyze ${label} today. What's driving the move?`, 'morning', 'brief_action')
          }}
        />
      </div>

      {/* Behavioral Warnings */}
      {warningCount > 0 && (
        <div className="mt-4">
          <WarningBanner
            warnings={todaysWarnings}
            onAction={(w) => openWithPrompt(null, `I have a trading warning: ${w.title}. ${w.message} What should I do? ${w.action}`, 'morning', 'brief_action')}
          />
        </div>
      )}

      {/* Pelican Brief — full width, above the grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="mt-6"
      >
        <PelicanCard accentGlow className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightning className={`h-5 w-5 text-[var(--accent-primary)] ${briefLoading ? 'animate-pulse' : ''}`} weight="bold" />
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">Pelican Brief</h3>
              {briefLoading && briefContent && (
                <span className="text-xs text-[var(--text-muted)] animate-pulse">Streaming...</span>
              )}
            </div>
            {briefContent && !briefLoading && (
              <PelicanButton
                variant="ghost"
                size="sm"
                onClick={handleGenerateBrief}
              >
                <ArrowsClockwise className="h-3 w-3" weight="regular" />
                Regenerate
              </PelicanButton>
            )}
          </div>

          {/* Empty state */}
          {!briefContent && !briefLoading && !briefError && (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                AI-generated morning intelligence across your positions, movers, and macro setup.
              </p>
              <PelicanButton
                variant="primary"
                onClick={handleGenerateBrief}
              >
                <Lightning className="h-4 w-4" weight="bold" />
                Generate Brief
              </PelicanButton>
            </>
          )}

          {/* Loading state */}
          {briefLoading && !briefContent && (
            <div className="flex items-center gap-3 py-8">
              <div className="h-5 w-5 border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">
                Generating your daily brief...
              </span>
            </div>
          )}

          {/* Streamed/completed content */}
          {briefContent && (
            <InteractiveBrief
              content={briefContent}
              isStreaming={briefLoading}
              onTickerClick={(ticker, prompt) => openWithPrompt(ticker, prompt, 'morning', 'brief_action')}
              onShare={handleShareBrief}
            />
          )}

          {/* Error state */}
          {briefError && (
            <div>
              <p className="text-sm text-[var(--data-negative)] mb-3">{briefError}</p>
              <PelicanButton
                variant="ghost"
                size="sm"
                onClick={handleGenerateBrief}
              >
                Try again
              </PelicanButton>
            </div>
          )}
        </PelicanCard>
      </motion.div>

      {/* Two-column grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2"
      >
        {/* Left column */}
        <div className="space-y-6">
          {/* Active Exposure */}
          <motion.div variants={staggerItem}>
            <PelicanCard accentGlow className="p-5">
              {/* Enhanced header with total P&L */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Active Exposure</h2>
                  <p className="text-xs text-[var(--text-muted)]">{openTrades.length} open position{openTrades.length !== 1 ? 's' : ''}</p>
                </div>
                {totalPnl != null && (
                  <div className="text-right">
                    <p className={`text-lg font-mono tabular-nums font-semibold ${
                      totalPnl >= 0 ? 'text-[var(--data-positive)]' : 'text-[var(--data-negative)]'
                    }`}>
                      {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Total P&L</p>
                  </div>
                )}
              </div>
              {tradesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)]" />
                </div>
              ) : openTrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Briefcase className="h-8 w-8 text-[var(--text-muted)] mb-2" weight="light" />
                  <p className="text-sm text-[var(--text-muted)]">No open positions</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Log trades in the Journal to see them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openTrades.slice(0, 8).map((trade) => {
                    // Calculate unrealized P&L from live prices
                    const quote = quotes[trade.ticker]
                    const currentPrice = quote?.price
                    const direction = trade.direction === 'long' ? 1 : -1

                    let unrealizedPnL: number | null = null
                    if (currentPrice) {
                      unrealizedPnL = (currentPrice - trade.entry_price) * trade.quantity * direction
                    }

                    const pnl = unrealizedPnL ?? trade.pnl_amount ?? null

                    return (
                      <button
                        key={trade.id}
                        onClick={() => handleAnalyzePosition(trade)}
                        className={`w-full rounded-xl border bg-[var(--bg-surface)] p-3 text-left transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] active:scale-[0.98] min-h-[44px] border-l-2 ${
                          pnl != null && pnl >= 0
                            ? 'border-[var(--border-subtle)] border-l-[var(--data-positive)]'
                            : pnl != null && pnl < 0
                              ? 'border-[var(--border-subtle)] border-l-[var(--data-negative)]'
                              : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <LogoImg symbol={trade.ticker} size={20} />
                            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{trade.ticker}</span>
                          </div>
                          <span className={`text-xs font-medium uppercase ${trade.direction === "long" ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"}`}>
                            {trade.direction}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">
                            Entry <span className="font-mono tabular-nums">${trade.entry_price.toFixed(2)}</span> · Qty <span className="font-mono tabular-nums">{trade.quantity}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <Sparkline
                              data={sparklines[trade.ticker] || []}
                              positive={(pnl ?? 0) >= 0}
                            />
                            {pnl === null ? (
                              <span className="font-mono tabular-nums text-[var(--text-disabled)]">&mdash;</span>
                            ) : (
                              <DataCell
                                value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                                sentiment={pnl >= 0 ? 'positive' : 'negative'}
                                size="sm"
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </PelicanCard>
          </motion.div>

          {/* Market Movers */}
          <motion.div variants={staggerItem}>
            <PelicanCard className="p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Market Movers</h2>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
                    <button
                      onClick={() => setMoversTab("gainers")}
                      className={`rounded px-2 py-1 text-xs transition-colors duration-150 ${
                        moversTab === "gainers"
                          ? "bg-green-500/20 text-[var(--data-positive)] border border-green-500/30"
                          : "text-[var(--text-muted)] border border-transparent"
                      }`}
                    >
                      Gainers
                    </button>
                    <button
                      onClick={() => setMoversTab("losers")}
                      className={`rounded px-2 py-1 text-xs transition-colors duration-150 ${
                        moversTab === "losers"
                          ? "bg-red-500/20 text-[var(--data-negative)] border border-red-500/30"
                          : "text-[var(--text-muted)] border border-transparent"
                      }`}
                    >
                      Losers
                    </button>
                  </div>
                </div>

                {/* Asset Class Tabs */}
                <div className="flex gap-1 mb-3">
                  {(['stocks', 'crypto', 'forex'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAssetClass(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        assetClass === tab
                          ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Dynamic Filters */}
                <div className="flex gap-1 flex-wrap">
                  {assetClass === 'stocks' ? (
                    STOCK_FILTERS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setStockFilter(f.key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors duration-150 ${
                          stockFilter === f.key
                            ? "bg-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))
                  ) : (
                    ASSET_FILTER_OPTIONS[assetClass].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors duration-150 ${
                          activeFilter === filter
                            ? "bg-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        {filter}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Loading state for non-stock data */}
              {(assetClass !== 'stocks' && assetLoading) ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-muted)] border-t-[var(--accent-primary)]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {currentMovers.map((mover) => (
                    <button
                      key={`${assetClass}-${moversTab}-${mover.ticker}`}
                      onClick={() => {
                        const prompts: Record<AssetClass, string> = {
                          stocks: `Analyze ${mover.ticker} \u2014 it's ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}% today at $${mover.price.toFixed(2)}. What's driving this move? Is there follow-through potential or is this a fade?`,
                          crypto: `Analyze ${mover.ticker} \u2014 it's ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}% today. What's driving the move in crypto?`,
                          forex: `Analyze ${mover.ticker.slice(0, 3)}/${mover.ticker.slice(3)} \u2014 the pair is ${mover.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(mover.changePercent).toFixed(2)}%. What's the macro driver?`,
                        }
                        openWithPrompt(mover.ticker, prompts[assetClass], 'morning', 'brief_action')
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] active:scale-[0.98] min-h-[44px]"
                    >
                      <div className="flex items-center gap-2 text-left">
                        {assetClass === 'stocks' ? (
                          <LogoImg symbol={mover.ticker} size={18} />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent-primary)]">
                            {assetClass === 'forex' ? mover.ticker.slice(0, 2) : mover.ticker.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                            {assetClass === 'forex' ? `${mover.ticker.slice(0, 3)}/${mover.ticker.slice(3)}` : mover.ticker}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                            {assetClass === 'forex'
                              ? mover.price.toFixed(4)
                              : mover.price < 1
                                ? `$${mover.price.toFixed(4)}`
                                : `$${mover.price.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                      <DataCell
                        value={`${mover.changePercent >= 0 ? "+" : ""}${mover.changePercent.toFixed(2)}`}
                        sentiment={mover.changePercent >= 0 ? 'positive' : 'negative'}
                        suffix="%"
                        size="sm"
                      />
                    </button>
                  ))}
                  {currentMovers.length === 0 && !moversLoading && !assetLoading && (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                      No {moversTab} in {assetClass === 'stocks' ? `${STOCK_FILTERS.find(f => f.key === stockFilter)?.label ?? 'All'}` : `${activeFilter}`} right now
                    </p>
                  )}
                </div>
              )}
            </PelicanCard>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Today's Playbook */}
          <motion.div variants={staggerItem}>
            <TodaysPlaybook
              economicEvents={economicEvents}
              economicLoading={economicLoading}
              onAnalyze={(ticker, prompt) => openWithPrompt(ticker, prompt, 'morning', 'brief_action')}
            />
          </motion.div>

          {/* Watchlist Radar */}
          <motion.div variants={staggerItem}>
            <WatchlistRadar
              watchlistItems={watchlistItems}
              quotes={quotes}
              onAnalyze={(ticker, prompt) => openWithPrompt(ticker, prompt, 'morning', 'brief_action')}
            />
          </motion.div>

          {/* Your Edge */}
          {behavioralInsights?.has_enough_data && (
            <motion.div variants={staggerItem}>
              <EdgeSummary
                insights={behavioralInsights}
                onAskPelican={(prompt) => openWithPrompt(null, prompt, 'morning', 'brief_action')}
                compact
              />
            </motion.div>
          )}

          {/* Risk Dashboard */}
          <motion.div variants={staggerItem}>
            <RiskDashboard
              openTrades={openTrades}
              closedTrades={closedTrades ?? []}
              quotes={quotes}
              onAnalyze={(ticker, prompt) => openWithPrompt(ticker, prompt, 'morning', 'brief_action')}
            />
          </motion.div>

          {/* News Headlines (placeholder) */}
          <motion.div variants={staggerItem}>
            <NewsHeadlines
              onAnalyze={(prompt) => openWithPrompt(null, prompt, 'morning', 'brief_action')}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Sector Mini Heatmap — full width below the grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-6"
      >
        <SectorMiniHeatmap
          sectors={sectors}
          onSectorClick={(sectorName) => {
            const sectorMap: Record<string, string> = {
              Technology: 'Information Technology',
              Financials: 'Financials',
              Healthcare: 'Health Care',
              Energy: 'Energy',
              'Consumer Discretionary': 'Consumer Discretionary',
              'Consumer Staples': 'Consumer Staples',
              Industrials: 'Industrials',
              Materials: 'Materials',
              'Real Estate': 'Real Estate',
              Utilities: 'Utilities',
              'Communication Services': 'Communication Services',
            }
            const mapped = sectorMap[sectorName] || sectorName
            router.push(`/heatmap?sector=${encodeURIComponent(mapped)}`)
          }}
        />
      </motion.div>

      {/* Footer disclaimer */}
      <p className="text-center text-xs text-[var(--text-disabled)] mt-8 pb-4">
        Market data may be delayed. Not financial advice.
      </p>
    </div>
  )
}
