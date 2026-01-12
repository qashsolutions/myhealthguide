/**
 * User Activity Tracking Service
 * Tracks user actions, page visits, and session data
 */

import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';

export interface ActivityLog {
  id?: string;
  userId: string;
  timestamp: Date;
  action: string;
  page: string;
  city?: string;
  state?: string;
  country?: string;
  ipAddressHash: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  browserVersion?: string;
  os?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

/**
 * Hash IP address using SHA-256 (one-way hash for privacy)
 * Uses Web Crypto API for browser compatibility
 */
async function hashIPAddress(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Cache IP address for the session to avoid repeated API calls
let cachedIPAddress = '';

/**
 * Get user's IP address (from our own API route to avoid CORS)
 * Cached per session to avoid repeated API calls
 */
async function getIPAddress(): Promise<string> {
  // Return cached IP if available
  if (cachedIPAddress) {
    return cachedIPAddress;
  }

  try {
    // Use our own API route to get client IP (avoids CORS issues)
    const response = await fetch('/api/client-ip', {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    const data = await response.json();
    cachedIPAddress = data.ip || 'unknown';
    return cachedIPAddress;
  } catch (error) {
    // Don't log errors - just return unknown silently
    cachedIPAddress = 'unknown';
    return cachedIPAddress;
  }
}

/**
 * Get approximate location from IP
 * Note: Skipping external IP geolocation API to avoid mixed content issues
 * Location tracking is optional - we track device/browser info instead
 */
async function getLocationFromIP(_ip: string): Promise<{ city?: string; state?: string; country?: string }> {
  // Skip location lookup - external geolocation APIs require HTTP which causes
  // mixed content errors on HTTPS sites. We can add server-side geolocation later if needed.
  return {};
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

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  action: string,
  page: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Get IP address
    const ip = await getIPAddress();
    const ipHash = await hashIPAddress(ip);

    // Get location
    const location = await getLocationFromIP(ip);

    // Get device and browser info
    const deviceType = getDeviceType();
    const browserInfo = getBrowserInfo();
    const sessionId = getSessionId();

    // Create activity log - only include defined values (Firestore doesn't accept undefined)
    const activityLog: Record<string, any> = {
      userId,
      timestamp: Timestamp.fromDate(new Date()),
      action,
      page,
      ipAddressHash: ipHash,
      deviceType,
      browser: browserInfo.browser,
      sessionId,
    };

    // Add optional fields only if they have values
    if (location.city) activityLog.city = location.city;
    if (location.state) activityLog.state = location.state;
    if (location.country) activityLog.country = location.country;
    if (browserInfo.browserVersion) activityLog.browserVersion = browserInfo.browserVersion;
    if (browserInfo.os) activityLog.os = browserInfo.os;
    if (metadata && Object.keys(metadata).length > 0) activityLog.metadata = metadata;

    // Store in Firestore
    await addDoc(collection(db, `user_activity/${userId}/logs`), activityLog);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity tracking should not break the app
  }
}

/**
 * Get user's activity history
 */
export async function getUserActivity(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<ActivityLog[]> {
  try {
    let q = query(
      collection(db, `user_activity/${userId}/logs`),
      orderBy('timestamp', 'desc')
    );

    if (startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }

    if (endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(endDate)));
    }

    const querySnapshot = await getDocs(q);

    const logs: ActivityLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        userId: data.userId,
        timestamp: data.timestamp.toDate(),
        action: data.action,
        page: data.page,
        city: data.city,
        state: data.state,
        country: data.country,
        ipAddressHash: data.ipAddressHash,
        deviceType: data.deviceType,
        browser: data.browser,
        browserVersion: data.browserVersion,
        os: data.os,
        sessionId: data.sessionId,
        metadata: data.metadata,
      });
    });

    return limit ? logs.slice(0, limit) : logs;
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
}
