/**
 * AI Feedback Service
 *
 * Handles CRUD operations for user feedback on AI features.
 * Supports rating, action, and correction feedback types.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  AIFeedback,
  FeedbackFilter,
  FeedbackStats,
  FeedbackTargetType,
  FeedbackType,
  FeedbackRating,
  FeedbackAction,
  FeedbackReason,
  CorrectionType,
  FeedbackContext,
} from '@/types/feedback';

const COLLECTION_NAME = 'aiFeedback';

/**
 * Convert Firestore document to AIFeedback type
 */
function docToFeedback(doc: DocumentSnapshot): AIFeedback | null {
  if (!doc.exists()) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    feedbackType: data.feedbackType,
    targetType: data.targetType,
    targetId: data.targetId,
    userId: data.userId,
    groupId: data.groupId,
    elderId: data.elderId,
    rating: data.rating,
    reason: data.reason,
    comment: data.comment,
    action: data.action,
    actionTaken: data.actionTaken,
    correctionType: data.correctionType,
    originalValue: data.originalValue,
    correctedValue: data.correctedValue,
    explanation: data.explanation,
    contextSnapshot: data.contextSnapshot,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    resolved: data.resolved,
    resolvedAt: data.resolvedAt?.toDate?.(),
    resolvedBy: data.resolvedBy,
    resolutionNote: data.resolutionNote,
  };
}

/**
 * Submit rating feedback (thumbs up/down)
 */
export async function submitRatingFeedback(params: {
  targetType: FeedbackTargetType;
  targetId: string;
  userId: string;
  groupId: string;
  elderId?: string;
  rating: FeedbackRating;
  reason?: FeedbackReason;
  comment?: string;
  contextSnapshot?: FeedbackContext;
  agencyId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const feedbackData = {
      feedbackType: 'rating' as FeedbackType,
      targetType: params.targetType,
      targetId: params.targetId,
      userId: params.userId,
      groupId: params.groupId,
      elderId: params.elderId || null,
      rating: params.rating,
      reason: params.reason || null,
      comment: params.comment || null,
      contextSnapshot: params.contextSnapshot || null,
      agencyId: params.agencyId || null,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), feedbackData);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error submitting rating feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit action feedback (apply/ignore suggestions)
 */
export async function submitActionFeedback(params: {
  targetType: FeedbackTargetType;
  targetId: string;
  userId: string;
  groupId: string;
  elderId?: string;
  action: FeedbackAction;
  actionTaken?: boolean;
  comment?: string;
  contextSnapshot?: FeedbackContext;
  agencyId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const feedbackData = {
      feedbackType: 'action' as FeedbackType,
      targetType: params.targetType,
      targetId: params.targetId,
      userId: params.userId,
      groupId: params.groupId,
      elderId: params.elderId || null,
      action: params.action,
      actionTaken: params.actionTaken ?? null,
      comment: params.comment || null,
      contextSnapshot: params.contextSnapshot || null,
      agencyId: params.agencyId || null,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), feedbackData);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error submitting action feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit correction feedback (user corrections to AI outputs)
 */
export async function submitCorrectionFeedback(params: {
  targetType: FeedbackTargetType;
  targetId: string;
  userId: string;
  groupId: string;
  elderId?: string;
  correctionType: CorrectionType;
  originalValue: string;
  correctedValue: string;
  explanation?: string;
  contextSnapshot?: FeedbackContext;
  agencyId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const feedbackData = {
      feedbackType: 'correction' as FeedbackType,
      targetType: params.targetType,
      targetId: params.targetId,
      userId: params.userId,
      groupId: params.groupId,
      elderId: params.elderId || null,
      correctionType: params.correctionType,
      originalValue: params.originalValue,
      correctedValue: params.correctedValue,
      explanation: params.explanation || null,
      contextSnapshot: params.contextSnapshot || null,
      agencyId: params.agencyId || null,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), feedbackData);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error submitting correction feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(feedbackId: string): Promise<AIFeedback | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, feedbackId);
    const docSnap = await getDoc(docRef);
    return docToFeedback(docSnap);
  } catch (error) {
    console.error('Error getting feedback:', error);
    return null;
  }
}

/**
 * Get user's feedback history
 */
export async function getUserFeedback(
  userId: string,
  options?: {
    limit?: number;
    targetType?: FeedbackTargetType;
    lastDoc?: DocumentSnapshot;
  }
): Promise<{ feedback: AIFeedback[]; lastDoc: DocumentSnapshot | null }> {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (options?.targetType) {
      q = query(q, where('targetType', '==', options.targetType));
    }

    if (options?.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }

    q = query(q, limit(options?.limit || 20));

    const snapshot = await getDocs(q);
    const feedback = snapshot.docs
      .map((doc) => docToFeedback(doc))
      .filter((f): f is AIFeedback => f !== null);

    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { feedback, lastDoc };
  } catch (error) {
    console.error('Error getting user feedback:', error);
    return { feedback: [], lastDoc: null };
  }
}

/**
 * Get feedback for a specific target (e.g., a chat response)
 */
export async function getTargetFeedback(
  targetId: string,
  targetType: FeedbackTargetType
): Promise<AIFeedback[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('targetId', '==', targetId),
      where('targetType', '==', targetType),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => docToFeedback(doc))
      .filter((f): f is AIFeedback => f !== null);
  } catch (error) {
    console.error('Error getting target feedback:', error);
    return [];
  }
}

/**
 * Check if user has already submitted feedback for a target
 */
export async function hasUserFeedback(
  userId: string,
  targetId: string,
  targetType: FeedbackTargetType
): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('targetId', '==', targetId),
      where('targetType', '==', targetType),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking user feedback:', error);
    return false;
  }
}

