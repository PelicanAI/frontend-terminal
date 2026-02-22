'use client'

import Link from 'next/link'
import Image from 'next/image'

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
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
          <span className="text-sm font-semibold text-white">Pelican AI</span>
        </Link>

        {/* Center: Nav links (hidden on mobile) */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#platform"
            className="text-sm text-white/60 transition-colors duration-150 hover:text-white"
          >
            Platform
          </a>
          <a
            href="#pricing"
            className="text-sm text-white/60 transition-colors duration-150 hover:text-white"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm text-white/60 transition-colors duration-150 hover:text-white"
          >
            FAQ
          </a>
        </div>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden text-sm text-white/60 transition-colors duration-150 hover:text-white sm:block"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-[#9d74f7] active:scale-[0.98]"
          >
            Start Free
          </Link>
        </div>
      </div>
    </nav>
  )
}
