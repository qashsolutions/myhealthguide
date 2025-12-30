/**
 * Smart Response Quality Metrics Tracker
 *
 * Tracks metrics to measure smart response quality:
 * - Follow-up rate (did user ask clarifying question?)
 * - Action completion rate (did user act on suggestion?)
 * - Session continuation (did user keep using after response?)
 *
 * Uses Firebase SDK queries to minimize index requirements.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getSessionId } from '@/lib/session/sessionManager';
import type {
  SmartInteractionEvent,
  UserSmartQualityMetrics,
} from '@/types/engagement';

const METRICS_COLLECTION = 'smartInteractionMetrics';
const QUALITY_STATS_COLLECTION = 'userSmartQualityStats';

// In-memory tracking for current session
let lastSmartResponseId: string | null = null;
let lastSmartResponseTime: number | null = null;
let lastSmartResponseDocId: string | null = null;

// Clinical terminology patterns for detection
const CLINICAL_TERM_PATTERNS = [
  /\b(mg|ml|mcg|iu)\b/i,
  /\b(hypertension|hypotension|tachycardia|bradycardia)\b/i,
  /\b(contraindicated?|adverse|interaction|pharmacokinetic)\b/i,
  /\b(hepatic|renal|cardiac|pulmonary)\b/i,
  /\b(prn|bid|tid|qid|qhs|ac|pc)\b/i,
  /\b(etiology|pathophysiology|differential|prognosis)\b/i,
];

/**
 * Detect if response contains clinical terminology
 */
