/**
 * Plan Limits Service
 * Enforces subscription tier limits across the application
 * Uses centralized subscription service for all plan configuration
 */

import { db } from './config';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import {
  PlanTier,
  getPlanLimits,
  getMaxElders,
  getMaxGroups,
  getMaxMembers,
  getMaxCaregivers,
  getMaxEldersPerCaregiver,
  getUpgradeMessage,
  PLAN_CONFIG,
} from '@/lib/subscription';

export interface PlanValidationResult {
  allowed: boolean;
  message?: string;
  limit?: number;
  current?: number;
}

/**
 * Get the subscription tier for a user
 */
export async function getUserTier(userId: string): Promise<PlanTier | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();

    // If user has a paid subscription (stripeSubscriptionId), use their actual tier
    if (userData.stripeSubscriptionId && userData.subscriptionTier) {
      return userData.subscriptionTier as PlanTier;
    }

    // During trial without paid subscription, assume family tier for limits
    if (userData.subscriptionStatus === 'trial') {
      return 'family';
    }

    return (userData.subscriptionTier as PlanTier) || null;
  } catch (error) {
    console.error('Error getting user tier:', error);
    return null;
  }
}

/**
 * Get display name for a tier
 */
function getTierDisplayName(tier: PlanTier): string {
  return PLAN_CONFIG[tier].name;
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
        message: 'Unable to determine subscription tier',
      };
    }

    // Count existing active (non-archived) elders in the group
    const eldersQuery = query(
      collection(db, 'elders'),
      where('groupId', '==', groupId)
    );
    const eldersSnap = await getDocs(eldersQuery);
    // Only count non-archived elders
    const currentElderCount = eldersSnap.docs.filter(
      (doc) => !doc.data().archived
    ).length;

    // Get limit based on tier
    let maxElders: number;

    if (tier === 'multi_agency') {
      // For multi-agency, check total active (non-archived) elders across all groups
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const groupIds = userData?.groups?.map((g: { groupId: string }) => g.groupId) || [];

      let totalElders = 0;
      for (const gId of groupIds) {
        const q = query(collection(db, 'elders'), where('groupId', '==', gId));
        const snap = await getDocs(q);
        // Only count non-archived elders
        totalElders += snap.docs.filter((d) => !d.data().archived).length;
      }

      const maxTotalElders = getMaxElders('multi_agency');
      if (totalElders >= maxTotalElders) {
        return {
          allowed: false,
          message: `${getTierDisplayName('multi_agency')} is limited to ${maxTotalElders} elders total across all groups. Current: ${totalElders}`,
          limit: maxTotalElders,
          current: totalElders,
        };
      }

      // Also check per-caregiver limit
      maxElders = getMaxEldersPerCaregiver('multi_agency');
    } else {
      maxElders = getMaxElders(tier);
    }

    if (currentElderCount >= maxElders) {
      return {
        allowed: false,
        message: `${getTierDisplayName(tier)} is limited to ${maxElders} elder${maxElders > 1 ? 's' : ''} per group. Please upgrade to add more elders.`,
        limit: maxElders,
        current: currentElderCount,
      };
    }

    return {
      allowed: true,
      limit: maxElders,
      current: currentElderCount,
    };
  } catch (error) {
    console.error('Error checking elder limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits',
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
        message: 'Unable to determine subscription tier',
      };
    }

    // Count existing groups for this user
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        allowed: false,
        message: 'User not found',
      };
    }

    const userData = userDoc.data();
    const currentGroupCount = userData.groups?.length || 0;

    const maxGroups = getMaxGroups(tier);

    if (currentGroupCount >= maxGroups) {
      return {
        allowed: false,
        message: `${getTierDisplayName(tier)} is limited to ${maxGroups} group${maxGroups > 1 ? 's' : ''}. Please upgrade to create more groups.`,
        limit: maxGroups,
        current: currentGroupCount,
      };
    }

    return {
      allowed: true,
      limit: maxGroups,
      current: currentGroupCount,
    };
  } catch (error) {
    console.error('Error checking group limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits',
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
        message: 'Agency not found',
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
        message: 'Only Multi Agency Plan supports multiple caregivers. Please upgrade to add more caregivers.',
        limit: 1,
        current: currentCaregiverCount,
      };
    }

    const maxCaregivers = getMaxCaregivers('multi_agency');

    if (currentCaregiverCount >= maxCaregivers) {
      return {
        allowed: false,
        message: `${getTierDisplayName('multi_agency')} is limited to ${maxCaregivers} caregivers. Current: ${currentCaregiverCount}.`,
        limit: maxCaregivers,
        current: currentCaregiverCount,
      };
    }

    return {
      allowed: true,
      limit: maxCaregivers,
      current: currentCaregiverCount,
    };
  } catch (error) {
    console.error('Error checking caregiver limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits',
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
        message: 'Unable to determine subscription tier',
      };
    }

    // Get group document
    const groupDoc = await getDoc(doc(db, 'groups', groupId));

    if (!groupDoc.exists()) {
      return {
        allowed: false,
        message: 'Group not found',
      };
    }

    const groupData = groupDoc.data();
    const currentMemberCount = groupData.memberIds?.length || 0;

    // Get limit based on tier
    let maxMembers: number;

    if (tier === 'multi_agency') {
      const limits = getPlanLimits('multi_agency');
      maxMembers = limits.maxMembersPerGroup || 4;
    } else {
      maxMembers = getMaxMembers(tier);
    }

    if (currentMemberCount >= maxMembers) {
      return {
        allowed: false,
        message: `${getTierDisplayName(tier)} is limited to ${maxMembers} members per group. Please upgrade to add more members.`,
        limit: maxMembers,
        current: currentMemberCount,
      };
    }

    return {
      allowed: true,
      limit: maxMembers,
      current: currentMemberCount,
    };
  } catch (error) {
    console.error('Error checking member limit:', error);
    return {
      allowed: false,
      message: 'Error checking plan limits',
    };
  }
}

/**
 * Get a user-friendly upgrade message
 * @deprecated Use getUpgradeMessage from @/lib/subscription instead
 */
export { getUpgradeMessage };
