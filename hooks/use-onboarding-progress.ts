"use client"

import useSWR from "swr"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/providers/auth-provider"
import { MILESTONES, TOTAL_MILESTONES } from "@/lib/onboarding-milestones"
import { toast } from "@/hooks/use-toast"
import { trackEvent } from "@/lib/tracking"

const MILESTONE_CELEBRATIONS: Record<string, { title: string; description: string }> = {
  first_message: { title: "First chat with Pelican!", description: "Ask anything about trading" },
  first_trade: { title: "First trade logged!", description: "Positions dashboard is now tracking it" },
  first_watchlist: { title: "Watchlist started!", description: "Track prices in your morning brief" },
  visited_heatmap: { title: "Heatmap explored!", description: "Click any stock for Pelican analysis" },
  visited_brief: { title: "Morning Brief read!", description: "Check it every morning for daily insights" },
  five_trades: { title: "5 trades logged!", description: "Pattern detection is now active" },
  first_insight: { title: "First insight discovered!", description: "Pelican is learning your trading style" },
}

const DISMISS_KEY = "pelican-onboarding-dismissed"

interface OnboardingRow {
  user_id: string
  completed_milestones: string[]
  dismissed: boolean
  created_at: string
  updated_at: string
}

export function useOnboardingProgress() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const retroCheckDone = useRef(false)

  const { data, error, isLoading, mutate } = useSWR<OnboardingRow | null>(
    user ? ["onboarding_progress", user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle()

      if (error) throw error
      return data as OnboardingRow | null
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )

  // Retroactive milestone detection for veteran users
  // Only runs once per session when the hook loads with no completed milestones
  useEffect(() => {
    if (!user || isLoading || retroCheckDone.current) return
    const completed = data?.completed_milestones ?? []
    if (completed.length > 0) {
      retroCheckDone.current = true
      return
    }

    retroCheckDone.current = true

    // Check what milestones the user has already achieved
    const checkRetroactive = async () => {
      const detected: string[] = []

      try {
        // Check first_message: has any conversations
        const { count: convCount } = await supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .limit(1)
        if (convCount && convCount > 0) detected.push("first_message")

        // Check first_trade & five_trades: has trades
        const { count: tradeCount } = await supabase
          .from("trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
        if (tradeCount && tradeCount > 0) detected.push("first_trade")
        if (tradeCount && tradeCount >= 5) detected.push("five_trades")

        // Check first_watchlist: has watchlist items
        const { count: watchCount } = await supabase
          .from("watchlist")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .limit(1)
        if (watchCount && watchCount > 0) detected.push("first_watchlist")
      } catch {
        // Silently fail — don't block UI for retroactive checks
        return
      }

      if (detected.length === 0) return

      // If veteran user has done most things, auto-dismiss
      const shouldAutoDismiss = detected.length >= 4

      // Optimistic update
      mutate(
        (prev) =>
          prev
            ? { ...prev, completed_milestones: detected, dismissed: prev.dismissed || shouldAutoDismiss }
            : {
                user_id: user.id,
                completed_milestones: detected,
                dismissed: shouldAutoDismiss,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
        false,
      )

      // Persist to DB
      await supabase.from("onboarding_progress").upsert(
        {
          user_id: user.id,
          completed_milestones: detected,
          dismissed: shouldAutoDismiss,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
    }

    checkRetroactive()
  }, [user, isLoading, data, supabase, mutate])

  const completed = data?.completed_milestones ?? []

  // localStorage fallback for dismiss — covers cases where DB write fails
  const localDismissed = typeof window !== "undefined"
    ? localStorage.getItem(DISMISS_KEY) === "true"
    : false
  const dismissed = data?.dismissed ?? localDismissed
  const progress = TOTAL_MILESTONES > 0 ? Math.round((completed.length / TOTAL_MILESTONES) * 100) : 0

  const nextMilestone = useMemo(
    () => MILESTONES.find((m) => !completed.includes(m.key)) ?? null,
    [completed],
  )

  const completeMilestone = useCallback(
    async (key: string) => {
      if (!user || completed.includes(key)) return

      const updated = [...completed, key]

      // Fire celebration toast
      const celebration = MILESTONE_CELEBRATIONS[key]
      if (celebration) {
        toast({ title: celebration.title, description: celebration.description })
      }

      trackEvent({ eventType: 'feature_first_use', feature: key })

      // Optimistic update
      mutate(
        (prev) =>
          prev
            ? { ...prev, completed_milestones: updated }
            : {
                user_id: user.id,
                completed_milestones: updated,
                dismissed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
        false,
      )

      const { error } = await supabase.from("onboarding_progress").upsert(
        {
          user_id: user.id,
          completed_milestones: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

      if (error) {
        // Revert on failure
        mutate()
      }
    },
    [user, completed, supabase, mutate],
  )

  const dismiss = useCallback(async () => {
    if (!user) return

    // localStorage fallback
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, "true")
    }

    mutate(
      (prev) =>
        prev
          ? { ...prev, dismissed: true }
          : {
              user_id: user.id,
              completed_milestones: [],
              dismissed: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
      false,
    )

    await supabase.from("onboarding_progress").upsert(
      {
        user_id: user.id,
        dismissed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
  }, [user, supabase, mutate])

  return {
    milestones: MILESTONES,
    completed,
    progress,
    nextMilestone,
    completeMilestone,
    dismiss,
    dismissed,
    isLoading,
    isFirstSession: !isLoading && data === null,
    error: error ?? null,
  }
}
