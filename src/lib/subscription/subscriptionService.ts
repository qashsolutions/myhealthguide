/**
 * Unified Subscription Service
 * Single source of truth for all subscription/pricing logic across the application
 */

// ============= Types =============

export type PlanTier = 'family' | 'single_agency' | 'multi_agency';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

export type FeatureName =
  | 'calendar'
  | 'shift_handoff'
  | 'agency_dashboard'
  | 'multi_caregiver'
  | 'advanced_analytics'
  | 'real_time_collaboration'
  | 'availability_scheduling';

export interface PlanLimits {
  maxElders: number;
  maxMembers: number;
  maxGroups: number;
  maxRecipients: number;
  storageMB: number;
  storageBytes: number;
  maxCaregivers?: number;
  maxEldersPerCaregiver?: number;
  maxMembersPerCaregiver?: number;
  maxMembersPerGroup?: number;
}

export interface PlanConfig {
  id: PlanTier;
  name: string;
  subtitle: string;
  price: number;
  priceNote: string;
  limits: PlanLimits;
  features: FeatureName[];
  extras: string[];
  rank: number;
}

export interface UpgradePromptInfo {
  title: string;
  message: string;
  targetPlan: PlanTier;
  targetPlanName: string;
  targetPrice: number;
}

// ============= Constants =============

export const REFUND_WINDOW_DAYS = 7;
export const BILLING_CYCLE_DAYS = 30;
export const TRIAL_DURATION_DAYS = 45;
export const MULTI_AGENCY_TRIAL_DAYS = 30;

export const CORE_FEATURES = [
  'Voice-powered health logging',
  'Medication & supplement tracking',
  'Diet & nutrition logging',
  'Smart health insights & chat',
  'Drug interaction checking',
  'Dementia screening (Q&A + behavioral)',
  'Clinical notes for doctor visits',
  'Family update reports',
  'Incident reporting',
  'Push notification reminders',
] as const;

// ============= Plan Configuration (Single Source of Truth) =============

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  family: {
    id: 'family',
    name: 'Family Plan A',
    subtitle: 'For individual caregivers',
    price: 8.99,
    priceNote: '/elder/month',
    rank: 1,
    limits: {
      maxElders: 1,
      maxMembers: 2,
      maxGroups: 1,
      maxRecipients: 2,
      storageMB: 25,
      storageBytes: 25 * 1024 * 1024,
    },
    features: [],
    extras: [],
  },
  single_agency: {
    id: 'single_agency',
    name: 'Family Plan B',
    subtitle: 'Add up to 3 family members or friends',
    price: 18.99,
    priceNote: '/month',
    rank: 2,
    limits: {
      maxElders: 1,
      maxMembers: 4,
      maxGroups: 1,
      maxRecipients: 4,
      storageMB: 50,
      storageBytes: 50 * 1024 * 1024,
    },
    features: ['real_time_collaboration', 'agency_dashboard'],
    extras: ['Real-time updates for all members', 'Team dashboard'],
  },
  multi_agency: {
    id: 'multi_agency',
    name: 'Multi Agency Plan',
    subtitle: 'For professional caregivers',
    price: 55,
    priceNote: '/elder/month',
    rank: 3,
    limits: {
      maxElders: 30,
      maxMembers: 4,
      maxGroups: 10,
      maxRecipients: 10,
      storageMB: 500,
      storageBytes: 500 * 1024 * 1024,
      maxCaregivers: 10,
      maxEldersPerCaregiver: 3,
      maxMembersPerCaregiver: 2,
      maxMembersPerGroup: 4,
    },
    features: [
      'real_time_collaboration',
      'agency_dashboard',
      'calendar',
      'shift_handoff',
      'multi_caregiver',
      'advanced_analytics',
      'availability_scheduling',
    ],
    extras: [
      'Shift calendar & scheduling',
      'Smart handoff notes',
      'Multi-caregiver coordination',
      'Caregiver availability tracking',
      'Caregiver burnout detection',
      'Caregiver & agency analytics',
      'Timesheet tracking',
    ],
  },
};

// Feature display names for upgrade prompts
const FEATURE_DISPLAY_NAMES: Record<FeatureName, string> = {
  calendar: 'Calendar',
  shift_handoff: 'Shift Handoff',
  agency_dashboard: 'Agency Dashboard',
  multi_caregiver: 'Multi-Caregiver Coordination',
  advanced_analytics: 'Advanced Analytics',
  real_time_collaboration: 'Real-time Collaboration',
  availability_scheduling: 'Availability Scheduling',
};

// ============= Helper Functions =============

/**
 * Get plan configuration for a tier
 */
export function getPlanConfig(tier: PlanTier | null): PlanConfig {
  if (!tier || !PLAN_CONFIG[tier]) {
    return PLAN_CONFIG.family;
  }
  return PLAN_CONFIG[tier];
}

