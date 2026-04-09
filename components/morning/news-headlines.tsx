'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { News01Icon as Newspaper } from '@hugeicons/core-free-icons'
import { PelicanCard } from '@/components/ui/pelican'
import { cn } from '@/lib/utils'

// TAVILY INTEGRATION TODO:
// 1. Ray adds POST /api/tavily/search endpoint on Fly.io backend
// 2. Create /api/news/headlines route that:
//    a. Calls Tavily with query: "stock market news today"
//    b. Adds user's position tickers as context
//    c. Returns top 5 results with title, source, time, url
//    d. Optionally runs sentiment classification per headline
// 3. Replace empty headlines array with useSWR call to /api/news/headlines
// 4. Remove "Coming Soon" badge

interface NewsHeadline {
  title: string
  source: string
  time: string
  url: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  relatedTickers?: string[]
}

interface NewsHeadlinesProps {
  onAnalyze: (prompt: string) => void
}

const sentimentColor: Record<string, string> = {
  positive: 'var(--data-positive)',
  negative: 'var(--data-negative)',
  neutral: 'var(--data-neutral)',
}

export function NewsHeadlines({ onAnalyze }: NewsHeadlinesProps) {
  // TODO: Replace with useSWR('/api/news/headlines') once Tavily backend is live
  const headlines: NewsHeadline[] = []

  return (
    <PelicanCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Newspaper} size={20} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} color="currentColor" />
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Market News
          </h3>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          Coming Soon
        </span>
      </div>

      {headlines.length > 0 ? (
        <div className="flex flex-col gap-2">
          {headlines.map((headline, i) => (
            <button
              key={i}
              onClick={() =>
                onAnalyze(`Analyze this market news: "${headline.title}" — What does this mean for the market?`)
              }
              className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <p className="text-sm line-clamp-2 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                {headline.title}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sentimentColor[headline.sentiment ?? 'neutral'] }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{headline.source}</span>
                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {headline.time}
                </span>
              </div>
              {headline.relatedTickers && headline.relatedTickers.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {headline.relatedTickers.map((ticker) => (
                    <span
                      key={ticker}
                      className="rounded px-1.5 py-0.5 text-xs font-mono"
                      style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent-primary)' }}
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
          AI-powered news feed arriving soon. Pelican will surface the headlines that matter to your positions.
        </p>
      )}
    </PelicanCard>
  )
}
