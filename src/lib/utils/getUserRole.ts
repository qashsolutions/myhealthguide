import { User, UserRole } from '@/types';

/**
 * Utility to determine a user's effective role for feature access
 *
 * Priority order:
 * 1. Agency roles (super_admin, caregiver_admin, caregiver) - highest priority
 * 2. Group roles (admin, caregiver) - family plan roles
 *
 * @param user - The authenticated user object
 * @returns UserRole | null
 */
export function getUserRole(user: User | null): UserRole | null {
  if (!user) return null;

  // Priority 1: Check agency membership (Agency Plan)
  // Agency roles: super_admin, caregiver_admin, caregiver
  if (user.agencies && user.agencies.length > 0) {
    const agencyRole = user.agencies[0].role; // Take first agency (most users have only one)

    // Map AgencyRole to UserRole
    switch (agencyRole) {
      case 'super_admin':
        return 'super_admin';
      case 'caregiver_admin':
        return 'caregiver_admin';
      case 'caregiver':
        return 'caregiver';
      case 'family_member':
        return 'caregiver'; // Family members have similar access to regular caregivers
      default:
        break;
    }
  }

  // Priority 2: Check group membership (Family Plan)
  // Group roles: admin, member
  if (user.groups && user.groups.length > 0) {
    const groupRole = user.groups[0].role; // Take first group

    // Map group role to UserRole
    if (groupRole === 'admin') {
      return 'admin'; // Family caregiver (admin)
    } else {
      return 'caregiver'; // Family member (gets notifications)
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
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
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
 * Check if user is a family plan member (read-only access)
 * Family members have 'member' role in their group membership
 */
export function isFamilyMember(user: User | null): boolean {
  if (!user) return false;
  // Check if user has no agency membership and has 'member' role in groups
  if (user.agencies && user.agencies.length > 0) return false;
  return user.groups?.some((g) => g.role === 'member') ?? false;
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
 * Agency Owners (super_admin) can manage agency but NOT elder care data
 * Only assigned caregivers can modify elder care data
 */
export function isReadOnlyForElderCare(user: User | null): boolean {
  if (!user) return true;

  // Family members and agency family members are always read-only
  if (isFamilyMember(user) || isAgencyFamilyMember(user)) {
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
