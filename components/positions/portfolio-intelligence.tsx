'use client'

import { motion } from 'framer-motion'
import {
  Lightning,
  ChartDonut,
  ShieldWarning,
  GitBranch,
  Scales,
  Shuffle,
} from '@phosphor-icons/react'
import { PelicanCard, staggerContainer, staggerItem } from '@/components/ui/pelican'
import type { PortfolioPosition, PortfolioStats, RiskSummary } from '@/types/portfolio'

interface PortfolioIntelligenceProps {
  positions: PortfolioPosition[]
  portfolio: PortfolioStats
  risk: RiskSummary
  onSendMessage: (message: string) => void
}

interface IntelligenceCard {
  id: string
  icon: React.ElementType
  title: string
  description: string
  buildPrompt: (
    positions: PortfolioPosition[],
    portfolio: PortfolioStats,
    risk: RiskSummary,
  ) => string
}

function formatPositionLine(p: PortfolioPosition): string {
  const parts = [
    `${p.ticker} (${p.direction.toUpperCase()})`,
    `Entry: $${p.entry_price}`,
    `Size: $${p.position_size_usd.toLocaleString()}`,
  ]
  if (p.stop_loss) parts.push(`Stop: $${p.stop_loss}`)
  if (p.take_profit) parts.push(`Target: $${p.take_profit}`)
  if (p.conviction) parts.push(`Conviction: ${p.conviction}/10`)
  parts.push(`Days held: ${p.days_held}`)
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
    description: 'Get a complete assessment of all open positions as a system',
    buildPrompt: (positions, portfolio) => {
      const list = buildPositionsList(positions)
      return `Review all my open positions as a portfolio:\n\n${list}\n\nTotal positions: ${portfolio.total_positions}\nTotal exposure: $${portfolio.total_exposure.toLocaleString()}\nLong exposure: $${portfolio.long_exposure.toLocaleString()}\nShort exposure: $${portfolio.short_exposure.toLocaleString()}\nNet exposure: $${portfolio.net_exposure.toLocaleString()}\n\nPlease provide:\n1. Overall portfolio assessment\n2. My top concern right now\n3. What I should prioritize today`
    },
  },
  {
    id: 'risk-assessment',
    icon: ShieldWarning,
    title: 'Risk Assessment',
    description: 'Stress-test your portfolio against market drops and black swans',
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
    description: 'Find hidden overlaps and concentration risks across tickers',
    buildPrompt: (positions) => {
      const tickers = positions.map((p) => p.ticker).join(', ')
      return `Check correlations across my positions: ${tickers}.\n\nAre any of these highly correlated? If tech sells off, how many of my positions get hit? Am I actually diversified or just spread across correlated names?`
    },
  },
  {
    id: 'position-sizing',
    icon: Scales,
    title: 'Position Sizing',
    description: 'Check if any positions are too large or under-allocated',
    buildPrompt: (positions, portfolio) => {
      const list = positions
        .map(
          (p) =>
            `- ${p.ticker}: $${p.position_size_usd.toLocaleString()} (${((p.position_size_usd / portfolio.total_exposure) * 100).toFixed(1)}% of portfolio)`,
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
    description: 'Get specific actions: what to trim, add to, or exit',
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
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Lightning size={20} weight="bold" className="text-[var(--accent-primary)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Portfolio Intelligence
        </h2>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Ask Pelican to analyze your positions as a system
      </p>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {intelligenceCards.map((card) => {
          const Icon = card.icon
          return (
            <motion.div key={card.id} variants={staggerItem}>
              <PelicanCard
                interactive
                className="p-4 cursor-pointer"
                onClick={() =>
                  onSendMessage(card.buildPrompt(positions, portfolio, risk))
                }
              >
                <Icon
                  size={24}
                  weight="regular"
                  className="text-[var(--accent-primary)] mb-3"
                />
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {card.description}
                </p>
              </PelicanCard>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
