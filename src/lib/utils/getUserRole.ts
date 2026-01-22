import { User, UserRole } from '@/types';

/**
 * Check if user is on a Family Plan (A or B)
 * Used to determine which permission model to apply
 *
 * Plan tiers:
 * - 'family' = Family Plan A ($8.99)
 * - 'single_agency' = Family Plan B ($18.99)
 * - 'multi_agency' = Multi Agency Plan ($55)
 */
export function isFamilyPlan(user: User | null): boolean {
  if (!user) return false;
  // Check subscriptionTier for paid users
  // 'family' = Plan A, 'single_agency' = Plan B (both are family plans)
  if (user.subscriptionTier === 'family' || user.subscriptionTier === 'single_agency') {
    return true;
  }
  // Trial users with groups but no agencies are on family plan path
  if (!user.subscriptionTier && user.groups?.length && !user.agencies?.length) {
    return true;
  }
  return false;
}

/**
 * Check if user is on Multi-Agency Plan
 */
export function isMultiAgencyPlan(user: User | null): boolean {
  if (!user) return false;
  return user.subscriptionTier === 'multi_agency';
}

/**
 * Utility to determine a user's effective role for feature access
 *
 * Priority order:
 * 1. Family Plan users: Use group roles (admin → 'admin', member → 'caregiver')
 * 2. Multi-Agency Plan users: Use agency roles (super_admin, caregiver_admin, caregiver)
 *
 * Note: 'member' role in groups maps to 'caregiver' UserRole.
 * Use isFamilyMember() to check if user is specifically a read-only family member.
 *
 * @param user - The authenticated user object
 * @returns UserRole | null
 */
export function getUserRole(user: User | null): UserRole | null {
  if (!user) return null;

  // Family Plan users: Use group-based roles
  // This includes trial users (no tier) and family/single_agency subscribers
  if (isFamilyPlan(user)) {
    if (user.groups && user.groups.length > 0) {
      const groupRole = user.groups[0].role;
      if (groupRole === 'admin') {
        return 'admin'; // Family Plan admin (has write access)
      } else {
        return 'caregiver'; // Family Plan member (read-only, but mapped to 'caregiver' UserRole)
      }
    }
  }

  // Multi-Agency Plan users: Use agency-based roles
  if (user.agencies && user.agencies.length > 0) {
    const agencyRole = user.agencies[0].role;

    switch (agencyRole) {
      case 'super_admin':
        return 'super_admin';
      case 'caregiver_admin':
        return 'caregiver_admin';
      case 'caregiver':
        return 'caregiver';
      case 'family_member':
        return 'caregiver'; // Agency family members are read-only (mapped to 'caregiver' UserRole)
      default:
        break;
    }
  }

  // Fallback: Check group membership for any user
  if (user.groups && user.groups.length > 0) {
    const groupRole = user.groups[0].role;
    if (groupRole === 'admin') {
      return 'admin';
    } else {
      return 'caregiver';
    }
  }

  // No membership found
  return null;
}

/**
 * Get all roles a user has across all groups and agencies
 * Useful for showing all possible features user can access
 */
export function getAllUserRoles(user: User | null): UserRole[] {
  if (!user) return [];

  const roles = new Set<UserRole>();

  // Add agency roles
  if (user.agencies && user.agencies.length > 0) {
    user.agencies.forEach((membership) => {
      switch (membership.role) {
        case 'super_admin':
          roles.add('super_admin');
          break;
        case 'caregiver_admin':
          roles.add('caregiver_admin');
          break;
        case 'caregiver':
          roles.add('caregiver');
          break;
        case 'family_member':
          roles.add('caregiver');
          break;
      }
    });
  }

  // Add group roles
  if (user.groups && user.groups.length > 0) {
    user.groups.forEach((membership) => {
      if (membership.role === 'admin') {
        roles.add('admin');
      } else {
        roles.add('caregiver');
      }
    });
  }

  return Array.from(roles);
}

/**
 * Check if user has access to a specific feature based on role requirements
 */
export function userHasFeatureAccess(user: User | null, requiredRoles: UserRole[]): boolean {
  const userRoles = getAllUserRoles(user);
  return userRoles.some(role => requiredRoles.includes(role));
}

/**
 * Check if user is a super admin of any agency
 * Super admins have full access to all agency features
 * Note: Only returns true for Multi-Agency Plan users
 * Family Plan users (family_a, family_b) are never considered super_admin
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  // Family Plan users should never be considered super_admin
  if (isFamilyPlan(user)) {
    return false;
  }
  return user.agencies?.some((a) => a.role === 'super_admin') ?? false;
}

/**
 * Check if user is a caregiver (not super admin)
 * Caregivers have limited access to agency features
 */