/**
 * Get plan limits for a tier
 */
export function getPlanLimits(tier: PlanTier | null): PlanLimits {
  return getPlanConfig(tier).limits;
}

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeature(tier: PlanTier | null, feature: FeatureName): boolean {
  if (!tier) {
    return false;
  }
  const config = PLAN_CONFIG[tier];
  return config.features.includes(feature);
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: FeatureName): PlanTier {
  if (PLAN_CONFIG.family.features.includes(feature)) {
    return 'family';
  }
  if (PLAN_CONFIG.single_agency.features.includes(feature)) {
    return 'single_agency';
  }
  return 'multi_agency';
}

/**
 * Get maximum notification recipients for a tier
 */
export function getMaxRecipients(tier: PlanTier | null): number {
  return getPlanLimits(tier).maxRecipients;
}

/**
 * Get maximum group members for a tier
 */
export function getMaxMembers(tier: PlanTier | null): number {
  return getPlanLimits(tier).maxMembers;
}

/**
 * Get maximum elders for a tier
 */
export function getMaxElders(tier: PlanTier | null): number {
  return getPlanLimits(tier).maxElders;
}

/**
 * Get maximum groups for a tier
 */
export function getMaxGroups(tier: PlanTier | null): number {
  return getPlanLimits(tier).maxGroups;
}

/**
 * Get maximum caregivers (multi-agency only)
 */
export function getMaxCaregivers(tier: PlanTier | null): number {
  if (tier !== 'multi_agency') {
    return 1;
  }
  return PLAN_CONFIG.multi_agency.limits.maxCaregivers || 10;
}

/**
 * Get maximum elders per caregiver (multi-agency only)
 */
export function getMaxEldersPerCaregiver(tier: PlanTier | null): number {
  if (tier !== 'multi_agency') {
    return 1;
  }
  return PLAN_CONFIG.multi_agency.limits.maxEldersPerCaregiver || 3;
}

/**
 * Get storage limit in bytes for a tier
 */
export function getStorageLimit(tier: PlanTier | null): number {
  return getPlanLimits(tier).storageBytes;
}

/**
 * Get storage limit in MB for a tier
 */
export function getStorageLimitMB(tier: PlanTier | null): number {
  return getPlanLimits(tier).storageMB;
}

/**
 * Determine if a plan change is an upgrade, downgrade, or same
 */
export function getPlanChangeType(
  currentTier: PlanTier | null,
  newTier: PlanTier
): 'upgrade' | 'downgrade' | 'same' {
  const currentRank = currentTier ? PLAN_CONFIG[currentTier].rank : 0;
  const newRank = PLAN_CONFIG[newTier].rank;

  if (newRank > currentRank) return 'upgrade';
  if (newRank < currentRank) return 'downgrade';
  return 'same';
}

/**
 * Get upgrade prompt information for a feature
 */
export function getUpgradePrompt(
  currentTier: PlanTier | null,
  feature: FeatureName
): UpgradePromptInfo {
  const minimumTier = getMinimumTierForFeature(feature);
  const targetConfig = PLAN_CONFIG[minimumTier];
  const featureDisplayName = FEATURE_DISPLAY_NAMES[feature];

  return {
    title: `Upgrade to Access ${featureDisplayName}`,
    message: `The ${featureDisplayName} feature is available on the ${targetConfig.name}. Upgrade now to unlock this and other premium features.`,
    targetPlan: minimumTier,
    targetPlanName: targetConfig.name,
    targetPrice: targetConfig.price,
  };
}

/**
 * Get a user-friendly upgrade message based on current tier
 */
export function getUpgradeMessage(tier: PlanTier | null): string {
  switch (tier) {
    case 'family':
      return `Upgrade to Single Agency ($${PLAN_CONFIG.single_agency.price}/elder/month) to add more members and enable real-time collaboration.`;
    case 'single_agency':
      return `Upgrade to Multi Agency ($${PLAN_CONFIG.multi_agency.price}/elder/month) to manage multiple caregivers and up to 30 elders.`;
    case 'multi_agency':
      return 'You are on the Multi Agency plan. Contact us for enterprise options.';
    default:
      return 'Please subscribe to a plan to access premium features.';
  }
}

/**
 * Get plan info for display (name and description)
 */
export function getPlanDisplayInfo(tier: PlanTier | null): { name: string; description: string } {
  if (!tier) {
    return {
      name: 'Free Trial',
      description: 'Limited to Family plan features',
    };
  }

  const config = PLAN_CONFIG[tier];
  const limits = config.limits;

  let description: string;
  switch (tier) {
    case 'family':
      description = `${limits.maxElders} elder, ${limits.maxMembers} members`;
      break;
    case 'single_agency':
      description = `${limits.maxElders} elder, ${limits.maxMembers} members, agency features`;
      break;
    case 'multi_agency':
      description = `Up to ${limits.maxElders} elders, ${limits.maxCaregivers} caregivers`;
      break;
    default:
      description = '';
  }

  return {
    name: config.name,
    description,
  };
}

