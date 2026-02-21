import { Trade } from '@/hooks/use-trades'
import { TradeStats } from '@/hooks/use-trade-stats'
import { Quote } from '@/hooks/use-live-quotes'

// ─── Types ──────────────────────────────────────────────

export interface QuickStats {
  totalExposure: number
  openPnl: number
  openPnlPercent: number
  winRate: number
  totalClosedTrades: number
  bestTradePnl: number
  worstTradePnl: number
}

export interface AllocationSlice {
  label: string
  value: number
  percent: number
  color: string
  ticker?: string
  tradeId?: string
}

export interface ExposureBreakdown {
  longExposure: number
  shortExposure: number
  netExposure: number
  netDirection: 'long' | 'short' | 'neutral'
}

export interface PositionPnlBar {
  ticker: string
  tradeId: string
  pnlAmount: number
  pnlPercent: number
  direction: string
  color: string
}

export interface RiskInsight {
  id: string
  severity: 'good' | 'warning' | 'critical'
  title: string
  description: string
}

export type AllocationView = 'ticker' | 'asset_type'

// ─── Position Size ──────────────────────────────────────

export function getPositionSize(trade: Trade): number {
  if (trade.quantity && trade.entry_price) {
    return Number(trade.quantity) * Number(trade.entry_price)
  }
  return 0
}

// ─── Open P&L ───────────────────────────────────────────
// Matches the formula in trades-table.tsx getUnrealizedPnL

export function getTradeOpenPnl(
  trade: Trade,
  quotes: Record<string, Quote>,
): { pnlAmount: number; pnlPercent: number } {
  // Closed trades: use stored values
  if (trade.status === 'closed' && trade.pnl_amount != null) {
    return {
      pnlAmount: Number(trade.pnl_amount),
      pnlPercent: Number(trade.pnl_percent || 0),
    }
  }

  // Open trades: calculate from live quotes
  if (trade.status === 'open') {
    const quote = quotes[trade.ticker]
    if (!quote) return { pnlAmount: 0, pnlPercent: 0 }

    const currentPrice = quote.price
    const direction = trade.direction === 'long' ? 1 : -1
    const pnlAmount = (currentPrice - trade.entry_price) * trade.quantity * direction
    const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100 * direction

    return { pnlAmount, pnlPercent }
  }

  return { pnlAmount: 0, pnlPercent: 0 }
}

// ─── Quick Stats ────────────────────────────────────────

export function calculateQuickStats(
  openTrades: Trade[],
  quotes: Record<string, Quote>,
  tradeStats: TradeStats | null,
): QuickStats {
  const totalExposure = openTrades.reduce(
    (sum, t) => sum + getPositionSize(t),
    0,
  )

  const openPnlData = openTrades.map((t) => getTradeOpenPnl(t, quotes))
  const openPnl = openPnlData.reduce((sum, p) => sum + p.pnlAmount, 0)
  const openPnlPercent = totalExposure > 0 ? (openPnl / totalExposure) * 100 : 0

  const winRate = tradeStats?.win_rate ?? 0
  const totalClosedTrades = tradeStats?.closed_trades ?? 0

  let bestTradePnl = tradeStats?.largest_win ?? 0
  let worstTradePnl = tradeStats?.largest_loss ?? 0

  if (totalClosedTrades === 0 && openPnlData.length > 0) {
    bestTradePnl = Math.max(...openPnlData.map((p) => p.pnlAmount))
    worstTradePnl = Math.min(...openPnlData.map((p) => p.pnlAmount))
  }

  return {
    totalExposure,
    openPnl,
    openPnlPercent,
    winRate,
    totalClosedTrades,
    bestTradePnl,
    worstTradePnl,
  }
}

// ─── Allocation ─────────────────────────────────────────

const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: 'hsl(217, 70%, 55%)',
  option: 'hsl(280, 65%, 55%)',
  future: 'hsl(35, 80%, 55%)',
  forex: 'hsl(160, 60%, 45%)',
  crypto: 'hsl(40, 90%, 55%)',
  etf: 'hsl(200, 60%, 50%)',
  other: 'hsl(0, 0%, 50%)',
}

const TICKER_COLORS = [
  'hsl(217, 70%, 55%)',
  'hsl(142, 60%, 45%)',
  'hsl(280, 65%, 55%)',
  'hsl(35, 80%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(350, 65%, 55%)',
  'hsl(200, 60%, 50%)',
  'hsl(40, 90%, 55%)',
  'hsl(100, 50%, 45%)',
  'hsl(320, 60%, 55%)',
]

