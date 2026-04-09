import { Metadata } from "next"
import { GuideHero } from "@/components/guide/guide-hero"
import { GuideSection } from "@/components/guide/guide-section"
import { PromptExample } from "@/components/guide/prompt-example"
import { GuideCTA } from "@/components/guide/guide-cta"

export const metadata: Metadata = {
  title: "Best Practices Guide | Pelican AI",
  description:
    "Get the most from your AI trading co-pilot. Morning routines, smarter prompts, trade tracking, and market intelligence.",
  openGraph: {
    title: "Best Practices Guide | Pelican AI",
    description:
      "Get the most from your AI trading co-pilot. Morning routines, smarter prompts, trade tracking, and market intelligence.",
    url: "https://pelicantrading.ai/guide",
    siteName: "Pelican Trading",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Practices Guide | Pelican AI",
    description:
      "Get the most from your AI trading co-pilot. Morning routines, smarter prompts, trade tracking, and market intelligence.",
  },
}

const PROMPT_TEMPLATES = [
  {
    want: "Trade idea validation",
    prompt:
      '"I\'m considering going long {TICKER} at {PRICE} because {THESIS}. What am I missing?"',
  },
  {
    want: "Risk assessment",
    prompt:
      '"I have {N} positions, all in tech. How correlated is my portfolio if NASDAQ drops 5%?"',
  },
  {
    want: "Post-trade review",
    prompt:
      '"I just closed {TICKER} for a {WIN/LOSS}. What should I have done differently?"',
  },
  {
    want: "Market context",
    prompt:
      '"Why is {TICKER} down 8%? Sector-wide, company-specific, or macro?"',
  },
  {
    want: "Options analysis",
    prompt:
      '"Selling covered calls on {TICKER}. What strike/expiration given current IV?"',
  },
  {
    want: "Pattern recognition",
    prompt:
      '"Historical pattern for {TICKER} after earnings beats? Gap up and fade, or run?"',
  },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <GuideHero />

        <div className="space-y-20 mt-16">
          {/* Section 1: Morning Routine */}
          <GuideSection
            id="morning-routine"
            title="Morning Routine"
            hook="Most traders waste 30 minutes every morning checking 6 different apps. Here's your 5-minute morning scan."
            cta={{
              label: "Try it now → Go to your Daily Brief",
              href: "/morning",
            }}
          >
            <p>
              <strong>Step 1 — Check the Daily Brief</strong>
            </p>
            <p>
              Open the Brief page first thing. In one glance you see your open
              positions and how they moved overnight, today&apos;s economic events
              and when they drop, which market sessions are open right now, top
              gaining and losing stocks, and market sentiment.
            </p>
            <p>
              The Brief replaces your morning routine of checking CNBC, Yahoo
              Finance, the economic calendar, and your broker app. It&apos;s all
              here.
            </p>

            <p>
              <strong>Step 2 — Scan Your Positions</strong>
            </p>
            <p>
              Your open positions on the Brief page show live P&amp;L. Check for
              positions approaching your target or stop, outsized winners you
              might want to trim, and anything that moved significantly
              overnight.
            </p>
            <p>
              If a position catches your eye, click it to ask Pelican for a
              deeper read.
            </p>

            <p>
              <strong>Step 3 — Check the Earnings Calendar</strong>
            </p>
            <p>
              See who&apos;s reporting today and this week. If any of your positions
              have earnings coming, Pelican can preview what to watch for.
            </p>
            <p>
              Click any company on the calendar — Pelican gives you an instant
              earnings preview with EPS estimates, revenue expectations, and what
              the market is pricing in.
            </p>
          </GuideSection>

          {/* Section 2: Smarter Prompts */}
          <GuideSection
            id="smarter-prompts"
            title="Smarter Prompts"
            hook="Pelican gets dramatically better when you give it context. Here's the difference between a $1 question and a $100 question."
            cta={{
              label: "Try a power prompt → Go to Chat",
              href: "/chat",
            }}
          >
            <PromptExample
              bad="What do you think about NVDA?"
              good="I'm looking at NVDA for a swing trade. I'm bullish on the AI infrastructure buildout thesis. The daily chart shows it consolidating above the 50 SMA after earnings. What are the key levels to watch, and where would you set a stop and target for a long entry here?"
            />

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-elevated)]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      What You Want
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Try This
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PROMPT_TEMPLATES.map((row, i) => (
                    <tr
                      key={row.want}
                      className={
                        i % 2 === 1
                          ? "bg-[rgba(255,255,255,0.02)]"
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap">
                        {row.want}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                        {row.prompt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              <strong>Ask follow-ups.</strong> Pelican remembers the full
              conversation. After an analysis, ask &quot;What&apos;s the bear case?&quot; or
              &quot;What if CPI comes in hot?&quot;
            </p>
            <p>
              <strong>Reference your positions.</strong> &quot;Given my open NVDA
              long, should I hedge with puts or reduce size?&quot;
            </p>
            <p>
              <strong>Ask for specifics.</strong> &quot;Give me exact entry, stop, and
              target levels&quot; beats &quot;what do you think?&quot;
            </p>
          </GuideSection>

          {/* Section 3: Track & Improve */}
          <GuideSection
            id="track-improve"
            title="Track & Improve"
            hook="The traders who improve fastest are the ones who track every trade. Pelican makes it painless."
            cta={{
              label: "Log your first trade → Go to Portfolio",
              href: "/portfolio?tab=history",
            }}
          >
            <p>
              <strong>Log every trade</strong>
            </p>
            <p>
              When you enter a position, log it in Pelican. Takes 30 seconds:
              ticker, direction, entry price, stop loss, take profit, your
              thesis, conviction level, and setup tags.
            </p>
            <p>
              Your thesis is the most valuable field. When you review losing
              trades later, the thesis tells you whether your analysis was wrong
              or your execution was wrong. That&apos;s how you improve.
            </p>

            <p>
              <strong>Close trades with context</strong>
            </p>
            <p>
              When you exit, close the trade in Pelican and add notes on what
              happened and what mistakes you made. Pelican calculates your
              P&amp;L, R-multiple, and win rate automatically.
            </p>

            <p>
              <strong>Use Pelican Scan</strong>
            </p>
            <p>
              Hit the SCAN button next to any open position. Pelican reviews
              your trade with full context — entry, stop, target, thesis,
              current price — and gives you an updated read. Do this at least
              once a week per position.
            </p>

            <p>
              <strong>Review your dashboard</strong>
            </p>
            <p>
              Your Positions dashboard shows portfolio allocation, P&amp;L by
              position, risk concentration warnings, win rate, equity curve, and
              drawdown. Check it weekly. Look for patterns: are you better at
              longs or shorts? Do you cut winners too early? Do Fridays
              consistently hurt you?
            </p>
          </GuideSection>

          {/* Section 4: Market Intel */}
          <GuideSection
            id="market-intel"
            title="Market Intel"
            hook="Pelican gives you institutional-grade market awareness without the Bloomberg terminal."
            cta={{
              label: "Explore the market → Go to Heatmap",
              href: "/heatmap",
            }}
          >
            <p>
              <strong>The Heatmap</strong>
            </p>
            <p>
              The S&amp;P 500 heatmap shows you the entire market in one view.
              Green is up, red is down, size is market cap. In 3 seconds you
              know whether money is flowing into tech or out of it, which
              sectors are leading, and whether this is a broad rally or narrow.
            </p>
            <p>
              Click any stock on the heatmap — Pelican instantly analyzes why
              it&apos;s moving and whether it matters for your portfolio.
            </p>

            <p>
              <strong>The Correlation Page</strong>
            </p>
            <p>
              See how assets move relative to each other. If you hold NVDA and
              AVGO and they&apos;re 0.87 correlated, you&apos;re essentially running
              double the semiconductor risk. The correlation matrix helps you
              diversify intelligently.
            </p>
          </GuideSection>

          {/* Section 5: Earnings Edge */}
          <GuideSection
            id="earnings-edge"
            title="Earnings Edge"
            hook="Earnings season is where careers are made and accounts are blown. Here's how to prepare."
            cta={{
              label: "Check this week's earnings → Go to Earnings",
              href: "/earnings",
            }}
          >
            <p>
              <strong>Before earnings:</strong> Check the Earnings Calendar to
              see when your holdings report. Click any company for an earnings
              preview: EPS estimate, revenue estimate, key things to watch, and
              how the stock reacted to recent quarters.
            </p>
            <p>
              <strong>During earnings:</strong> Ask Pelican what just happened.
              Beat or miss? How&apos;s the stock reacting after hours?
            </p>
            <p>
              <strong>After earnings:</strong> Log the trade outcome. Ask
              Pelican to review: &quot;I went long into earnings and it dropped 8%
              despite beating estimates. What went wrong?&quot;
            </p>
          </GuideSection>

          {/* Section 6: Learn as You Go */}
          <GuideSection
            id="learn"
            title="Learn as You Go"
            hook="Don't know what RSI means? Good. Turn on Learning Mode."
            cta={{
              label: "Turn on Learning Mode → Go to Chat",
              href: "/chat",
            }}
          >
            <p>
              <strong>Learning Mode</strong> — Toggle it in the chat header
              (graduation cap icon). Every trading term Pelican uses gets
              highlighted. Hover for the definition. Click to open the Learn
              panel for a deeper explanation.
            </p>
            <p>
              You don&apos;t need to understand everything before you start.
              Learning Mode lets you learn in context — when the term actually
              matters for your trade, not in a textbook.
            </p>
          </GuideSection>

          {/* Section 7: Pro Tips */}
          <GuideSection
            id="pro-tips"
            title="Pro Tips"
            hook="Things power users do that casual users don't."
          >
            <div className="space-y-4">
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <p>
                  <strong>Build playbooks.</strong> If you have a repeatable
                  setup, save it as a playbook in the Journal. Tag trades to it.
                  Over time you see your actual win rate per setup.
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <p>
                  <strong>Use the watchlist strategically.</strong> Add tickers
                  from conversations. When you ask about a stock but aren&apos;t
                  ready to trade, watch it. The Daily Brief tracks it for you.
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <p>
                  <strong>Ask Pelican to critique you.</strong> &quot;Look at my last
                  10 trades and tell me what patterns you see. Am I cutting
                  winners too early? Be brutally honest.&quot;
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <p>
                  <strong>
                    Check correlations before adding positions.
                  </strong>{" "}
                  Before entering a new trade, ask how correlated it is with
                  your existing positions.
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <p>
                  <strong>Review your best trades too.</strong> Traders obsess
                  over losses but rarely study wins. Ask Pelican what you did
                  right.
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <p>
                  <strong>The daily flow:</strong> Daily Brief → check
                  positions with concerns → chat for deeper analysis → adjust
                  positions. Takes 10-15 minutes.
                </p>
              </div>
            </div>
          </GuideSection>
        </div>

        <GuideCTA />
      </div>
    </div>
  )
}
