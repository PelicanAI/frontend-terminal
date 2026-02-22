'use client'

import { LandingNav } from './landing-nav'
import { HeroSection } from './hero-section'
import { SocialProofBar } from './social-proof-bar'
import { ProblemSection } from './problem-section'
import { PlatformShowcase } from './platform-showcase'
import { DayWithPelican } from './day-with-pelican'
import { FlywheelSection } from './flywheel-section'
import { MultiAssetSection } from './multi-asset-section'
import { FeatureGrid } from './feature-grid'
import { PricingSection } from './pricing-section'
import { FAQSection } from './faq-section'
import { FinalCTA } from './final-cta'
import { LandingFooter } from './landing-footer'

export default function LandingPageClient() {
  return (
    <main className="bg-[#0a0a0f] text-white overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <PlatformShowcase />
      <DayWithPelican />
      <FlywheelSection />
      <MultiAssetSection />
      <FeatureGrid />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <LandingFooter />
    </main>
  )
}
