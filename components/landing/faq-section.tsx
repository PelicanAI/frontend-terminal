'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

const faqs = [
  {
    question: 'How is this different from ChatGPT?',
    answer:
      "ChatGPT doesn't have live market data, doesn't know your positions, can't track your setups, and forgets everything between conversations. Pelican pulls real-time data from Polygon, remembers your entire trading history, and gets more personalized every day you use it.",
  },
  {
    question: 'What markets does Pelican support?',
    answer:
      'Stocks, forex, crypto, and futures. When you sign up, you tell Pelican what you trade and the entire platform adapts — heatmap views, session indicators, morning briefings, and suggested analysis all match your market.',
  },
  {
    question: 'Is my trading data secure?',
    answer:
      "Yes. Every table in the database has row-level security policies. Your trades, journal entries, and playbooks are only accessible to you. We don't sell your data or share it with third parties.",
  },
  {
    question: "What does 'credits' mean?",
    answer:
      'Each AI query uses credits based on complexity. Simple questions use fewer credits, deep analysis uses more. Your monthly plan includes a set number that refresh each billing cycle.',
  },
  {
    question: 'Can I import my existing trades?',
    answer:
      'Broker CSV import is on the roadmap. For now, you can log trades manually (takes about 15 seconds per trade) or log them directly from chat.',
  },
  {
    question: 'Do I need to be an experienced trader?',
    answer:
      "No. Pelican adapts to your level. Beginners get explained concepts and guided analysis. Advanced traders get technical depth and setup-specific coaching. Learning Mode highlights any term you don't recognize.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. No contracts, no cancellation fees. Your data stays accessible on the free tier if you downgrade.',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <Section id="faq">
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Questions?
          </h2>
        </div>
      </ScrollReveal>

      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <ScrollReveal key={i} delay={i * 0.05}>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium text-white/90 text-left">
                  {faq.question}
                </span>
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 ml-4"
                >
                  <CaretDown weight="bold" className="h-4 w-4 text-white/40" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-white/50 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  )
}
