'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon as ArrowLeft, Loading03Icon as SpinnerGap } from '@hugeicons/core-free-icons'
import { toast } from '@/hooks/use-toast'

import { useAuth } from '@/lib/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

import { SurveyProgress } from '@/components/onboarding/survey-progress'
import { ExperienceStep } from '@/components/onboarding/steps/experience-step'
import { MarketsStyleStep } from '@/components/onboarding/steps/markets-style-step'
import { RiskStep } from '@/components/onboarding/steps/risk-step'
import { GoalsStep } from '@/components/onboarding/steps/goals-step'
import { PersonalizeStep } from '@/components/onboarding/steps/personalize-step'

// ============================================================================
// Types
// ============================================================================

interface SurveyData {
  experience_level: string | null
  markets_traded: string[]
  primary_style: string | null
  account_size_range: string | null
  risk_tolerance: string | null
  primary_goal: string | null
  technical_analysis_level: string | null
  fundamental_analysis_level: string | null
  options_knowledge: string | null
  typical_tickers_input: string
  preferred_chart_timeframes: string[]
  prefers_technical_or_fundamental: string | null
  wants_learning_mode: boolean
}

// ============================================================================
// Constants
// ============================================================================

const TOTAL_STEPS = 5

const DEFAULT_SURVEY_DATA: SurveyData = {
  experience_level: null,
  markets_traded: [],
  primary_style: null,
  account_size_range: null,
  risk_tolerance: null,
  primary_goal: null,
  technical_analysis_level: null,
  fundamental_analysis_level: null,
  options_knowledge: null,
  typical_tickers_input: '',
  preferred_chart_timeframes: [],
  prefers_technical_or_fundamental: null,
  wants_learning_mode: true,
}

function getLearningModeDefault(experienceLevel: string | null): boolean {
  if (!experienceLevel) return true
  return !['experienced', 'veteran'].includes(experienceLevel)
}

// ============================================================================
// Completion Pipeline
// ============================================================================

