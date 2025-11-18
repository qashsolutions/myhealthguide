/**
 * Plan Limits Service
 * Enforces subscription tier limits across the application
 */

import { db } from './config';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { PLAN_LIMITS } from '@/types';

export interface PlanValidationResult {
  allowed: boolean;
  message?: string;
  limit?: number;
  current?: number;
}

/**
 * Get the subscription tier for a user
 */
export async function getUserTier(userId: string): Promise<'family' | 'single_agency' | 'multi_agency' | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();

    // During trial, assume family tier for limits
    if (userData.subscriptionStatus === 'trial') {
      return 'family';
    }

    return userData.subscriptionTier || null;
  } catch (error) {
    console.error('Error getting user tier:', error);
    return null;
  }
}

/**
 * Validate if user can create a new elder in a group
 */
export async function canCreateElder(
  userId: string,
  groupId: string
): Promise<PlanValidationResult> {
  try {
    const tier = await getUserTier(userId);

    if (!tier) {
      return {
        allowed: false,
        message: 'Unable to determine subscription tier'
      };
    }

    // Count existing elders in the group
    const eldersQuery = query(
      collection(db, 'elders'),
      where('groupId', '==', groupId)
    );
    const eldersSnap = await getDocs(eldersQuery);
    const currentElderCount = eldersSnap.size;

    // Get limit based on tier
    let maxElders: number;
    switch (tier) {
      case 'family':
        maxElders = PLAN_LIMITS.FAMILY.maxElders;
        break;
      case 'single_agency':
        maxElders = PLAN_LIMITS.SINGLE_AGENCY.maxElders;
        break;
      case 'multi_agency':
        // For multi-agency, check total elders across all groups
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        const groupIds = userData?.groups?.map((g: any) => g.groupId) || [];

        let totalElders = 0;
        for (const gId of groupIds) {
          const q = query(collection(db, 'elders'), where('groupId', '==', gId));
          const snap = await getDocs(q);
          totalElders += snap.size;
        }

        if (totalElders >= PLAN_LIMITS.MULTI_AGENCY.maxElders) {
          return {
            allowed: false,
            message: `Multi Agency plan is limited to ${PLAN_LIMITS.MULTI_AGENCY.maxElders} elders total across all groups. Current: ${totalElders}`,
            limit: PLAN_LIMITS.MULTI_AGENCY.maxElders,
            current: totalElders
          };
        }

        // Also check per-group limit
        maxElders = PLAN_LIMITS.MULTI_AGENCY.maxEldersPerCaregiver;
        break;
      default:
        maxElders = PLAN_LIMITS.FAMILY.maxElders;
    }

    if (currentElderCount >= maxElders) {
      const tierName = tier === 'family' ? 'Family' : tier === 'single_agency' ? 'Single Agency' : 'Multi Agency';
      return {
        allowed: false,
        message: `${tierName} plan is limited to ${maxElders} elders per group. Please upgrade to add more elders.`,
        limit: maxElders,
        current: currentElderCount
      };
    }

    return {
      allowed: true,
      limit: maxElders,
      current: currentElderCount
    };
  } catch (error) {
    console.error('Error checking elder limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits'
    };
  }
}

/**
 * Validate if user can create a new group
 */
export async function canCreateGroup(userId: string): Promise<PlanValidationResult> {
  try {
    const tier = await getUserTier(userId);

    if (!tier) {
      return {
        allowed: false,
        message: 'Unable to determine subscription tier'
      };
    }

    // Count existing groups for this user
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        allowed: false,
        message: 'User not found'
      };
    }

    const userData = userDoc.data();
    const currentGroupCount = userData.groups?.length || 0;

    // Get limit based on tier
    let maxGroups: number;
    switch (tier) {
      case 'family':
        maxGroups = PLAN_LIMITS.FAMILY.maxGroups;
        break;
      case 'single_agency':
        maxGroups = PLAN_LIMITS.SINGLE_AGENCY.maxGroups;
        break;
      case 'multi_agency':
        maxGroups = PLAN_LIMITS.MULTI_AGENCY.maxGroups;
        break;
      default:
        maxGroups = PLAN_LIMITS.FAMILY.maxGroups;
    }

    if (currentGroupCount >= maxGroups) {
      const tierName = tier === 'family' ? 'Family' : tier === 'single_agency' ? 'Single Agency' : 'Multi Agency';
      return {
        allowed: false,
        message: `${tierName} plan is limited to ${maxGroups} group${maxGroups > 1 ? 's' : ''}. Please upgrade to create more groups.`,
        limit: maxGroups,
        current: currentGroupCount
      };
    }

    return {
      allowed: true,
      limit: maxGroups,
      current: currentGroupCount
    };
  } catch (error) {
    console.error('Error checking group limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits'
    };
  }
}

