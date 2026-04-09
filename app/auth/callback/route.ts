import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

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
        logger.error('[AUTH CALLBACK] Exchange error', exchangeError instanceof Error ? exchangeError : undefined, { message: exchangeError.message })
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      // Verify session was actually created
      if (!sessionData?.session) {
        logger.error('[AUTH CALLBACK] No session returned from exchangeCodeForSession')
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      // Get user to check if they're new
      // Use the user from sessionData first, fallback to getUser()
      let user: User | null = sessionData.user
      if (!user) {
        const { data: { user: fetchedUser }, error: getUserError } = await supabase.auth.getUser()

        if (getUserError) {
          logger.error('[AUTH CALLBACK] getUser() error', getUserError instanceof Error ? getUserError : undefined, { message: getUserError.message })
          return NextResponse.redirect(`${origin}/auth/error`)
        }
        user = fetchedUser || null
      }

      if (!user) {
        logger.error('[AUTH CALLBACK] No user found after exchangeCodeForSession')
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      // Handle referral code from cookie (OAuth flow)
      const cookieStore = await cookies()
      const referralCode = cookieStore.get('pelican_ref')?.value
      if (referralCode) {
        try {
          const trimmedCode = referralCode.toUpperCase().trim()

          // First validate the code
          const { data: validationData, error: validationError } = await supabase.rpc('validate_referral_code', {
            input_code: trimmedCode,
          })

          if (!validationError && validationData?.valid) {
            // Record the referral
            await supabase.rpc('record_referral', {
              p_code: trimmedCode,
              p_user_id: user.id,
            })
          }
        } catch (error) {
          logger.error('[AUTH CALLBACK] Failed to record referral', error instanceof Error ? error : undefined)
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

      const validPlans = ['starter', 'pro', 'power', 'founder']
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
    return NextResponse.redirect(new URL('/chat', request.url))
  } catch (error) {
    logger.error('[AUTH CALLBACK] Unhandled error', error instanceof Error ? error : undefined)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }
}
