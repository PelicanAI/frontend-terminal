'use client'

import Image from 'next/image'
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { TwitterIcon as XLogo } from '@hugeicons/core-free-icons'

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
  { label: 'Support', href: 'mailto:support@pelicantrading.ai' },
]

export function LandingFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
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
              <span className="text-sm font-semibold text-slate-900">
                Pelican AI
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-powered trading analysis with live market data, trade
              journaling, and personalized coaching.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Product
            </h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Connect
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://x.com/PelicanAI_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <HugeiconsIcon icon={XLogo} className="h-3.5 w-3.5" strokeWidth={2} color="currentColor" />
                  Twitter / X
                </a>
              </li>
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
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Pelican AI. All rights reserved.
          </p>
          <p className="text-xs text-slate-300">
            Not financial advice. Trading involves risk. Pelican is an AI model — it can make mistakes. Please double-check responses.
          </p>
        </div>
      </div>
    </footer>
  )
}
