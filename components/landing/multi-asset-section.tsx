'use client'

import {
  TrendUp,
  CurrencyCircleDollar,
  CurrencyBtc,
  ChartLine,
} from '@phosphor-icons/react'
import { ScrollReveal } from '@/components/landing/scroll-reveal'
import { Section } from '@/components/landing/section'

const assets = [
  {
    icon: TrendUp,
    title: 'Stocks',
    description: 'S&P 500 heatmap, earnings calendar, sector analysis',
    tickers: ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN'],
  },
  {
    icon: CurrencyCircleDollar,
    title: 'Forex',
    description: 'Session-aware briefs, DXY tracking, 19 pair heatmap',
    tickers: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  },
  {
    icon: CurrencyBtc,
    title: 'Crypto',
    description: '24/7 monitoring, BTC dominance, 24 token heatmap',
    tickers: ['BTC', 'ETH', 'SOL', 'DOGE'],
  },
  {
    icon: ChartLine,
    title: 'Futures',
    description: 'Globex sessions, contract tracking, economic calendar',
    tickers: ['ES', 'NQ', 'CL', 'GC', 'ZN'],
  },
]

export function MultiAssetSection() {
  return (
    <Section>
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Built for how you trade
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Tell Pelican what you trade. Everything adapts.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {assets.map((asset, i) => {
          const Icon = asset.icon
          return (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500/20 transition-colors">
                <Icon
                  className="h-7 w-7 text-blue-600 mb-3"
                  weight="duotone"
                />
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {asset.title}
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {asset.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {asset.tickers.map((ticker) => (
                    <span
                      key={ticker}
                      className="text-[10px] font-mono text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    </Section>
  )
}
