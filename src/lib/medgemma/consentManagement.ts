/**
 * MedGemma Consent Management
 *
 * Manages user consent for Google Health AI Developer Foundations (HAI-DEF)
 * Implements requirements from: https://developers.google.com/health-ai-developer-foundations/terms
 *
 * COMPLIANCE REQUIREMENTS:
 * - Users must accept HAI-DEF Terms of Use
 * - Medical disclaimer acknowledgment required
 * - Consent logged for audit trail
 * - 90-day re-consent period
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';

export interface MedGemmaConsent {
  id: string;
  userId: string;
  groupId: string;

  // Consent details
  consentGiven: boolean;
  consentedAt: Date;
  expiresAt: Date; // 90 days from consent

  // Terms acceptance
  termsVersion: string; // e.g., "2025-01-01"
  termsUrl: string;
  acceptedTerms: boolean;
  acceptedMedicalDisclaimer: boolean;

  // Model preferences
  preferredModel: 'medgemma-4b' | 'medgemma-27b';

  // Tracking
  isActive: boolean;
  revokedAt?: Date;
  revokedReason?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedGemmaAccessLog {
  id: string;
  userId: string;
  groupId: string;
  elderId?: string;

  featureType: 'health_chat' | 'clinical_notes';
  action: 'accessed' | 'query_submitted' | 'report_generated';

  consentId: string;
  consentValid: boolean;

  modelUsed: 'medgemma-4b' | 'medgemma-27b' | 'gemini-2.5-pro';

  timestamp: Date;
  metadata?: {
    queryLength?: number;
    responseLength?: number;
    processingTimeMs?: number;
  };
}

const CONSENT_VALIDITY_DAYS = 90;
const CURRENT_TERMS_VERSION = '2025-01-01';
const TERMS_URL = 'https://developers.google.com/health-ai-developer-foundations/terms';

/**
 * Check if user has valid MedGemma consent
 */
export async function checkMedGemmaConsent(
  userId: string,
  groupId: string
): Promise<{ valid: boolean; consent: MedGemmaConsent | null; reason?: string }> {
  try {
    const q = query(
      collection(db, 'medgemmaConsents'),
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
        reason: 'No consent found. Please review and accept the MedGemma terms.'
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
    } as MedGemmaConsent;

    // Check expiration
    const now = new Date();
    if (consent.expiresAt && consent.expiresAt < now) {
      return {
        valid: false,
        consent,
        reason: 'Consent expired. Please re-consent to continue using MedGemma features.'
      };
    }

    // Check if revoked
    if (!consent.isActive || consent.revokedAt) {
      return {
        valid: false,
        consent,
        reason: 'Consent was revoked.'
      };
    }

    // All checks passed
    return {
      valid: true,
      consent
    };
  } catch (error) {
    console.error('Error checking MedGemma consent:', error);
    return {
      valid: false,
      consent: null,
      reason: 'Error verifying consent. Please try again.'
    };
  }
}

/**
 * Create new MedGemma consent record
 */
export async function createMedGemmaConsent(
  userId: string,
  groupId: string,
  preferredModel: 'medgemma-4b' | 'medgemma-27b'
): Promise<MedGemmaConsent> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const consentData: Omit<MedGemmaConsent, 'id'> = {
      userId,
      groupId,

      consentGiven: true,
      consentedAt: now,
      expiresAt,

      termsVersion: CURRENT_TERMS_VERSION,
      termsUrl: TERMS_URL,
      acceptedTerms: true,
      acceptedMedicalDisclaimer: true,

      preferredModel,

      isActive: true,

      ipAddress: typeof window !== 'undefined' ? undefined : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,

      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, 'medgemmaConsents'), consentData);

    return {
      id: docRef.id,
      ...consentData
    };
  } catch (error) {
    console.error('Error creating MedGemma consent:', error);
    throw error;
  }
}

/**
 * Log MedGemma feature access
 */
export async function logMedGemmaAccess(
  userId: string,
  groupId: string,
  elderId: string | undefined,
  featureType: 'health_chat' | 'clinical_notes',
  action: 'accessed' | 'query_submitted' | 'report_generated',
  consentId: string,
  consentValid: boolean,
  modelUsed: 'medgemma-4b' | 'medgemma-27b' | 'gemini-2.5-pro',
  metadata?: {
    queryLength?: number;
    responseLength?: number;
    processingTimeMs?: number;
  }
): Promise<void> {
  try {
    const accessLog: Omit<MedGemmaAccessLog, 'id'> = {
      userId,
      groupId,
      elderId,
      featureType,
      action,
      consentId,
      consentValid,
      modelUsed,
      timestamp: new Date(),
      metadata
    };

    await addDoc(collection(db, 'medgemmaAccessLogs'), accessLog);
  } catch (error) {
    console.error('Error logging MedGemma access:', error);
    // Don't throw - logging failure shouldn't block the feature
  }
}

/**
 * Revoke MedGemma consent
 */
export async function revokeMedGemmaConsent(
  consentId: string,
  reason?: string
): Promise<void> {
  try {
    const consentRef = doc(db, 'medgemmaConsents', consentId);
    await updateDoc(consentRef, {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || 'User revoked consent',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error revoking MedGemma consent:', error);
    throw error;
  }
}

/**
 * Get consent expiry warning
 */
export function getConsentExpiryWarning(consent: MedGemmaConsent): {
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
      message: 'Your MedGemma consent has expired. Please re-consent to continue using AI features.'
    };
  }

  return {
    warning: true,
    daysRemaining,
    message: `Your MedGemma consent expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. You will need to re-consent soon.`
  };
}

/**
 * Get all user consents (for settings page)
 */
export async function getUserMedGemmaConsents(
  userId: string,
  groupId: string
): Promise<MedGemmaConsent[]> {
  try {
    const q = query(
      collection(db, 'medgemmaConsents'),
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
    })) as MedGemmaConsent[];
  } catch (error) {
    console.error('Error getting user MedGemma consents:', error);
    return [];
  }
}