function hasClinicalTerms(text: string): boolean {
  return CLINICAL_TERM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract topic categories from response
 */
function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  const topicPatterns: Record<string, RegExp[]> = {
    medications: [/medication/i, /medicine/i, /drug/i, /dose/i, /pill/i],
    nutrition: [/diet/i, /nutrition/i, /meal/i, /food/i, /eat/i],
    activity: [/activity/i, /exercise/i, /walk/i, /movement/i],
    schedule: [/schedule/i, /reminder/i, /time/i, /appointment/i],
    symptoms: [/symptom/i, /pain/i, /discomfort/i, /feeling/i],
    care: [/care/i, /caregiver/i, /help/i, /assist/i],
  };

  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some(p => p.test(lowerText))) {
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Record a smart response for quality tracking
 * Call this when smart assistant sends a response to the user
 */
export async function recordSmartResponse(params: {
  userId: string;
  groupId: string;
  responseId: string;
  responseText: string;
  feature: 'health_chat' | 'smart_assistant' | 'weekly_summary' | 'smart_insight';
}): Promise<string | null> {
  const { userId, groupId, responseId, responseText, feature } = params;
  const sessionId = getSessionId() || 'unknown';

  try {
    const event: Omit<SmartInteractionEvent, 'id'> = {
      userId,
      groupId,
      sessionId,
      responseId,
      feature,
      timestamp: new Date(),
      responseLength: responseText.length,
      hadFollowUp: false,
      actionTaken: false,
      sessionContinued: false,
      sessionEndedAfter: false,
      wasDetailedResponse: responseText.length > 500,
      hadTechnicalTerms: hasClinicalTerms(responseText),
      topicCategories: extractTopics(responseText),
    };

    const docRef = await addDoc(collection(db, METRICS_COLLECTION), {
      ...event,
      timestamp: Timestamp.now(),
    });

    // Update in-memory tracking
    lastSmartResponseId = responseId;
    lastSmartResponseTime = Date.now();
    lastSmartResponseDocId = docRef.id;

    return docRef.id;
  } catch (error) {
    console.error('Error recording smart response:', error);
    return null;
  }
}

/**
 * Record user follow-up message
 * Call this when user sends a message after a smart response
 */
export async function recordUserFollowUp(
  userId: string,
  isFollowUpQuestion: boolean
): Promise<void> {
  if (!lastSmartResponseDocId || !lastSmartResponseTime) return;

  const timeSinceResponse = Date.now() - lastSmartResponseTime;
  const FOLLOW_UP_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

  // Check if this is within the follow-up window
  const isWithinWindow = timeSinceResponse <= FOLLOW_UP_WINDOW_MS;

  try {
    const docRef = doc(db, METRICS_COLLECTION, lastSmartResponseDocId);

    // Mark as follow-up if it's a question within the time window
    if (isWithinWindow && isFollowUpQuestion) {
      await updateDoc(docRef, {
        hadFollowUp: true,
        followUpTimestamp: Timestamp.now(),
      });
    }

    // Always mark session as continued
    await updateDoc(docRef, {
      sessionContinued: true,
    });

    // Update quality stats
    await updateQualityStats(userId, 'message', { hadFollowUp: isWithinWindow && isFollowUpQuestion });
  } catch (error) {
    console.error('Error recording user follow-up:', error);
  }
}

/**
 * Record action taken on smart suggestion
 * Call when user clicks action button or applies a suggestion
 */
export async function recordActionTaken(
  userId: string,
  responseId: string,
  actionType: string
): Promise<void> {
  try {
    // Find the metrics document for this response
    const q = query(
      collection(db, METRICS_COLLECTION),
      where('userId', '==', userId),
      where('responseId', '==', responseId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, {
      actionTaken: true,
      actionType,
    });

    // Update quality stats
    await updateQualityStats(userId, 'action', {});
  } catch (error) {
    console.error('Error recording action taken:', error);
  }
}

/**
 * Record session end after smart response
 * Call when user session ends (leaves page, timeout, etc.)
 */
export async function recordSessionEnd(userId: string): Promise<void> {
  if (!lastSmartResponseDocId) return;

  try {
    const docRef = doc(db, METRICS_COLLECTION, lastSmartResponseDocId);
    await updateDoc(docRef, {
      sessionEndedAfter: true,
    });

    // Reset tracking
    lastSmartResponseId = null;
    lastSmartResponseTime = null;
    lastSmartResponseDocId = null;
  } catch (error) {
    console.error('Error recording session end:', error);
  }
}

/**
 * Update aggregated quality stats for user
 */
async function updateQualityStats(
  userId: string,
  eventType: 'response' | 'message' | 'action',
  data: { hadFollowUp?: boolean }
): Promise<void> {
  const statsRef = doc(db, QUALITY_STATS_COLLECTION, userId);

  try {
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
      const stats = statsDoc.data() as UserSmartQualityMetrics;

      const updates: Partial<UserSmartQualityMetrics> = {
        updatedAt: new Date(),
      };

      switch (eventType) {
        case 'response':
          updates.totalInteractions = (stats.totalInteractions || 0) + 1;
          break;
        case 'message':
          if (data.hadFollowUp) {
            updates.followUpCount = (stats.followUpCount || 0) + 1;
          }
          updates.sessionsContinued = (stats.sessionsContinued || 0) + 1;
          // Recalculate rates
          const total = stats.totalInteractions || 1;
          updates.followUpRate = (updates.followUpCount || stats.followUpCount || 0) / total;
          updates.continuationRate = (updates.sessionsContinued || 0) / total;
          break;
        case 'action':
          updates.actionsTaken = (stats.actionsTaken || 0) + 1;
          updates.actionRate = (updates.actionsTaken || 0) / (stats.totalInteractions || 1);
          break;
      }

      await setDoc(statsRef, { ...stats, ...updates }, { merge: true });
    } else {
      // Create new stats
      const newStats: UserSmartQualityMetrics = {
        userId,
        totalInteractions: eventType === 'response' ? 1 : 0,
        followUpCount: eventType === 'message' && data.hadFollowUp ? 1 : 0,
        followUpRate: 0,
        actionsTaken: eventType === 'action' ? 1 : 0,
        actionRate: 0,
        sessionsContinued: eventType === 'message' ? 1 : 0,
        continuationRate: 0,
        preferredResponseLength: 'medium',
        avgResponseLengthEngaged: 0,
        updatedAt: new Date(),
      };

      await setDoc(statsRef, newStats);
    }
  } catch (error) {
    console.error('Error updating quality stats:', error);
  }
}

/**
 * Get user's smart quality metrics
 */
export async function getUserSmartQualityMetrics(
  userId: string
): Promise<UserSmartQualityMetrics | null> {
  try {
    const docRef = doc(db, QUALITY_STATS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      ...data,
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    } as UserSmartQualityMetrics;
  } catch (error) {
    console.error('Error getting user smart quality metrics:', error);
    return null;
  }
}

/**
 * Get recent smart interactions for analysis
 * Uses simple userId query (no composite index needed)
 */
export async function getRecentSmartInteractions(
  userId: string,
  count: number = 50
): Promise<SmartInteractionEvent[]> {
  try {
    const q = query(
      collection(db, METRICS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(count)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
      followUpTimestamp: doc.data().followUpTimestamp?.toDate?.(),
    })) as SmartInteractionEvent[];
  } catch (error) {
    console.error('Error getting recent smart interactions:', error);
    return [];
  }
}

/**
 * Detect if a message is a follow-up question
 * Simple heuristic based on question patterns
 */
export function isFollowUpQuestion(message: string): boolean {
  const questionPatterns = [
    /\?$/,
    /^(what|why|how|when|where|who|can|could|would|is|are|do|does|did)\b/i,
    /\b(clarify|explain|meaning|mean|understand)\b/i,
    /\b(more|detail|elaborate|specific)\b/i,
  ];

  return questionPatterns.some(p => p.test(message.trim()));
}
