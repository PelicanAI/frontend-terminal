"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo } from "react"
import type { TradingProfile, TraderSurvey } from "@/types/trading"

export interface UseTraderProfileReturn {
  profile: TradingProfile | null
  survey: TraderSurvey | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
  updateProfile: (updates: Partial<TradingProfile>) => Promise<void>
}

export function useTraderProfile(): UseTraderProfileReturn {
  const supabase = useMemo(() => createClient(), [])

  const { data: profile, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR<TradingProfile | null>(
    'trader-profile',
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('trading_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as TradingProfile | null
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const { data: survey, error: surveyError, isLoading: surveyLoading } = useSWR<TraderSurvey | null>(
    'trader-survey',
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('trader_survey')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as TraderSurvey | null
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const updateProfile = async (updates: Partial<TradingProfile>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('trading_profiles')
      .update(updates)
      .eq('user_id', user.id)

    if (error) throw error
    mutateProfile()
  }

  return {
    profile: profile ?? null,
    survey: survey ?? null,
    isLoading: profileLoading || surveyLoading,
    error: profileError ?? surveyError ?? null,
    refetch: mutateProfile,
    updateProfile,
  }
}
