import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingFooter } from '@/components/landing/landing-footer';

const HelpChat = dynamic(() => import('@/components/marketing/HelpChat'), {
  ssr: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pelicantrading.ai'),
  title: 'Pelican Trading | AI Market Intelligence for Traders',
  description:
    'The AI trading platform that learns how you trade. Real-time market analysis, trade journaling, AI coaching, and institutional-grade intelligence for stocks, forex, crypto, and futures.',
  icons: {
    icon: '/pelican-logo-transparent.webp',
  },
  openGraph: {
    title: 'Pelican Trading AI — Your AI-Powered Trading Edge',
    description:
      'The AI trading platform that gets smarter every day you use it. Stocks, forex, crypto, and futures.',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Pelican Trading' },
    ],
    type: 'website',
    siteName: 'Pelican Trading',
    url: 'https://pelicantrading.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pelican Trading AI',
    description:
      'The AI trading platform that gets smarter every day you use it.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-theme bg-white text-slate-900 min-h-screen antialiased scroll-smooth">
      <LandingNav />
      {children}
      <LandingFooter />
      <HelpChat />
    </div>
  );
}
