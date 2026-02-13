'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/providers/translation-provider';
import MarketingNav from '@/components/marketing/MarketingNav';
import dynamic from 'next/dynamic';

const HelpChat = dynamic(() => import('@/components/marketing/HelpChat'), {
  ssr: false,
});
import SignUpButton from '@/components/marketing/SignUpButton';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: 'About Pelican',
    icon: '',
    items: [
      {
        question: 'What is Pelican Trading?',
        answer: 'Pelican is "Cursor for Traders" - an AI-powered trading intelligence platform that lets traders analyze markets, backtest strategies, and get insights using plain English instead of code. Think of it as having an expert analyst available 24/7 who speaks your language.',
      },
      {
        question: 'Who is Pelican for?',
        answer: 'Pelican is designed for traders of all levels who want institutional-grade market intelligence without the complexity. Whether you\'re a day trader, swing trader, or long-term investor, Pelican helps you make more informed decisions faster.',
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
    icon: '',
    items: [
      {
        question: 'What are Natural Language Queries?',
        answer: 'Ask questions in plain English and get instant answers. Examples: "What caused TSLA to drop yesterday?", "Compare AAPL vs SPY last quarter", "Show me the best performing tech stocks this month". No code, no complex syntax—just ask.',
      },
      {
        question: 'How does Plain-English Backtesting work?',
        answer: 'Test trading ideas in seconds without writing a single line of code. Just describe your strategy: "Backtest momentum strategy on SPY, last 6 months" and Pelican returns comprehensive results including win rate, Sharpe ratio, max drawdown, and more.',
      },
      {
        question: 'What is Context Memory?',
        answer: 'Pelican remembers your trading style, preferences, and past conversations. This means responses get more personalized over time, and you don\'t have to repeat yourself. It\'s like having an assistant who truly knows how you trade.',
      },
      {
        question: 'How does Pattern Detection work?',
        answer: 'Pelican\'s AI continuously analyzes market data to find patterns and anomalies you might miss. It can identify trends, correlations, and unusual activity across thousands of tickers, giving you an edge in spotting opportunities.',
      },
    ],
  },
  {
    title: 'Data & Coverage',
    icon: '',
    items: [
      {
        question: 'How many tickers does Pelican cover?',
        answer: 'Pelican provides data on 10,000+ tickers, covering a comprehensive range of tradeable instruments.',
      },
      {
        question: 'What asset classes are supported?',
        answer: 'Pelican supports US stocks, Foreign Exchange (FX), and cryptocurrencies. Whether you trade stocks, FX, or crypto, we\'ve got you covered.',
      },
      {
        question: 'Is the data real-time or delayed?',
        answer: 'Pelican provides both real-time and historical data. All subscribers get live data on 10,000+ tickers for up-to-the-minute market intelligence.',
      },
    ],
  },
  {
    title: 'Pricing',
    icon: '',
    items: [
      {
        question: 'How does Pelican\'s pricing work?',
        answer: 'Pelican uses a credit-based pricing system. Credits represent analytical workload—simple queries cost fewer credits, complex analyses cost more. Credits reset monthly and do not roll over.',
      },
      {
        question: 'What are the subscription tiers?',
        answer: 'Three tiers: Starter ($29/month, 1,000 credits) for exploration and learning, Pro ($99/month, 3,500 credits) for active traders, and Power ($249/month, 10,000 credits) for heavy and professional users.',
      },
      {
        question: 'How many credits do queries cost?',
        answer: 'It depends on complexity: Conversation/Mentoring costs 2 credits, Simple Price Checks cost 10 credits, Basic Analysis (RSI, MACD, comparisons) costs 25 credits, Event Studies cost 75 credits, and Multi-Day Tick Analysis or backtests cost 200 credits.',
      },
      {
        question: 'What\'s included in all tiers?',
        answer: 'All tiers include: live data on 10,000+ tickers, plain-English backtesting, context memory across sessions, one-click shareable reports, and all new features as they ship. The only difference is credit allotment.',
      },
      {
        question: 'Is there a free tier or trial?',
        answer: 'Every new account gets 10 free questions to try Pelican before subscribing. No credit card required. After that, choose a plan that fits your trading style.',
      },
      {
        question: 'What happens if a query fails?',
        answer: 'System failures automatically refund your credits. We prioritize trust and fairness—you only pay for successful analyses.',
      },
      {
        question: 'How does Pelican compare to Bloomberg or other terminals?',
        answer: 'Pelican is approximately 99% cheaper than institutional terminals. Bloomberg Terminal costs ~$24,000/year, Refinitiv Eikon ~$22,000/year, FactSet ~$12,000/year. Pelican ranges from $348–$2,988/year while delivering institutional-grade reasoning through natural language.',
      },
    ],
  },
  {
    title: 'Languages & Accessibility',
    icon: '',
    items: [
      {
        question: 'What languages does Pelican support?',
        answer: 'Pelican is available in 30+ languages including Chinese, Spanish, Japanese, Korean, French, German, Portuguese, Italian, Dutch, Russian, Turkish, Arabic, Polish, and many more. Trade in your native language.',
      },
    ],
  },
  {
    title: 'Team & Company',
    icon: '',
    items: [
      {
        question: 'Who founded Pelican?',
        answer: 'Pelican was founded by Nick Groves, who serves as CEO. Nick brings 8 years of trading experience across futures, equities, FX, and crypto, with a background in crypto arbitrage.',
      },
      {
        question: 'Who else is on the team?',
        answer: 'Raymond Campbell is the Senior Architect with 20+ years of experience. Raymond previously helped architect the NYSE ARCA electronic trading systems, bringing institutional-grade engineering to Pelican.',
      },
    ],
  },
  {
    title: 'Support',
    icon: '',
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
];

function FAQAccordion({ item, isOpen, onToggle, id }: { item: FAQItem; isOpen: boolean; onToggle: () => void; id: string }) {
  return (
    <div className="faq-item">
      <button
        className={`faq-question ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${id}`}
      >
        <span>{item.question}</span>
        <svg
          className={`faq-chevron ${isOpen ? 'open' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div id={`faq-answer-${id}`} className={`faq-answer ${isOpen ? 'open' : ''}`} role="region">
        <p>{item.answer}</p>
      </div>
    </div>
  );
}

export default function FAQPageContent() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const t = useT();

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const navLinks = [
    { href: '/#features', label: t.marketing.nav.features },
    { href: '/how-to-use', label: 'How to Use' },
    { href: '/#pricing', label: t.marketing.nav.pricing },
    { href: '/faq', label: t.marketing.nav.faq, active: true },
  ];

  return (
    <>
      <div className="grid-bg"></div>

      <MarketingNav
        links={navLinks}
        ctaLabel={t.marketing.nav.getStarted}
        ctaAction="login"
        mobileNavId="faq-mobile-nav"
      />

      <main id="main-content" className="faq-page">
        <div className="faq-container">
          <header className="faq-header">
            <div className="faq-tag">{t.marketing.faq.helpCenter}</div>
            <h1>
              {t.marketing.faq.title} <span className="highlight">{t.marketing.faq.titleHighlight}</span>
            </h1>
            <p>
              {t.marketing.faq.subtitle}
            </p>
          </header>

          {faqData.map((category, catIndex) => (
            <section key={catIndex} className="faq-category">
              <div className="faq-category-header">
                {category.icon && <span className="faq-category-icon">{category.icon}</span>}
                <h2 className="faq-category-title">{category.title}</h2>
              </div>
              {category.items.map((item, itemIndex) => {
                const key = `${catIndex}-${itemIndex}`;
                return (
                  <FAQAccordion
                    key={key}
                    item={item}
                    isOpen={openItems.has(key)}
                    onToggle={() => toggleItem(key)}
                    id={key}
                  />
                );
              })}
            </section>
          ))}

          <div className="faq-cta">
            <h3>{t.marketing.faq.stillHaveQuestions}</h3>
            <p>{t.marketing.faq.teamHere}</p>
            <div className="faq-cta-buttons">
              <a href="mailto:support@pelicantrading.ai" className="btn-secondary">
                {t.marketing.faq.emailSupport}
              </a>
              <SignUpButton className="btn-primary">
                {t.marketing.faq.startTradingNow}
              </SignUpButton>
            </div>
          </div>
        </div>
      </main>

      <footer className="faq-footer">
        <p>
          {t.marketing.footer.copyright} <Link href="/">{t.marketing.nav.backToHome}</Link> | <Link href="/terms">Terms of Use</Link>
        </p>
      </footer>

      <HelpChat logoUrl="/pelican-logo-transparent.webp" />
    </>
  );
}