/**
 * Validate if agency can add more caregivers
 */
export async function canAddCaregiver(agencyId: string): Promise<PlanValidationResult> {
  try {
    // Get agency document
    const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));

    if (!agencyDoc.exists()) {
      return {
        allowed: false,
        message: 'Agency not found'
      };
    }

    const agencyData = agencyDoc.data();
    const currentCaregiverCount = agencyData.caregiverIds?.length || 0;

    // Get agency owner's tier
    const tier = await getUserTier(agencyData.superAdminId);

    // Only Multi Agency tier can have multiple caregivers
    if (tier !== 'multi_agency') {
      return {
        allowed: currentCaregiverCount < 1,
        message: 'Only Multi Agency plan supports multiple caregivers. Please upgrade to add more caregivers.',
        limit: 1,
        current: currentCaregiverCount
      };
    }

    const maxCaregivers = PLAN_LIMITS.MULTI_AGENCY.maxCaregivers;

    if (currentCaregiverCount >= maxCaregivers) {
      return {
        allowed: false,
        message: `Multi Agency plan is limited to ${maxCaregivers} caregivers. Current: ${currentCaregiverCount}. Please upgrade your plan to add more caregivers.`,
        limit: maxCaregivers,
        current: currentCaregiverCount
      };
    }

    return {
      allowed: true,
      limit: maxCaregivers,
      current: currentCaregiverCount
    };
  } catch (error) {
    console.error('Error checking caregiver limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits'
    };
  }
}

/**
 * Validate if user can add more members to a group
 */
export async function canAddGroupMember(
  userId: string,
  groupId: string
): Promise<PlanValidationResult> {
  try {
    const tier = await getUserTier(userId);

    if (!tier) {
      return {
        allowed: false,
        message: 'Unable to determine subscription tier'
      };
    }

    // Get group document
    const groupDoc = await getDoc(doc(db, 'groups', groupId));

    if (!groupDoc.exists()) {
      return {
        allowed: false,
        message: 'Group not found'
      };
    }

    const groupData = groupDoc.data();
    const currentMemberCount = groupData.memberIds?.length || 0;

    // Get limit based on tier
    let maxMembers: number;
    switch (tier) {
      case 'family':
        maxMembers = PLAN_LIMITS.FAMILY.maxMembers;
        break;
      case 'single_agency':
        maxMembers = PLAN_LIMITS.SINGLE_AGENCY.maxMembers;
        break;
      case 'multi_agency':
        maxMembers = PLAN_LIMITS.MULTI_AGENCY.maxMembersPerGroup;
        break;
      default:
        maxMembers = PLAN_LIMITS.FAMILY.maxMembers;
    }

    if (currentMemberCount >= maxMembers) {
      const tierName = tier === 'family' ? 'Family' : tier === 'single_agency' ? 'Single Agency' : 'Multi Agency';
      return {
        allowed: false,
        message: `${tierName} plan is limited to ${maxMembers} members per group. Please upgrade to add more members.`,
        limit: maxMembers,
        current: currentMemberCount
      };
    }

    return {
      allowed: true,
      limit: maxMembers,
      current: currentMemberCount
    };
  } catch (error) {
    console.error('Error checking member limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits'
    };
  }
}

/**
 * Get a user-friendly upgrade message
 */
export function getUpgradeMessage(tier: 'family' | 'single_agency' | 'multi_agency' | null): string {
  switch (tier) {
    case 'family':
      return 'Upgrade to Single Agency ($14.99/month) to manage up to 4 elders and add more members.';
    case 'single_agency':
      return 'Upgrade to Multi Agency ($144/month) to manage up to 10 groups with 30 elders total.';
    case 'multi_agency':
      return 'You are on the Multi Agency plan. Contact us for enterprise options.';
    default:
      return 'Please subscribe to a plan to continue adding resources.';
  }
}
