import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (code) {
      const supabase = await createClient()
      
      // Exchange code for session
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[AUTH CALLBACK] Exchange error:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      // Verify session was actually created
      if (!sessionData?.session) {
        console.error('[AUTH CALLBACK] No session returned from exchangeCodeForSession')
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      // Get user to check if they're new
      // Use the user from sessionData first, fallback to getUser()
      let user: User | null = sessionData.user
      if (!user) {
        const { data: { user: fetchedUser }, error: getUserError } = await supabase.auth.getUser()

        if (getUserError) {
          console.error('[AUTH CALLBACK] getUser() error:', getUserError)
          return NextResponse.redirect(`${origin}/auth/error`)
        }
        user = fetchedUser || null
      }
      
      if (!user) {
        console.error('[AUTH CALLBACK] No user found after exchangeCodeForSession')
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      // Handle referral code from cookie (OAuth flow)
      const cookieStore = await cookies()
      const referralCode = cookieStore.get('pelican_ref')?.value
      if (referralCode) {
        try {
          // First validate the code
          const { data: validationData, error: validationError } = await supabase.rpc('validate_referral_code', {
            p_code: referralCode.toUpperCase().trim(),
          })

          if (!validationError && validationData?.valid && validationData.code_id) {
            // Record the referral
            await supabase.rpc('record_referral', {
              p_user_id: user.id,
              p_code_id: validationData.code_id,
            })
          }
        } catch (error) {
          console.error('[AUTH CALLBACK] Failed to record referral:', error)
          // Continue without failing the auth flow
        }
      }

      // Check if user has subscription and terms acceptance
      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('plan_type, free_questions_remaining, terms_accepted')
        .eq('user_id', user.id)
        .single()

      // New user - no credits row yet, trigger will create it with 10 free questions
      // Send to accept-terms since they haven't accepted yet
      if (creditsError?.code === 'PGRST116' || !userCredits) {
        return NextResponse.redirect(new URL('/accept-terms', request.url))
      }

      // Check terms acceptance before anything else
      if (!userCredits.terms_accepted) {
        return NextResponse.redirect(new URL('/accept-terms', request.url))
      }

      const validPlans = ['base', 'pro', 'power', 'founder', 'starter', 'trial']
      const hasSubscription = userCredits.plan_type && validPlans.includes(userCredits.plan_type)
      const hasFreeQuestions = (userCredits.free_questions_remaining ?? 0) > 0
      const hasAccess = hasSubscription || hasFreeQuestions

      if (hasAccess) {
        return NextResponse.redirect(new URL('/chat', request.url))
      } else {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }
    }

    // No code provided - this shouldn't happen for OAuth, but handle gracefully
    console.warn('[AUTH CALLBACK] No code parameter provided')
    return NextResponse.redirect(new URL('/chat', request.url))
  } catch (error) {
    console.error('[AUTH CALLBACK] Unhandled error:', error)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }
}

