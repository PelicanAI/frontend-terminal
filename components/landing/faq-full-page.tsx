'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CaretDown } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  title: string
  items: FAQItem[]
}

const faqData: FAQCategory[] = [
  {
    title: 'About Pelican',
    items: [
      {
        question: 'What is Pelican Trading?',
        answer: 'Pelican is an AI-powered trading intelligence platform that lets traders analyze markets, track trades, and get insights using plain English instead of code. Think of it as having an expert analyst available 24/7 who speaks your language.',
      },
      {
        question: 'Who is Pelican for?',
        answer: "Pelican is designed for traders of all levels who want institutional-grade market intelligence without the complexity. Whether you're a day trader, swing trader, or long-term investor, Pelican helps you make more informed decisions faster.",
      },
      {
        question: 'What makes Pelican different from other trading tools?',
        answer: 'Unlike traditional platforms that require coding skills or complex interfaces, Pelican uses natural language. Just ask questions like "What caused TSLA to drop yesterday?" or "Compare AAPL vs SPY last quarter" and get instant, actionable insights. One tool instead of 20 browser tabs.',
      },
      {
        question: 'What is the current status of Pelican?',
        answer: 'Pelican is currently in Beta. You can sign up at pelicantrading.ai to get early access and help shape the future of the platform.',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        question: 'What are Natural Language Queries?',
        answer: 'Ask questions in plain English and get instant answers. Examples: "What caused TSLA to drop yesterday?", "Compare AAPL vs SPY last quarter", "Show me the best performing tech stocks this month". No code, no complex syntax\u2014just ask.',
      },
      {
        question: 'How does Plain-English Backtesting work?',
        answer: 'Test trading ideas in seconds without writing a single line of code. Just describe your strategy: "Backtest momentum strategy on SPY, last 6 months" and Pelican returns comprehensive results including win rate, Sharpe ratio, max drawdown, and more.',
      },
      {
        question: 'What is Context Memory?',
        answer: "Pelican remembers your trading style, preferences, and past conversations. This means responses get more personalized over time, and you don't have to repeat yourself. It's like having an assistant who truly knows how you trade.",
      },
      {
        question: 'How does Pattern Detection work?',
        answer: "Pelican's AI continuously analyzes market data to find patterns and anomalies you might miss. It can identify trends, correlations, and unusual activity across thousands of tickers, giving you an edge in spotting opportunities.",
      },
    ],
  },
  {
    title: 'Data & Coverage',
    items: [
      {
        question: 'How many tickers does Pelican cover?',
        answer: 'Pelican provides data on 10,000+ tickers, covering a comprehensive range of tradeable instruments.',
      },
      {
        question: 'What asset classes are supported?',
        answer: "Pelican supports US stocks, Foreign Exchange (FX), and cryptocurrencies. Whether you trade stocks, FX, or crypto, we've got you covered.",
      },
      {
        question: 'Is the data real-time or delayed?',
        answer: 'Pelican provides both real-time and historical data. All subscribers get live data on 10,000+ tickers for up-to-the-minute market intelligence.',
      },
    ],
  },
  {
    title: 'Pricing',
    items: [
      {
        question: "How does Pelican's pricing work?",
        answer: 'Pelican uses a credit-based pricing system. Credits represent analytical workload\u2014simple queries cost fewer credits, complex analyses cost more. Credits reset monthly and do not roll over.',
      },
      {
        question: 'What are the subscription tiers?',
        answer: 'Three tiers: Base ($29/month, 1,000 credits) for exploration and learning, Pro ($99/month, 3,500 credits) for active traders, and Power ($249/month, 10,000 credits) for heavy and professional users.',
      },
      {
        question: 'How many credits do queries cost?',
        answer: 'It depends on complexity: Conversation/Mentoring costs 2 credits, Simple Price Checks cost 10 credits, Basic Analysis (RSI, MACD, comparisons) costs 25 credits, Event Studies cost 75 credits, and Multi-Day Tick Analysis or backtests cost 200 credits.',
      },
      {
        question: "What's included in all tiers?",
        answer: 'All tiers include: live data on 10,000+ tickers, plain-English backtesting, context memory across sessions, one-click shareable reports, and all new features as they ship. The only difference is credit allotment.',
      },
      {
        question: 'Is there a free tier or trial?',
        answer: 'Every new account gets 10 free questions to try Pelican before subscribing. No credit card required. After that, choose a plan that fits your trading style.',
      },
      {
        question: 'What happens if a query fails?',
        answer: 'System failures automatically refund your credits. We prioritize trust and fairness\u2014you only pay for successful analyses.',
      },
      {
        question: 'How does Pelican compare to Bloomberg or other terminals?',
        answer: 'Pelican is approximately 99% cheaper than institutional terminals. Bloomberg Terminal costs ~$24,000/year, Refinitiv Eikon ~$22,000/year, FactSet ~$12,000/year. Pelican ranges from $348\u2013$2,988/year while delivering institutional-grade reasoning through natural language.',
      },
    ],
  },
  {
    title: 'Languages & Accessibility',
    items: [
      {
        question: 'What languages does Pelican support?',
        answer: 'Pelican is available in 30+ languages including Chinese, Spanish, Japanese, Korean, French, German, Portuguese, Italian, Dutch, Russian, Turkish, Arabic, Polish, and many more. Trade in your native language.',
      },
    ],
  },
  {
    title: 'Team & Company',
    items: [
      {
        question: 'Who founded Pelican?',
        answer: 'Pelican was founded by Nick Groves, who serves as CEO. Nick brings 8 years of trading experience across futures, equities, FX, and crypto, with a background in crypto arbitrage.',
      },
      {
        question: 'Who else is on the team?',
        answer: "Raymond Campbell is the Senior Architect with 20+ years of experience. Raymond previously helped architect the NYSE ARCA electronic trading systems, bringing institutional-grade engineering to Pelican.",
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        question: 'How do I get help?',
        answer: 'You can use the chat widget on this site for quick questions about Pelican. For account issues, billing questions, bug reports, or anything else, email us at support@pelicantrading.ai.',
      },
      {
        question: 'What if I have a billing or account issue?',
        answer: 'For billing questions, payment issues, account access problems, or refund requests, please email support@pelicantrading.ai and our team will help you directly.',
      },
      {
        question: 'How do I report a bug?',
        answer: 'If you encounter a bug or technical issue with the platform, email support@pelicantrading.ai with details about what happened. Screenshots and steps to reproduce are always helpful!',
      },
    ],
  },
]

export function FAQFullPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <main className="pt-24 pb-16 overflow-x-hidden">
      <Section>
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Everything you need to know about Pelican Trading.
            </p>
          </div>
        </ScrollReveal>

        <div className="max-w-3xl mx-auto space-y-10">
          {faqData.map((category, catIndex) => (
            <ScrollReveal key={catIndex} delay={catIndex * 0.05}>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  {category.title}
                </h2>
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => {
                    const key = `${catIndex}-${itemIndex}`
                    const isOpen = openItems.has(key)

                    return (
                      <div
                        key={key}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(key)}
                          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-medium text-slate-800 text-left">
                            {item.question}
                          </span>
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 ml-4"
                          >
                            <CaretDown
                              weight="bold"
                              className="h-4 w-4 text-slate-400"
                            />
                          </motion.span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: [0.25, 0.1, 0.25, 1],
                              }}
                              className="overflow-hidden"
                            >
                              <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">
                                {item.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.4}>
          <div className="mt-16 text-center max-w-lg mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Our team is here to help. Reach out anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:support@pelicantrading.ai"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Email Support
              </a>
              <Link
                href="/auth/signup"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Start Trading Now
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </Section>
    </main>
  )
}
