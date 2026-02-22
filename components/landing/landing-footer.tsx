'use client'

import Image from 'next/image'
import Link from 'next/link'

const productLinks = [
  { label: 'Features', href: '#platform' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

const legalLinks = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
]

const connectLinks = [
  { label: 'Twitter', href: 'https://x.com/PelicanAI_' },
  { label: 'Discord', href: '#' },
  { label: 'Support', href: 'mailto:support@pelicantrading.ai' },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Image
                src="/pelican-logo-transparent.webp"
                alt="Pelican AI"
                width={24}
                height={24}
              />
              <span className="text-sm font-semibold text-white">
                Pelican AI
              </span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              AI-powered trading analysis with live market data, trade
              journaling, and personalized coaching.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Product
            </h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Connect
            </h4>
            <ul className="space-y-2">
              {connectLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={
                      link.href.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Pelican AI. All rights reserved.
          </p>
          <p className="text-xs text-white/20">
            Not financial advice. Trading involves risk.
          </p>
        </div>
      </div>
    </footer>
  )
}
