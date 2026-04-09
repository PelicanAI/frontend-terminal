'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SurveyOptionCard } from '@/components/onboarding/survey-option-card'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon as CaretDown, Alert01Icon as Warning } from '@hugeicons/core-free-icons'
import { m, AnimatePresence } from 'framer-motion'

const ACCOUNT_SIZES = [
  { value: 'under_1k', label: 'Under $1,000' },
  { value: '1k_5k', label: '$1K \u2013 $5K' },
  { value: '5k_25k', label: '$5K \u2013 $25K' },
  { value: '25k_100k', label: '$25K \u2013 $100K' },
  { value: '100k_500k', label: '$100K \u2013 $500K' },
  { value: '500k_plus', label: '$500K+' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

const RISK_OPTIONS = [
  { value: 'conservative', emoji: '\u{1F7E2}', title: 'Conservative', subtitle: 'Risk 0.5\u20131% per trade. Slow and steady.' },
  { value: 'moderate', emoji: '\u{1F7E1}', title: 'Moderate', subtitle: 'Risk 1\u20132% per trade. Balanced growth.' },
  { value: 'aggressive', emoji: '\u{1F7E0}', title: 'Aggressive', subtitle: 'Risk 2\u20135% per trade. Higher upside, higher drawdowns.' },
  { value: 'very_aggressive', emoji: '\u{1F534}', title: 'Very Aggressive', subtitle: 'Risk 5%+ per trade. High risk tolerance.' },
] as const

const PDT_ACCOUNTS = ['under_1k', '1k_5k', '5k_25k']
const PDT_STYLES = ['day_trader', 'scalper']

interface RiskStepProps {
  accountSize: string | null
  onAccountSizeChange: (size: string) => void
  riskTolerance: string | null
  onRiskToleranceChange: (risk: string) => void
  primaryStyle: string | null
}

export function RiskStep({
  accountSize,
  onAccountSizeChange,
  riskTolerance,
  onRiskToleranceChange,
  primaryStyle,
}: RiskStepProps) {
  const [explainerOpen, setExplainerOpen] = useState(false)

  const showPdtWarning =
    accountSize && PDT_ACCOUNTS.includes(accountSize) &&
    primaryStyle && PDT_STYLES.includes(primaryStyle)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-8"
    >
      {/* Section 1: Account Size */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          What&apos;s your account size?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACCOUNT_SIZES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAccountSizeChange(option.value)}
              className={cn(
                'px-4 py-3 rounded-xl border text-sm text-left transition-all duration-200 cursor-pointer',
                accountSize === option.value
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Risk Tolerance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          How much risk are you comfortable with?
        </h2>
        <div className="flex flex-col gap-3">
          {RISK_OPTIONS.map((option) => (
            <SurveyOptionCard
              key={option.value}
              emoji={option.emoji}
              title={option.title}
              subtitle={option.subtitle}
              selected={riskTolerance === option.value}
              onClick={() => onRiskToleranceChange(option.value)}
            />
          ))}
        </div>

        {/* Explainer */}
        <button
          type="button"
          onClick={() => setExplainerOpen(!explainerOpen)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={CaretDown} className={cn('w-3 h-3 transition-transform duration-200', explainerOpen && 'rotate-180')} strokeWidth={2} color="currentColor" />
          Not sure what this means?
        </button>
        <AnimatePresence>
          {explainerOpen && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg bg-muted/50 border border-border p-4 text-xs text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Risk per trade</strong> means the maximum
                  percentage of your account you&apos;re willing to lose on a single trade.
                </p>
                <p>
                  For example, with a $10,000 account and 2% risk, you&apos;d risk up to $200
                  per trade. This helps determine position sizing and stop-loss placement.
                </p>
                <p>
                  If you&apos;re unsure, <strong className="text-foreground">Moderate (1-2%)</strong> is
                  a widely recommended starting point.
                </p>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* PDT Warning */}
      <AnimatePresence>
        {showPdtWarning && (
          <m.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4"
          >
            <HugeiconsIcon icon={Warning} className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" strokeWidth={1.5} color="currentColor" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">PDT Rule Warning</p>
              <p className="text-xs text-muted-foreground">
                Accounts under $25,000 are limited to 3 day trades per 5 business days
                under the Pattern Day Trader rule. Pelican will help you track this.
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}
