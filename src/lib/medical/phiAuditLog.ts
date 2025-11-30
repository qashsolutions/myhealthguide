/**
 * PHI (Protected Health Information) Audit Logging Service
 *
 * HIPAA Compliance: 45 CFR § 164.312(b) - Audit Controls
 *
 * This service logs ALL access to PHI with the following information:
 * - WHO: User ID, role, group
 * - WHAT: PHI type, specific element, action
 * - WHEN: Timestamp
 * - WHY: Purpose (treatment, payment, operations, user request)
 * - HOW: Method (web app, API, export, third-party service)
 * - WHERE: IP address (hashed), location
 *
 * Also tracks third-party disclosures for "Accounting of Disclosures" (45 CFR § 164.528)
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Types of PHI tracked in the system
 */
export type PHIType =
  | 'medication'           // Medication data (name, dosage, schedule, logs)
  | 'diet'                 // Diet/meal entries
  | 'elder'                // Elder demographic and health information
  | 'health_summary'       // AI-generated health summaries
  | 'medical_assessment'   // Medical assessments (drug interactions, side effects, etc.)
  | 'export'               // Data exports
  | 'third_party_disclosure'; // Data shared with third parties

/**
 * Actions that can be performed on PHI
 */
export type PHIAction =
  | 'create'               // Creating new PHI
  | 'read'                 // Viewing/accessing PHI
  | 'update'               // Modifying existing PHI
  | 'delete'               // Deleting PHI
  | 'export'               // Exporting PHI
  | 'ai_analysis'          // AI processing of PHI
  | 'third_party_api';     // Third-party API access to PHI

/**
 * Purpose of PHI access (HIPAA required)
 */
export type PHIPurpose =
  | 'treatment'            // Healthcare treatment
  | 'payment'              // Billing/subscription
  | 'operations'           // Healthcare operations
  | 'user_request';        // Direct user request

/**
 * Method of PHI access
 */
export type PHIMethod =
  | 'web_app'              // User via web application
  | 'api'                  // Programmatic API access
  | 'export'               // Export functionality
  | 'third_party_service'; // External service (AI, FDA API, etc.)

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'caregiver' | 'member';

/**
 * Third-party disclosure information for Accounting of Disclosures
 */
export interface ThirdPartyDisclosure {
  serviceName: string;      // e.g., 'Google Gemini AI', 'FDA Drug Information API'
  serviceType: string;      // e.g., 'ai_analysis', 'drug_information_lookup'
  dataShared: string[];     // Specific data elements shared
  dateShared: Date;         // When was data shared
  purpose: string;          // Why was data shared
  disclosureId?: string;    // Unique ID for this disclosure
}

/**
 * Complete PHI Audit Log entry
 */
export interface PHIAuditLog {
  id?: string;

  // WHO - User identification
  userId: string;
  userRole: UserRole;
  groupId: string;

  // WHAT - PHI element and action
  phiType: PHIType;
  phiId?: string;           // ID of the specific PHI element
  elderId?: string;         // Which elder's data was accessed
  action: PHIAction;
  actionDetails?: string;   // Additional context

  // WHEN - Timestamp
  timestamp: Date;

  // WHY - Purpose (HIPAA required)
  purpose: PHIPurpose;

  // HOW - Method
  method: PHIMethod;

  // WHERE - Location
  ipAddress?: string;       // Raw IP (only stored temporarily if needed)
  ipAddressHash: string;    // Hashed IP for privacy
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  // Additional metadata
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  browserVersion?: string;
  os?: string;
  sessionId?: string;

  // Third-party disclosure (for Accounting of Disclosures)
  thirdPartyDisclosure?: ThirdPartyDisclosure;
}

// ============================================================================
// HELPER FUNCTIONS (from activity.ts with enhancements)
// ============================================================================

/**
 * Hash IP address using SHA-256 (one-way hash for privacy)
 */