export function isCaregiver(user: User | null): boolean {
  if (!user) return false;
  const role = getUserRole(user);
  return role === 'caregiver' || role === 'caregiver_admin';
}

/**
 * Check if user is a caregiver admin (can manage some caregivers)
 */
export function isCaregiverAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.agencies?.some((a) => a.role === 'caregiver_admin') ?? false;
}

/**
 * Check if user is a family plan admin
 */
export function isFamilyAdmin(user: User | null): boolean {
  if (!user) return false;
  const role = getUserRole(user);
  return role === 'admin';
}

/**
 * Check if user is a Family Plan member (read-only access)
 * Family members have 'member' role in their group membership
 * These are users invited by the Family Plan admin to view elder data
 */
export function isFamilyMember(user: User | null): boolean {
  if (!user) return false;
  // Family Plan members have 'member' role in groups
  // Check that they're on a Family Plan (or trial) and have member role
  if (isFamilyPlan(user) || !user.subscriptionTier) {
    return user.groups?.some((g) => g.role === 'member') ?? false;
  }
  return false;
}

/**
 * Check if user is an agency family member (read-only access)
 * These are family/friends invited by caregivers to view elder data
 */
export function isAgencyFamilyMember(user: User | null): boolean {
  if (!user) return false;
  return user.agencies?.some((a) => a.role === 'family_member') ?? false;
}

/**
 * Check if user is an agency caregiver (not super admin, not family member)
 */
export function isAgencyCaregiver(user: User | null): boolean {
  if (!user) return false;
  return user.agencies?.some((a) => a.role === 'caregiver' || a.role === 'caregiver_admin') ?? false;
}

/**
 * Check if user is read-only (member in family plan or family_member in agency)
 */
export function isReadOnlyUser(user: User | null): boolean {
  return isFamilyMember(user) || isAgencyFamilyMember(user);
}

/**
 * Check if user is read-only for elder care data (medications, care logs, etc.)
 *
 * Family Plan:
 * - Admin: Has write access to care data
 * - Member: Read-only (invited family members)
 *
 * Multi-Agency Plan:
 * - Super Admin (Agency Owner): Read-only for care data (can manage agency but not care)
 * - Caregiver Admin: Has write access to care data
 * - Caregiver: Has write access to care data
 * - Family Member: Read-only (invited family/friends)
 */
export function isReadOnlyForElderCare(user: User | null): boolean {
  if (!user) return true;

  // Family Plan users
  if (isFamilyPlan(user)) {
    // Family Plan admin has write access
    if (user.groups?.some((g) => g.role === 'admin')) {
      return false;
    }
    // Family Plan members are read-only
    return true;
  }

  // Multi-Agency Plan users
  // Family members (invited by caregivers) are always read-only
  if (isAgencyFamilyMember(user)) {
    return true;
  }

  // Agency Owner (super_admin) is read-only for elder care data
  // They can manage agency (caregivers, billing) but not care data
  if (user.agencies?.some((a) => a.role === 'super_admin')) {
    // Check if they also have caregiver role (can happen if owner is also a caregiver)
    const isAlsoCaregiver = user.agencies?.some((a) =>
      a.role === 'caregiver' || a.role === 'caregiver_admin'
    );
    // If ONLY super_admin and not also a caregiver, they are read-only for care data
    if (!isAlsoCaregiver) {
      return true;
    }
  }

  // Caregivers and caregiver_admins can modify care data
  return false;
}

/**
 * Check if user can manage billing/subscription
 * Only the account owner can subscribe or change plans:
 * - Agency: super_admin (owner)
 * - Family: admin (original subscriber)
 *
 * Returns false for:
 * - Family members (invited users)
 * - Agency caregivers (not superadmin)
 * - Agency family members
 */
export function canManageBilling(user: User | null): boolean {
  if (!user) return false;

  // Check if user is agency superadmin (owner)
  if (user.agencies && user.agencies.length > 0) {
    return user.agencies.some((a) => a.role === 'super_admin');
  }

  // Check if user is family plan admin (original subscriber)
  if (user.groups && user.groups.length > 0) {
    return user.groups.some((g) => g.role === 'admin');
  }

  // No membership - could be new user, allow access to subscribe
  return true;
}