export function calculateAllocation(
  openTrades: Trade[],
  view: AllocationView,
): AllocationSlice[] {
  const totalExposure = openTrades.reduce(
    (sum, t) => sum + getPositionSize(t),
    0,
  )

  if (totalExposure === 0) return []

  if (view === 'ticker') {
    return openTrades
      .map((t, i) => ({
        label: t.ticker,
        value: getPositionSize(t),
        percent: (getPositionSize(t) / totalExposure) * 100,
        color: TICKER_COLORS[i % TICKER_COLORS.length] ?? 'hsl(0, 0%, 50%)',
        ticker: t.ticker,
        tradeId: t.id,
      }))
      .sort((a, b) => b.value - a.value)
  }

  // Group by asset_type
  const groups = new Map<string, number>()
  for (const t of openTrades) {
    const type = t.asset_type || 'other'
    groups.set(type, (groups.get(type) || 0) + getPositionSize(t))
  }

  return Array.from(groups.entries())
    .map(([type, value]) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value,
      percent: (value / totalExposure) * 100,
      color: ASSET_TYPE_COLORS[type] ?? ASSET_TYPE_COLORS.other ?? 'hsl(0, 0%, 50%)',
    }))
    .sort((a, b) => b.value - a.value)
}

// ─── Exposure ───────────────────────────────────────────

export function calculateExposure(openTrades: Trade[]): ExposureBreakdown {
  let longExposure = 0
  let shortExposure = 0

  for (const t of openTrades) {
    const size = getPositionSize(t)
    if (t.direction === 'long') longExposure += size
    else if (t.direction === 'short') shortExposure += size
  }

  const netExposure = longExposure - shortExposure

  return {
    longExposure,
    shortExposure,
    netExposure: Math.abs(netExposure),
    netDirection: netExposure > 0 ? 'long' : netExposure < 0 ? 'short' : 'neutral',
  }
}

// ─── P&L Bars ───────────────────────────────────────────

export function calculatePnlBars(
  openTrades: Trade[],
  quotes: Record<string, Quote>,
): PositionPnlBar[] {
  return openTrades
    .map((t) => {
      const { pnlAmount, pnlPercent } = getTradeOpenPnl(t, quotes)
      return {
        ticker: t.ticker,
        tradeId: t.id,
        pnlAmount,
        pnlPercent,
        direction: t.direction,
        color: pnlAmount >= 0 ? 'var(--data-positive)' : 'var(--data-negative)',
      }
    })
    .sort((a, b) => b.pnlAmount - a.pnlAmount)
}

// ─── Risk Insights ──────────────────────────────────────