async function completeSurvey(data: SurveyData, userId: string) {
  const supabase = createClient()

  // 1. Parse tickers
  const typicalTickers = data.typical_tickers_input
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0 && t.length <= 10)

  // 2. Derive UI complexity
  const uiComplexity = ['brand_new', 'beginner'].includes(data.experience_level!)
    ? 'simplified'
    : data.experience_level === 'intermediate'
      ? 'standard'
      : 'advanced'

  // 3. Write trader_survey (upsert on user_id which is UNIQUE)
  const { error: surveyError } = await supabase.from('trader_survey').upsert({
    user_id: userId,
    experience_level: data.experience_level,
    primary_style: data.primary_style,
    markets_traded: data.markets_traded,
    account_size_range: data.account_size_range,
    risk_tolerance: data.risk_tolerance,
    primary_goal: data.primary_goal,
    technical_analysis_level: data.technical_analysis_level,
    fundamental_analysis_level: data.fundamental_analysis_level,
    options_knowledge: data.options_knowledge,
    typical_tickers: typicalTickers,
    preferred_chart_timeframes: data.preferred_chart_timeframes,
    prefers_technical_or_fundamental: data.prefers_technical_or_fundamental,
    wants_learning_mode: data.wants_learning_mode,
    uses_options: data.markets_traded.includes('options'),
    ui_complexity: uiComplexity,
    completed_at: new Date().toISOString(),
    survey_version: 1,
    skipped: false,
  })
  if (surveyError) throw surveyError

  try {
    // 4. Create trading_profiles (NO unique constraint on user_id - check first)
    const seedStyle = data.primary_style === 'not_sure' ? 'mixed' : data.primary_style
    const holdingPeriodMap: Record<string, string> = {
      scalper: 'minutes',
      day_trader: 'hours',
      swing_trader: 'days',
      position_trader: 'weeks',
      investor: 'months',
      not_sure: 'days',
    }
    const riskComfortMap: Record<string, string> = {
      conservative: 'low',
      moderate: 'medium',
      aggressive: 'high',
      very_aggressive: 'high',
    }

    const { data: existingProfile } = await supabase
      .from('trading_profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (existingProfile) {
      await supabase
        .from('trading_profiles')
        .update({
          seed_style: seedStyle,
          seed_holding_period: holdingPeriodMap[data.primary_style!] || 'days',
          seed_risk_comfort: riskComfortMap[data.risk_tolerance!] || 'medium',
        })
        .eq('id', existingProfile.id)
    } else {
      await supabase.from('trading_profiles').insert({
        user_id: userId,
        profile_name: 'Default',
        seed_style: seedStyle,
        seed_holding_period: holdingPeriodMap[data.primary_style!] || 'days',
        seed_risk_comfort: riskComfortMap[data.risk_tolerance!] || 'medium',
        is_default: true,
        is_active: true,
      })
    }

    // 5. Update user_settings (has UNIQUE on user_id)
    const settingsRisk =
      data.risk_tolerance === 'very_aggressive' ? 'aggressive' : data.risk_tolerance
    await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        default_timeframes:
          data.preferred_chart_timeframes.length > 0
            ? data.preferred_chart_timeframes
            : ['5m', '15m', '1h'],
        preferred_markets: data.markets_traded,
        risk_tolerance: settingsRisk || 'moderate',
        favorite_tickers: typicalTickers,
      },
      { onConflict: 'user_id' }
    )

    // 6. Learning mode in localStorage
    if (data.wants_learning_mode) {
      localStorage.setItem('pelican-learning-mode', 'true')
    }

    // 7. Insert watchlist tickers (has UNIQUE on user_id,ticker)
    if (typicalTickers.length > 0) {
      for (const ticker of typicalTickers) {
        try {
          await supabase
            .from('watchlist')
            .upsert(
              {
                user_id: userId,
                ticker,
                added_from: 'onboarding',
              },
              { onConflict: 'user_id,ticker', ignoreDuplicates: true }
            )
        } catch {
          // Silently ignore duplicate/failed watchlist inserts
        }
      }
    }
  } catch {
    // Survey was written but secondary writes failed
    toast({ title: 'Profile saved', description: 'Some settings couldn\'t be updated.' })
  }

  // 8. Redirect to morning brief
  window.location.href = '/morning'
}

