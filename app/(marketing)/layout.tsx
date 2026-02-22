import type { Metadata } from 'next';

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
    <div className="dark bg-[#0a0a0f] text-white min-h-screen antialiased scroll-smooth">
      {children}
    </div>
  );
}
