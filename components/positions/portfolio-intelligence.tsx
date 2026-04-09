'use client'

import { m } from 'framer-motion'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  BalanceScaleIcon as Scales,
  GitBranchIcon as GitBranch,
  PieChart01Icon as ChartDonut,
  SecurityWarningIcon as ShieldWarning,
  ShuffleIcon as Shuffle,
} from '@hugeicons/core-free-icons'
import { staggerContainer, staggerItem } from '@/components/ui/pelican'
import type { PortfolioPosition, PortfolioStats, RiskSummary } from '@/types/portfolio'

interface PortfolioIntelligenceProps {
  positions: PortfolioPosition[]
  portfolio: PortfolioStats
  risk: RiskSummary
  onSendMessage: (message: string) => void
}

interface IntelligenceCard {
  id: string
  icon: IconSvgElement
  title: string
  description: string
  buildPrompt: (
    positions: PortfolioPosition[],
    portfolio: PortfolioStats,
    risk: RiskSummary,
  ) => string
}

function formatPositionLine(position: PortfolioPosition): string {
  const parts = [
    `${position.ticker} (${position.direction.toUpperCase()})`,
    `Entry: $${position.entry_price}`,
    `Size: $${position.position_size_usd.toLocaleString()}`,
  ]
  if (position.stop_loss) parts.push(`Stop: $${position.stop_loss}`)
  if (position.take_profit) parts.push(`Target: $${position.take_profit}`)
  if (position.conviction) parts.push(`Conviction: ${position.conviction}/10`)
  parts.push(`Days held: ${position.days_held}`)
  return `- ${parts.join(' | ')}`
}

function buildPositionsList(positions: PortfolioPosition[]): string {
  return positions.map(formatPositionLine).join('\n')
}

const intelligenceCards: IntelligenceCard[] = [
  {
    id: 'full-review',
    icon: ChartDonut,
    title: 'Full Portfolio Review',
    description: 'Assess the open book as one system.',
    buildPrompt: (positions, portfolio) => {
      const list = buildPositionsList(positions)
      return `Review all my open positions as a portfolio:\n\n${list}\n\nTotal positions: ${portfolio.total_positions}\nTotal exposure: $${portfolio.total_exposure.toLocaleString()}\nLong exposure: $${portfolio.long_exposure.toLocaleString()}\nShort exposure: $${portfolio.short_exposure.toLocaleString()}\nNet exposure: $${portfolio.net_exposure.toLocaleString()}\n\nPlease provide:\n1. Overall portfolio assessment\n2. My top concern right now\n3. What I should prioritize today`
    },
  },
  {
    id: 'risk-assessment',
    icon: ShieldWarning,
    title: 'Risk Assessment',
    description: 'Stress-test the book against sharp downside.',
    buildPrompt: (positions, portfolio, risk) => {
      const list = buildPositionsList(positions)
      const longPct = portfolio.total_exposure > 0
        ? ((portfolio.long_exposure / portfolio.total_exposure) * 100).toFixed(1)
        : '0'
      return `Assess the risk across all my open positions:\n\n${list}\n\nTotal at risk: $${risk.total_risk_usd.toLocaleString()}\nPositions without stops: ${portfolio.positions_without_stop}\nNet exposure: ${longPct}% long\n\nAm I overexposed to any single direction or sector? What happens if the market drops 5%? 10%? What is my worst-case scenario?`
    },
  },
  {
    id: 'correlation',
    icon: GitBranch,
    title: 'Correlation Check',
    description: 'Find hidden overlap across names.',
    buildPrompt: (positions) => {
      const tickers = positions.map((position) => position.ticker).join(', ')
      return `Check correlations across my positions: ${tickers}.\n\nAre any of these highly correlated? If tech sells off, how many of my positions get hit? Am I actually diversified or just spread across correlated names?`
    },
  },
  {
    id: 'position-sizing',
    icon: Scales,
    title: 'Position Sizing',
    description: 'Check if any line item is outsized.',
    buildPrompt: (positions, portfolio) => {
      const list = positions
        .map(
          (position) =>
            `- ${position.ticker}: $${position.position_size_usd.toLocaleString()} (${((position.position_size_usd / portfolio.total_exposure) * 100).toFixed(1)}% of portfolio)`,
        )
        .join('\n')
      const avgSize = portfolio.total_exposure / portfolio.total_positions
      return `Review the sizing of my positions:\n\n${list}\n\nAverage position size: $${avgSize.toLocaleString()}\nTotal exposure: $${portfolio.total_exposure.toLocaleString()}\n\nAre any positions too large relative to my portfolio? Am I over-concentrated in anything? Suggest ideal sizing ratios.`
    },
  },
  {
    id: 'rebalance',
    icon: Shuffle,
    title: 'Rebalance Suggestions',
    description: 'Suggest trims, adds, and exits.',
    buildPrompt: (positions, portfolio, risk) => {
      const list = buildPositionsList(positions)
      return `Based on my current portfolio, suggest specific rebalancing actions:\n\n${list}\n\nTotal exposure: $${portfolio.total_exposure.toLocaleString()}\nPortfolio R:R ratio: ${risk.portfolio_rr_ratio?.toFixed(2) ?? 'N/A'}\nPositions without stops: ${portfolio.positions_without_stop}\n\nWhat should I trim? Add to? Exit entirely? Are there any gaps I should consider filling? Give me specific actions with reasoning.`
    },
  },
]

export function PortfolioIntelligence({
  positions,
  portfolio,
  risk,
  onSendMessage,
}: PortfolioIntelligenceProps) {
  return (
    <m.div
      className="border-b border-[var(--border-default)]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {intelligenceCards.map((card, index) => (
        <m.div
          key={card.id}
          variants={staggerItem}
          className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 py-2.5 ${index < intelligenceCards.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
        >
          <HugeiconsIcon icon={card.icon} size={15} className="mt-0.5 text-[var(--accent-primary)] opacity-60" strokeWidth={1.5} color="currentColor" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">{card.title}</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{card.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onSendMessage(card.buildPrompt(positions, portfolio, risk))}
            className="inline-flex min-h-11 items-center bg-transparent p-0 text-xs font-medium uppercase tracking-wider text-[var(--accent-primary)] transition-colors duration-150 cursor-pointer hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
          >
            Run
          </button>
        </m.div>
      ))}
    </m.div>
  )
}
