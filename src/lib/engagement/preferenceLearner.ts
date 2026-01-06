/**
 * Preference Learning Engine
 *
 * Analyzes user feedback and engagement data to learn:
 * - Verbosity preference (concise vs detailed)
 * - Terminology preference (simple vs clinical)
 * - Focus areas (topics user engages with most)
 *
 * Uses existing feedback collection + new engagement data.
 * Implements confidence scoring to avoid premature conclusions.
 */

import {
  collection,
  doc,
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
import { getUserFeatureStats, getTopFeatures } from './featureTracker';
import { getRecentSmartInteractions, getUserSmartQualityMetrics } from './smartMetricsTracker';
import type {
  UserSmartPreferences,
  VerbosityLevel,
  TerminologyLevel,
  TrackableFeature,
  SmartInteractionEvent,
} from '@/types/engagement';
import { getDefaultPreferences } from '@/types/engagement';
import type { AIFeedback } from '@/types/feedback';

const PREFERENCES_COLLECTION = 'userSmartPreferences';
const FEEDBACK_COLLECTION = 'aiFeedback';

// Learning configuration
const CONFIG = {
  minFeedbackForLearning: 5,
  minEngagementForLearning: 10,
  confidenceThreshold: 0.6,
  shortResponseThreshold: 200,
  longResponseThreshold: 500,
};

/**
 * Get user's current smart preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<UserSmartPreferences> {
  try {
    const docRef = doc(db, PREFERENCES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return getDefaultPreferences(userId);
    }

    const data = docSnap.data();
    return {
      ...data,
      lastLearningUpdate: data.lastLearningUpdate?.toDate?.() || new Date(data.lastLearningUpdate),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    } as UserSmartPreferences;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return getDefaultPreferences(userId);
  }
}

/**
 * Save user preferences
 */
export async function saveUserPreferences(
  preferences: UserSmartPreferences
): Promise<void> {
  try {
    const docRef = doc(db, PREFERENCES_COLLECTION, preferences.userId);
    await setDoc(docRef, {
      ...preferences,
      lastLearningUpdate: Timestamp.fromDate(preferences.lastLearningUpdate),
      createdAt: Timestamp.fromDate(preferences.createdAt),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Update manual preferences (user setting override)
 */
export async function updateManualPreferences(
  userId: string,
  manualSettings: {
    manualOverride: boolean;
    manualVerbosity?: VerbosityLevel;
    manualTerminology?: TerminologyLevel;
    manualFocusAreas?: string[];
  }
): Promise<void> {
  try {
    const current = await getUserPreferences(userId);
    await saveUserPreferences({
      ...current,
      ...manualSettings,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating manual preferences:', error);
  }
}

/**
 * Main learning function - analyzes data and updates preferences
 * Call this periodically or after significant new data
 */
export async function learnUserPreferences(userId: string): Promise<UserSmartPreferences> {
  const currentPrefs = await getUserPreferences(userId);

  // Get feedback data
  const feedback = await getUserFeedback(userId);

  // Get smart interaction metrics
  const interactions = await getRecentSmartInteractions(userId, 100);

  // Get feature engagement stats
  const topFeatures = await getTopFeatures(userId, 5);

  // Check if we have enough data
  const totalDataPoints = feedback.length + interactions.length;
  if (totalDataPoints < CONFIG.minFeedbackForLearning) {
    // Not enough data yet - return defaults with low confidence
    return currentPrefs;
  }

  // Learn verbosity preference
  const verbosityResult = learnVerbosityPreference(feedback, interactions);

  // Learn terminology preference
  const terminologyResult = learnTerminologyPreference(feedback, interactions);

  // Learn focus areas
  const focusAreasResult = await learnFocusAreas(userId, topFeatures);

  // Update preferences with learned values
  const updatedPrefs: UserSmartPreferences = {
    ...currentPrefs,
    learnedVerbosity: verbosityResult.value,
    verbosityConfidence: verbosityResult.confidence,
    learnedTerminology: terminologyResult.value,
    terminologyConfidence: terminologyResult.confidence,
    learnedFocusAreas: focusAreasResult.value,
    focusAreasConfidence: focusAreasResult.confidence,
    feedbackAnalyzed: feedback.length,
    engagementEventsAnalyzed: interactions.length,
    lastLearningUpdate: new Date(),
    updatedAt: new Date(),
  };

  await saveUserPreferences(updatedPrefs);
  return updatedPrefs;
}

/**
 * Get user's feedback from aiFeedback collection
 */
async function getUserFeedback(userId: string): Promise<AIFeedback[]> {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    })) as AIFeedback[];
  } catch (error) {
    console.error('Error getting user feedback:', error);
    return [];
  }
}

/**
 * Learn verbosity preference from feedback and interactions
 */
function learnVerbosityPreference(
  feedback: AIFeedback[],
  interactions: SmartInteractionEvent[]
): { value: VerbosityLevel; confidence: number } {
  // Default with low confidence
  let result: { value: VerbosityLevel; confidence: number } = {
    value: 'balanced',
    confidence: 0,
  };

  // Analyze feedback for response length patterns
  const ratingFeedback = feedback.filter(f => f.feedbackType === 'rating');

  // Count positive feedback for different response lengths
  let shortPositive = 0;
  let longPositive = 0;
  let totalRatings = 0;

  // Analyze interactions where user continued the session (positive signal)
  for (const interaction of interactions) {
    if (interaction.sessionContinued && !interaction.hadFollowUp) {
      // User continued without asking follow-up = response was satisfactory
      if (interaction.responseLength < CONFIG.shortResponseThreshold) {
        shortPositive++;
      } else if (interaction.responseLength > CONFIG.longResponseThreshold) {
        longPositive++;
      }
      totalRatings++;
    }
  }

  // Analyze explicit feedback
  for (const fb of ratingFeedback) {
    if (fb.rating === 'helpful') {
      // Check context for response length (if available)
      const context = fb.contextSnapshot;
      if (context?.responseLength) {
        if (context.responseLength < CONFIG.shortResponseThreshold) {
          shortPositive++;
        } else if (context.responseLength > CONFIG.longResponseThreshold) {
          longPositive++;
        }
        totalRatings++;
      }
    }
  }

  if (totalRatings < CONFIG.minFeedbackForLearning) {
    return result;
  }

  // Calculate preference
  const shortRate = shortPositive / totalRatings;
  const longRate = longPositive / totalRatings;

  if (shortRate > longRate * 1.5) {
    result.value = 'concise';
    result.confidence = Math.min(0.9, shortRate);
  } else if (longRate > shortRate * 1.5) {
    result.value = 'detailed';
    result.confidence = Math.min(0.9, longRate);
  } else {
    result.value = 'balanced';
    result.confidence = Math.min(0.8, 1 - Math.abs(shortRate - longRate));
  }

  return result;
}

/**
 * Learn terminology preference from feedback and interactions
 */
function learnTerminologyPreference(
  feedback: AIFeedback[],
  interactions: SmartInteractionEvent[]
): { value: TerminologyLevel; confidence: number } {
  let result: { value: TerminologyLevel; confidence: number } = {
    value: 'moderate',
    confidence: 0,
  };

  let clinicalPositive = 0;
  let clinicalNegative = 0;
  let simplePositive = 0;
  let simpleNegative = 0;
  let totalSignals = 0;

  // Analyze interactions
  for (const interaction of interactions) {
    if (interaction.hadTechnicalTerms) {
      if (interaction.sessionContinued && !interaction.hadFollowUp) {
        // User understood clinical terms
        clinicalPositive++;
      } else if (interaction.hadFollowUp) {
        // User needed clarification - might prefer simpler terms
        clinicalNegative++;
      }
    } else {
      if (interaction.sessionContinued) {
        simplePositive++;
      }
    }
    totalSignals++;
  }

  // Analyze feedback
  const ratingFeedback = feedback.filter(f => f.feedbackType === 'rating');
  for (const fb of ratingFeedback) {
    if (fb.reason === 'too_technical') {
      clinicalNegative += 2; // Weight explicit feedback more
      totalSignals += 2;
    } else if (fb.reason === 'too_simple') {
      simpleNegative += 2;
      totalSignals += 2;
    }
  }

  if (totalSignals < CONFIG.minFeedbackForLearning) {
    return result;
  }

  // Calculate preference
  const clinicalScore = clinicalPositive - clinicalNegative;
  const simpleScore = simplePositive - simpleNegative;

  if (clinicalScore > simpleScore + 3) {
    result.value = 'clinical';
    result.confidence = Math.min(0.85, clinicalScore / totalSignals);
  } else if (simpleScore > clinicalScore + 3) {
    result.value = 'simple';
    result.confidence = Math.min(0.85, simpleScore / totalSignals);
  } else {
    result.value = 'moderate';
    result.confidence = 0.6;
  }

  return result;
}

/**
 * Learn focus areas from feature engagement
 */
async function learnFocusAreas(
  userId: string,
  topFeatures: TrackableFeature[]
): Promise<{ value: string[]; confidence: number }> {
  // Map features to focus area categories
  const featureToArea: Record<TrackableFeature, string> = {
    overview: 'general',
    health_profile: 'health',
    daily_care: 'care',
    daily_care_medications: 'medications',
    daily_care_supplements: 'supplements',
    daily_care_diet: 'nutrition',
    daily_care_activity: 'activity',
    ask_ai: 'ai_assistance',
    ask_ai_chat: 'ai_assistance',
    ask_ai_clinical_notes: 'clinical',
    ask_ai_reports: 'reports',
    safety_alerts: 'safety',
    safety_alerts_interactions: 'drug_interactions',
    safety_alerts_incidents: 'incidents',
    safety_alerts_conflicts: 'scheduling',
    safety_alerts_screening: 'cognitive',
    analytics: 'analytics',
    analytics_adherence: 'adherence',
    analytics_nutrition: 'nutrition',
    analytics_trends: 'trends',
    my_notes: 'notes',
    care_management: 'management',
    agency_management: 'agency',
    settings: 'settings',
    symptom_checker: 'symptoms',
  };

  const focusAreas = topFeatures
    .map(f => featureToArea[f])
    .filter(Boolean)
    .slice(0, 3);

  // Confidence based on how much data we have
  const stats = await getUserFeatureStats(userId);
  const totalVisits = stats.reduce((sum, s) => sum + s.visitCount, 0);
  const confidence = Math.min(0.9, totalVisits / 50); // Max confidence at 50+ visits

  return {
    value: focusAreas,
    confidence,
  };
}

/**
 * Check if preferences need to be re-learned
 */
export async function shouldRelearn(userId: string): Promise<boolean> {
  const prefs = await getUserPreferences(userId);

  // Check if enough new data has accumulated
  const feedback = await getUserFeedback(userId);
  const newFeedback = feedback.length - prefs.feedbackAnalyzed;

  const interactions = await getRecentSmartInteractions(userId, 100);
  const newInteractions = interactions.length - prefs.engagementEventsAnalyzed;

  const totalNew = newFeedback + newInteractions;

  // Re-learn after every 10 new events
  return totalNew >= 10;
}

/**
 * Trigger learning if needed (call periodically)
 */
export async function maybeLearnPreferences(userId: string): Promise<UserSmartPreferences> {
  const shouldUpdate = await shouldRelearn(userId);

  if (shouldUpdate) {
    return learnUserPreferences(userId);
  }

  return getUserPreferences(userId);
}
