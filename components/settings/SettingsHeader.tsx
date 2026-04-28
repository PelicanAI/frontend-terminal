"use client"

import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon as ArrowLeft,
  UserIcon as User,
  FloppyDiskIcon as FloppyDisk,
  Loading03Icon as CircleNotch,
} from "@hugeicons/core-free-icons"
import Link from "next/link"
import { PressScale } from "@/components/motion/press-scale"
import { LanguageSelector } from "@/components/language-selector"
import { cn } from "@/lib/utils"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SettingsHeaderProps {
  user: SupabaseUser | null
  isSaving: boolean
  hasUnsavedChanges: boolean
  onSave: () => void
}

export function SettingsHeader({ user, isSaving, hasUnsavedChanges, onSave }: SettingsHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="page-container-wide py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/chat">
                <HugeiconsIcon icon={ArrowLeft} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <LanguageSelector />
            {user ? (
              <PressScale disabled={!hasUnsavedChanges || isSaving} className="w-full sm:w-auto">
                <Button
                  onClick={onSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={cn(
                    "w-full sm:w-auto",
                    (!hasUnsavedChanges || isSaving)
                      ? "cursor-not-allowed bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                      : "bg-violet-500 text-white hover:bg-violet-600"
                  )}
                >
                  {isSaving ? (
                    <>
                      <HugeiconsIcon icon={CircleNotch} size={16} className="mr-2 animate-spin" strokeWidth={1.5} color="currentColor" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={FloppyDisk} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
                      Save Changes
                    </>
                  )}
                </Button>
              </PressScale>
            ) : (
              <PressScale className="w-full sm:w-auto">
                <Button
                  asChild
                  className="w-full sm:w-auto bg-violet-500 text-white hover:bg-violet-600"
                >
                  <Link href="/auth/signup">
                    <HugeiconsIcon icon={User} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
                    Sign Up to Save
                  </Link>
                </Button>
              </PressScale>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
