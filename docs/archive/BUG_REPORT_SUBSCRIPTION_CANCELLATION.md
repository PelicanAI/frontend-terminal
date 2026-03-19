# 🚨 P0 BUG FIX: SUBSCRIPTION CANCELLATION

## EXECUTIVE SUMMARY

**BUG:** Users who cancel subscriptions through the Stripe billing portal remain marked as "active" in the Pelican database, even though Stripe correctly cancels the subscription.

**ROOT CAUSE:** The Stripe webhook calls three Supabase RPC functions (`cancel_subscription`, `setup_subscriber`, `reset_monthly_credits`) that **DO NOT EXIST** in the database.

**SEVERITY:** P0 - Critical billing bug affecting real users
- ✅ Users are NOT charged after cancellation (Stripe handles this correctly)
- ❌ App shows incorrect subscription status
- ❌ Users may retain access to features they shouldn't have
- ❌ Analytics and metrics are incorrect

**STATUS:** ✅ **FIXED** - Migration created, ready to deploy

---

## INVESTIGATION FINDINGS

### PHASE 1: Cancel Flow Architecture (ALL CORRECT ✅)

1. **UI Component:** `components/manage-subscription-button.tsx`
   - Button labeled "Manage Subscription"
   - Calls `POST /api/stripe/billing-portal` (line 27)

2. **Billing Portal Endpoint:** `app/api/stripe/billing-portal/route.ts`
   - Creates Stripe billing portal session (line 57-60)
   - Redirects user to Stripe's hosted portal
   - User cancels subscription in Stripe UI

3. **Stripe Processes Cancellation:**
   - Subscription status → `canceled`
   - Sends webhook: `customer.subscription.deleted`

4. **Webhook Handler:** `app/api/stripe/webhook/route.ts`
   - Receives `customer.subscription.deleted` event (line 167)
   - Extracts `user_id` from `subscription.metadata` (line 169) ✅
   - Calls `cancel_subscription(p_user_id)` RPC (line 172) ❌

### PHASE 2: The Missing Piece

**The webhook handler calls THREE RPC functions that don't exist:**

```typescript
// Line 172: customer.subscription.deleted
await supabaseAdmin.rpc('cancel_subscription', { p_user_id: userId })

// Line 85: checkout.session.completed
await supabaseAdmin.rpc('setup_subscriber', {
  p_user_id: userId,
  p_plan_type: planName,
  p_credits: credits,
  p_stripe_customer_id: session.customer,
  p_stripe_subscription_id: subscription.id
})

// Line 129: invoice.paid (subscription_cycle)
await supabaseAdmin.rpc('reset_monthly_credits', { p_user_id: userId })
```

**Searched entire codebase:**
```bash
find supabase -name "*.sql" -exec grep -l "cancel_subscription" {} \;
# Result: NO FILES FOUND
```

**Conclusion:** The functions were never created in Supabase migrations. The webhook code was written before the database functions were implemented.

---

## THE FIX

### Created Migration: `supabase/migrations/20260309_create_subscription_rpcs.sql`

This migration creates all three missing RPC functions:

#### 1. `cancel_subscription(p_user_id UUID)`
- Sets `plan_type = 'none'`
- Clears `stripe_subscription_id`
- Called when user cancels through Stripe billing portal

