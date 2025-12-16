/**
 * Pricing Constants
 *
 * This file re-exports all pricing/subscription constants from the centralized
 * subscription service for backward compatibility.
 *
 * The single source of truth is now: @/lib/subscription/subscriptionService.ts
 *
 * @deprecated Import from '@/lib/subscription' instead
 */

// Re-export everything from subscription service
export {
  // Constants
  PRICING,
  PLAN_FEATURES,
  PLAN_HIERARCHY,
  CORE_FEATURES,
  REFUND_WINDOW_DAYS,
  BILLING_CYCLE_DAYS,
  STORAGE_LIMITS,
  PLAN_LIMITS,

  // Functions
  getPlanChangeType,
  getStripePriceId,

  // Types
  type PlanTier as SubscriptionTier,
  type SubscriptionStatus,
} from '@/lib/subscription';
