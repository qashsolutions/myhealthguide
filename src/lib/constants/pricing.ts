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
    MAX_GROUPS: 10, // Maximum groups
    STORAGE_MB: 500,
    PRICE_RANK: 3, // Highest tier
  },
  SINGLE_AGENCY: {
    MONTHLY_RATE: 14.99,
    MAX_ELDERS: 1, // 1 elder (care recipient)
    MAX_MEMBERS: 4, // 1 admin + 3 members
    MAX_GROUPS: 1,
    STORAGE_MB: 50,
    PRICE_RANK: 2, // Middle tier
  },
  FAMILY: {
    MONTHLY_RATE: 8.99,
    MAX_ELDERS: 1, // 1 elder (care recipient)
    MAX_MEMBERS: 2, // 1 admin + 1 member
    MAX_GROUPS: 1,
    STORAGE_MB: 25,
    PRICE_RANK: 1, // Lowest tier
  },
} as const;

// Core features available to ALL plans
export const CORE_FEATURES = [
  'Voice-powered health logging',
  'Medication tracking & reminders',
  'Diet & nutrition tracking',
  'Daily health summaries',
  'AI health insights',
  'Compliance tracking',
] as const;

// Plan-specific feature configurations (single source of truth)
export const PLAN_FEATURES = {
  family: {
    name: 'Family Plan',
    subtitle: 'Perfect for small families',
    priceNote: '/elder/month',
    limits: [
      `${PRICING.FAMILY.MAX_ELDERS} elder`,
      `1 admin + 1 member`,
      `${PRICING.FAMILY.STORAGE_MB} MB storage`,
    ],
    extras: [] as string[], // No additional features beyond core
  },
  single_agency: {
    name: 'Single Agency Plan',
    subtitle: 'For families with caregivers',
    priceNote: '/elder/month',
    limits: [
      `${PRICING.SINGLE_AGENCY.MAX_ELDERS} elder`,
      `1 admin + ${PRICING.SINGLE_AGENCY.MAX_MEMBERS - 1} members`,
      `${PRICING.SINGLE_AGENCY.STORAGE_MB} MB storage`,
    ],
    extras: [
      'Real-time collaboration',
      'Agency dashboard',
    ],
  },
  multi_agency: {
    name: 'Multi Agency Plan',
    subtitle: 'For professional caregivers',
    priceNote: '/elder/month',
    limits: [
      `Up to ${PRICING.MULTI_AGENCY.MAX_ELDERS} elders`,
      `Up to ${PRICING.MULTI_AGENCY.MAX_CAREGIVERS} caregivers`,
      `${PRICING.MULTI_AGENCY.STORAGE_MB} MB storage`,
    ],
    extras: [
      'Real-time collaboration',
      'Agency dashboard',
      'Multi-caregiver coordination',
      'Shift scheduling',
      'Advanced analytics',
    ],
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
