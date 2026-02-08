'use client';

import {
  FlaskConical,
  MessageCircle,
  Search,
  XSquare,
  BarChart3,
  Target,
} from 'lucide-react';
import { useT } from '@/lib/providers/translation-provider';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SignUpButton from '@/components/marketing/SignUpButton';
import ScrollAnimationObserver from '@/components/marketing/ScrollAnimationObserver';
import MobileStickyCtaBar from '@/components/marketing/MobileStickyCtaBar';
import CollapsibleBio from '@/components/marketing/CollapsibleBio';
import dynamic from 'next/dynamic';

const HelpChat = dynamic(() => import('@/components/marketing/HelpChat'), {
  ssr: false,
});

export default function HomePageContent() {
  const t = useT();
  const pricingBullets = {
    starter: [
      'Learning what RSI, support, resistance actually mean?',
      "Tired of trading off YouTube clips and gut feelings?",
      "Want to ask basic questions without paying for tools you don't need yet?",
      'Perfect for building your foundation with real data',
    ],
    pro: [
      'Using Pelican daily to validate trades before you make them',
      'Running enough analyses and event studies to need room to breathe',
      'Exploring multiple tickers, strategies, and setups each week',
      'The sweet spot between casual and all-in',
    ],
    power: [
      "Research isn't something you do sometimes, it's how you trade",
      'Burning through analyses the way day traders burn through charts',
      'Pressure-testing every idea before real money touches it',
      'Maximum runway for traders who never stop asking questions',
    ],
  };

  const navLinks = [
    { href: '#features', label: t.marketing.nav.features, isAnchor: true },
    { href: '/how-to-use', label: 'How to Use' },
    { href: '#team', label: t.marketing.nav.team, isAnchor: true },
    { href: '#pricing', label: t.marketing.nav.pricing, isAnchor: true },
    { href: '/faq', label: t.marketing.nav.faq },
  ];

  return (
    <>
      <ScrollAnimationObserver extraSelectors={['.feature-card']} />
      <div className="grid-bg"></div>

      <MarketingNav links={navLinks} ctaAction="login" />

      <main id="main-content">

      <section className="how-it-works-section">
        <div className="section-inner">
          <div className="section-header animate-on-scroll">
            <div className="section-tag">{'// How It Works'}</div>
            <h2 className="section-title">THREE STEPS TO SMARTER TRADING</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card animate-on-scroll">
              <div className="step-number">01</div>
              <div className="step-icon"><MessageCircle /></div>
              <h3>Ask in Plain English</h3>
              <p>Type any market question. No syntax, no formulas, no learning curve.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card animate-on-scroll">
              <div className="step-number">02</div>
              <div className="step-icon"><BarChart3 /></div>
              <h3>Pelican Analyzes Real-Time Data</h3>
              <p>Scans thousands of tickers, checks fundamentals, technicals, and macro context.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card animate-on-scroll">
              <div className="step-number">03</div>
              <div className="step-icon"><Target /></div>
              <h3>Get Actionable Insights</h3>
              <p>Specific levels, probabilities, and context. Not vague summaries.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="section-inner">
          <div className="section-header animate-on-scroll">
            <div className="section-tag">{t.marketing.features.sectionTag}</div>
            <h2 className="section-title">{t.marketing.features.title}</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <MessageCircle />
              </div>
              <div className="feature-card-content">
                <h3>{t.marketing.features.justAsk}</h3>
                <p>{t.marketing.features.justAskDesc}</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FlaskConical />
              </div>
              <div className="feature-card-content">
                <h3>{t.marketing.features.testIdeas}</h3>
                <p>{t.marketing.features.testIdeasDesc}</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Search />
              </div>
              <div className="feature-card-content">
                <h3>{t.marketing.features.findsWhat}</h3>
                <p>{t.marketing.features.findsWhatDesc}</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <XSquare />
              </div>
              <div className="feature-card-content">
                <h3>{t.marketing.features.killChaos}</h3>
                <p>{t.marketing.features.killChaosDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="every-trader-section">
        <div className="section-inner">
          <div className="section-header animate-on-scroll">
            <div className="section-tag">{t.marketing.traders.sectionTag}</div>
            <h2 className="section-title">{t.marketing.traders.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '1.1rem' }}>{t.marketing.traders.subtitle}</p>
          </div>
          <div className="trader-comparison">
            <div className="trader-card bracket-box animate-on-scroll">
              <div className="trader-card-title">{t.marketing.traders.newTrader}</div>
              <div className="trader-question">{t.marketing.traders.newTraderQuestion}</div>
              <div className="trader-response">
                <p>Maybe—but only if buyers keep defending today&apos;s levels. As of 12:04 ET, TSLA is $425.21 (+2.8%) after bouncing from a low of $419.70, so dips are getting bought intraday.</p>
                <p>Simple plans for a new trader:</p>
                <div className="response-item">- Aggressive buy-the-dip: look for a pullback that holds 420–422, enter on a turn back up, risk a stop just below 419 (today&apos;s low). First target 429–430 (today&apos;s high), then 435 if momentum continues.</div>
                <div className="response-item">- Conservative: wait for a clean push and hold above 430, then buy a pullback toward 428–430, risk to ~423–425, target 435–440.</div>
                <p style={{ marginTop: '1rem' }}>If 419 breaks with volume and it can&apos;t reclaim quickly, skip it and wait for a better setup. Keep size small—TSLA moves fast—define your risk before you click.</p>
              </div>
            </div>
            <div className="trader-card bracket-box animate-on-scroll">
              <div className="trader-card-title">{t.marketing.traders.experiencedTrader}</div>
              <div className="trader-question">{t.marketing.traders.experiencedTraderQuestion}</div>
              <div className="trader-response">
                <p>QQQ closed down at least -3% and the 2-week (10 trading days) return that followed:</p>
                <div className="response-item">- 2025-03-07: -3.88% day, next 2 weeks: -2.2%</div>
                <div className="response-item">- 2025-04-02: -5.35% day, next 2 weeks: -6.71%</div>
                <div className="response-item">- 2025-04-03: -6.21% day, next 2 weeks: -1.46%</div>
                <div className="response-item">- 2025-04-09: -4.25% day, next 2 weeks: +0.29%</div>
                <div className="response-item">- 2025-04-15: -3.02% day, next 2 weeks: +3.82%</div>
                <p className="summary-title">Summary (2-week/10-trading-day follow-through):</p>
                <div className="response-item">- Count: 5</div>
                <div className="response-item">- Average: -1.26%</div>
                <div className="response-item">- Median: -1.46%</div>
                <div className="response-item">- Best: +3.82%</div>
                <div className="response-item">- Worst: -6.71%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="what-section">
        <div className="section-inner">
          <div className="what-content">
            <div className="what-text animate-on-scroll">
              <h2>{t.marketing.what.title}</h2>
              <p>
                {t.marketing.what.description1}
              </p>
              <p>
                {t.marketing.what.description2}
              </p>
            </div>
            <div className="what-platform bracket-box animate-on-scroll">
              <div className="platform-header">
                <div className="platform-dot red"></div>
                <div className="platform-dot yellow"></div>
                <div className="platform-dot green"></div>
              </div>
              <div className="platform-line">
                <span className="platform-prompt">{t.marketing.what.platformPrompt}</span>{' '}
                <span className="platform-command">{t.marketing.what.platformCommand}</span>
              </div>
              <div className="platform-line">
                <span className="platform-output">{t.marketing.what.platformAnalyzing}</span>
              </div>
              <div className="platform-line">
                <span className="platform-success">&#10003;</span>{' '}
                <span className="platform-output">{t.marketing.what.platformWinRate}</span>{' '}
                <span className="platform-value">67.4%</span>
              </div>
              <div className="platform-line">
                <span className="platform-success">&#10003;</span>{' '}
                <span className="platform-output">{t.marketing.what.platformSharpe}</span>{' '}
                <span className="platform-value">1.84</span>
              </div>
              <div className="platform-line">
                <span className="platform-success">&#10003;</span>{' '}
                <span className="platform-output">{t.marketing.what.platformDrawdown}</span>{' '}
                <span className="platform-value">-8.2%</span>
              </div>
              <div className="platform-line">
                <span className="platform-prompt">{t.marketing.what.platformResponse}</span>{' '}
                <span className="platform-command">{t.marketing.what.platformGenerating}<span className="cursor-blink">_</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="section-inner">
          <div className="section-header animate-on-scroll">
            <div className="section-tag">{t.marketing.pricing.sectionTag}</div>
            <h2 className="section-title">{t.marketing.pricing.title}</h2>
            <p className="pricing-unified">{t.marketing.pricing.sameFeaturesDesc}</p>
          </div>

          <div className="credits-explainer animate-on-scroll">
            <h3>{t.marketing.pricing.howCreditsWork}</h3>
            <p>{t.marketing.pricing.creditsExplainer}</p>
            <div className="credit-types-grid">
              <div className="credit-type bracket-box">
                <div className="credit-type-name">{t.marketing.pricing.conversation}</div>
                <div className="credit-type-amount">{t.marketing.pricing.conversationCredits} <span>{t.marketing.pricing.credits}</span></div>
                <div className="credit-type-example">{t.marketing.pricing.conversationExample}</div>
              </div>
              <div className="credit-type bracket-box">
                <div className="credit-type-name">{t.marketing.pricing.priceCheck}</div>
                <div className="credit-type-amount">{t.marketing.pricing.priceCheckCredits} <span>{t.marketing.pricing.credits}</span></div>
                <div className="credit-type-example">{t.marketing.pricing.priceCheckExample}</div>
              </div>
              <div className="credit-type bracket-box">
                <div className="credit-type-name">{t.marketing.pricing.basicAnalysis}</div>
                <div className="credit-type-amount">{t.marketing.pricing.basicAnalysisCredits} <span>{t.marketing.pricing.credits}</span></div>
                <div className="credit-type-example">{t.marketing.pricing.basicAnalysisExample}</div>
              </div>
              <div className="credit-type bracket-box">
                <div className="credit-type-name">{t.marketing.pricing.eventStudy}</div>
                <div className="credit-type-amount">{t.marketing.pricing.eventStudyCredits} <span>{t.marketing.pricing.credits}</span></div>
                <div className="credit-type-example">{t.marketing.pricing.eventStudyExample}</div>
              </div>
              <div className="credit-type bracket-box">
                <div className="credit-type-name">{t.marketing.pricing.deepAnalysis}</div>
                <div className="credit-type-amount">{t.marketing.pricing.deepAnalysisCredits} <span>{t.marketing.pricing.credits}</span></div>
                <div className="credit-type-example">{t.marketing.pricing.deepAnalysisExample}</div>
              </div>
            </div>
          </div>

          <p className="pricing-unified-note animate-on-scroll">
            All plans include full access to Pelican. Same model, same capabilities. Choose based on how often you&apos;ll use it.
          </p>

          <div className="pricing-tiers">
            <div className="pricing-card bracket-box animate-on-scroll">
              <div className="pricing-tier-name">{t.marketing.pricing.starter}</div>
              <div className="pricing-amount">{t.marketing.pricing.starterPrice}<span>{t.marketing.pricing.starterPeriod}</span></div>
              <div className="pricing-credits">
                <div className="pricing-credits-amount">{t.marketing.pricing.starterCredits}</div>
                <div className="pricing-credits-label">{t.marketing.pricing.starterCreditsLabel}</div>
              </div>
              <ul className="pricing-bullets">
                {pricingBullets.starter.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <SignUpButton plan="starter" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                {t.marketing.pricing.starterButton}
              </SignUpButton>
            </div>

            <div className="pricing-card bracket-box featured animate-on-scroll">
              <div className="pricing-badge">{t.marketing.pricing.mostPopular}</div>
              <div className="pricing-tier-name">{t.marketing.pricing.pro}</div>
              <div className="pricing-amount">{t.marketing.pricing.proPrice}<span>{t.marketing.pricing.proPeriod}</span></div>
              <div className="pricing-credits">
                <div className="pricing-credits-amount">{t.marketing.pricing.proCredits}</div>
                <div className="pricing-credits-label">{t.marketing.pricing.proCreditsLabel}</div>
              </div>
              <ul className="pricing-bullets">
                {pricingBullets.pro.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <SignUpButton plan="pro" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t.marketing.pricing.proButton}
              </SignUpButton>
            </div>

            <div className="pricing-card bracket-box animate-on-scroll">
              <div className="pricing-tier-name">{t.marketing.pricing.power}</div>
              <div className="pricing-amount">{t.marketing.pricing.powerPrice}<span>{t.marketing.pricing.powerPeriod}</span></div>
              <div className="pricing-credits">
                <div className="pricing-credits-amount">{t.marketing.pricing.powerCredits}</div>
                <div className="pricing-credits-label">{t.marketing.pricing.powerCreditsLabel}</div>
              </div>
              <ul className="pricing-bullets">
                {pricingBullets.power.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <SignUpButton plan="power" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                {t.marketing.pricing.powerButton}
              </SignUpButton>
            </div>
          </div>

          <div className="market-comparison animate-on-scroll">
            <h3>{t.marketing.pricing.marketComparison}</h3>
            <p>{t.marketing.pricing.marketComparisonDesc}</p>
            <div className="market-grid">
              <div className="market-item">
                <div className="market-item-name">{t.marketing.pricing.bloomberg}</div>
                <div className="market-item-price">~$24,000</div>
                <div className="market-item-annual">{t.marketing.pricing.perYear}</div>
              </div>
              <div className="market-item">
                <div className="market-item-name">{t.marketing.pricing.refinitiv}</div>
                <div className="market-item-price">~$22,000</div>
                <div className="market-item-annual">{t.marketing.pricing.perYear}</div>
              </div>
              <div className="market-item">
                <div className="market-item-name">{t.marketing.pricing.factset}</div>
                <div className="market-item-price">~$12,000</div>
                <div className="market-item-annual">{t.marketing.pricing.perYear}</div>
              </div>
              <div className="market-item pelican-item">
                <div className="market-item-name">{t.marketing.pricing.pelican}</div>
                <div className="market-item-price">$348 – $2,988</div>
                <div className="market-item-annual">{t.marketing.pricing.perYear}</div>
              </div>
            </div>
            <div className="savings-badge">{t.marketing.pricing.savingsBadge}</div>
          </div>
        </div>
      </section>

      <section id="team">
        <div className="section-inner">
          <div className="section-header animate-on-scroll">
            <div className="section-tag">{t.marketing.team.sectionTag}</div>
            <h2 className="section-title">{t.marketing.team.title}</h2>
          </div>
          <div className="team-grid">
            <div className="team-card bracket-box animate-on-scroll">
              <div className="team-name">{t.marketing.team.nickName}</div>
              <div className="team-role">{t.marketing.team.nickRole}</div>
              <CollapsibleBio text={t.marketing.team.nickBio} />
            </div>
            <div className="team-card bracket-box animate-on-scroll">
              <div className="team-name">{t.marketing.team.rayName}</div>
              <div className="team-role">{t.marketing.team.rayRole}</div>
              <CollapsibleBio text={t.marketing.team.rayBio} />
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="section-inner animate-on-scroll">
          <h2>{t.marketing.cta.title1}<br />{t.marketing.cta.title2} <span style={{ color: 'var(--accent-purple)' }}>{t.marketing.cta.titleHighlight}</span></h2>
          <p>{t.marketing.cta.subtitle}</p>
          <SignUpButton className="btn-primary">{t.marketing.cta.button}</SignUpButton>
        </div>
      </section>

      </main>

      <MarketingFooter />

      <MobileStickyCtaBar />
      <HelpChat logoUrl="/pelican-logo-transparent.webp" />
    </>
  );
}
