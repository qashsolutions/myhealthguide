/**
 * Unified AI & Medical Consent Management
 *
 * Single source of truth for all AI and medical feature consent.
 * Consolidates:
 * - AI Features consent (health change detection, medication optimization, etc.)
 * - MedGemma/Google HAI-DEF terms
 * - Medical disclaimer (drug interactions, side effects, dementia screening)
 *
 * COMPLIANCE REQUIREMENTS:
 * - Users must read terms for minimum 60 seconds
 * - Users must scroll to bottom of terms
 * - Users must check all acknowledgment boxes
 * - Consent expires after 90 days
 * - All access is logged for audit trail
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
  orderBy,
  limit
} from 'firebase/firestore';

// Constants
export const CONSENT_VERSION = '2.0.0';
export const CONSENT_VALIDITY_DAYS = 90;
export const MINIMUM_READ_TIME_MS = 60000; // 60 seconds
export const GOOGLE_HAI_DEF_TERMS_URL = 'https://developers.google.com/health-ai-developer-foundations/terms';
export const MEDGEMMA_MODEL_CARD_URL = 'https://developers.google.com/health-ai-developer-foundations/medgemma/model-card';

/**
 * Unified consent record structure
 */
export interface UnifiedAIConsent {
  id: string;
  userId: string;
  groupId: string;

  // Consent status
  consentGiven: boolean;
  consentedAt: Date;
  expiresAt: Date;
  consentVersion: string;

  // What was consented to
  acceptedTerms: {
    aiFeatures: boolean;           // Health change detection, medication optimization, etc.
    medgemmaTerms: boolean;        // Google HAI-DEF terms
    medicalDisclaimer: boolean;    // Not medical advice disclaimer
    dataProcessing: boolean;       // Data sent to Google AI
  };

  // Reading verification
  timeSpentReading: number;        // Milliseconds spent reading
  scrolledToBottom: boolean;       // User scrolled through entire document

  // Preferences
  preferredModel: 'medgemma-4b' | 'medgemma-27b';

  // Status
  isActive: boolean;
  revokedAt?: Date;
  revokedReason?: string;

  // Audit metadata
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Access log for audit trail
 */
export interface UnifiedConsentAccessLog {
  id: string;
  consentId: string;
  userId: string;
  groupId: string;
  elderId?: string;

  featureAccessed:
    | 'health_chat'
    | 'drug_interactions'
    | 'side_effects'
    | 'dementia_screening'
    | 'health_change_detection'
    | 'medication_optimization'
    | 'weekly_summary'
    | 'doctor_visit_prep'
    | 'document_analysis'
    | 'ai_settings';

  action: 'accessed' | 'query_submitted' | 'report_generated' | 'data_viewed';
  consentValid: boolean;
  timestamp: Date;
  userAgent?: string;
}

/**
 * Check if user has valid unified consent
 */
export async function checkUnifiedConsent(
  userId: string,
  groupId: string
): Promise<{ valid: boolean; consent: UnifiedAIConsent | null; reason?: string }> {
  try {
    // Simplified query to avoid composite index requirement
    // We filter by userId only, then filter the rest in memory
    const q = query(
      collection(db, 'unifiedAIConsents'),
      where('userId', '==', userId)
    );

    const consentsSnap = await getDocs(q);

    // Filter in memory for groupId, isActive, and consentGiven
    const matchingDocs = consentsSnap.docs.filter(doc => {
      const data = doc.data();
      return data.groupId === groupId &&
             data.isActive === true &&
             data.consentGiven === true;
    });

    // Sort by consentedAt descending and take the first one
    matchingDocs.sort((a, b) => {
      const aTime = a.data().consentedAt?.toDate?.() || a.data().consentedAt || new Date(0);
      const bTime = b.data().consentedAt?.toDate?.() || b.data().consentedAt || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    if (matchingDocs.length === 0) {
      return {
        valid: false,
        consent: null,
        reason: 'No consent found. Please review and accept the AI & Medical terms.'
      };
    }

    const consentDoc = matchingDocs[0];
    const data = consentDoc.data();

    const consent: UnifiedAIConsent = {
      id: consentDoc.id,
      userId: data.userId,
      groupId: data.groupId,
      consentGiven: data.consentGiven,
      consentedAt: data.consentedAt?.toDate() || new Date(),
      expiresAt: data.expiresAt?.toDate() || new Date(),
      consentVersion: data.consentVersion,
      acceptedTerms: data.acceptedTerms,
      timeSpentReading: data.timeSpentReading,
      scrolledToBottom: data.scrolledToBottom,
      preferredModel: data.preferredModel,
      isActive: data.isActive,
      revokedAt: data.revokedAt?.toDate(),
      revokedReason: data.revokedReason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };

    // Check expiration
    const now = new Date();
    if (consent.expiresAt < now) {
      return {
        valid: false,
        consent,
        reason: 'Consent expired. Please re-consent to continue using AI & Medical features.'
      };
    }

    // Check if revoked
    if (!consent.isActive || consent.revokedAt) {
      return {
        valid: false,
        consent,
        reason: 'Consent was revoked. Please re-consent to use AI & Medical features.'
      };
    }

    // Check if all required terms were accepted
    const { acceptedTerms } = consent;
    if (!acceptedTerms.aiFeatures || !acceptedTerms.medgemmaTerms ||
        !acceptedTerms.medicalDisclaimer || !acceptedTerms.dataProcessing) {
      return {
        valid: false,
        consent,
        reason: 'Incomplete consent. Please review and accept all terms.'
      };
    }

    // All checks passed
    return {
      valid: true,
      consent
    };
  } catch (error) {
    console.error('Error checking unified consent:', error);
    return {
      valid: false,
      consent: null,
      reason: 'Error verifying consent. Please try again.'
    };
  }
}

/**
 * Create new unified consent record
 */
export async function createUnifiedConsent(
  userId: string,
  groupId: string,
  acceptedTerms: {
    aiFeatures: boolean;
    medgemmaTerms: boolean;
    medicalDisclaimer: boolean;
    dataProcessing: boolean;
  },
  timeSpentReading: number,
  scrolledToBottom: boolean,
  preferredModel: 'medgemma-4b' | 'medgemma-27b' = 'medgemma-27b'
): Promise<UnifiedAIConsent> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const consentData = {
      userId,
      groupId,
      consentGiven: true,
      consentedAt: now,
      expiresAt,
      consentVersion: CONSENT_VERSION,
      acceptedTerms,
      timeSpentReading,
      scrolledToBottom,
      preferredModel,
      isActive: true,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, 'unifiedAIConsents'), consentData);

    return {
      id: docRef.id,
      ...consentData
    } as UnifiedAIConsent;
  } catch (error) {
    console.error('Error creating unified consent:', error);
    throw error;
  }
}

