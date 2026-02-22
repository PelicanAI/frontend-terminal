'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { List, X } from '@phosphor-icons/react'

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/pelican-logo-transparent.webp"
            alt="Pelican AI"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-sm font-semibold text-slate-900">Pelican AI</span>
        </Link>

        {/* Center: Nav links (hidden on mobile) */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#platform"
            className="text-sm text-slate-500 transition-colors duration-150 hover:text-slate-900"
          >
            Platform
          </a>
          <a
            href="#pricing"
            className="text-sm text-slate-500 transition-colors duration-150 hover:text-slate-900"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm text-slate-500 transition-colors duration-150 hover:text-slate-900"
          >
            FAQ
          </a>
        </div>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden text-sm text-slate-500 transition-colors duration-150 hover:text-slate-900 sm:block"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] sm:block"
          >
            Start Free
          </Link>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-center md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X weight="bold" className="h-6 w-6 text-slate-700" />
            ) : (
              <List weight="bold" className="h-6 w-6 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a
              href="#platform"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Platform
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              FAQ
            </a>
            <Link
              href="/auth/login"
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-blue-700"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
