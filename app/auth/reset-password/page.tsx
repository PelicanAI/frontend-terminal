"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon as ArrowLeft, LockIcon as Lock } from "@hugeicons/core-free-icons"
import { createClient } from "@/lib/supabase/client"

function getHashParams() {
  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : ""
  return new URLSearchParams(hash)
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const hydrateSession = async () => {
      const supabase = createClient()

      const { data } = await supabase.auth.getSession()
      if (data.session) return

      const hashParams = getHashParams()
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const code = new URLSearchParams(window.location.search).get("code")

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
    }

    void hydrateSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setSuccess("Password updated. You can now sign in.")
      setPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update password.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden font-sans p-4">
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="mb-8 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/auth/login" className="inline-flex items-center hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft} size={16} className="mr-2" strokeWidth={1.5} color="currentColor" />
            Back to sign in
          </Link>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 mb-4 relative">
              <Image
                src="/pelican-logo-transparent.webp"
                alt="Pelican Logo"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create a new password</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Choose a strong password you don&apos;t use elsewhere.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground ml-1 uppercase tracking-wider">
                New password
              </label>
              <div className="relative group">
                <HugeiconsIcon icon={Lock} size={20} className="absolute left-3.5 top-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" strokeWidth={1.5} color="currentColor" />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground ml-1 uppercase tracking-wider">
                Confirm password
              </label>
              <div className="relative group">
                <HugeiconsIcon icon={Lock} size={20} className="absolute left-3.5 top-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" strokeWidth={1.5} color="currentColor" />
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {success && (
              <p className="text-sm text-emerald-600">
                {success}{" "}
                <Link href="/auth/login" className="underline underline-offset-4 text-primary hover:text-primary/80">
                  Sign in
                </Link>
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
