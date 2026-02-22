// Canonical plan configuration — single source of truth for plan types, prices, and credits.
// Import from here instead of using inline strings/numbers.

export const PLAN_CONFIG = {
  none: {
    label: 'Free',
    price: 0,
    credits: 0,
    stripePriceId: null,
    color: 'gray',
  },
  starter: {
    label: 'Starter',
    price: 29,
    credits: 1000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? null,
    color: 'green',
  },
  pro: {
    label: 'Pro',
    price: 99,
    credits: 3500,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null,
    color: 'purple',
  },
  power: {
    label: 'Power',
    price: 249,
    credits: 10000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID ?? null,
    color: 'blue',
  },
  founder: {
    label: 'Founder',
    price: 0,
    credits: 999999,
    stripePriceId: null,
    color: 'amber',
  },
  past_due: {
    label: 'Past Due',
    price: 0,
    credits: 0,
    stripePriceId: null,
    color: 'red',
  },
} as const

export type PlanType = keyof typeof PLAN_CONFIG

/** All valid plan_type values that can appear in the database */
export const VALID_PLAN_TYPES = Object.keys(PLAN_CONFIG) as PlanType[]

/** Plans that count as "has a subscription" for access gating */
export const PAID_PLANS: PlanType[] = ['starter', 'pro', 'power']

/** Plans that grant access (paid + founder) */
export const ACCESS_PLANS: PlanType[] = ['starter', 'pro', 'power', 'founder']

/** Map Stripe price IDs → plan types (server-side only, reads env vars) */
export function getPlanByPriceId(priceId: string): PlanType | null {
  for (const [key, config] of Object.entries(PLAN_CONFIG)) {
    if (config.stripePriceId && config.stripePriceId === priceId) return key as PlanType
  }
  return null
}

/** Get price for a plan type */
export function getPlanPrice(planType: string): number {
  return PLAN_CONFIG[planType as PlanType]?.price ?? 0
}

/** Get monthly credit allocation for a plan type */
export function getPlanCredits(planType: string): number {
  return PLAN_CONFIG[planType as PlanType]?.credits ?? 0
}

/** Check if a plan_type represents an active paid subscription */
export function isPaidPlan(planType: string): boolean {
  return PAID_PLANS.includes(planType as PlanType)
}

/** Check if a plan_type grants access (paid or founder) */
export function hasAccess(planType: string): boolean {
  return ACCESS_PLANS.includes(planType as PlanType)
}

/** Map of plan type → price, for MRR calculations */
export const PLAN_PRICES: Record<string, number> = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([key, config]) => [key, config.price])
)

/** Map of plan type → monthly credits */
export const PLAN_CREDITS: Record<string, number> = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([key, config]) => [key, config.credits])
)