/**
 * Get feedback statistics for a group
 */
export async function getGroupFeedbackStats(groupId: string): Promise<FeedbackStats> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    const feedbackList = snapshot.docs
      .map((doc) => docToFeedback(doc))
      .filter((f): f is AIFeedback => f !== null);

    return calculateFeedbackStats(feedbackList);
  } catch (error) {
    console.error('Error getting group feedback stats:', error);
    return getEmptyStats();
  }
}

/**
 * Get feedback statistics for an agency (super admin view)
 */
export async function getAgencyFeedbackStats(agencyId: string): Promise<FeedbackStats> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('agencyId', '==', agencyId)
    );

    const snapshot = await getDocs(q);
    const feedbackList = snapshot.docs
      .map((doc) => docToFeedback(doc))
      .filter((f): f is AIFeedback => f !== null);

    return calculateFeedbackStats(feedbackList);
  } catch (error) {
    console.error('Error getting agency feedback stats:', error);
    return getEmptyStats();
  }
}

/**
 * Delete feedback (user's own or group admin)
 */
export async function deleteFeedback(feedbackId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, feedbackId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate statistics from feedback list
 */
function calculateFeedbackStats(feedbackList: AIFeedback[]): FeedbackStats {
  const total = feedbackList.length;

  // Rating breakdown
  const ratings = feedbackList.filter((f) => f.feedbackType === 'rating');
  const helpful = ratings.filter((f) => f.rating === 'helpful').length;
  const notHelpful = ratings.filter((f) => f.rating === 'not_helpful').length;

  // Action breakdown
  const actions = feedbackList.filter((f) => f.feedbackType === 'action');
  const applied = actions.filter((f) => f.action === 'applied' || f.action === 'correct' || f.action === 'valid').length;
  const ignored = actions.filter((f) => f.action === 'ignored' || f.action === 'not_needed' || f.action === 'false_alarm').length;

  // Correction breakdown
  const corrections = feedbackList.filter((f) => f.feedbackType === 'correction');
  const falsePositives = corrections.filter((f) => f.correctionType === 'false_positive').length;
  const falseNegatives = corrections.filter((f) => f.correctionType === 'false_negative').length;

  // By target type
  const targetTypes: FeedbackTargetType[] = [
    'health_chat', 'weekly_summary', 'ai_insight', 'smart_assistant',
    'medication_optimization', 'refill_alert', 'health_change',
    'compliance_prediction', 'burnout_detection'
  ];

  const byTargetType = targetTypes.reduce((acc, type) => {
    const typeFeedback = feedbackList.filter((f) => f.targetType === type);
    const typeRatings = typeFeedback.filter((f) => f.feedbackType === 'rating');
    acc[type] = {
      total: typeFeedback.length,
      helpful: typeRatings.filter((f) => f.rating === 'helpful').length,
      notHelpful: typeRatings.filter((f) => f.rating === 'not_helpful').length,
    };
    return acc;
  }, {} as Record<FeedbackTargetType, { total: number; helpful: number; notHelpful: number }>);

  // Top reasons
  const reasonCounts = new Map<FeedbackReason, number>();
  feedbackList.forEach((f) => {
    if (f.reason) {
      reasonCounts.set(f.reason, (reasonCounts.get(f.reason) || 0) + 1);
    }
  });

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Trends (simplified - would need historical data for real trends)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentFeedback = feedbackList.filter((f) => f.createdAt >= oneWeekAgo);
  const recentHelpful = recentFeedback.filter((f) => f.rating === 'helpful').length;
  const recentTotal = recentFeedback.length;

  return {
    totalFeedback: total,
    helpfulCount: helpful,
    notHelpfulCount: notHelpful,
    helpfulPercentage: ratings.length > 0 ? Math.round((helpful / ratings.length) * 100) : 0,
    appliedCount: applied,
    ignoredCount: ignored,
    applicationRate: actions.length > 0 ? Math.round((applied / actions.length) * 100) : 0,
    correctionCount: corrections.length,
    falsePositiveCount: falsePositives,
    falseNegativeCount: falseNegatives,
    byTargetType,
    topReasons,
    trendsLastWeek: {
      helpfulTrend: recentHelpful > helpful / 2 ? 'up' : recentHelpful < helpful / 4 ? 'down' : 'stable',
      totalFeedbackTrend: recentTotal > total / 2 ? 'up' : recentTotal < total / 4 ? 'down' : 'stable',
      percentageChange: total > 0 ? Math.round((recentTotal / total) * 100) : 0,
    },
  };
}

/**
 * Get empty stats object
 */
function getEmptyStats(): FeedbackStats {
  const targetTypes: FeedbackTargetType[] = [
    'health_chat', 'weekly_summary', 'ai_insight', 'smart_assistant',
    'medication_optimization', 'refill_alert', 'health_change',
    'compliance_prediction', 'burnout_detection'
  ];

  return {
    totalFeedback: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    helpfulPercentage: 0,
    appliedCount: 0,
    ignoredCount: 0,
    applicationRate: 0,
    correctionCount: 0,
    falsePositiveCount: 0,
    falseNegativeCount: 0,
    byTargetType: targetTypes.reduce((acc, type) => {
      acc[type] = { total: 0, helpful: 0, notHelpful: 0 };
      return acc;
    }, {} as Record<FeedbackTargetType, { total: number; helpful: number; notHelpful: number }>),
    topReasons: [],
    trendsLastWeek: {
      helpfulTrend: 'stable',
      totalFeedbackTrend: 'stable',
      percentageChange: 0,
    },
  };
}
