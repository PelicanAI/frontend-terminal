import type { Metadata } from 'next';
import { HowToUsePage } from '@/components/landing/how-to-use-page';

export const metadata: Metadata = {
  title: 'How to Use | Pelican Trading',
  description: 'Learn how to use Pelican Trading — get started with AI-powered market analysis, trade journaling, and more.',
  alternates: {
    canonical: '/how-to-use',
  },
};

export default function HowToUse() {
  return <HowToUsePage />;
}
