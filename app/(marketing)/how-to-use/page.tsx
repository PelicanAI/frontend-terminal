import type { Metadata } from 'next';
import { HowToUsePage } from '@/components/landing/how-to-use-page';

export const metadata: Metadata = {
  title: 'How Pelican Works — AI Trading Platform Guide',
  description: 'Learn how to use Pelican AI: trade journal, position dashboard, morning briefs, market heatmap, playbooks, earnings calendar, correlations, and behavioral coaching.',
  alternates: {
    canonical: '/how-to-use',
  },
};

export default function HowToUse() {
  return <HowToUsePage />;
}