// ============================================================================
// Page Component
// ============================================================================

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [surveyData, setSurveyData] = useState<SurveyData>(DEFAULT_SURVEY_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back

  // --------------------------------------------------------------------------
  // Auth Guard
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <HugeiconsIcon icon={SpinnerGap} className="w-8 h-8 text-primary animate-spin" strokeWidth={2} color="currentColor" />
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <HugeiconsIcon icon={SpinnerGap} className="w-8 h-8 text-primary animate-spin" strokeWidth={2} color="currentColor" />
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!surveyData.experience_level
      case 2:
        return surveyData.markets_traded.length > 0 && !!surveyData.primary_style
      case 3:
        return !!surveyData.account_size_range && !!surveyData.risk_tolerance
      case 4:
        return !!surveyData.primary_goal
      case 5:
        return true
      default:
        return false
    }
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function updateSurvey(updates: Partial<SurveyData>) {
    setSurveyData(prev => {
      const next = { ...prev, ...updates }

      // Auto-set learning mode when experience level changes
      if ('experience_level' in updates && updates.experience_level !== prev.experience_level) {
        next.wants_learning_mode = getLearningModeDefault(updates.experience_level ?? null)
      }

      return next
    })
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  async function handleSkip() {
    if (!user) return
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      await supabase.from('trader_survey').upsert({
        user_id: user.id,
        experience_level: 'beginner',
        primary_style: 'not_sure',
        markets_traded: ['stocks'],
        skipped: true,
        survey_version: 1,
      })
      router.push('/chat')
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' })
      setIsSubmitting(false)
    }
  }

  async function handleComplete() {
    if (!user || isSubmitting) return
    setIsSubmitting(true)
    try {
      await completeSurvey(surveyData, user.id)
    } catch {
      toast({ title: 'Something went wrong', description: 'Failed to save your profile.', variant: 'destructive' })
      setIsSubmitting(false)
    }
  }

  // --------------------------------------------------------------------------
  // Step Rendering
  // --------------------------------------------------------------------------

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <ExperienceStep
            value={surveyData.experience_level}
            onChange={(value) => updateSurvey({ experience_level: value })}
          />
        )
      case 2:
        return (
          <MarketsStyleStep
            marketsTraded={surveyData.markets_traded}
            onMarketsChange={(value) => updateSurvey({ markets_traded: value })}
            primaryStyle={surveyData.primary_style}
            onStyleChange={(value) => updateSurvey({ primary_style: value })}
            experienceLevel={surveyData.experience_level}
          />
        )
      case 3:
        return (
          <RiskStep
            accountSize={surveyData.account_size_range}
            onAccountSizeChange={(value) => updateSurvey({ account_size_range: value })}
            riskTolerance={surveyData.risk_tolerance}
            onRiskToleranceChange={(value) => updateSurvey({ risk_tolerance: value })}
            primaryStyle={surveyData.primary_style}
          />
        )
      case 4:
        return (
          <GoalsStep
            primaryGoal={surveyData.primary_goal}
            onGoalChange={(value) => updateSurvey({ primary_goal: value })}
            technicalLevel={surveyData.technical_analysis_level}
            onTechnicalChange={(v) => updateSurvey({ technical_analysis_level: v })}
            fundamentalLevel={surveyData.fundamental_analysis_level}
            onFundamentalChange={(v) => updateSurvey({ fundamental_analysis_level: v })}
            optionsKnowledge={surveyData.options_knowledge}
            onOptionsChange={(v) => updateSurvey({ options_knowledge: v })}
          />
        )
      case 5:
        return (
          <PersonalizeStep
            tickersInput={surveyData.typical_tickers_input}
            onTickersChange={(v) => updateSurvey({ typical_tickers_input: v })}
            timeframes={surveyData.preferred_chart_timeframes}
            onTimeframesChange={(v) => updateSurvey({ preferred_chart_timeframes: v })}
            analysisPreference={surveyData.prefers_technical_or_fundamental}
            onAnalysisChange={(v) => updateSurvey({ prefers_technical_or_fundamental: v })}
            learningMode={surveyData.wants_learning_mode}
            onLearningModeChange={(v) => updateSurvey({ wants_learning_mode: v })}
          />
        )
      default:
        return null
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const isFinalStep = currentStep === TOTAL_STEPS

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl flex flex-col flex-1">
        {/* Progress Bar */}
        <div className="mb-8">
          <SurveyProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6 h-8">
          {currentStep > 1 && (
            <m.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-1.5 text-sm text-muted-foreground',
                'hover:text-foreground transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <HugeiconsIcon icon={ArrowLeft} className="w-4 h-4" strokeWidth={2} color="currentColor" />
              Back
            </m.button>
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1 mb-8">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={currentStep}
              initial={{ opacity: 0, y: direction > 0 ? 12 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -12 : 12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {renderStep()}
            </m.div>
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="pb-8 space-y-3">
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid() || isSubmitting}
            className={cn(
              'w-full py-3 px-6 rounded-lg font-medium text-sm transition-all duration-150',
              'bg-primary text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
              'flex items-center justify-center gap-2'
            )}
          >
            {isSubmitting ? (
              <HugeiconsIcon icon={SpinnerGap} className="w-5 h-5 animate-spin" strokeWidth={2} color="currentColor" />
            ) : isFinalStep ? (
              'Start Trading →'
            ) : (
              'Continue'
            )}
          </button>

          {!isSubmitting && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
