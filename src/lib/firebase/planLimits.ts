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
  MULTI_AGENCY_TRIAL_DAYS,
} from '@/lib/subscription';
import { toSafeDate } from '@/lib/utils/dateConversion';

export interface PlanValidationResult {
  allowed: boolean;
  message?: string;
  limit?: number;
  current?: number;
  // Multi-agency trial info
  trialEndsAt?: Date;
  daysRemaining?: number;
}

/**
 * Get the subscription tier for a user
 * For agency super admins, checks the agency subscription tier
 */
export async function getUserTier(userId: string): Promise<PlanTier | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();

    // Check if user is a super_admin of an agency - use agency tier
    if (userData.agencies && Array.isArray(userData.agencies)) {
      const superAdminMembership = userData.agencies.find(
        (a: any) => a.role === 'super_admin'
      );

      if (superAdminMembership) {
        // Get the agency's subscription tier
        const agencyDoc = await getDoc(doc(db, 'agencies', superAdminMembership.agencyId));
        if (agencyDoc.exists()) {
          const agencyData = agencyDoc.data();
          // Check agency subscription tier
          if (agencyData.subscription?.tier) {
            return agencyData.subscription.tier as PlanTier;
          }
        }
      }
    }

    // If user has a paid subscription (stripeSubscriptionId), use their actual tier
    if (userData.stripeSubscriptionId && userData.subscriptionTier) {
      return userData.subscriptionTier as PlanTier;
    }

    // During trial, use the user's selected subscription tier for limits and display
    // This ensures the correct plan name is shown (e.g., "Family Plan A" vs "Family Plan B")
    if (userData.subscriptionStatus === 'trial' && userData.subscriptionTier) {
      return userData.subscriptionTier as PlanTier;
    }

    // Fallback for trial users without a tier set - use 'family' (Plan A) as default
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
  const config = PLAN_CONFIG[tier] || PLAN_CONFIG.family;
  return config.name;
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

    if (tier === 'multi_agency') {
      // For multi-agency super admin, check trial/payment status and elder limits
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      // Find the agency where user is super_admin
      const superAdminMembership = userData?.agencies?.find(
        (a: any) => a.role === 'super_admin'
      );

      if (!superAdminMembership) {
        return {
          allowed: false,
          message: 'You must be a super admin to add elders',
        };
      }

      // Get agency data to check trial/payment status
      const agencyDoc = await getDoc(doc(db, 'agencies', superAdminMembership.agencyId));
      if (!agencyDoc.exists()) {
        return {
          allowed: false,
          message: 'Agency not found',
        };
      }

      const agencyData = agencyDoc.data();
      const subscription = agencyData.subscription;

      // Check if in trial period
      const trialEndsAt = subscription?.trialEndsAt
        ? toSafeDate(subscription.trialEndsAt)
        : null;
      const now = new Date();
      const isInTrial = trialEndsAt && now < trialEndsAt;

      // Check if has active payment (Stripe subscription)
      const hasActivePayment = subscription?.status === 'active' &&
        (agencyData.stripeSubscriptionIds?.length > 0 || subscription?.stripeSubscriptionId);

      // After trial, require payment to add elders
      if (!isInTrial && !hasActivePayment) {
        const daysAgoTrialEnded = trialEndsAt
          ? Math.floor((now.getTime() - trialEndsAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          allowed: false,
          message: trialEndsAt
            ? `Your ${MULTI_AGENCY_TRIAL_DAYS}-day free trial ended ${daysAgoTrialEnded} day${daysAgoTrialEnded !== 1 ? 's' : ''} ago. Please add a payment method to continue adding elders.`
            : 'Please add a payment method to add elders.',
        };
      }

      // Count total elders across all agency groups
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
          message: `${getTierDisplayName('multi_agency')} is limited to ${maxTotalElders} elders total. Current: ${totalElders}`,
          limit: maxTotalElders,
          current: totalElders,
        };
      }

      // Multi-agency super admin passed all checks - allow creation
      return {
        allowed: true,
        limit: maxTotalElders,
        current: totalElders,
        // Include trial info for UI
        ...(isInTrial && trialEndsAt && {
          trialEndsAt: trialEndsAt,
          daysRemaining: Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        }),
      };
    }

    // For non-multi-agency tiers, check per-group limit
    const maxElders = getMaxElders(tier);
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

/**
 * Multi-agency access status
 */
export interface MultiAgencyAccessStatus {
  hasAccess: boolean;
  status: 'trial' | 'active' | 'expired' | 'unknown';
  message?: string;
  trialEndsAt?: Date;
  daysRemaining?: number;
  elderCount?: number;
  estimatedMonthlyBill?: number;
}

