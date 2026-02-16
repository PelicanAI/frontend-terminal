"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Lock, Mail, ArrowLeft } from "lucide-react"
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
      // Map 'starter' from marketing site to 'base' used by pricing page
      const mappedPlan = planParam === 'starter' ? 'base' : planParam
      sessionStorage.setItem('intended_plan', mappedPlan)
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
    <div className="min-h-screen w-full bg-[#0a0a0c] flex flex-col items-center justify-center relative overflow-hidden font-sans text-white">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#1e1b4b_0%,_transparent_50%)] opacity-20 pointer-events-none" />

      <div className="absolute top-6 left-6 z-30 pointer-events-auto">
        <Link
          href="/"
          aria-label="Back to home"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition-colors hover:text-white hover:border-white/20 hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="w-full min-h-screen bg-[#12141c] rounded-none shadow-none overflow-hidden flex flex-col md:flex-row border-0 z-10">
        {/* LEFT SIDE: Visual & Branding (CSS-Only Version) */}
        <div className="flex w-full md:w-1/2 relative flex-col justify-between p-8 md:p-12 overflow-hidden bg-[#050505] min-h-[320px] md:min-h-full">
            {/* BACKGROUND: Glowing Data Landscape (CSS Only) */}
            <div className="absolute inset-0 z-0 overflow-hidden">
               {/* 1. The Dark Base */}
               <div className="absolute inset-0 bg-[#020205]"></div>
               
               {/* 2. The "Mountain" Glows */}
               <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[60%] bg-purple-900/40 blur-[80px] rounded-full mix-blend-screen"></div>
               <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[60%] bg-blue-900/30 blur-[80px] rounded-full mix-blend-screen"></div>
               
               {/* 3. The Grid Floor (Perspective) */}
               <div 
                 className="absolute inset-0 opacity-30" 
                 style={{
                    backgroundImage: 'linear-gradient(rgba(124, 58, 237, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.3) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)',
                    transformOrigin: 'bottom center',
                    maskImage: 'linear-gradient(to top, black 0%, transparent 100%)'
                 }} 
               />
               
               {/* 4. Rising "Candlestick" Bars (Simulated with spans) */}
               <div className="absolute bottom-0 left-10 w-4 h-32 bg-gradient-to-t from-purple-600 to-transparent opacity-50 blur-sm"></div>
               <div className="absolute bottom-0 left-20 w-4 h-48 bg-gradient-to-t from-purple-500 to-transparent opacity-60 blur-sm"></div>
               <div className="absolute bottom-0 left-32 w-4 h-24 bg-gradient-to-t from-blue-600 to-transparent opacity-40 blur-sm"></div>
               <div className="absolute bottom-0 right-20 w-4 h-56 bg-gradient-to-t from-purple-400 to-transparent opacity-50 blur-sm"></div>
            </div>

            {/* Logo */}
            <div className="relative z-10 mb-6 md:mb-12">
              <div className="w-40 h-40 md:w-72 md:h-72 relative">
                 <Image 
                   src="/pelican-logo-transparent.webp" 
                   alt="Pelican Logo" 
                   width={288} 
                   height={288} 
                   className="object-contain" 
                 />
              </div>
            </div>

            {/* Hero Text */}
            <div className="relative z-10 mt-auto mb-6">
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 tracking-tight text-white drop-shadow-lg">
                Unlock Your Trading <br />
                Potential.
              </h1>
              <p className="text-gray-300 text-base md:text-lg font-light max-w-sm leading-relaxed drop-shadow-md">
                Join thousands using AI to find their next big opportunity.
              </p>
            </div>
        </div>

        <div className="w-full md:w-1/2 bg-[#12141c] p-10 md:p-14 flex flex-col justify-center relative z-10 pointer-events-auto">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-3xl font-semibold mb-2 text-white">Create your account</h2>
            <p className="text-gray-400 mb-8">Start trading smarter in minutes.</p>

            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-300 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="email"
                    id="email"
                    placeholder="trader@example.com"
                    className="w-full bg-[#1b1f2b] border border-[#2d3240] rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-300 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="password"
                    id="password"
                    className="w-full bg-[#1b1f2b] border border-[#2d3240] rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="repeat-password" className="text-sm font-medium text-gray-300 ml-1">Repeat Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="password"
                    id="repeat-password"
                    className="w-full bg-[#1b1f2b] border border-[#2d3240] rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
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
                  className="w-5 h-5 bg-[#1b1f2b] border-[#2d3240] rounded text-purple-600 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer accent-purple-600"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-400">
                  I agree to the <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">Terms of Service</Link>
                </label>
              </div>

              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

              <button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3.5 rounded-full transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>

              <div className="text-center pt-4 pointer-events-auto">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>

            <div className="my-6 flex items-center gap-4 text-xs text-gray-500">
              <div className="h-px flex-1 bg-white/10" />
              <span>or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 flex items-center justify-center gap-3"
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
    </div>
  )
}
