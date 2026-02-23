"use client"

/**
 * Settings Page
 *
 * User settings, preferences, and account management.
 * Uses RLS-safe operations for all database interactions.
 *
 * @version 2.1.0 - Split into section components
 */

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/providers/auth-provider"
import { Loader2 } from "lucide-react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { toast } from "@/hooks/use-toast"
import {
  upsertUserSettings,
  isValidUUID,
  logRLSError
} from "@/lib/supabase/helpers"
import {
  SettingsHeader,
  SettingsSidebar,
  AccountSection,
  TradingSection,
  PrivacySection,
  UploadedImagesSection,
} from "@/components/settings"
import { type UserSettings, DEFAULT_SETTINGS } from "@/components/settings/types"

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeSection, setActiveSection] = useState("account")

  // Fetch user settings
  const { data: userSettings, mutate } = useSWR(
    user ? `/api/settings/${user.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .single()

      if (error && error.code !== "PGRST116") {
        logger.error("Failed to fetch user settings", error)
        throw error
      }

      return data || {}
    }
  )

  useEffect(() => {
    if (userSettings) {
      setSettings({
        email: user?.email || "",
        ...DEFAULT_SETTINGS,
        ...userSettings,
      } as UserSettings)
    } else if (user) {
      setSettings({
        email: user.email || "",
        ...DEFAULT_SETTINGS,
      } as UserSettings)
    } else {
      setSettings({
        email: "",
        ...DEFAULT_SETTINGS,
      } as UserSettings)
    }
  }, [userSettings, user])

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
      setHasUnsavedChanges(true)
    }
  }

  const handleSave = async () => {
    if (!user || !settings) return

    if (!isValidUUID(user.id)) {
      logger.error("Invalid user ID format")
      toast({ title: "Invalid user session", description: "Please sign in again.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const { success, error } = await upsertUserSettings(supabase, user.id, settings as unknown as Record<string, unknown>)

      if (!success || error) {
        logRLSError('upsert', 'user_settings', error, { userId: user.id })
        throw error || new Error('Failed to save settings')
      }

      await mutate()
      setHasUnsavedChanges(false)
      toast({ title: "Settings saved" })
      logger.info("Settings saved", { userId: user.id })
    } catch (error) {
      logger.error("Failed to save settings", error instanceof Error ? error : new Error(String(error)))
      toast({ title: "Failed to save settings", description: "Please try again.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader
        user={user}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
      />

      <div className="page-container-wide py-8 bg-[var(--bg-base)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          <div className="lg:col-span-3 space-y-6">
            {activeSection === "account" && (
              <AccountSection
                user={user}
                settings={settings}
                supabase={supabase}
              />
            )}

            {activeSection === "trading" && (
              <TradingSection
                settings={settings}
                updateSetting={updateSetting}
              />
            )}

            {activeSection === "privacy" && (
              <PrivacySection user={user} />
            )}

            {activeSection === "images" && user && (
              <UploadedImagesSection userId={user.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