/**
 * Downgrade validation result
 */
export interface DowngradeValidationResult {
  allowed: boolean;
  blockers: DowngradeBlocker[];
}

export interface DowngradeBlocker {
  type: 'members' | 'storage';
  currentValue: number;
  targetLimit: number;
  excess: number;
  message: string;
}

/**
 * Validate if user can downgrade to a target plan
 * Checks member count and storage usage against target plan limits
 */
export async function validateDowngrade(
  userId: string,
  targetTier: PlanTier
): Promise<DowngradeValidationResult> {
  const blockers: DowngradeBlocker[] = [];

  try {
    // Get user document
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        allowed: false,
        blockers: [{
          type: 'members',
          currentValue: 0,
          targetLimit: 0,
          excess: 0,
          message: 'User not found',
        }],
      };
    }

    const userData = userDoc.data();

    // Get user's groups to count members
    const groupIds = userData.groups?.map((g: { groupId: string }) => g.groupId) || [];

    // Get target plan limits
    const targetLimits = getPlanLimits(targetTier);
    const targetMaxMembers = targetLimits.maxMembers; // Includes admin
    const targetStorageBytes = targetLimits.storageBytes;

    // Check member count for each group
    // For Family Plan A: maxMembers = 2 (1 admin + 1 member)
    // For Family Plan B: maxMembers = 4 (1 admin + 3 members)
    // Member count = total users in group (including admin)
    for (const groupId of groupIds) {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) continue;

      const groupData = groupDoc.data();
      const currentMemberCount = groupData.memberIds?.length || 0;

      // If current member count exceeds target limit, add blocker
      if (currentMemberCount > targetMaxMembers) {
        const excess = currentMemberCount - targetMaxMembers;
        blockers.push({
          type: 'members',
          currentValue: currentMemberCount,
          targetLimit: targetMaxMembers,
          excess,
          message: `You have ${currentMemberCount} members in your group. ${getTierDisplayName(targetTier)} allows only ${targetMaxMembers} members (1 admin + ${targetMaxMembers - 1} member${targetMaxMembers - 1 !== 1 ? 's' : ''}). Please remove ${excess} member${excess !== 1 ? 's' : ''} before downgrading.`,
        });
      }
    }

    // Note: Storage check is informational only for downgrade
    // Storage compliance is enforced AFTER downgrade (blocking uploads/downloads)
    // We don't block the downgrade itself based on storage
    const currentStorageUsed = userData.storageUsed || 0;
    if (currentStorageUsed > targetStorageBytes) {
      const currentStorageMB = (currentStorageUsed / (1024 * 1024)).toFixed(1);
      const targetStorageMB = (targetStorageBytes / (1024 * 1024)).toFixed(0);
      const excessMB = ((currentStorageUsed - targetStorageBytes) / (1024 * 1024)).toFixed(1);

      // This is informational - storage doesn't block downgrade
      // but will block uploads/downloads after downgrade
      // We still include it so the UI can warn the user
      blockers.push({
        type: 'storage',
        currentValue: currentStorageUsed,
        targetLimit: targetStorageBytes,
        excess: currentStorageUsed - targetStorageBytes,
        message: `You are using ${currentStorageMB} MB of storage. ${getTierDisplayName(targetTier)} allows ${targetStorageMB} MB. After downgrading, you will need to delete ${excessMB} MB of files to access your data.`,
      });
    }

    // Only member blockers prevent downgrade
    // Storage blockers are warnings (compliance enforced post-downgrade)
    const memberBlockers = blockers.filter(b => b.type === 'members');

    return {
      allowed: memberBlockers.length === 0,
      blockers,
    };
  } catch (error) {
    console.error('Error validating downgrade:', error);
    return {
      allowed: false,
      blockers: [{
        type: 'members',
        currentValue: 0,
        targetLimit: 0,
        excess: 0,
        message: 'Error checking plan limits',
      }],
    };
  }
}

/**
 * Check if user's storage is over their plan limit
 * Used to block uploads/downloads when over quota after downgrade
 */
export async function checkStorageCompliance(userId: string): Promise<{
  isCompliant: boolean;
  currentUsage: number;
  limit: number;
  excessBytes: number;
  message?: string;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        isCompliant: true,
        currentUsage: 0,
        limit: 0,
        excessBytes: 0,
      };
    }

    const userData = userDoc.data();
    const currentUsage = userData.storageUsed || 0;
    const limit = userData.storageLimit || 0;

    if (currentUsage > limit && limit > 0) {
      const currentMB = (currentUsage / (1024 * 1024)).toFixed(1);
      const limitMB = (limit / (1024 * 1024)).toFixed(0);
      const excessMB = ((currentUsage - limit) / (1024 * 1024)).toFixed(1);

      return {
        isCompliant: false,
        currentUsage,
        limit,
        excessBytes: currentUsage - limit,
        message: `You are using ${currentMB} MB of ${limitMB} MB storage. Delete ${excessMB} MB of files to regain full access.`,
      };
    }

    return {
      isCompliant: true,
      currentUsage,
      limit,
      excessBytes: 0,
    };
  } catch (error) {
    console.error('Error checking storage compliance:', error);
    return {
      isCompliant: true,
      currentUsage: 0,
      limit: 0,
      excessBytes: 0,
    };
  }
}

