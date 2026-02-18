"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, UserCircle, ClipboardText } from "@phosphor-icons/react"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const [proDark, setProDark] = useState(false)

  // Load Pro Dark setting from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pelican-pro-dark")
    if (saved === "true") {
      setProDark(true)
      document.body.classList.add("pro-dark")
    }
  }, [])

  // Handle Pro Dark toggle
  const handleProDarkChange = (enabled: boolean) => {
    setProDark(enabled)
    localStorage.setItem("pelican-pro-dark", enabled.toString())

    if (enabled) {
      document.body.classList.add("pro-dark")
    } else {
      document.body.classList.remove("pro-dark")
    }
  }

  const isDarkMode = theme === "dark"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--foreground)]">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--foreground)]">Appearance</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pro-dark" className="text-sm font-medium text-[var(--foreground)]">
                  Pro Dark
                </Label>
                <p className="text-xs text-[var(--text-secondary)]">Enhanced dark theme with refined contrast and borders</p>
              </div>
              <Switch
                id="pro-dark"
                checked={proDark}
                onCheckedChange={handleProDarkChange}
                disabled={!isDarkMode}
                className="focus-outline"
              />
            </div>

            {!isDarkMode && <p className="text-xs text-[var(--text-muted)]">Pro Dark is only available in dark mode</p>}
          </div>

          <Separator className="bg-[var(--border-subtle)]" />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--foreground)]">Account</h3>
            <button
              onClick={() => { onOpenChange(false); router.push('/profile') }}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <User weight="regular" className="w-4 h-4" />
              Account
            </button>
            <button
              onClick={() => { onOpenChange(false); router.push('/journal?tab=profile') }}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <UserCircle weight="regular" className="w-4 h-4" />
              Trader Profile
            </button>
            <button
              onClick={() => { onOpenChange(false); router.push('/journal?tab=plan') }}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <ClipboardText weight="regular" className="w-4 h-4" />
              Trading Plan
            </button>
          </div>

          <Separator className="bg-[var(--border-subtle)]" />

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--foreground)]">About</h3>
            <p className="text-xs text-[var(--text-secondary)]">Pelican AI - Your intelligent trading assistant</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
