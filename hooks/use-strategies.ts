"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useMemo, useCallback, useState } from "react"
import type { Playbook, StrategyFilter, StrategyRating, TemplateAdoption, StrategyBacktestResult } from "@/types/trading"

const DEFAULT_FILTERS: StrategyFilter = {
  source: 'all',
  category: 'all',
  difficulty: 'all',
  search: '',
  sortBy: 'popular',
}

export function useStrategies(initialFilters?: Partial<StrategyFilter>) {
  const supabase = useMemo(() => createClient(), [])
  const [filters, setFilters] = useState<StrategyFilter>({ ...DEFAULT_FILTERS, ...initialFilters })

  const { data, error, isLoading, mutate } = useSWR<Playbook[]>(
    ['strategies', filters],
    async () => {
      let query = supabase
        .from('playbooks')
        .select('*')
        .or('is_published.eq.true,is_curated.eq.true')

      // Filter by source
      if (filters.source === 'curated') {
        query = query.eq('is_curated', true)
      } else if (filters.source === 'community') {
        query = query.eq('is_curated', false).eq('is_published', true)
      }

      // Filter by category
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      // Filter by difficulty
      if (filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty)
      }

      // Search
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,setup_type.ilike.%${filters.search}%`)
      }

      // Sort
      switch (filters.sortBy) {
        case 'popular':
          query = query.order('is_curated', { ascending: false }).order('adoption_count', { ascending: false })
          break
        case 'rating':
          query = query.order('community_rating', { ascending: false, nullsFirst: false })
          break
        case 'newest':
          query = query.order('published_at', { ascending: false, nullsFirst: false })
          break
      }

      const { data, error } = await query
      if (error) throw error
      return data as Playbook[]
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    strategies: data || [],
    isLoading,
    error: error ?? null,
    filters,
    setFilters,
    mutate,
  }
}

export function useStrategyDetail(slug: string | null) {
  const supabase = useMemo(() => createClient(), [])

  const { data: strategy, isLoading, error } = useSWR<Playbook>(
    slug ? ['strategy-detail', slug] : null,
    async () => {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('slug', slug)
        .or('is_published.eq.true,is_curated.eq.true')
        .single()

      if (error) throw error
      return data as Playbook
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  // Fetch backtests
  const { data: backtests } = useSWR<StrategyBacktestResult[]>(
    strategy?.id ? ['strategy-backtests', strategy.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('strategy_backtest_results')
        .select('*')
        .eq('playbook_id', strategy!.id)
        .order('calculated_at', { ascending: false })

      if (error) throw error
      return data as StrategyBacktestResult[]
    },
    { revalidateOnFocus: false }
  )

  // Fetch ratings
  const { data: ratings } = useSWR<StrategyRating[]>(
    strategy?.id ? ['strategy-ratings', strategy.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('strategy_ratings')
        .select('*')
        .eq('playbook_id', strategy!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as StrategyRating[]
    },
    { revalidateOnFocus: false }
  )

  // Check if current user adopted this strategy
  const { data: adoption } = useSWR<TemplateAdoption | null>(
    strategy?.id ? ['strategy-adoption', strategy.id] : null,
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('template_adoptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('source_playbook_id', strategy!.id)
        .maybeSingle()

      if (error) throw error
      return data as TemplateAdoption | null
    },
    { revalidateOnFocus: false }
  )

  return {
    strategy: strategy ?? null,
    backtests: backtests || [],
    ratings: ratings || [],
    adoption: adoption ?? null,
    isLoading,
    error: error ?? null,
  }
}

export function useAdoptTemplate() {
  const supabase = useMemo(() => createClient(), [])
  const [isAdopting, setIsAdopting] = useState(false)

  const adopt = useCallback(async (sourceId: string): Promise<{ success: boolean; playbook_id?: string; error?: string }> => {
    setIsAdopting(true)
    try {
      const { data, error } = await supabase.rpc('adopt_template', { source_id: sourceId })
      if (error) throw error
      return data as { success: boolean; playbook_id?: string; error?: string }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to adopt template' }
    } finally {
      setIsAdopting(false)
    }
  }, [supabase])

  return { adopt, isAdopting }
}

export function usePublishPlaybook() {
  const supabase = useMemo(() => createClient(), [])
  const [isPublishing, setIsPublishing] = useState(false)

  const publish = useCallback(async (
    playbookId: string,
    slug: string,
    displayName: string
  ): Promise<{ success: boolean; slug?: string; error?: string }> => {
    setIsPublishing(true)
    try {
      const { data, error } = await supabase.rpc('publish_playbook', {
        p_playbook_id: playbookId,
        p_slug: slug,
        p_display_name: displayName,
      })
      if (error) throw error
      return data as { success: boolean; slug?: string; error?: string }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to publish' }
    } finally {
      setIsPublishing(false)
    }
  }, [supabase])

  const unpublish = useCallback(async (playbookId: string): Promise<{ success: boolean; error?: string }> => {
    setIsPublishing(true)
    try {
      const { data, error } = await supabase.rpc('unpublish_playbook', { p_playbook_id: playbookId })
      if (error) throw error
      return data as { success: boolean; error?: string }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to unpublish' }
    } finally {
      setIsPublishing(false)
    }
  }, [supabase])

  return { publish, unpublish, isPublishing }
}

export function useRateStrategy() {
  const supabase = useMemo(() => createClient(), [])
  const [isRating, setIsRating] = useState(false)

  const rate = useCallback(async (
    playbookId: string,
    rating: number,
    review?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsRating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Not authenticated' }

      const { error } = await supabase
        .from('strategy_ratings')
        .upsert({
          user_id: user.id,
          playbook_id: playbookId,
          rating,
          review: review || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,playbook_id' })

      if (error) throw error

      // Update the playbook's community_rating
      const { data: avgData } = await supabase
        .from('strategy_ratings')
        .select('rating')
        .eq('playbook_id', playbookId)

      if (avgData && avgData.length > 0) {
        const avg = avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length
        await supabase
          .from('playbooks')
          .update({ community_rating: avg, rating_count: avgData.length })
          .eq('id', playbookId)
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to rate' }
    } finally {
      setIsRating(false)
    }
  }, [supabase])

  return { rate, isRating }
}
