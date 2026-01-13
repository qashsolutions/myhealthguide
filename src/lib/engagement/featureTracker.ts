/**
 * Feature Engagement Tracker
 *
 * Tracks user engagement with features for preference learning.
 * Extends existing session management to add feature-specific tracking.
 *
 * Uses Firebase SDK queries (no composite indexes required).
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getSessionId } from '@/lib/session/sessionManager';
import type {
  TrackableFeature,
  FeatureEngagementEvent,
  UserFeatureEngagement,
} from '@/types/engagement';

const ENGAGEMENT_COLLECTION = 'featureEngagement';
const STATS_COLLECTION = 'userFeatureStats';

// In-memory tracking for current page
let currentFeature: TrackableFeature | null = null;
let featureStartTime: number | null = null;
let pendingActionId: string | null = null;

/**
 * Track page view for a feature
 * Call when user navigates to a feature page
 */
export async function trackFeatureView(
  userId: string,
  feature: TrackableFeature
): Promise<void> {
  // End tracking for previous feature
  if (currentFeature && currentFeature !== feature) {
    await endFeatureTracking(userId);
  }

  currentFeature = feature;
  featureStartTime = Date.now();

  const sessionId = getSessionId() || 'unknown';

  try {
    await addDoc(collection(db, ENGAGEMENT_COLLECTION), {
      userId,
      feature,
      eventType: 'page_view',
      sessionId,
      timestamp: Timestamp.now(),
    });

    // Update aggregated stats
    await updateFeatureStats(userId, feature, 'view');
  } catch (error) {
    console.error('Error tracking feature view:', error);
  }
}

/**
 * Track when user starts an action (form open, button click, etc.)
 */
export async function trackActionStart(
  userId: string,
  feature: TrackableFeature,
  actionType?: string
): Promise<string | null> {
  const sessionId = getSessionId() || 'unknown';

  try {
    const docRef = await addDoc(collection(db, ENGAGEMENT_COLLECTION), {
      userId,
      feature,
      eventType: 'action_start',
      sessionId,
      timestamp: Timestamp.now(),
      metadata: actionType ? { actionType } : {},
    });

    pendingActionId = docRef.id;

    // Update aggregated stats
    await updateFeatureStats(userId, feature, 'action_start');

    return docRef.id;
  } catch (error) {
    console.error('Error tracking action start:', error);
    return null;
  }
}

/**
 * Track when user completes an action
 */
export async function trackActionComplete(
  userId: string,
  feature: TrackableFeature,
  actionType?: string
): Promise<void> {
  const sessionId = getSessionId() || 'unknown';

  try {
    await addDoc(collection(db, ENGAGEMENT_COLLECTION), {
      userId,
      feature,
      eventType: 'action_complete',
      sessionId,
      timestamp: Timestamp.now(),
      metadata: actionType ? { actionType } : {},
    });

    pendingActionId = null;

    // Update aggregated stats
    await updateFeatureStats(userId, feature, 'action_complete');
  } catch (error) {
    console.error('Error tracking action complete:', error);
  }
}

/**
 * Track when user abandons an action (navigates away without completing)
 */
export async function trackActionAbandon(
  userId: string,
  feature: TrackableFeature
): Promise<void> {
  if (!pendingActionId) return;

  const sessionId = getSessionId() || 'unknown';

  try {
    await addDoc(collection(db, ENGAGEMENT_COLLECTION), {
      userId,
      feature,
      eventType: 'action_abandon',
      sessionId,
      timestamp: Timestamp.now(),
    });

    pendingActionId = null;

    // Update aggregated stats
    await updateFeatureStats(userId, feature, 'action_abandon');
  } catch (error) {
    console.error('Error tracking action abandon:', error);
  }
}

/**
 * End tracking for current feature (records time spent)
 */
async function endFeatureTracking(userId: string): Promise<void> {
  if (!currentFeature || !featureStartTime) return;

  const durationMs = Date.now() - featureStartTime;

  // Only record if spent more than 1 second
  if (durationMs > 1000) {
    try {
      // Update time spent in stats
      await updateFeatureStats(userId, currentFeature, 'time', durationMs);
    } catch (error) {
      console.error('Error ending feature tracking:', error);
    }
  }

  // Check for abandoned action
  if (pendingActionId) {
    await trackActionAbandon(userId, currentFeature);
  }

  currentFeature = null;
  featureStartTime = null;
}

/**
 * Update aggregated feature stats for user
 * Uses Firebase SDK document ID pattern (userId_feature) to avoid indexes
 */