#### 2. `setup_subscriber(p_user_id, p_plan_type, p_credits, p_stripe_customer_id, p_stripe_subscription_id)`
- Upserts user_credits record
- Sets plan details and Stripe IDs
- Preserves existing credit balance (doesn't decrease)
- Called when checkout completes successfully

#### 3. `reset_monthly_credits(p_user_id UUID)`
- Resets `credits_balance` to monthly allocation
- Allows 20% rollover from previous balance
- Resets `credits_used_this_month` to 0
- Called on monthly billing cycle (invoice.paid)

**Security:**
- All functions use `SECURITY DEFINER` (run with creator privileges)
- Granted only to `service_role` (not public)
- Used `SET search_path = public` to prevent schema hijacking

---

## DEPLOYMENT STEPS

### 1. Push Migration to Supabase

```bash
# If using Supabase CLI
cd "c:\Users\grove\Desktop\Pelican Docs\Trade Journal"
supabase db push

# OR manually apply via Supabase dashboard
# Copy contents of supabase/migrations/20260309_create_subscription_rpcs.sql
# Paste into SQL Editor in Supabase dashboard
# Run the migration
```

### 2. Verify Functions Were Created

```sql
-- Run in Supabase SQL Editor
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'cancel_subscription',
  'setup_subscriber',
  'reset_monthly_credits'
)
ORDER BY routine_name;
```

Expected result: 3 rows showing FUNCTION with DEFINER security

### 3. Test with Real Cancellation

**Test Steps:**
1. Create a test subscription (use Stripe test mode)
2. Go to Settings → Click "Manage Subscription"
3. Cancel subscription in Stripe billing portal
4. Wait ~30 seconds for webhook to process
5. Check `user_credits` table:
   ```sql
   SELECT
     user_id,
     plan_type,
     stripe_subscription_id,
     updated_at
   FROM user_credits
   WHERE user_id = '<test_user_id>';
   ```
6. Verify `plan_type = 'none'` and `stripe_subscription_id IS NULL`

---

## STRIPE WEBHOOK CONFIGURATION

**Verify webhook is configured in Stripe Dashboard:**

1. Go to: https://dashboard.stripe.com/webhooks
2. Endpoint URL should be: `https://pelicantrading.ai/api/stripe/webhook`
3. Events to listen for:
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.updated`
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`

**Webhook Secret:**
- Must match `STRIPE_WEBHOOK_SECRET` environment variable
- Checked in code at line 26: `app/api/stripe/webhook/route.ts`

---

## ROLLBACK PLAN (IF NEEDED)

If the migration causes issues, rollback:

```sql
-- Drop all three functions
DROP FUNCTION IF EXISTS public.cancel_subscription(UUID);
DROP FUNCTION IF EXISTS public.setup_subscriber(UUID, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reset_monthly_credits(UUID);
```

Then investigate errors in Supabase logs and Vercel function logs.

---

## POST-DEPLOYMENT VERIFICATION

### Check for Affected Users

Users who cancelled recently but still show as active:

```sql
SELECT
  uc.user_id,
  uc.plan_type,
  uc.stripe_subscription_id,
  uc.stripe_customer_id,
  uc.updated_at,
  au.email
FROM user_credits uc
JOIN auth.users au ON au.id = uc.user_id
WHERE uc.plan_type != 'none'
  AND uc.stripe_subscription_id IS NOT NULL
ORDER BY uc.updated_at DESC
LIMIT 50;
```

For each user, verify their Stripe subscription status:
1. Go to Stripe dashboard
2. Search for customer by email or subscription ID
3. If Stripe shows "Canceled" but DB shows "active" → manually fix:
   ```sql
   UPDATE user_credits
   SET
     plan_type = 'none',
     stripe_subscription_id = NULL,
     updated_at = NOW()
   WHERE user_id = '<affected_user_id>';
   ```

---

## MONITORING

**After deployment, monitor:**

1. **Webhook Logs:**
   - Check Stripe dashboard → Webhooks → Recent deliveries
   - Should see successful 200 responses for all events

2. **Supabase Logs:**
   - Check for RPC errors
   - Look for NOTICE messages from the functions

3. **User Reports:**
   - Monitor support@pelicantrading.ai for cancellation issues
   - Check if users still show as "active" after canceling

---

## PREVENTION

**Why This Happened:**
- Webhook handler code written before database migrations
- No type checking for RPC function names (TypeScript can't validate runtime RPC calls)
- No integration tests verifying webhook → database flow

**Prevention Measures:**
1. ✅ Add integration test: simulate webhook → verify DB state
2. ✅ Document all RPC functions in migration files
3. ✅ Add type definitions for RPC function signatures
4. ✅ Add monitoring/alerts for webhook failures

---

## TECHNICAL DETAILS

### Webhook Event Flow

```
User Cancels in Stripe Portal
    ↓
Stripe: subscription.status = "canceled"
    ↓
Stripe sends webhook: customer.subscription.deleted
    ↓
app/api/stripe/webhook/route.ts receives event
    ↓
Verifies signature with STRIPE_WEBHOOK_SECRET
    ↓
Extracts userId from subscription.metadata.user_id
    ↓
Calls: supabaseAdmin.rpc('cancel_subscription', { p_user_id: userId })
    ↓
[BEFORE FIX]: RPC function not found → ERROR → DB not updated
[AFTER FIX]: RPC function executes → user_credits updated
```

### Database Schema (user_credits table)

```sql
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan_type TEXT NOT NULL DEFAULT 'none',
  plan_credits_monthly INTEGER NOT NULL DEFAULT 0,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  credits_used_this_month INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  free_questions_remaining INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Cancellation changes:**
- `plan_type`: 'starter'/'pro'/'power' → 'none'
- `stripe_subscription_id`: 'sub_xxx' → NULL
- `updated_at`: updated to NOW()

---

## CONTACT

**If issues arise after deployment:**
- Tech Lead: Nick Groves
- Email: support@pelicantrading.ai
- Check: Vercel logs, Supabase logs, Stripe webhook logs