async function hashIPAddress(ip: string): Promise<string> {
  if (ip === 'unknown' || !ip) return 'unknown';

  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get user's IP address (from request headers or API)
 */
async function getIPAddress(): Promise<string> {
  try {
    // For client-side, use a free IP API
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('Error fetching IP address:', error);
    return 'unknown';
  }
}

/**
 * Get approximate location from IP
 * Uses ipapi.co which provides free HTTPS API (1000 requests/day)
 */
async function getLocationFromIP(ip: string): Promise<{ city?: string; state?: string; country?: string }> {
  if (ip === 'unknown' || !ip) return {};

  try {
    // Use ipapi.co - free HTTPS API (1000 requests/day, no API key needed for basic usage)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) return {};

    const data = await response.json();

    if (!data.error) {
      return {
        city: data.city,
        state: data.region,
        country: data.country_name,
      };
    }
    return {};
  } catch (error) {
    // Silently fail - location is optional for audit logs
    return {};
  }
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Get browser name and version
 */
function getBrowserInfo(): { browser: string; browserVersion?: string; os?: string } {
  if (typeof navigator === 'undefined') {
    return { browser: 'unknown' };
  }

  const ua = navigator.userAgent;
  let browser = 'unknown';
  let browserVersion = '';
  let os = '';

  // Detect browser
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    const match = ua.match(/Firefox\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    const match = ua.match(/Edg\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    const match = ua.match(/Chrome\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Safari/')) {
    browser = 'Safari';
    const match = ua.match(/Version\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }

  // Detect OS
  if (ua.includes('Windows NT')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }

  return { browser, browserVersion, os };
}

/**
 * Generate or retrieve session ID from sessionStorage
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

// ============================================================================
// MAIN PHI AUDIT LOGGING FUNCTIONS
// ============================================================================

/**
 * Log PHI access - Primary function for all PHI audit logging
 *
 * @param params - PHI access information
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await logPHIAccess({
 *   userId: 'user123',
 *   userRole: 'caregiver',
 *   groupId: 'group456',
 *   phiType: 'medication',
 *   phiId: 'med789',
 *   elderId: 'elder101',
 *   action: 'read',
 *   purpose: 'treatment',
 *   method: 'web_app',
 * });
 * ```
 */
export async function logPHIAccess(params: {
  userId: string;
  userRole: UserRole;
  groupId: string;
  phiType: PHIType;
  phiId?: string;
  elderId?: string;
  action: PHIAction;
  actionDetails?: string;
  purpose: PHIPurpose;
  method: PHIMethod;
  thirdPartyDisclosure?: ThirdPartyDisclosure;
}): Promise<void> {
  try {
    // Get IP address and hash it
    const ip = await getIPAddress();
    const ipHash = await hashIPAddress(ip);

    // Get location from IP
    const location = await getLocationFromIP(ip);

    // Get device and browser info
    const deviceType = getDeviceType();
    const browserInfo = getBrowserInfo();
    const sessionId = getSessionId();

    // Create PHI audit log entry
    const phiLog: Omit<PHIAuditLog, 'id'> = {
      // WHO
      userId: params.userId,
      userRole: params.userRole,
      groupId: params.groupId,

      // WHAT
      phiType: params.phiType,
      phiId: params.phiId,
      elderId: params.elderId,
      action: params.action,
      actionDetails: params.actionDetails,

      // WHEN
      timestamp: new Date(),

      // WHY
      purpose: params.purpose,

      // HOW
      method: params.method,

      // WHERE
      ipAddressHash: ipHash,
      location,

      // Additional metadata
      deviceType,
      browser: browserInfo.browser,
      browserVersion: browserInfo.browserVersion,
      os: browserInfo.os,
      sessionId,

      // Third-party disclosure
      thirdPartyDisclosure: params.thirdPartyDisclosure,
    };

    // Build the document, filtering out undefined values (Firestore doesn't accept undefined)
    const docData: Record<string, any> = {
      userId: phiLog.userId,
      userRole: phiLog.userRole,
      groupId: phiLog.groupId,
      phiType: phiLog.phiType,
      action: phiLog.action,
      timestamp: Timestamp.fromDate(phiLog.timestamp),
      purpose: phiLog.purpose,
      method: phiLog.method,
      deviceType: phiLog.deviceType,
      browser: phiLog.browser,
    };

    // Add optional fields only if defined
    if (phiLog.phiId) docData.phiId = phiLog.phiId;
    if (phiLog.elderId) docData.elderId = phiLog.elderId;
    if (phiLog.actionDetails) docData.actionDetails = phiLog.actionDetails;
    if (phiLog.ipAddressHash) docData.ipAddressHash = phiLog.ipAddressHash;
    if (phiLog.location && Object.keys(phiLog.location).length > 0) docData.location = phiLog.location;
    if (phiLog.browserVersion) docData.browserVersion = phiLog.browserVersion;
    if (phiLog.os) docData.os = phiLog.os;
    if (phiLog.sessionId) docData.sessionId = phiLog.sessionId;

    // Handle thirdPartyDisclosure separately
    if (phiLog.thirdPartyDisclosure) {
      docData.thirdPartyDisclosure = {
        ...phiLog.thirdPartyDisclosure,
        ...(phiLog.thirdPartyDisclosure.dateShared && {
          dateShared: Timestamp.fromDate(phiLog.thirdPartyDisclosure.dateShared),
        }),
      };
    }

    // Store in Firestore - top-level collection for easy querying
    await addDoc(collection(db, 'phi_audit_logs'), docData);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[PHI AUDIT]', {
        userId: params.userId,
        phiType: params.phiType,
        action: params.action,
        elderId: params.elderId,
        purpose: params.purpose,
      });
    }
  } catch (error) {
    console.error('Error logging PHI access:', error);
    // CRITICAL: PHI audit logging failures should be monitored
    // In production, send alert to monitoring system
    // Don't throw - we don't want to break the app, but we should log this failure
  }
}

/**
 * Log third-party disclosure of PHI
 * Convenience function for tracking disclosures to external services
 *
 * @param params - Disclosure information
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await logPHIThirdPartyDisclosure({
 *   userId: 'user123',
 *   userRole: 'caregiver',
 *   groupId: 'group456',
 *   elderId: 'elder101',
 *   serviceName: 'Google Gemini AI',
 *   serviceType: 'health_summary_generation',
 *   dataShared: ['medications', 'diet_entries', 'elder_age'],
 *   purpose: 'Generate health summary for treatment planning',
 * });
 * ```
 */
export async function logPHIThirdPartyDisclosure(params: {
  userId: string;
  userRole: UserRole;
  groupId: string;
  elderId?: string;
  serviceName: string;
  serviceType: string;
  dataShared: string[];
  purpose: string;
  phiType?: PHIType;
  phiId?: string;
}): Promise<void> {
  const disclosureId = `disclosure_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  await logPHIAccess({
    userId: params.userId,
    userRole: params.userRole,
    groupId: params.groupId,
    phiType: params.phiType || 'third_party_disclosure',
    phiId: params.phiId,
    elderId: params.elderId,
    action: 'third_party_api',
    actionDetails: `Disclosed to ${params.serviceName}`,
    purpose: 'operations', // Third-party processing is typically for operations
    method: 'third_party_service',
    thirdPartyDisclosure: {
      serviceName: params.serviceName,
      serviceType: params.serviceType,
      dataShared: params.dataShared,
      dateShared: new Date(),
      purpose: params.purpose,
      disclosureId,
    },
  });
}

// ============================================================================
// QUERY FUNCTIONS FOR AUDIT LOGS
// ============================================================================

/**
 * Get Accounting of Disclosures for a user
 * HIPAA requires ability to provide an accounting of disclosures for the past 6 years
 *
 * @param userId - User ID to get disclosures for
 * @param startDate - Start date for disclosure period (default: 6 years ago)
 * @param endDate - End date for disclosure period (default: now)
 * @returns Promise<PHIAuditLog[]> - Array of disclosure logs
 */
export async function getAccountingOfDisclosures(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PHIAuditLog[]> {
  try {
    // Default to 6 years ago (HIPAA requirement)
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 6);

    const start = startDate || defaultStartDate;
    const end = endDate || new Date();

    // Query for third-party disclosures
    const q = query(
      collection(db, 'phi_audit_logs'),
      where('userId', '==', userId),
      where('action', '==', 'third_party_api'),
      where('timestamp', '>=', Timestamp.fromDate(start)),
      where('timestamp', '<=', Timestamp.fromDate(end)),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);

    const disclosures: PHIAuditLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      disclosures.push({
        id: doc.id,
        userId: data.userId,
        userRole: data.userRole,
        groupId: data.groupId,
        phiType: data.phiType,
        phiId: data.phiId,
        elderId: data.elderId,
        action: data.action,
        actionDetails: data.actionDetails,
        timestamp: data.timestamp.toDate(),
        purpose: data.purpose,
        method: data.method,
        ipAddressHash: data.ipAddressHash,
        location: data.location,
        deviceType: data.deviceType,
        browser: data.browser,
        browserVersion: data.browserVersion,
        os: data.os,
        sessionId: data.sessionId,
        thirdPartyDisclosure: data.thirdPartyDisclosure ? {
          ...data.thirdPartyDisclosure,
          dateShared: data.thirdPartyDisclosure.dateShared?.toDate(),
        } : undefined,
      });
    });

    return disclosures;
  } catch (error) {
    console.error('Error fetching accounting of disclosures:', error);
    return [];
  }
}

/**
 * Get PHI audit logs for a specific elder
 * Useful for tracking who accessed a specific elder's information
 *
 * @param elderId - Elder ID to get audit logs for
 * @param limitCount - Maximum number of logs to return (default: 100)
 * @returns Promise<PHIAuditLog[]>
 */
export async function getElderPHIAuditLogs(
  elderId: string,
  limitCount: number = 100
): Promise<PHIAuditLog[]> {
  try {
    const q = query(
      collection(db, 'phi_audit_logs'),
      where('elderId', '==', elderId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    const logs: PHIAuditLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        userId: data.userId,
        userRole: data.userRole,
        groupId: data.groupId,
        phiType: data.phiType,
        phiId: data.phiId,
        elderId: data.elderId,
        action: data.action,
        actionDetails: data.actionDetails,
        timestamp: data.timestamp.toDate(),
        purpose: data.purpose,
        method: data.method,
        ipAddressHash: data.ipAddressHash,
        location: data.location,
        deviceType: data.deviceType,
        browser: data.browser,
        browserVersion: data.browserVersion,
        os: data.os,
        sessionId: data.sessionId,
        thirdPartyDisclosure: data.thirdPartyDisclosure ? {
          ...data.thirdPartyDisclosure,
          dateShared: data.thirdPartyDisclosure.dateShared?.toDate(),
        } : undefined,
      });
    });

    return logs;
  } catch (error) {
    console.error('Error fetching elder PHI audit logs:', error);
    return [];
  }
}

/**
 * Get PHI audit logs for a specific user's activity
 * Useful for investigating potential security incidents
 *
 * @param userId - User ID to get audit logs for
 * @param startDate - Start date (optional)
 * @param endDate - End date (optional)
 * @param limitCount - Maximum number of logs to return (default: 100)
 * @returns Promise<PHIAuditLog[]>
 */
export async function getUserPHIAuditLogs(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limitCount: number = 100
): Promise<PHIAuditLog[]> {
  try {
    let q = query(
      collection(db, 'phi_audit_logs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    );

    if (startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }

    if (endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(endDate)));
    }

    const querySnapshot = await getDocs(q);

    const logs: PHIAuditLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        userId: data.userId,
        userRole: data.userRole,
        groupId: data.groupId,
        phiType: data.phiType,
        phiId: data.phiId,
        elderId: data.elderId,
        action: data.action,
        actionDetails: data.actionDetails,
        timestamp: data.timestamp.toDate(),
        purpose: data.purpose,
        method: data.method,
        ipAddressHash: data.ipAddressHash,
        location: data.location,
        deviceType: data.deviceType,
        browser: data.browser,
        browserVersion: data.browserVersion,
        os: data.os,
        sessionId: data.sessionId,
        thirdPartyDisclosure: data.thirdPartyDisclosure ? {
          ...data.thirdPartyDisclosure,
          dateShared: data.thirdPartyDisclosure.dateShared?.toDate(),
        } : undefined,
      });
    });

    return logs;
  } catch (error) {
    console.error('Error fetching user PHI audit logs:', error);
    return [];
  }
}
