import type { Metadata } from 'next';
import { FAQFullPage } from '@/components/landing/faq-full-page';

export const metadata: Metadata = {
  title: 'FAQ | Pelican Trading',
  description: 'Frequently asked questions about Pelican Trading — how it works, pricing, supported markets, data sources, and more.',
  alternates: {
    canonical: '/faq',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Pelican Trading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pelican is an AI-powered trading intelligence platform that lets traders analyze markets, track trades, and get insights using plain English.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who is Pelican for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Pelican is designed for traders of all levels who want institutional-grade market intelligence without the complexity.",
      },
    },
    {
      '@type': 'Question',
      name: "How does Pelican's pricing work?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pelican uses a credit-based pricing system. Three tiers: Base ($29/month), Pro ($99/month), and Power ($249/month).',
      },
    },
    {
      '@type': 'Question',
      name: 'How many tickers does Pelican cover?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pelican provides data on 10,000+ tickers covering US stocks, Foreign Exchange (FX), and cryptocurrencies.',
      },
    },
    {
      '@type': 'Question',
      name: 'What languages does Pelican support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pelican is available in 30+ languages including Chinese, Spanish, Japanese, Korean, French, German, Portuguese, and many more.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is the data real-time or delayed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pelican provides both real-time and historical data. All subscribers get live data on 10,000+ tickers.',
      },
    },
  ],
};

export default function FAQ() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQFullPage />
    </>
  );
}
