"use client"

import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export type FieldSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutoSavePlanReturn {
  saveField: (field: string, value: unknown, oldValue: unknown) => void
  fieldStatus: Record<string, FieldSaveStatus>
  globalStatus: FieldSaveStatus
}

export function useAutoSavePlan(planId: string | null): UseAutoSavePlanReturn {
  const supabase = useMemo(() => createClient(), [])
  const [fieldStatus, setFieldStatus] = useState<Record<string, FieldSaveStatus>>({})
  const [globalStatus, setGlobalStatus] = useState<FieldSaveStatus>('idle')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  const saveField = useCallback(
    (field: string, value: unknown, oldValue: unknown) => {
      if (!planId) return

      // Clear existing timer for this field
      if (timers.current[field]) clearTimeout(timers.current[field])

      // Debounce 500ms
      timers.current[field] = setTimeout(async () => {
        setFieldStatus((prev) => ({ ...prev, [field]: 'saving' }))
        setGlobalStatus('saving')

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return

          const { error } = await supabase
            .from('trading_plans')
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq('id', planId)

          if (error) throw error

          // Track change (non-blocking — don't let this fail the save)
          Promise.resolve(
            supabase
              .from('plan_changes')
              .insert({
                user_id: user.id,
                plan_id: planId,
                field_changed: field,
                old_value: String(oldValue ?? ''),
                new_value: String(value ?? ''),
              })
          ).catch(() => {})

          setFieldStatus((prev) => ({ ...prev, [field]: 'saved' }))
          setGlobalStatus('saved')

          // Fade back to idle after 1.5s
          setTimeout(() => {
            setFieldStatus((prev) => ({ ...prev, [field]: 'idle' }))
            setGlobalStatus((s) => (s === 'saved' ? 'idle' : s))
          }, 1500)
        } catch {
          setFieldStatus((prev) => ({ ...prev, [field]: 'error' }))
          setGlobalStatus('error')
        }
      }, 500)
    },
    [planId, supabase],
  )

  return { saveField, fieldStatus, globalStatus }
}
