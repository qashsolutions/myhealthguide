/**
 * Subscription Module
 * Unified exports for all subscription-related functionality
 */

// Core service exports
export {
  // Types
  type PlanTier,
  type SubscriptionStatus,
  type FeatureName,
  type PlanLimits,
  type PlanConfig,
  type UpgradePromptInfo,

  // Constants
  REFUND_WINDOW_DAYS,
  BILLING_CYCLE_DAYS,
  TRIAL_DURATION_DAYS,
  MULTI_AGENCY_TRIAL_DAYS,
  CORE_FEATURES,
  PLAN_CONFIG,

  // Functions
  getPlanConfig,
  getPlanLimits,
  hasFeature,
  getMinimumTierForFeature,
  getMaxRecipients,
  getMaxMembers,
  getMaxElders,
  getMaxGroups,
  getMaxCaregivers,
  getMaxEldersPerCaregiver,
  getStorageLimit,
  getStorageLimitMB,
  getPlanChangeType,
  getUpgradePrompt,
  getUpgradeMessage,
  getPlanDisplayInfo,
  canDowngrade,
  getAllPlans,
  getStripePriceId,

  // Backward compatibility exports
  PRICING,
  PLAN_FEATURES,
  PLAN_HIERARCHY,
  STORAGE_LIMITS,
  PLAN_LIMITS,
  DETAILED_FEATURES,
} from './subscriptionService';

// React hook export
export { useSubscription, type SubscriptionState } from './useSubscription';
