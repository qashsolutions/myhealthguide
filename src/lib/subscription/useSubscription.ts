'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  PlanTier,
  SubscriptionStatus,
  FeatureName,
  PlanLimits,
  PlanConfig,
  getPlanConfig,
  getPlanLimits,
  hasFeature,
  getUpgradePrompt,
  getUpgradeMessage,
  getPlanDisplayInfo,
  getPlanChangeType,
  UpgradePromptInfo,
} from './subscriptionService';

export interface SubscriptionState {
  // Current tier and status
  tier: PlanTier | null;
  status: SubscriptionStatus | null;

  // Computed boolean states
  isActive: boolean;
  isTrial: boolean;
  isPaid: boolean;
  isExpired: boolean;
  isCanceled: boolean;
  cancelAtPeriodEnd: boolean;

  // Tier-specific booleans
  isFamily: boolean;
  isSingleAgency: boolean;
  isMultiAgency: boolean;

  // Plan configuration
  config: PlanConfig;
  limits: PlanLimits;

  // Display info
  planName: string;
  planDescription: string;

  // Feature access
  hasFeature: (feature: FeatureName) => boolean;
  getUpgradePrompt: (feature: FeatureName) => UpgradePromptInfo;
  upgradeMessage: string;

  // Plan change helpers
  canUpgrade: boolean;
  canDowngrade: boolean;
  getPlanChangeType: (targetTier: PlanTier) => 'upgrade' | 'downgrade' | 'same';

  // Stripe info
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;

  // Pending changes
  pendingPlanChange: PlanTier | null;
}

/**
 * Convert Firestore Timestamp to Date
 */
function convertFirestoreTimestamp(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
    return new Date((timestamp as { seconds: number }).seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * React hook for accessing subscription state throughout the application
 */
export function useSubscription(): SubscriptionState {
  const { user } = useAuth();

  return useMemo(() => {
    const tier = (user?.subscriptionTier as PlanTier | null) || null;
    const status = (user?.subscriptionStatus as SubscriptionStatus | null) || null;
    const hasPaidSubscription = !!user?.stripeSubscriptionId;

    // Status checks
    const isTrial = status === 'trial';
    const isActive = status === 'active' || (status === 'trial' && hasPaidSubscription);
    const isPaid = hasPaidSubscription;
    const isExpired = status === 'expired';
    const isCanceled = status === 'canceled';
    const cancelAtPeriodEnd = user?.cancelAtPeriodEnd || false;

    // Tier checks
    const isFamily = tier === 'family';
    const isSingleAgency = tier === 'single_agency';
    const isMultiAgency = tier === 'multi_agency';

    // Get plan config and limits
    const config = getPlanConfig(tier);
    const limits = getPlanLimits(tier);

    // Display info
    const displayInfo = getPlanDisplayInfo(tier);

    // Feature access function
    const checkFeature = (feature: FeatureName): boolean => {
      // Trial users without paid subscription get family tier features
      if (isTrial && !hasPaidSubscription) {
        return hasFeature('family', feature);
      }
      return hasFeature(tier, feature);
    };

    // Upgrade prompt function
    const getUpgradePromptForFeature = (feature: FeatureName): UpgradePromptInfo => {
      return getUpgradePrompt(tier, feature);
    };

    // Upgrade message
    const upgradeMessage = getUpgradeMessage(tier);

    // Can upgrade (not on highest tier)
    const canUpgrade = tier !== 'multi_agency';

    // Can downgrade (only single_agency can downgrade to family)
    const canDowngrade = tier === 'single_agency';

    // Plan change type helper
    const checkPlanChangeType = (targetTier: PlanTier): 'upgrade' | 'downgrade' | 'same' => {
      return getPlanChangeType(tier, targetTier);
    };

    // Stripe info
    const stripeCustomerId = user?.stripeCustomerId || null;
    const stripeSubscriptionId = user?.stripeSubscriptionId || null;
    const currentPeriodEnd = convertFirestoreTimestamp(user?.currentPeriodEnd);

    // Pending changes
    const pendingPlanChange = (user?.pendingPlanChange as PlanTier | null) || null;

    return {
      tier,
      status,
      isActive,
      isTrial,
      isPaid,
      isExpired,
      isCanceled,
      cancelAtPeriodEnd,
      isFamily,
      isSingleAgency,
      isMultiAgency,
      config,
      limits,
      planName: displayInfo.name,
      planDescription: displayInfo.description,
      hasFeature: checkFeature,
      getUpgradePrompt: getUpgradePromptForFeature,
      upgradeMessage,
      canUpgrade,
      canDowngrade,
      getPlanChangeType: checkPlanChangeType,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd,
      pendingPlanChange,
    };
  }, [user]);
}

export default useSubscription;
