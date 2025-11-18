/**
 * Medical Disclaimer Consent Management
 *
 * CRITICAL: All medical features MUST verify consent before displaying data
 * - Checks if user has valid, non-expired consent
 * - Logs every access to medical features
 * - Enforces 90-day re-consent requirement
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import type { MedicalFeatureType, MedicalDisclaimerConsent, MedicalFeatureAccessLog } from '@/types';

/**
 * Check if user has valid consent for a medical feature
 * Returns the consent record if valid, null if invalid/expired
 */
export async function checkMedicalConsent(
  userId: string,
  groupId: string,
  featureType: MedicalFeatureType
): Promise<{ valid: boolean; consent: MedicalDisclaimerConsent | null; reason?: string }> {
  try {
    // Look for active consent for this specific feature OR for all medical features
    const q = query(
      collection(db, 'medicalDisclaimerConsents'),
      where('userId', '==', userId),
      where('groupId', '==', groupId),
      where('isActive', '==', true),
      where('consentGiven', '==', true),
      orderBy('consentedAt', 'desc'),
      limit(1)
    );

    const consentsSnap = await getDocs(q);

    if (consentsSnap.empty) {
      return {
        valid: false,
        consent: null,
        reason: 'No consent found'
      };
    }

    const consentDoc = consentsSnap.docs[0];
    const consent = {
      id: consentDoc.id,
      ...consentDoc.data(),
      consentedAt: consentDoc.data().consentedAt?.toDate(),
      expiresAt: consentDoc.data().expiresAt?.toDate(),
      createdAt: consentDoc.data().createdAt?.toDate(),
      updatedAt: consentDoc.data().updatedAt?.toDate(),
      revokedAt: consentDoc.data().revokedAt?.toDate()
    } as MedicalDisclaimerConsent;

    // Check if consent matches the feature type
    const isCorrectType =
      consent.featureType === featureType || consent.featureType === 'all_medical_features';

    if (!isCorrectType) {
      return {
        valid: false,
        consent: null,
        reason: 'Consent for different feature type'
      };
    }

    // Check if consent has expired
    const now = new Date();
    if (consent.expiresAt && consent.expiresAt < now) {
      return {
        valid: false,
        consent,
        reason: 'Consent expired - re-consent required'
      };
    }

    // Check if consent was revoked
    if (!consent.isActive || consent.revokedAt) {
      return {
        valid: false,
        consent,
        reason: 'Consent was revoked'
      };
    }

    // All checks passed
    return {
      valid: true,
      consent
    };
  } catch (error) {
    console.error('Error checking medical consent:', error);
    return {
      valid: false,
      consent: null,
      reason: 'Error checking consent'
    };
  }
}

/**
 * Log access to medical features (for audit trail)
 * MUST be called every time medical data is viewed
 */
export async function logMedicalFeatureAccess(
  userId: string,
  groupId: string,
  featureType: MedicalFeatureType,
  action: 'viewed' | 'acknowledged' | 'dismissed',
  consentId: string,
  consentValid: boolean,
  interactionData?: {
    medicationIds?: string[];
    interactionCount?: number;
    severity?: 'minor' | 'moderate' | 'major' | 'contraindicated';
    elderId?: string;
  }
): Promise<void> {
  try {
    const accessLog: Omit<MedicalFeatureAccessLog, 'id'> = {
      userId,
      groupId,
      elderId: interactionData?.elderId,
      featureType,
      action,
      interactionData: interactionData
        ? {
            medicationIds: interactionData.medicationIds,
            interactionCount: interactionData.interactionCount,
            severity: interactionData.severity
          }
        : undefined,
      consentId,
      consentValid,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    await addDoc(collection(db, 'medicalFeatureAccessLogs'), accessLog);
  } catch (error) {
    console.error('Error logging medical feature access:', error);
    // Don't throw - logging failure shouldn't block the feature
  }
}

/**
 * Check consent and log access in one call
 * Use this as the entry point for all medical features
 */
export async function verifyAndLogMedicalAccess(
  userId: string,
  groupId: string,
  featureType: MedicalFeatureType,
  elderId?: string
): Promise<{ allowed: boolean; consent: MedicalDisclaimerConsent | null; reason?: string }> {
  const { valid, consent, reason } = await checkMedicalConsent(userId, groupId, featureType);

  // Log the access attempt (even if denied)
  if (consent) {
    await logMedicalFeatureAccess(
      userId,
      groupId,
      featureType,
      valid ? 'viewed' : 'dismissed',
      consent.id,
      valid,
      elderId ? { elderId } : undefined
    );
  }

  return {
    allowed: valid,
    consent,
    reason
  };
}

/**
 * Get consent expiry warning
 * Returns days until expiry, or null if more than 7 days away
 */
export function getConsentExpiryWarning(consent: MedicalDisclaimerConsent): {
  warning: boolean;
  daysRemaining: number;
  message: string;
} | null {
  if (!consent.expiresAt) return null;

  const now = new Date();
  const daysRemaining = Math.ceil(
    (consent.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining > 7) {
    return null; // No warning needed
  }

  if (daysRemaining <= 0) {
    return {
      warning: true,
      daysRemaining: 0,
      message: 'Your medical disclaimer consent has expired. You must re-consent to continue using this feature.'
    };
  }

  return {
    warning: true,
    daysRemaining,
    message: `Your medical disclaimer consent expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. You will need to re-consent soon.`
  };
}

/**
 * Revoke consent
 */
export async function revokeMedicalConsent(
  consentId: string,
  reason?: string
): Promise<void> {
  try {
    const consentRef = doc(db, 'medicalDisclaimerConsents', consentId);
    await updateDoc(consentRef, {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || 'User revoked consent',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error revoking consent:', error);
    throw error;
  }
}

/**
 * Get all consents for a user (for settings page)
 */
export async function getUserMedicalConsents(
  userId: string,
  groupId: string
): Promise<MedicalDisclaimerConsent[]> {
  try {
    const q = query(
      collection(db, 'medicalDisclaimerConsents'),
      where('userId', '==', userId),
      where('groupId', '==', groupId),
      orderBy('consentedAt', 'desc')
    );

    const consentsSnap = await getDocs(q);

    return consentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      consentedAt: doc.data().consentedAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      revokedAt: doc.data().revokedAt?.toDate()
    })) as MedicalDisclaimerConsent[];
  } catch (error) {
    console.error('Error getting user consents:', error);
    return [];
  }
}

// Missing import
import { doc, updateDoc } from 'firebase/firestore';
