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
