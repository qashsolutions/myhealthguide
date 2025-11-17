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

/**
 * Get user's IP address (from request headers or API)
 */
async function getIPAddress(): Promise<string> {
  try {
    // For client-side, use a free IP API
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('Error fetching IP address:', error);
    return 'unknown';
  }
}

/**
 * Get approximate location from IP (using free service)
 */
async function getLocationFromIP(ip: string): Promise<{ city?: string; state?: string; country?: string }> {
  try {
    // Use ip-api.com free tier (no API key needed, 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city,
        state: data.regionName,
        country: data.country,
      };
    }
    return {};
  } catch (error) {
    console.error('Error fetching location:', error);
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
    browserVersion = ua.match(/Firefox\\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/')) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\\/([0-9.]+)/)?.[1] || '';
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

    // Create activity log
    const activityLog: Omit<ActivityLog, 'id'> = {
      userId,
      timestamp: new Date(),
      action,
      page,
      city: location.city,
      state: location.state,
      country: location.country,
      ipAddressHash: ipHash,
      deviceType,
      browser: browserInfo.browser,
      browserVersion: browserInfo.browserVersion,
      os: browserInfo.os,
      sessionId,
      metadata,
    };

    // Store in Firestore
    await addDoc(collection(db, `user_activity/${userId}/logs`), {
      ...activityLog,
      timestamp: Timestamp.fromDate(activityLog.timestamp),
    });
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
