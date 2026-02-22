"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo, useCallback } from "react"
import type { Playbook } from "@/types/trading"
import type { Trade } from "./use-trades"

// ── PlaybookStats (computed from trades tagged with this playbook) ──

export interface PlaybookStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgR: number | null
  profitFactor: number | null
  expectancy: number | null
  totalPnl: number
  equityCurve: { date: string; cumPnl: number }[]
  rDistribution: { bucket: string; count: number; color: string }[]
  recentResults: { id: string; result: "W" | "L"; pnl: number }[]
  trades: Trade[]
}

// ── Main hook: CRUD for playbooks ──

export function usePlaybooks() {
  const supabase = useMemo(() => createClient(), [])

  const {
    data: playbooks,
    error,
    isLoading,
    mutate,
  } = useSWR<Playbook[]>("playbooks", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("playbooks")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as Playbook[]
  })

  const createPlaybook = useCallback(
    async (
      input: Omit<
        Playbook,
        | "id"
        | "user_id"
        | "total_trades"
        | "winning_trades"
        | "avg_r_multiple"
        | "avg_pnl_percent"
        | "win_rate"
        | "is_active"
        | "created_at"
        | "updated_at"
      >
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("playbooks")
        .insert({
          ...input,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      await mutate()
      return data as Playbook
    },
    [supabase, mutate]
  )

  const updatePlaybook = useCallback(
    async (id: string, updates: Partial<Playbook>) => {
      const { error } = await supabase
        .from("playbooks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error
      await mutate()
    },
    [supabase, mutate]
  )

  const deletePlaybook = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("playbooks").delete().eq("id", id)

      if (error) throw error
      await mutate()
    },
    [supabase, mutate]
  )

  return {
    playbooks: playbooks ?? [],
    isLoading,
    error: error ?? null,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
    refetch: mutate,
  }
}

// ── Stats hook: compute from trades tagged with the playbook's setup_type ──

export function usePlaybookStats(playbook: Playbook | null): {
  stats: PlaybookStats | null
  isLoading: boolean
} {
  const supabase = useMemo(() => createClient(), [])

  const { data, isLoading } = useSWR<PlaybookStats | null>(
    playbook ? `playbook-stats-${playbook.id}` : null,
    async () => {
      if (!playbook) return null

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      // Get trades that have this playbook's setup_type in their setup_tags
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .contains("setup_tags", [playbook.setup_type])
        .order("exit_date", { ascending: true })

      if (error || !trades) return null

      const typedTrades = trades as Trade[]
      const wins = typedTrades.filter((t) => (t.pnl_amount ?? 0) > 0)
      const losses = typedTrades.filter((t) => (t.pnl_amount ?? 0) < 0)
      const totalPnl = typedTrades.reduce((s, t) => s + (t.pnl_amount ?? 0), 0)
      const winRate =
        typedTrades.length > 0
          ? (wins.length / typedTrades.length) * 100
          : 0

      // Avg R
      const rValues = typedTrades
        .map((t) => t.r_multiple)
        .filter((r): r is number => r != null)
      const avgR =
        rValues.length > 0
          ? rValues.reduce((s, r) => s + r, 0) / rValues.length
          : null

      // Profit factor
      const grossProfit = wins.reduce((s, t) => s + (t.pnl_amount ?? 0), 0)
      const grossLoss = Math.abs(
        losses.reduce((s, t) => s + (t.pnl_amount ?? 0), 0)
      )
      const profitFactor =
        grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : null

      // Expectancy
      const avgWin =
        wins.length > 0 ? grossProfit / wins.length : 0
      const avgLoss =
        losses.length > 0 ? grossLoss / losses.length : 0
      const wr = typedTrades.length > 0 ? wins.length / typedTrades.length : 0
      const expectancy =
        typedTrades.length > 0
          ? avgWin * wr - avgLoss * (1 - wr)
          : null

      // Equity curve
      let cumPnl = 0
      const equityCurve = typedTrades.map((t) => {
        cumPnl += t.pnl_amount ?? 0
        return {
          date: t.exit_date ?? t.entry_date,
          cumPnl,
        }
      })

      // R-multiple distribution
      const buckets: Record<string, number> = {}
      for (const r of rValues) {
        const bucket =
          r < -2
            ? "<-2R"
            : r < -1
              ? "-2R to -1R"
              : r < 0
                ? "-1R to 0"
                : r < 1
                  ? "0 to 1R"
                  : r < 2
                    ? "1R to 2R"
                    : ">2R"
        buckets[bucket] = (buckets[bucket] ?? 0) + 1
      }

      const bucketOrder = ["<-2R", "-2R to -1R", "-1R to 0", "0 to 1R", "1R to 2R", ">2R"]
      const rDistribution = bucketOrder
        .filter((b) => buckets[b])
        .map((bucket) => ({
          bucket,
          count: buckets[bucket] ?? 0,
          color: bucket.startsWith("-") || bucket.startsWith("<")
            ? "var(--data-negative)"
            : "var(--data-positive)",
        }))

      // Recent results (last 20)
      const recentResults = typedTrades.slice(-20).map((t) => ({
        id: t.id,
        result: ((t.pnl_amount ?? 0) >= 0 ? "W" : "L") as "W" | "L",
        pnl: t.pnl_amount ?? 0,
      }))

      return {
        totalTrades: typedTrades.length,
        winningTrades: wins.length,
        losingTrades: losses.length,
        winRate,
        avgR,
        profitFactor,
        expectancy,
        totalPnl,
        equityCurve,
        rDistribution,
        recentResults,
        trades: typedTrades,
      }
    }
  )

  return { stats: data ?? null, isLoading }
}
