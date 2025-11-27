export const PRICING = {
  // Global subscription settings
  REFUND_WINDOW_DAYS: 7, // 7-day full refund window for all plans
  BILLING_CYCLE_DAYS: 30, // 30-day billing cycles for all plans

  MULTI_AGENCY: {
    ELDER_MONTHLY_RATE: 30, // $30 per elder per month
    MONTHLY_RATE: 30.00,
    MAX_ELDERS: 30, // Maximum elders per agency
    MAX_CAREGIVERS: 10, // Maximum caregivers per agency
    MAX_ELDERS_PER_CAREGIVER: 3, // Maximum elders per caregiver
    PRICE_RANK: 3, // Highest tier
  },
  SINGLE_AGENCY: {
    MONTHLY_RATE: 14.99,
    MAX_ELDERS: 4,
    MAX_MEMBERS: 4,
    PRICE_RANK: 2, // Middle tier
  },
  FAMILY: {
    MONTHLY_RATE: 8.99,
    MAX_ELDERS: 2,
    MAX_MEMBERS: 2,
    PRICE_RANK: 1, // Lowest tier
  },
} as const;

// Plan hierarchy for upgrade/downgrade logic
export const PLAN_HIERARCHY: Record<string, number> = {
  family: 1,
  single_agency: 2,
  multi_agency: 3,
};

// Helper to determine if change is upgrade or downgrade
export function getPlanChangeType(
  currentPlan: string,
  newPlan: string
): 'upgrade' | 'downgrade' | 'same' {
  const currentRank = PLAN_HIERARCHY[currentPlan] || 0;
  const newRank = PLAN_HIERARCHY[newPlan] || 0;
  if (newRank > currentRank) return 'upgrade';
  if (newRank < currentRank) return 'downgrade';
  return 'same';
}

export type SubscriptionTier = 'family' | 'single_agency' | 'multi_agency';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';
export type ElderSubscriptionStatus = 'active' | 'cancelled' | 'refunded' | 'at_risk';
