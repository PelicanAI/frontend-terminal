'use client'

import { useState, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon as X } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/providers/auth-provider'

export function OnboardingSkipBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(true)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem('pelican-survey-banner-dismissed') === 'true') return

    const supabase = createClient()
    supabase
      .from('trader_survey')
      .select('skipped')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.skipped) {
          setSkipped(true)
          setDismissed(false)
        }
      })
  }, [user])

  if (dismissed || !skipped) return null

  return (
    <div className="mx-4 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
      <p className="text-sm text-foreground">
        Complete your profile for personalized insights{' '}
        <Link href="/onboarding" className="text-primary hover:underline font-medium">
          Set up now
        </Link>
      </p>
      <button
        onClick={() => {
          setDismissed(true)
          localStorage.setItem('pelican-survey-banner-dismissed', 'true')
        }}
        className="text-muted-foreground hover:text-foreground ml-4 flex-shrink-0"
      >
        <HugeiconsIcon icon={X} size={16} strokeWidth={2} color="currentColor" />
      </button>
    </div>
  )
}
