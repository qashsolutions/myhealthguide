/**
 * API Route Authentication Utilities
 *
 * Provides secure authentication for API routes using Firebase ID tokens.
 * All API routes that access user data should use these utilities.
 */

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Result of token verification
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  decodedToken?: DecodedIdToken;
}

/**
 * Verify Firebase ID token from Authorization header
 *
 * Expected header format: "Authorization: Bearer <id_token>"
 *
 * @param request - NextRequest object
 * @returns AuthResult with userId if successful
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return { success: false, error: 'Missing Authorization header' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Invalid Authorization header format. Expected: Bearer <token>' };
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!idToken) {
      return { success: false, error: 'Missing ID token' };
    }

    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    return {
      success: true,
      userId: decodedToken.uid,
      decodedToken,
    };
  } catch (error: any) {
    console.error('Token verification failed:', error.message);

    // Provide user-friendly error messages
    if (error.code === 'auth/id-token-expired') {
      return { success: false, error: 'Session expired. Please refresh the page.' };
    }
    if (error.code === 'auth/argument-error') {
      return { success: false, error: 'Invalid authentication token' };
    }

    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if user can access an elder's profile (admin only)
 *
 * Uses Admin SDK to bypass Firestore security rules.
 *
 * @param userId - Verified user ID from token
 * @param elderId - Elder document ID
 * @param groupId - Group document ID
 * @returns true if user is admin of the group
 */
export async function canAccessElderProfileServer(
  userId: string,
  elderId: string,
  groupId: string
): Promise<boolean> {
  try {
    const adminDb = getAdminDb();

    console.log('[canAccessElderProfileServer] Checking access:', { userId, elderId, groupId });

    // Check if user is group admin
    const groupDoc = await adminDb.collection('groups').doc(groupId).get();

    console.log('[canAccessElderProfileServer] Group doc exists:', groupDoc.exists);

    if (groupDoc.exists) {
      const groupData = groupDoc.data();
      console.log('[canAccessElderProfileServer] Group adminId:', groupData?.adminId, '| userId:', userId, '| match:', groupData?.adminId === userId);

      // Check adminId field
      if (groupData?.adminId === userId) {
        console.log('[canAccessElderProfileServer] Access granted via adminId');
        return true;
      }

      // Also check members array for admin role
      if (groupData?.members && Array.isArray(groupData.members)) {
        const userMember = groupData.members.find((m: any) => m.userId === userId);
        console.log('[canAccessElderProfileServer] Members check - userMember:', userMember);
        if (userMember && userMember.role === 'admin') {
          console.log('[canAccessElderProfileServer] Access granted via members array');
          return true;
        }
      }
    }

    // Check if user is primary caregiver for this elder (top-level elders collection)
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();
    console.log('[canAccessElderProfileServer] Elder doc (top-level) exists:', elderDoc.exists);

    if (elderDoc.exists) {
      const elderData = elderDoc.data();
      console.log('[canAccessElderProfileServer] Elder primaryCaregiverId:', elderData?.primaryCaregiverId, '| createdBy:', elderData?.createdBy);
      if (elderData?.primaryCaregiverId === userId) {
        console.log('[canAccessElderProfileServer] Access granted via primaryCaregiverId');
        return true;
      }

      // Check if user created this elder
      if (elderData?.createdBy === userId) {
        console.log('[canAccessElderProfileServer] Access granted via createdBy');
        return true;
      }
    }

    // Also check subcollection: groups/{groupId}/elders/{elderId}
    const elderSubDoc = await adminDb.collection('groups').doc(groupId).collection('elders').doc(elderId).get();
    console.log('[canAccessElderProfileServer] Elder doc (subcollection) exists:', elderSubDoc.exists);

    if (elderSubDoc.exists) {
      const elderSubData = elderSubDoc.data();
      console.log('[canAccessElderProfileServer] Elder (subcollection) primaryCaregiverId:', elderSubData?.primaryCaregiverId, '| createdBy:', elderSubData?.createdBy);
      if (elderSubData?.primaryCaregiverId === userId) {
        console.log('[canAccessElderProfileServer] Access granted via subcollection primaryCaregiverId');
        return true;
      }
      if (elderSubData?.createdBy === userId) {
        console.log('[canAccessElderProfileServer] Access granted via subcollection createdBy');
        return true;
      }
    }

    console.log('[canAccessElderProfileServer] Access denied - no matching permission found');
    return false;
  } catch (error) {
    console.error('[canAccessElderProfileServer] Error:', error);
    return false;
  }
}