/**
 * Check if a multi-agency super admin has access
 * Used to block dashboard access when trial expires without payment
 */
export async function checkMultiAgencyAccess(userId: string): Promise<MultiAgencyAccessStatus> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { hasAccess: false, status: 'unknown', message: 'User not found' };
    }

    const userData = userDoc.data();

    // Find the agency where user is super_admin
    const superAdminMembership = userData?.agencies?.find(
      (a: any) => a.role === 'super_admin'
    );

    if (!superAdminMembership) {
      // Not a super admin - check if regular caregiver (they have access if agency does)
      const caregiverMembership = userData?.agencies?.find(
        (a: any) => a.role === 'caregiver' || a.role === 'caregiver_admin'
      );

      if (!caregiverMembership) {
        return { hasAccess: true, status: 'unknown' }; // Not in multi-agency at all
      }

      // Check the agency's status
      const agencyDoc = await getDoc(doc(db, 'agencies', caregiverMembership.agencyId));
      if (!agencyDoc.exists()) {
        return { hasAccess: false, status: 'unknown', message: 'Agency not found' };
      }

      const agencyData = agencyDoc.data();
      if (agencyData.subscription?.tier !== 'multi_agency') {
        return { hasAccess: true, status: 'unknown' }; // Not multi-agency
      }

      const status = agencyData.subscription?.status;
      if (status === 'expired') {
        return {
          hasAccess: false,
          status: 'expired',
          message: 'Agency subscription has expired. Please contact your agency administrator.',
        };
      }

      return { hasAccess: true, status: status || 'unknown' };
    }

    // User is super_admin - check agency status
    const agencyDoc = await getDoc(doc(db, 'agencies', superAdminMembership.agencyId));
    if (!agencyDoc.exists()) {
      return { hasAccess: false, status: 'unknown', message: 'Agency not found' };
    }

    const agencyData = agencyDoc.data();
    const subscription = agencyData.subscription;

    if (subscription?.tier !== 'multi_agency') {
      return { hasAccess: true, status: 'unknown' }; // Not multi-agency
    }

    const trialEndsAt = subscription?.trialEndsAt
      ? toSafeDate(subscription.trialEndsAt)
      : null;
    const now = new Date();

    // Count elders
    let elderCount = 0;
    if (agencyData.groupIds?.length > 0) {
      for (const gId of agencyData.groupIds) {
        const q = query(collection(db, 'elders'), where('groupId', '==', gId));
        const snap = await getDocs(q);
        elderCount += snap.docs.filter((d) => !d.data().archived).length;
      }
    }

    const estimatedMonthlyBill = elderCount * PLAN_CONFIG.multi_agency.price;

    // Check if in trial
    if (trialEndsAt && now < trialEndsAt) {
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        hasAccess: true,
        status: 'trial',
        trialEndsAt,
        daysRemaining,
        elderCount,
        estimatedMonthlyBill,
        message: daysRemaining <= 3
          ? `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Add a payment method to continue.`
          : undefined,
      };
    }

    // Check if has active subscription
    const hasActivePayment = subscription?.status === 'active' &&
      (agencyData.stripeSubscriptionIds?.length > 0 || subscription?.stripeSubscriptionId);

    if (hasActivePayment) {
      return {
        hasAccess: true,
        status: 'active',
        elderCount,
        estimatedMonthlyBill,
      };
    }

    // Trial expired and no payment
    const daysAgoTrialEnded = trialEndsAt
      ? Math.floor((now.getTime() - trialEndsAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      hasAccess: false,
      status: 'expired',
      elderCount,
      estimatedMonthlyBill,
      message: `Your ${MULTI_AGENCY_TRIAL_DAYS}-day free trial ended ${daysAgoTrialEnded} day${daysAgoTrialEnded !== 1 ? 's' : ''} ago. Add a payment method to restore access.`,
    };
  } catch (error) {
    console.error('Error checking multi-agency access:', error);
    return {
      hasAccess: false,
      status: 'unknown',
      message: 'Error checking subscription status',
    };
  }
}
