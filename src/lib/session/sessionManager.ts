/**
 * Session Management System
 *
 * Manages user sessions with persistent session IDs that remain
 * until the user explicitly logs out or clears browser history/data.
 *
 * Features:
 * - Persistent session ID across page reloads
 * - Session tracking and analytics
 * - Automatic cleanup on logout
 * - Session activity tracking
 */

import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc, Timestamp, query, where, orderBy, limit, getDocs, setDoc, getDoc } from 'firebase/firestore';

export interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
  isActive: boolean;
  // Cross-device session continuity fields
  lastPage?: string;
  lastElderId?: string;
  lastElderName?: string;
  lastAction?: string;
}

export interface SessionContinuityData {
  lastPage: string;
  lastElderId?: string;
  lastElderName?: string;
  lastAction?: string;
  lastActivity: Date;
  deviceInfo: {
    platform: string;
  };
}

const SESSION_KEY = 'app_session_id';
const SESSION_DATA_KEY = 'app_session_data';
const SESSION_START_KEY = 'app_session_start';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get device information
 */
function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  };
}

/**
 * Initialize or retrieve existing session
 * Called when app loads or user visits
 */
export function initializeSession(userId?: string): string {
  // Check if session already exists
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // Create new session
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(SESSION_START_KEY, new Date().toISOString());

    // Save session start to Firebase
    createSessionRecord(sessionId, userId);
  } else {
    // Update existing session with last activity
    updateSessionActivity(sessionId, userId);
  }

  // Update session data in localStorage
  const sessionData: SessionData = {
    sessionId,
    userId,
    startTime: new Date(localStorage.getItem(SESSION_START_KEY) || new Date()),
    lastActivity: new Date(),
    deviceInfo: getDeviceInfo(),
    isActive: true
  };

  localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));

  return sessionId;
}

/**
 * Create session record in Firebase
 */
