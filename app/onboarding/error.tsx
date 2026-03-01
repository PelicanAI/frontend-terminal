'use client'

import { useEffect } from 'react'

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Onboarding Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h2>
        <p className="text-[var(--text-secondary)]">
          We couldn&apos;t load the onboarding survey. This won&apos;t affect
          your account.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm hover:bg-[var(--accent-hover)] transition-colors"
          >
            Try again
          </button>
          <a
            href="/chat"
            className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-elevated)] transition-colors"
          >
            Skip to chat
          </a>
        </div>
      </div>
    </div>
  )
}
