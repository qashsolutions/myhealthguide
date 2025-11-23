export const PRICING = {
  MULTI_AGENCY: {
    ELDER_MONTHLY_RATE: 30, // $30 per elder per 31 days
    BILLING_CYCLE_DAYS: 31, // 31-day billing cycles
    REFUND_WINDOW_DAYS: 7, // 7-day full refund window
    MAX_ELDERS: 30, // Maximum elders per agency
    MAX_CAREGIVERS: 10, // Maximum caregivers per agency
    MAX_ELDERS_PER_CAREGIVER: 3, // Maximum elders per caregiver
  },
  SINGLE_AGENCY: {
    MONTHLY_RATE: 14.99,
    MAX_ELDERS: 4,
    MAX_MEMBERS: 4,
  },
  FAMILY: {
    MONTHLY_RATE: 8.99,
    MAX_ELDERS: 2,
    MAX_MEMBERS: 2,
  },
} as const;

export type SubscriptionTier = 'family' | 'single_agency' | 'multi_agency';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';
export type ElderSubscriptionStatus = 'active' | 'cancelled' | 'refunded' | 'at_risk';