async function createSessionRecord(sessionId: string, userId?: string) {
  try {
    await addDoc(collection(db, 'sessions'), {
      sessionId,
      userId: userId || null,
      startTime: Timestamp.now(),
      lastActivity: Timestamp.now(),
      deviceInfo: getDeviceInfo(),
      isActive: true,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error creating session record:', error);
  }
}

/**
 * Update session activity timestamp
 */
async function updateSessionActivity(sessionId: string, userId?: string) {
  try {
    // In a real implementation, you'd query for the session document and update it
    // For now, we'll just update localStorage
    const sessionData = getSessionData();
    if (sessionData) {
      sessionData.lastActivity = new Date();
      if (userId) sessionData.userId = userId;
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
    }
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

/**
 * Get current session ID
 */
export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Get current session data
 */
export function getSessionData(): SessionData | null {
  const dataStr = localStorage.getItem(SESSION_DATA_KEY);
  if (!dataStr) return null;

  try {
    const data = JSON.parse(dataStr);
    return {
      ...data,
      startTime: new Date(data.startTime),
      lastActivity: new Date(data.lastActivity)
    };
  } catch (error) {
    console.error('Error parsing session data:', error);
    return null;
  }
}

/**
 * Get session duration in minutes
 */
export function getSessionDuration(): number {
  const startTime = localStorage.getItem(SESSION_START_KEY);
  if (!startTime) return 0;

  const start = new Date(startTime);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
}

/**
 * Track activity in current session
 * Call this on user interactions (clicks, navigations, etc.)
 */
export function trackSessionActivity() {
  const sessionId = getSessionId();
  if (!sessionId) return;

  const sessionData = getSessionData();
  if (sessionData) {
    sessionData.lastActivity = new Date();
    localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
  }
}

/**
 * End session (called on logout)
 * Clears all session data
 */
export async function endSession() {
  const sessionId = getSessionId();

  if (sessionId) {
    // Mark session as inactive in Firebase
    try {
      // In real implementation, query and update the session document
      // For now, just add an end event
      await addDoc(collection(db, 'sessionEvents'), {
        sessionId,
        eventType: 'session_end',
        timestamp: Timestamp.now(),
        duration: getSessionDuration()
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Clear all session data from localStorage
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_DATA_KEY);
  localStorage.removeItem(SESSION_START_KEY);
}

/**
 * Check if session is still valid
 * Sessions expire after 24 hours of inactivity
 */
export function isSessionValid(): boolean {
  const sessionData = getSessionData();
  if (!sessionData) return false;

  const lastActivity = sessionData.lastActivity;
  const now = new Date();
  const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60 / 60;

  // Session expires after 24 hours of inactivity
  if (hoursSinceActivity > 24) {
    endSession();
    return false;
  }

  return true;
}

/**
 * Associate session with user after login
 */
export async function associateSessionWithUser(userId: string) {
  const sessionId = getSessionId();
  if (!sessionId) {
    // Create new session with user
    initializeSession(userId);
    return;
  }

  // Update existing session with user ID
  const sessionData = getSessionData();
  if (sessionData) {
    sessionData.userId = userId;
    localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));

    // Update in Firebase
    try {
      await addDoc(collection(db, 'sessionEvents'), {
        sessionId,
        eventType: 'user_login',
        userId,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Error associating session with user:', error);
    }
  }
}

/**
 * Log session event (page view, action, etc.)
 */
export async function logSessionEvent(eventType: string, data?: Record<string, any>) {
  const sessionId = getSessionId();
  if (!sessionId) return;

  const sessionData = getSessionData();

  try {
    await addDoc(collection(db, 'sessionEvents'), {
      sessionId,
      userId: sessionData?.userId || null,
      eventType,
      data: data || {},
      timestamp: Timestamp.now(),
      deviceInfo: getDeviceInfo()
    });
  } catch (error) {
    console.error('Error logging session event:', error);
  }

  // Update last activity
  trackSessionActivity();
}

// ============================================================================
// CROSS-DEVICE SESSION CONTINUITY
// ============================================================================

/**
 * Update session with current page/elder context
 * Call this on page navigation or elder selection
 */
export async function updateSessionContext(context: {
  page?: string;
  elderId?: string;
  elderName?: string;
  action?: string;
}) {
  const sessionId = getSessionId();
  if (!sessionId) return;

  const sessionData = getSessionData();
  if (!sessionData) return;

  // Update localStorage
  if (context.page) sessionData.lastPage = context.page;
  if (context.elderId) sessionData.lastElderId = context.elderId;
  if (context.elderName) sessionData.lastElderName = context.elderName;
  if (context.action) sessionData.lastAction = context.action;
  sessionData.lastActivity = new Date();

  localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));

  // Update Firestore for cross-device access (only if user is logged in)
  if (sessionData.userId) {
    try {
      const userSessionRef = doc(db, 'userSessions', sessionData.userId);
      await setDoc(userSessionRef, {
        userId: sessionData.userId,
        sessionId,
        lastPage: sessionData.lastPage || null,
        lastElderId: sessionData.lastElderId || null,
        lastElderName: sessionData.lastElderName || null,
        lastAction: sessionData.lastAction || null,
        lastActivity: Timestamp.now(),
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent.substring(0, 100) // Truncate for storage
        },
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating session context in Firestore:', error);
    }
  }
}

/**
 * Get previous session data for a user (for cross-device continuity)
 * Call this after login to check if user has a previous session to resume
 */
export async function getPreviousSessionForUser(userId: string): Promise<SessionContinuityData | null> {
  try {
    const userSessionRef = doc(db, 'userSessions', userId);
    const sessionDoc = await getDoc(userSessionRef);

    if (!sessionDoc.exists()) {
      return null;
    }

    const data = sessionDoc.data();

    // Check if the session is from a different device/session
    const currentSessionId = getSessionId();
    if (data.sessionId === currentSessionId) {
      // Same session, no need to offer continuity
      return null;
    }

    // Check if session is recent (within last 7 days)
    let lastActivity: Date;
    if (data.lastActivity && typeof data.lastActivity === 'object' && 'seconds' in data.lastActivity) {
      lastActivity = new Date(data.lastActivity.seconds * 1000);
    } else {
      lastActivity = new Date(data.lastActivity);
    }

    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity > 7) {
      // Session too old, don't offer continuity
      return null;
    }

    // Only return if there's meaningful context to resume
    if (!data.lastPage || data.lastPage === '/dashboard') {
      return null;
    }

    return {
      lastPage: data.lastPage,
      lastElderId: data.lastElderId || undefined,
      lastElderName: data.lastElderName || undefined,
      lastAction: data.lastAction || undefined,
      lastActivity,
      deviceInfo: {
        platform: data.deviceInfo?.platform || 'Unknown device'
      }
    };
  } catch (error) {
    console.error('Error getting previous session:', error);
    return null;
  }
}

/**
 * Clear the cross-device session continuity offer
 * Call this after user dismisses or accepts the continuity offer
 */
export async function clearSessionContinuityOffer(userId: string) {
  try {
    const currentSessionId = getSessionId();
    const userSessionRef = doc(db, 'userSessions', userId);

    // Update the session ID to current, effectively marking continuity as handled
    await setDoc(userSessionRef, {
      sessionId: currentSessionId,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error clearing session continuity offer:', error);
  }
}

/**
 * Get human-readable page name from path
 */
export function getPageDisplayName(path: string): string {
  const pageNames: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/daily-care': 'Daily Care',
    '/dashboard/elder-profile': 'Health Profile',
    '/dashboard/ask-ai': 'Ask AI',
    '/dashboard/safety-alerts': 'Safety Alerts',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/notes': 'My Notes',
    '/dashboard/settings': 'Settings',
    '/dashboard/elders': 'Loved Ones',
    '/dashboard/elders/new': 'Add Loved One',
    '/dashboard/medications': 'Medications',
    '/dashboard/supplements': 'Supplements',
    '/dashboard/diet': 'Diet',
    '/dashboard/activity': 'Activity',
    '/dashboard/health-chat': 'Health Chat',
    '/dashboard/drug-interactions': 'Drug Interactions',
    '/dashboard/dementia-screening': 'Dementia Screening',
    '/dashboard/insights': 'Health Trends',
    '/dashboard/timesheet': 'Timesheet',
    '/dashboard/shift-handoff': 'Shift Handoff',
  };

  // Check for exact match first
  if (pageNames[path]) return pageNames[path];

  // Check for partial match (for dynamic routes)
  for (const [route, name] of Object.entries(pageNames)) {
    if (path.startsWith(route)) return name;
  }

  // Extract last segment as fallback
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'Page';
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
}