/**
 * Check if user can downgrade from current tier to target tier
 * Multi-agency cannot downgrade (would lose caregivers/elders data)
 */
export function canDowngrade(currentTier: PlanTier | null, targetTier: PlanTier): boolean {
  if (!currentTier) return false;
  if (currentTier === 'multi_agency') return false;
  if (currentTier === 'family') return false;

  return getPlanChangeType(currentTier, targetTier) === 'downgrade';
}

/**
 * Get all plans as an array (useful for rendering plan cards)
 */
export function getAllPlans(): PlanConfig[] {
  return [PLAN_CONFIG.family, PLAN_CONFIG.single_agency, PLAN_CONFIG.multi_agency];
}

/**
 * Get Stripe price ID for a plan tier
 */
export function getStripePriceId(tier: PlanTier): string | undefined {
  switch (tier) {
    case 'family':
      return process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID;
    case 'single_agency':
      return process.env.NEXT_PUBLIC_STRIPE_SINGLE_AGENCY_PRICE_ID;
    case 'multi_agency':
      return process.env.NEXT_PUBLIC_STRIPE_MULTI_AGENCY_PRICE_ID;
  }
}

// ============= Backward Compatibility Exports =============

// These match the old PRICING constant structure for backward compatibility
export const PRICING = {
  REFUND_WINDOW_DAYS,
  BILLING_CYCLE_DAYS,
  MULTI_AGENCY: {
    ELDER_MONTHLY_RATE: PLAN_CONFIG.multi_agency.price,
    MONTHLY_RATE: PLAN_CONFIG.multi_agency.price,
    MAX_ELDERS: PLAN_CONFIG.multi_agency.limits.maxElders,
    MAX_CAREGIVERS: PLAN_CONFIG.multi_agency.limits.maxCaregivers,
    MAX_ELDERS_PER_CAREGIVER: PLAN_CONFIG.multi_agency.limits.maxEldersPerCaregiver,
    MAX_GROUPS: PLAN_CONFIG.multi_agency.limits.maxGroups,
    STORAGE_MB: PLAN_CONFIG.multi_agency.limits.storageMB,
    PRICE_RANK: PLAN_CONFIG.multi_agency.rank,
  },
  SINGLE_AGENCY: {
    MONTHLY_RATE: PLAN_CONFIG.single_agency.price,
    MAX_ELDERS: PLAN_CONFIG.single_agency.limits.maxElders,
    MAX_MEMBERS: PLAN_CONFIG.single_agency.limits.maxMembers,
    MAX_GROUPS: PLAN_CONFIG.single_agency.limits.maxGroups,
    STORAGE_MB: PLAN_CONFIG.single_agency.limits.storageMB,
    PRICE_RANK: PLAN_CONFIG.single_agency.rank,
  },
  FAMILY: {
    MONTHLY_RATE: PLAN_CONFIG.family.price,
    MAX_ELDERS: PLAN_CONFIG.family.limits.maxElders,
    MAX_MEMBERS: PLAN_CONFIG.family.limits.maxMembers,
    MAX_GROUPS: PLAN_CONFIG.family.limits.maxGroups,
    STORAGE_MB: PLAN_CONFIG.family.limits.storageMB,
    PRICE_RANK: PLAN_CONFIG.family.rank,
  },
} as const;

// Plan features for backward compatibility
export const PLAN_FEATURES = {
  family: {
    name: PLAN_CONFIG.family.name,
    subtitle: PLAN_CONFIG.family.subtitle,
    priceNote: PLAN_CONFIG.family.priceNote,
    limits: [
      `${PLAN_CONFIG.family.limits.maxElders} elder`,
      `1 admin + 1 member`,
      `${PLAN_CONFIG.family.limits.storageMB} MB storage`,
    ],
    extras: PLAN_CONFIG.family.extras,
  },
  single_agency: {
    name: PLAN_CONFIG.single_agency.name,
    subtitle: PLAN_CONFIG.single_agency.subtitle,
    priceNote: PLAN_CONFIG.single_agency.priceNote,
    limits: [
      `${PLAN_CONFIG.single_agency.limits.maxElders} elder`,
      `1 admin + ${PLAN_CONFIG.single_agency.limits.maxMembers - 1} members`,
      `${PLAN_CONFIG.single_agency.limits.storageMB} MB storage`,
    ],
    extras: PLAN_CONFIG.single_agency.extras,
  },
  multi_agency: {
    name: PLAN_CONFIG.multi_agency.name,
    subtitle: PLAN_CONFIG.multi_agency.subtitle,
    priceNote: PLAN_CONFIG.multi_agency.priceNote,
    limits: [
      `Up to ${PLAN_CONFIG.multi_agency.limits.maxElders} elders`,
      `Up to ${PLAN_CONFIG.multi_agency.limits.maxCaregivers} caregivers`,
      `${PLAN_CONFIG.multi_agency.limits.storageMB} MB storage`,
    ],
    extras: PLAN_CONFIG.multi_agency.extras,
  },
} as const;

