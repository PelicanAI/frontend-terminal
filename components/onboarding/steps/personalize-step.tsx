'use client'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { SurveyOptionCard } from '@/components/onboarding/survey-option-card'
import { SurveyPillSelect } from '@/components/onboarding/survey-pill-select'
import { HugeiconsIcon } from '@hugeicons/react'
import { BookOpenTextIcon as BookOpenText } from '@hugeicons/core-free-icons'
import { m } from 'framer-motion'

const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const

const ANALYSIS_OPTIONS = [
  { value: 'technical', emoji: '\u{1F4CA}', title: 'Technical Analysis', subtitle: 'Charts, patterns, indicators' },
  { value: 'fundamental', emoji: '\u{1F4F0}', title: 'Fundamental Analysis', subtitle: 'Earnings, valuation, macro' },
  { value: 'both', emoji: '\u{1F504}', title: 'Both', subtitle: 'A mix of technical and fundamental' },
  { value: 'not_sure', emoji: '\u{1F937}', title: 'Not sure yet', subtitle: 'Pelican will help you explore' },
] as const

interface PersonalizeStepProps {
  tickersInput: string
  onTickersChange: (val: string) => void
  timeframes: string[]
  onTimeframesChange: (tf: string[]) => void
  analysisPreference: string | null
  onAnalysisChange: (val: string) => void
  learningMode: boolean
  onLearningModeChange: (val: boolean) => void
}

export function PersonalizeStep({
  tickersInput,
  onTickersChange,
  timeframes,
  onTimeframesChange,
  analysisPreference,
  onAnalysisChange,
  learningMode,
  onLearningModeChange,
}: PersonalizeStepProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Personalize your experience
        </h2>
        <p className="text-sm text-muted-foreground">All fields are optional</p>
      </div>

      {/* Tickers */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="tickers-input">
          Tickers you follow
        </label>
        <Input
          id="tickers-input"
          placeholder="AAPL, NVDA, TSLA..."
          value={tickersInput}
          onChange={(e) => onTickersChange(e.target.value)}
          className="bg-card"
        />
        <p className="text-xs text-muted-foreground">Comma-separated ticker symbols</p>
      </div>

      {/* Chart Timeframes */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Preferred chart timeframes</p>
        <SurveyPillSelect
          options={[...TIMEFRAME_OPTIONS]}
          selected={timeframes}
          onChange={onTimeframesChange}
        />
      </div>

      {/* Analysis Preference */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Analysis preference</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ANALYSIS_OPTIONS.map((option) => (
            <SurveyOptionCard
              key={option.value}
              emoji={option.emoji}
              title={option.title}
              subtitle={option.subtitle}
              selected={analysisPreference === option.value}
              onClick={() => onAnalysisChange(option.value)}
              size="compact"
            />
          ))}
        </div>
      </div>

      {/* Learning Mode Toggle */}
      <div className={cn(
        'flex items-center justify-between rounded-xl border border-border bg-card p-4'
      )}>
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={BookOpenText} className="w-5 h-5 text-primary" strokeWidth={1.5} color="currentColor" />
          <div>
            <p className="text-sm font-medium text-foreground">Learning Mode</p>
            <p className="text-xs text-muted-foreground">
              Highlights trading terms with explanations
            </p>
          </div>
        </div>
        <Switch
          checked={learningMode}
          onCheckedChange={onLearningModeChange}
        />
      </div>
    </m.div>
  )
}
