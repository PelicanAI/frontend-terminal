'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Section } from '@/components/landing/section'
import { ScrollReveal } from '@/components/landing/scroll-reveal'

function TeamAvatar({
  src,
  alt,
  initials,
}: {
  src: string
  alt: string
  initials: string
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0 ring-2 ring-slate-200">
      {!imgError ? (
        <Image
          src={src}
          alt={alt}
          width={96}
          height={96}
          className="h-full w-full object-cover object-center scale-110"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-2xl font-bold text-white">{initials}</span>
      )}
    </div>
  )
}

function CollapsibleBio({ text, maxWords = 50 }: { text: string; maxWords?: number }) {
  const [expanded, setExpanded] = useState(false)
  const words = text.split(/\s+/)
  const needsTruncation = words.length > maxWords

  if (!needsTruncation) {
    return <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{text}</p>
  }

  const truncated = words.slice(0, maxWords).join(' ') + '...'

  return (
    <div className="text-sm text-slate-500 leading-relaxed">
      <p className="whitespace-pre-line">{expanded ? text : truncated}</p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-1 text-violet-600 hover:text-violet-700 text-sm font-medium transition-colors"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  )
}

const team = [
  {
    name: 'Nick Groves',
    role: 'Founder & CEO',
    src: '/nick-headshot.jpg',
    initials: 'NG',
    xHandle: '@GrasshopperNick',
    xUrl: 'https://x.com/GrasshopperNick',
    bio: "Nick Groves is a systems-driven trader and market analyst with eight years of experience across futures, FX, equities, and digital assets.\n\nHe began his career in cryptocurrency arbitrage, building early crypto auto-spreading systems with support from Trading Technologies in Chicago. These systems connected seven major global exchanges and helped shape his core belief that markets reward structure, discipline, and context over prediction.\n\nSince 2020, Nick has focused on discretionary trading in equity index futures and currencies, using cross-market analysis and central bank policy to identify high-probability inflection points. His work blends macroeconomic insight with technical execution, emphasizing risk control, process, and emotional discipline.\n\nBeyond trading, Nick is an active market educator and builder. He co-hosts daily market calls, produces institutional-style analysis across platforms, and founded Pelican after years of watching traders overpay for shallow tools and false authority, with a mission to make institutional-grade insight accessible and honest.",
  },
  {
    name: 'Ray Campbell',
    role: 'Co-Founder & CTO',
    src: '/ray-headshot.jpg',
    initials: 'RC',
    bio: "Ray Campbell is a rare systems architect who has helped build the infrastructure behind multiple generations of global markets.\n\nAt LaBranche & Co. Inc., he played a critical role in the NYSE's transition to electronic trading, designing ultra-low-latency systems that continuously quoted and executed trades across hundreds of stocks at once. This work powered institutional market-making during one of the most important structural shifts in modern market history.\n\nBeyond U.S. equities, Ray worked extensively in Asia, helping design and deploy trading systems for the Shanghai Futures Exchange and Korean derivatives markets. In partnership with CITIC Bank, he contributed to the launch of China's first commodity ETF, operating at the intersection of regulation, exchange infrastructure, and high-performance execution.\n\nOver the last decade, Ray has applied that same rigor to modern markets, architecting exchange-grade platforms across equities, futures, options, and crypto. His work spans matching engines, market data pipelines, exchange connectivity, and high-performance C++ systems built for environments where speed, reliability, and precision are non-negotiable.",
  },
]

export function TeamSection() {
  return (
    <Section>
      <ScrollReveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Built by traders, for traders
          </h2>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {team.map((member, i) => (
          <ScrollReveal key={member.name} delay={i * 0.15}>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <TeamAvatar
                  src={member.src}
                  alt={member.name}
                  initials={member.initials}
                />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {member.name}
                  </h3>
                  <p className="text-sm text-slate-400">{member.role}</p>
                  {member.xHandle && (
                    <a
                      href={member.xUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      {member.xHandle}
                    </a>
                  )}
                </div>
              </div>
              <CollapsibleBio text={member.bio} />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  )
}
