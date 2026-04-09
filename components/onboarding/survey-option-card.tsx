'use client'

import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick01Icon as Check } from '@hugeicons/core-free-icons'
import { m } from 'framer-motion'

interface SurveyOptionCardProps {
  emoji: string
  title: string
  subtitle?: string
  selected: boolean
  onClick: () => void
  size?: 'normal' | 'compact'
}

export function SurveyOptionCard({
  emoji,
  title,
  subtitle,
  selected,
  onClick,
  size = 'normal',
}: SurveyOptionCardProps) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 w-full rounded-xl border text-left cursor-pointer',
        'transition-all duration-200',
        size === 'normal' ? 'min-h-[80px] px-4 py-4' : 'min-h-[56px] px-3 py-3',
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'bg-card border-border hover:border-primary/40'
      )}
    >
      <span className={cn('shrink-0', size === 'normal' ? 'text-2xl' : 'text-xl')}>
        {emoji}
      </span>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium text-foreground',
          size === 'normal' ? 'text-sm' : 'text-sm'
        )}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>

      {selected && (
        <m.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-primary"
        >
          <HugeiconsIcon icon={Check} className="w-3 h-3 text-primary-foreground" strokeWidth={2} color="currentColor" />
        </m.span>
      )}
    </m.button>
  )
}