async function updateFeatureStats(
  userId: string,
  feature: TrackableFeature,
  eventType: 'view' | 'action_start' | 'action_complete' | 'action_abandon' | 'time',
  durationMs?: number
): Promise<void> {
  const statsId = `${userId}_${feature}`;
  const statsRef = doc(db, STATS_COLLECTION, statsId);

  try {
    const statsDoc = await getDoc(statsRef);
    const now = new Date();

    if (statsDoc.exists()) {
      const data = statsDoc.data() as UserFeatureEngagement;

      // Update based on event type
      const updates: Partial<UserFeatureEngagement> = {
        updatedAt: now,
      };

      switch (eventType) {
        case 'view':
          updates.visitCount = (data.visitCount || 0) + 1;
          updates.lastVisit = now;
          break;
        case 'action_start':
          updates.actionsStarted = (data.actionsStarted || 0) + 1;
          break;
        case 'action_complete':
          updates.actionsCompleted = (data.actionsCompleted || 0) + 1;
          // Recalculate completion rate
          const completedAfter = (data.actionsCompleted || 0) + 1;
          const startedAfter = data.actionsStarted || 1;
          updates.completionRate = completedAfter / startedAfter;
          break;
        case 'action_abandon':
          updates.actionsAbandoned = (data.actionsAbandoned || 0) + 1;
          // Recalculate completion rate
          const abandoned = (data.actionsAbandoned || 0) + 1;
          const started = data.actionsStarted || 1;
          const completed = data.actionsCompleted || 0;
          updates.completionRate = started > 0 ? completed / started : 0;
          break;
        case 'time':
          if (durationMs) {
            const totalTime = (data.totalTimeSpentMs || 0) + durationMs;
            const visits = data.visitCount || 1;
            updates.totalTimeSpentMs = totalTime;
            updates.avgTimeSpentMs = totalTime / visits;
          }
          break;
      }

      await setDoc(statsRef, { ...data, ...updates }, { merge: true });
    } else {
      // Create new stats document
      const newStats: UserFeatureEngagement = {
        userId,
        feature,
        visitCount: eventType === 'view' ? 1 : 0,
        totalTimeSpentMs: eventType === 'time' ? (durationMs || 0) : 0,
        avgTimeSpentMs: eventType === 'time' ? (durationMs || 0) : 0,
        actionsStarted: eventType === 'action_start' ? 1 : 0,
        actionsCompleted: eventType === 'action_complete' ? 1 : 0,
        actionsAbandoned: eventType === 'action_abandon' ? 1 : 0,
        completionRate: eventType === 'action_complete' ? 1 : 0,
        lastVisit: now,
        updatedAt: now,
      };

      await setDoc(statsRef, newStats);
    }
  } catch (error) {
    // Silently fail - feature stats are non-critical analytics
    // Firebase permission errors can occur if rules aren't deployed
    if (process.env.NODE_ENV === 'development') {
      console.warn('[FeatureTracker] Stats update failed (non-critical):', error);
    }
  }
}

/**
 * Get user's feature engagement stats
 * Uses document ID pattern to avoid composite indexes
 */
export async function getUserFeatureStats(
  userId: string
): Promise<UserFeatureEngagement[]> {
  try {
    // Query by userId field (simple single-field query, no index needed)
    const q = query(
      collection(db, STATS_COLLECTION),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastVisit: doc.data().lastVisit?.toDate?.() || new Date(doc.data().lastVisit),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
    })) as UserFeatureEngagement[];
  } catch (error) {
    console.error('Error getting user feature stats:', error);
    return [];
  }
}

/**
 * Get top features for user (most visited/engaged)
 */
export async function getTopFeatures(
  userId: string,
  count: number = 5
): Promise<TrackableFeature[]> {
  const stats = await getUserFeatureStats(userId);

  // Sort by engagement score (visit count * avg time)
  const sorted = stats.sort((a, b) => {
    const scoreA = a.visitCount * (a.avgTimeSpentMs / 1000);
    const scoreB = b.visitCount * (b.avgTimeSpentMs / 1000);
    return scoreB - scoreA;
  });

  return sorted.slice(0, count).map(s => s.feature);
}

/**
 * Handle visibility change (tab hidden/visible)
 * Records time when user leaves tab
 */
export function setupVisibilityTracking(userId: string): () => void {
  const handleVisibilityChange = () => {
    if (document.hidden && currentFeature) {
      endFeatureTracking(userId);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (currentFeature) {
      endFeatureTracking(userId);
    }
  };
}

/**
 * Handle before unload (page close/navigation)
 */
export function setupUnloadTracking(userId: string): () => void {
  const handleBeforeUnload = () => {
    if (currentFeature) {
      // Use sendBeacon for reliable tracking on page close
      const durationMs = featureStartTime ? Date.now() - featureStartTime : 0;
      if (durationMs > 1000) {
        // Note: sendBeacon is fire-and-forget, we can't await it
        // This is a best-effort tracking for page closes
        navigator.sendBeacon?.(
          '/api/track-engagement',
          JSON.stringify({
            userId,
            feature: currentFeature,
            durationMs,
            timestamp: Date.now(),
          })
        );
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}