export function generateRiskInsights(openTrades: Trade[]): RiskInsight[] {
  const insights: RiskInsight[] = []

  if (openTrades.length === 0) return insights

  const totalExposure = openTrades.reduce(
    (sum, t) => sum + getPositionSize(t),
    0,
  )

  // Concentration check
  for (const t of openTrades) {
    const size = getPositionSize(t)
    const pct = totalExposure > 0 ? (size / totalExposure) * 100 : 0
    if (pct > 40) {
      insights.push({
        id: `concentration-critical-${t.ticker}`,
        severity: 'critical',
        title: `${t.ticker} is ${pct.toFixed(0)}% of portfolio`,
        description: 'Single position concentration above 40%. Consider reducing or hedging.',
      })
    } else if (pct > 25) {
      insights.push({
        id: `concentration-warn-${t.ticker}`,
        severity: 'warning',
        title: `${t.ticker} is ${pct.toFixed(0)}% of portfolio`,
        description: 'Large single position. Monitor closely.',
      })
    }
  }

  // Asset type diversification
  const assetTypes = new Set(openTrades.map((t) => t.asset_type))
  if (assetTypes.size === 1 && openTrades.length > 1) {
    const type = openTrades[0]?.asset_type ?? 'stock'
    insights.push({
      id: 'asset-type-single',
      severity: 'warning',
      title: `All positions are ${type}s`,
      description: 'No asset class diversification. Consider exposure across stocks, crypto, or forex.',
    })
  }

  // Directional concentration
  const directions = new Set(openTrades.map((t) => t.direction))
  if (directions.size === 1 && openTrades.length > 1) {
    const dir = openTrades[0]?.direction ?? 'long'
    insights.push({
      id: 'direction-single',
      severity: 'warning',
      title: `All positions are ${dir}`,
      description: `No directional hedge. A broad market move ${dir === 'long' ? 'down' : 'up'} hits everything.`,
    })
  }

  // Tech concentration
  const techTickers = new Set([
    'NVDA', 'AAPL', 'MSFT', 'GOOG', 'GOOGL', 'META', 'AMZN',
    'TSLA', 'AMD', 'AVGO', 'INTC', 'CRM', 'NFLX',
  ])
  const userTechPositions = openTrades.filter((t) =>
    techTickers.has(t.ticker.toUpperCase()),
  )
  if (userTechPositions.length >= 2) {
    const techExposure = userTechPositions.reduce(
      (s, t) => s + getPositionSize(t),
      0,
    )
    const techPct = totalExposure > 0
      ? (techExposure / totalExposure) * 100
      : 0
    if (techPct > 50) {
      insights.push({
        id: 'sector-tech-heavy',
        severity: 'warning',
        title: `${techPct.toFixed(0)}% in tech`,
        description: `${userTechPositions.map((t) => t.ticker).join(', ')} are highly correlated. Semiconductor downturns or rate hikes hit them all.`,
      })
    }
  }

  // Energy concentration
  const energyTickers = new Set([
    'XOM', 'CVX', 'COP', 'SLB', 'OXY', 'EOG', 'MPC', 'PSX', 'VLO', 'XLE', 'USO',
  ])
  const userEnergyPositions = openTrades.filter((t) =>
    energyTickers.has(t.ticker.toUpperCase()),
  )
  if (userEnergyPositions.length >= 2) {
    const energyExposure = userEnergyPositions.reduce(
      (s, t) => s + getPositionSize(t),
      0,
    )
    const energyPct = totalExposure > 0
      ? (energyExposure / totalExposure) * 100
      : 0
    if (energyPct > 40) {
      insights.push({
        id: 'sector-energy-heavy',
        severity: 'warning',
        title: `${energyPct.toFixed(0)}% in energy`,
        description: `${userEnergyPositions.map((t) => t.ticker).join(', ')} move together. Oil price drops hit the whole cluster.`,
      })
    }
  }

  // Crypto concentration
  const cryptoPositions = openTrades.filter((t) => t.asset_type === 'crypto')
  if (cryptoPositions.length >= 2) {
    const cryptoExposure = cryptoPositions.reduce(
      (s, t) => s + getPositionSize(t),
      0,
    )
    const cryptoPct = totalExposure > 0
      ? (cryptoExposure / totalExposure) * 100
      : 0
    if (cryptoPct > 30) {
      insights.push({
        id: 'sector-crypto-heavy',
        severity: 'warning',
        title: `${cryptoPct.toFixed(0)}% in crypto`,
        description: 'Crypto assets are highly correlated. BTC drawdowns typically drag everything down 60-80%.',
      })
    }
  }

  // Stop loss coverage
  const tradesWithoutStops = openTrades.filter((t) => t.stop_loss == null)

  if (tradesWithoutStops.length === 0 && openTrades.length > 0) {
    insights.push({
      id: 'stops-all-set',
      severity: 'good',
      title: 'All positions have stop losses',
      description: `${openTrades.length} of ${openTrades.length} positions protected.`,
    })
  } else if (tradesWithoutStops.length > 0) {
    const tickers = tradesWithoutStops.map((t) => t.ticker).join(', ')
    insights.push({
      id: 'stops-missing',
      severity: tradesWithoutStops.length > openTrades.length / 2 ? 'critical' : 'warning',
      title: `${tradesWithoutStops.length} position${tradesWithoutStops.length > 1 ? 's' : ''} without stop loss`,
      description: `${tickers} ${tradesWithoutStops.length > 1 ? 'have' : 'has'} no stop loss defined. Unlimited downside risk.`,
    })
  }

  // All clear
  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      severity: 'good',
      title: 'Portfolio health looks solid',
      description: 'Good diversification, reasonable position sizing, stop losses set.',
    })
  }

  // Sort: critical first, then warning, then good
  const order = { critical: 0, warning: 1, good: 2 }
  return insights.sort((a, b) => order[a.severity] - order[b.severity])
}

// ─── Formatters ─────────────────────────────────────────

const dollarFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dollarFmtPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatDollar(value: number, precise = false): string {
  return precise ? dollarFmtPrecise.format(value) : dollarFmt.format(value)
}

export function formatDollarSigned(value: number, precise = false): string {
  const formatted = precise ? dollarFmtPrecise.format(Math.abs(value)) : dollarFmt.format(Math.abs(value))
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

import { formatPercent as _formatPercent } from '@/lib/formatters'

/** Positions use 1 decimal for percent display */
export const formatPercent = (value: number) => _formatPercent(value, 1)

export function formatCompactDollar(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}
