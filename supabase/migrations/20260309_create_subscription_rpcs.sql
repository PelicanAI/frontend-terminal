-- Subscription management RPC functions
-- These are called by the Stripe webhook handler to update subscription status

-- Function to cancel a user's subscription
-- Called when customer.subscription.deleted webhook fires
CREATE OR REPLACE FUNCTION public.cancel_subscription(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
  SET
    plan_type = 'none',
    stripe_subscription_id = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log for debugging
  RAISE NOTICE 'Cancelled subscription for user %', p_user_id;
END;
$$;

COMMENT ON FUNCTION public.cancel_subscription IS 'Cancels a user subscription by setting plan_type to none and clearing stripe_subscription_id';

-- Function to setup a new subscriber after successful checkout
-- Called when checkout.session.completed webhook fires
CREATE OR REPLACE FUNCTION public.setup_subscriber(
  p_user_id UUID,
  p_plan_type TEXT,
  p_credits INTEGER,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update existing record or insert if doesn't exist
  INSERT INTO public.user_credits (
    user_id,
    plan_type,
    plan_credits_monthly,
    credits_balance,
    stripe_customer_id,
    stripe_subscription_id,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_plan_type,
    p_credits,
    p_credits, -- Start with full monthly allocation
    p_stripe_customer_id,
    p_stripe_subscription_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    plan_credits_monthly = EXCLUDED.plan_credits_monthly,
    -- Don't decrease existing balance, only increase if new allocation is higher
    credits_balance = GREATEST(user_credits.credits_balance, EXCLUDED.credits_balance),
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    updated_at = NOW();

  -- Log for debugging
  RAISE NOTICE 'Setup subscriber for user %, plan %, credits %', p_user_id, p_plan_type, p_credits;
END;
$$;

COMMENT ON FUNCTION public.setup_subscriber IS 'Sets up a new subscriber after successful Stripe checkout, preserving existing credit balance';

-- Function to reset monthly credits at billing cycle renewal
-- Called when invoice.paid webhook fires with billing_reason = 'subscription_cycle'
CREATE OR REPLACE FUNCTION public.reset_monthly_credits(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_credits INTEGER;
  v_current_balance INTEGER;
  v_rollover_limit INTEGER;
BEGIN
  -- Get user's plan details
  SELECT
    plan_credits_monthly,
    credits_balance
  INTO
    v_monthly_credits,
    v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found in user_credits', p_user_id;
  END IF;

  -- Calculate rollover limit (20% of monthly allocation)
  v_rollover_limit := FLOOR(v_monthly_credits * 0.2);

  -- Reset credits: give full monthly allocation + rollover (capped at 20%)
  UPDATE public.user_credits
  SET
    credits_balance = v_monthly_credits + LEAST(v_current_balance, v_rollover_limit),
    credits_used_this_month = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log for debugging
  RAISE NOTICE 'Reset monthly credits for user %, new balance: %', p_user_id, v_monthly_credits + LEAST(v_current_balance, v_rollover_limit);
END;
$$;

COMMENT ON FUNCTION public.reset_monthly_credits IS 'Resets monthly credits at billing cycle, allowing up to 20% rollover from previous balance';

-- Grant execute permissions to authenticated users (via service role)
GRANT EXECUTE ON FUNCTION public.cancel_subscription TO service_role;
GRANT EXECUTE ON FUNCTION public.setup_subscriber TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_monthly_credits TO service_role;
