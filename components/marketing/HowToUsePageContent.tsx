'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/providers/translation-provider';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import ScrollAnimationObserver from '@/components/marketing/ScrollAnimationObserver';
import SignUpButton from '@/components/marketing/SignUpButton';
import DemoCard from '@/components/how-to-use/DemoCard';
import dynamic from 'next/dynamic';

const HelpChat = dynamic(() => import('@/components/marketing/HelpChat'), {
  ssr: false,
});

const traderDemos = [
  {
    skillLevel: 'beginner' as const,
    title: 'Natural Language Scanning',
    description:
      'Ask Pelican to find stocks in plain English. No complex screener setup, no syntax to learn — just describe what you\'re looking for.',
    examplePrompt: 'Show me stocks getting hammered today',
    features: ['Plain English', 'Instant Results', 'No Setup Required'],
    demoSrc: '/demos/how-to-use/trader-beginner.html',
  },
  {
    skillLevel: 'intermediate' as const,
    title: 'Multi-Filter Stock Scanning',
    description:
      'Combine multiple criteria in a single query. Price, volume, percentage moves, VWAP — stack as many filters as you need.',
    examplePrompt:
      'Show me US stocks down at least -3% today trading above $20 and trading at least 1.8x their normal volume',
    features: ['Multiple Filters', 'Volume Analysis', 'Real-Time Data'],
    demoSrc: '/demos/how-to-use/trader-intermediate.html',
  },
  {
    skillLevel: 'advanced' as const,
    title: 'Custom Backtesting',
    description:
      'Run sophisticated backtests with tick data, custom indicators, and full statistical output. Get results in seconds, not hours.',
    examplePrompt:
      'Backtest AAPL with 20-trade rolling EMA on tick data. Return P&L, win rate, max drawdown, and sensitivity analysis.',
    features: ['Tick Data', 'Custom Indicators', 'Statistical Output'],
    demoSrc: '/demos/how-to-use/trader-advanced.html',
  },
];

const investorDemos = [
  {
    skillLevel: 'beginner' as const,
    title: 'Understand Any Company',
    description:
      'Get clear, jargon-free explanations of what a company does, how it makes money, and why it\'s in the news.',
    examplePrompt: 'What does NVIDIA do and why is everyone talking about it?',
    features: ['Plain English', 'Business Model', 'Context'],
    demoSrc: '/demos/how-to-use/investor-beginner.html',
  },
  {
    skillLevel: 'intermediate' as const,
    title: 'Historical Analysis',
    description:
      'Query historical events, price patterns, and market milestones instantly. Years of data at your fingertips.',
    examplePrompt: 'How many All Time Highs did AAPL have in 2021?',
    features: ['Historical Data', 'Pattern Recognition', 'Quick Answers'],
    demoSrc: '/demos/how-to-use/investor-intermediate.html',
  },
  {
    skillLevel: 'advanced' as const,
    title: 'Cross-Ticker Analysis',
    description:
      'Analyze relationships between stocks, compare performance around events, and uncover correlations that take hours to find manually.',
    examplePrompt:
      "Show me all 27 dates when AAPL hit ATHs in 2021 with MSFT's 5-day return for each",
    features: ['Multi-Ticker', 'Event Correlation', 'Deep Analysis'],
    demoSrc: '/demos/how-to-use/investor-advanced.html',
  },
];

export default function HowToUsePageContent() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'traders' | 'investors'>('traders');

  const navLinks = [
    { href: '/#features', label: t.marketing.nav.features },
    { href: '/how-to-use', label: 'How to Use', active: true },
    { href: '/#team', label: t.marketing.nav.team },
    { href: '/#pricing', label: t.marketing.nav.pricing },
    { href: '/faq', label: t.marketing.nav.faq },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeTab]);

  const currentDemos = activeTab === 'traders' ? traderDemos : investorDemos;
  const handleTabChange = (tab: 'traders' | 'investors') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  return (
    <div id="main-content" className="how-to-use-page">
      <ScrollAnimationObserver dep={activeTab} />
      <div className="grid-bg"></div>

      <MarketingNav links={navLinks} ctaAction="login" />

      {/* Hero Section */}
      <section className="how-to-use-hero">
        <div className="section-inner">
          <div className="hero-content animate-on-scroll" style={{ textAlign: 'center' }}>
            <div className="section-tag">{'// TUTORIALS'}</div>
            <h1 className="section-title">See Pelican in Action</h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.25rem',
                maxWidth: '700px',
                margin: '1.5rem auto 0',
                lineHeight: 1.7,
              }}
            >
              Watch how Pelican transforms complex market questions into instant insights.
            </p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="tabs-section">
        <div className="section-inner">
          <div className="tabs-container animate-on-scroll">
            <button
              className={`tab-button ${activeTab === 'traders' ? 'active' : ''}`}
              onClick={() => handleTabChange('traders')}
            >
              For Traders
            </button>
            <button
              className={`tab-button ${activeTab === 'investors' ? 'active' : ''}`}
              onClick={() => handleTabChange('investors')}
            >
              For Investors
            </button>
          </div>
        </div>
      </section>

      {/* Demo Sections */}
      <section className="demos-section">
        <div className="section-inner">
          <div className="demos-container">
            {currentDemos.map((demo, index) => (
              <DemoCard
                key={`${activeTab}-${index}`}
                skillLevel={demo.skillLevel}
                title={demo.title}
                description={demo.description}
                examplePrompt={demo.examplePrompt}
                features={demo.features}
                demoSrc={demo.demoSrc}
                reverse={index % 2 === 1}
                audience={activeTab === 'traders' ? 'trader' : 'investor'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-inner animate-on-scroll">
          <h2>
            Ready to Trade
            <br />
            <span style={{ color: 'var(--accent-purple)' }}>Smarter?</span>
          </h2>
          <p>Join traders and investors who are already using Pelican.</p>
          <SignUpButton className="btn-primary">
            Sign Up Now
          </SignUpButton>
        </div>
      </section>

      <MarketingFooter />

      <HelpChat logoUrl="/pelican-logo-transparent.webp" />
    </div>
  );
}
