"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Lock, Envelope, ArrowLeft } from "@phosphor-icons/react"
import { ReferralCodeInput } from "@/components/ReferralCodeInput"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan')
  const recordReferralRef = useRef<((userId: string) => Promise<void>) | null>(null)

  // Store the plan parameter in sessionStorage for use after signup
  useEffect(() => {
    if (planParam) {
      sessionStorage.setItem('intended_plan', planParam)
    }
  }, [planParam])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service to continue")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
          },
        },
      })

      if (error) throw error

      // If email confirmation is disabled, user is immediately logged in with a session
      if (data.session && data.user) {
        // Persist terms acceptance to user_credits
        await supabase
          .from("user_credits")
          .update({
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
          })
          .eq("user_id", data.user.id)

        // Record referral if available
        if (recordReferralRef.current) {
          await recordReferralRef.current(data.user.id)
        }

        // User is logged in, redirect to pricing (new users need to subscribe)
        // Check if there's a pre-selected plan from the marketing site
        const storedPlan = sessionStorage.getItem('intended_plan')
        if (storedPlan) {
          router.push(`/pricing?plan=${storedPlan}`)
        } else {
          router.push('/pricing')
        }
        return
      }

      // No session means email confirmation is required
      // Redirect to confirmation screen
      router.push("/auth/signup-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
        }}
      />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col">
        <div className="mb-6 self-start">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} weight="regular" className="mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 mb-4 relative">
              <Image
                src="/pelican-logo-transparent.webp"
                alt="Pelican Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-2">Start trading smarter in minutes.</p>
            <div className="mt-4 flex flex-col gap-1.5 text-left w-full">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                10 free questions, no credit card required
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                Real-time analysis on 10,000+ tickers
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                Learns your positions and trade history
              </div>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground ml-1">Email</label>
              <div className="relative group">
                <Envelope size={20} weight="regular" className="absolute left-3.5 top-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  id="email"
                  placeholder="trader@example.com"
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground ml-1">Password</label>
              <div className="relative group">
                <Lock size={20} weight="regular" className="absolute left-3.5 top-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  id="password"
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="repeat-password" className="text-sm font-medium text-muted-foreground ml-1">Repeat Password</label>
              <div className="relative group">
                <Lock size={20} weight="regular" className="absolute left-3.5 top-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  id="repeat-password"
                  className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
            </div>

            <ReferralCodeInput onReferralReady={(fn) => { recordReferralRef.current = fn; }} />

            <div className="flex items-center pt-2">
              <input
                id="terms"
                type="checkbox"
                className="w-5 h-5 bg-background border-border rounded text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer accent-primary"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="ml-3 text-sm text-muted-foreground">
                I agree to the <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</Link>
              </label>
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <button
              type="submit"
              className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted flex items-center justify-center gap-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.196 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.272 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917Z"/>
              <path fill="#FF3D00" d="M6.306 14.691 12.18 19.01C13.772 15.087 18.569 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.272 4 24 4 16.318 4 9.656 8.356 6.306 14.691Z"/>
              <path fill="#4CAF50" d="M24 44c5.091 0 9.771-1.947 13.313-5.118l-6.149-5.207C29.14 35.091 26.715 36 24 36c-5.172 0-9.612-3.322-11.282-7.946l-6.05 4.66C9.999 39.556 16.505 44 24 44Z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.004 2.78-3.077 5.111-5.99 6.487l.001-.001 6.149 5.207C34.013 41.091 40 36 40 24c0-1.341-.138-2.65-.389-3.917Z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}
