'use client'

import { InfiniteGridBg } from '@/components/ui/infinite-grid-bg'
import { HeroSection } from './hero-section'
import { SocialProofBar } from './social-proof-bar'
import { ProblemSection } from './problem-section'
import { PlatformShowcase } from './platform-showcase'
import { DayWithPelican } from './day-with-pelican'
import { FlywheelSection } from './flywheel-section'
import { MultiAssetSection } from './multi-asset-section'
import { FeatureGrid } from './feature-grid'
import { StrategyShowcase } from './strategy-showcase'
import { CreditTiersSection } from './credit-tiers-section'
import { PricingSection } from './pricing-section'
import { TeamSection } from './team-section'
import { FAQSection } from './faq-section'
import { FinalCTA } from './final-cta'

export default function LandingPageClient() {
  return (
    <main className="overflow-x-hidden">
      <InfiniteGridBg>
        <HeroSection />
        <SocialProofBar />
        <ProblemSection />
        <PlatformShowcase />
        <DayWithPelican />
      </InfiniteGridBg>
      <FlywheelSection />
      <MultiAssetSection />
      <FeatureGrid />
      <StrategyShowcase />
      <CreditTiersSection />
      <PricingSection />
      <TeamSection />
      <FAQSection />
      <FinalCTA />
    </main>
  )
}