/**
 * Verify AI consent and log access (server-side version)
 *
 * Uses Admin SDK to check consent status.
 *
 * @param userId - Verified user ID from token
 * @param groupId - Group document ID
 * @param featureAccessed - Feature being accessed
 * @param elderId - Optional elder ID
 * @returns Object with allowed status and reason
 */
export async function verifyAndLogAccessServer(
  userId: string,
  groupId: string,
  featureAccessed: string,
  elderId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const adminDb = getAdminDb();

    // Query for active consent
    const consentsRef = adminDb.collection('unifiedAIConsents');
    const consentsSnap = await consentsRef
      .where('userId', '==', userId)
      .where('groupId', '==', groupId)
      .where('isActive', '==', true)
      .where('consentGiven', '==', true)
      .limit(1)
      .get();

    if (consentsSnap.empty) {
      return {
        allowed: false,
        reason: 'No consent found. Please review and accept the AI & Medical terms.',
      };
    }

    const consentDoc = consentsSnap.docs[0];
    const consentData = consentDoc.data();

    // Check if consent has expired
    const expiresAt = consentData.expiresAt?.toDate?.() || new Date(consentData.expiresAt);
    if (expiresAt < new Date()) {
      return {
        allowed: false,
        reason: 'Your AI consent has expired. Please review and accept the terms again.',
      };
    }

    // Log the access
    await adminDb.collection('unifiedConsentAccessLogs').add({
      consentId: consentDoc.id,
      userId,
      groupId,
      elderId: elderId || null,
      featureAccessed,
      accessType: 'accessed',
      accessGranted: true,
      accessedAt: new Date(),
    });

    return { allowed: true };
  } catch (error) {
    console.error('[verifyAndLogAccessServer] Error:', error);
    return { allowed: false, reason: 'Failed to verify consent' };
  }
}

/**
 * Get user data from Firestore using Admin SDK
 *
 * @param userId - User document ID
 * @returns User data or null
 */
export async function getUserDataServer(userId: string): Promise<any | null> {
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('[getUserDataServer] Error:', error);
    return null;
  }
}

/**
 * Check if user can access agency data (super_admin or caregiver_admin only)
 *
 * Uses Admin SDK to verify agency membership.
 *
 * @param userId - Verified user ID from token
 * @param agencyId - Agency document ID
 * @returns Object with access status and user's role in the agency
 */
export async function canAccessAgencyServer(
  userId: string,
  agencyId: string
): Promise<{ canAccess: boolean; role?: string }> {
  try {
    const adminDb = getAdminDb();

    // Get user document to check agency membership
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log('[canAccessAgencyServer] User not found:', userId);
      return { canAccess: false };
    }

    const userData = userDoc.data();
    const agencies = userData?.agencies || [];

    // Find the user's membership in this agency
    const agencyMembership = agencies.find((a: any) => a.agencyId === agencyId);

    if (!agencyMembership) {
      console.log('[canAccessAgencyServer] User not a member of agency:', { userId, agencyId });
      return { canAccess: false };
    }

    // Only super_admin and caregiver_admin can access billing data
    const role = agencyMembership.role;
    const hasAccess = role === 'super_admin' || role === 'caregiver_admin';

    console.log('[canAccessAgencyServer] Access check:', { userId, agencyId, role, hasAccess });

    return { canAccess: hasAccess, role };
  } catch (error) {
    console.error('[canAccessAgencyServer] Error:', error);
    return { canAccess: false };
  }
}