// Additional features for detailed pricing pages
export const DETAILED_FEATURES = {
  core: [
    { name: 'Voice-powered health logging', description: 'Log medications, meals, and notes by voice' },
    { name: 'Medication & supplement tracking', description: 'Track dosages, schedules, and compliance' },
    { name: 'Diet & nutrition logging', description: 'Log meals with nutritional insights' },
    { name: 'Smart health insights & chat', description: 'Ask questions about logged health data' },
    { name: 'Drug interaction checking', description: 'FDA drug label analysis for interactions' },
    { name: 'Dementia screening', description: 'Q&A assessment + behavioral pattern detection' },
    { name: 'Clinical notes', description: 'Generate doctor visit preparation reports' },
    { name: 'Family update reports', description: 'Auto-generated weekly updates for family' },
    { name: 'Incident reporting', description: 'Document falls, injuries, medication errors' },
    { name: 'Health analytics', description: 'Adherence prediction, nutrition analysis, trends' },
  ],
  single_agency: [
    { name: 'Real-time collaboration', description: 'Live dashboard updates for team members' },
    { name: 'Agency dashboard', description: 'Agency-level monitoring and overview' },
  ],
  multi_agency: [
    { name: 'Shift calendar & scheduling', description: 'Visual week/month shift management' },
    { name: 'Smart handoff notes', description: 'Auto-generated caregiver transition notes' },
    { name: 'Multi-caregiver coordination', description: 'Assign caregivers to elders' },
    { name: 'Caregiver availability', description: 'Track scheduling preferences' },
    { name: 'Caregiver burnout detection', description: 'Monitor stress levels proactively' },
    { name: 'Advanced analytics', description: 'Agency-wide performance analytics' },
    { name: 'Timesheet tracking', description: 'Track caregiver hours worked' },
  ],
} as const;

// Plan hierarchy for backward compatibility
export const PLAN_HIERARCHY: Record<string, number> = {
  family: PLAN_CONFIG.family.rank,
  single_agency: PLAN_CONFIG.single_agency.rank,
  multi_agency: PLAN_CONFIG.multi_agency.rank,
};

// Storage limits for backward compatibility
export const STORAGE_LIMITS = {
  FAMILY: PLAN_CONFIG.family.limits.storageBytes,
  SINGLE_AGENCY: PLAN_CONFIG.single_agency.limits.storageBytes,
  MULTI_AGENCY: PLAN_CONFIG.multi_agency.limits.storageBytes,
} as const;

// Plan limits for backward compatibility
export const PLAN_LIMITS = {
  FAMILY: {
    maxElders: PLAN_CONFIG.family.limits.maxElders,
    maxMembers: PLAN_CONFIG.family.limits.maxMembers,
    maxGroups: PLAN_CONFIG.family.limits.maxGroups,
    storage: PLAN_CONFIG.family.limits.storageBytes,
    price: PLAN_CONFIG.family.price,
  },
  SINGLE_AGENCY: {
    maxElders: PLAN_CONFIG.single_agency.limits.maxElders,
    maxMembers: PLAN_CONFIG.single_agency.limits.maxMembers,
    maxGroups: PLAN_CONFIG.single_agency.limits.maxGroups,
    storage: PLAN_CONFIG.single_agency.limits.storageBytes,
    price: PLAN_CONFIG.single_agency.price,
  },
  MULTI_AGENCY: {
    maxElders: PLAN_CONFIG.multi_agency.limits.maxElders,
    maxCaregivers: PLAN_CONFIG.multi_agency.limits.maxCaregivers,
    maxEldersPerCaregiver: PLAN_CONFIG.multi_agency.limits.maxEldersPerCaregiver,
    maxMembersPerCaregiver: PLAN_CONFIG.multi_agency.limits.maxMembersPerCaregiver,
    maxGroups: PLAN_CONFIG.multi_agency.limits.maxGroups,
    maxMembersPerGroup: PLAN_CONFIG.multi_agency.limits.maxMembersPerGroup,
    storage: PLAN_CONFIG.multi_agency.limits.storageBytes,
    price: PLAN_CONFIG.multi_agency.price,
  },
} as const;
