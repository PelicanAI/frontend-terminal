'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/tracking'

export function usePageTracking() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const feature = pathname.split('/').filter(Boolean)[0] || 'chat'
    trackEvent({ eventType: 'page_visited', feature })
  }, [pathname])
}
