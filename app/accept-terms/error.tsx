'use client'

import { useEffect } from 'react'

export default function AcceptTermsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Accept Terms Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h2>
        <p className="text-[var(--text-secondary)]">
          We couldn&apos;t load the terms page. Please try refreshing.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm hover:bg-[var(--accent-hover)] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