/**
 * Log feature access for audit trail
 */
export async function logUnifiedConsentAccess(
  consentId: string,
  userId: string,
  groupId: string,
  featureAccessed: UnifiedConsentAccessLog['featureAccessed'],
  action: UnifiedConsentAccessLog['action'],
  consentValid: boolean,
  elderId?: string
): Promise<void> {
  try {
    const accessLog = {
      consentId,
      userId,
      groupId,
      elderId,
      featureAccessed,
      action,
      consentValid,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    await addDoc(collection(db, 'unifiedConsentAccessLogs'), accessLog);
  } catch (error) {
    console.error('Error logging consent access:', error);
    // Don't throw - logging failure shouldn't block the feature
  }
}

/**
 * Check consent and log access in one call
 * Use this as the entry point for all AI/medical features
 */
export async function verifyAndLogAccess(
  userId: string,
  groupId: string,
  featureAccessed: UnifiedConsentAccessLog['featureAccessed'],
  elderId?: string
): Promise<{ allowed: boolean; consent: UnifiedAIConsent | null; reason?: string }> {
  const { valid, consent, reason } = await checkUnifiedConsent(userId, groupId);

  // Log the access attempt
  if (consent) {
    await logUnifiedConsentAccess(
      consent.id,
      userId,
      groupId,
      featureAccessed,
      valid ? 'accessed' : 'data_viewed',
      valid,
      elderId
    );
  }

  return {
    allowed: valid,
    consent,
    reason
  };
}

/**
 * Revoke unified consent
 */
export async function revokeUnifiedConsent(
  consentId: string,
  reason?: string
): Promise<void> {
  try {
    const consentRef = doc(db, 'unifiedAIConsents', consentId);
    await updateDoc(consentRef, {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || 'User revoked consent',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error revoking unified consent:', error);
    throw error;
  }
}

/**
 * Get consent expiry warning
 */
export function getConsentExpiryWarning(consent: UnifiedAIConsent): {
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
      message: 'Your AI & Medical consent has expired. Please re-consent to continue using these features.'
    };
  }

  return {
    warning: true,
    daysRemaining,
    message: `Your AI & Medical consent expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. You will need to re-consent soon.`
  };
}

/**
 * Get user's consent history
 */
export async function getUserConsentHistory(
  userId: string,
  groupId: string
): Promise<UnifiedAIConsent[]> {
  try {
    const q = query(
      collection(db, 'unifiedAIConsents'),
      where('userId', '==', userId),
      where('groupId', '==', groupId),
      orderBy('consentedAt', 'desc')
    );

    const consentsSnap = await getDocs(q);

    return consentsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        groupId: data.groupId,
        consentGiven: data.consentGiven,
        consentedAt: data.consentedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
        consentVersion: data.consentVersion,
        acceptedTerms: data.acceptedTerms,
        timeSpentReading: data.timeSpentReading,
        scrolledToBottom: data.scrolledToBottom,
        preferredModel: data.preferredModel,
        isActive: data.isActive,
        revokedAt: data.revokedAt?.toDate(),
        revokedReason: data.revokedReason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as UnifiedAIConsent;
    });
  } catch (error) {
    console.error('Error getting user consent history:', error);
    return [];
  }
}
