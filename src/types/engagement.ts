/**
 * Engagement Tracking Types
 *
 * Types for feature engagement tracking, AI quality metrics,
 * and user preference learning.
 */

// ============= Feature Engagement =============

/**
 * Features that can be tracked
 */
export type TrackableFeature =
  | 'overview'
  | 'health_profile'
  | 'daily_care'
  | 'daily_care_medications'
  | 'daily_care_supplements'
  | 'daily_care_diet'
  | 'daily_care_activity'
  | 'ask_ai'
  | 'ask_ai_chat'
  | 'ask_ai_clinical_notes'
  | 'ask_ai_reports'
  | 'safety_alerts'
  | 'safety_alerts_interactions'
  | 'safety_alerts_incidents'
  | 'safety_alerts_conflicts'
  | 'safety_alerts_screening'
  | 'analytics'
  | 'analytics_adherence'
  | 'analytics_nutrition'
  | 'analytics_trends'
  | 'my_notes'
  | 'care_management'
  | 'agency_management'
  | 'settings';

/**
 * Feature engagement event
 */
export interface FeatureEngagementEvent {
  id?: string;
  userId: string;
  feature: TrackableFeature;
  eventType: 'page_view' | 'action_start' | 'action_complete' | 'action_abandon';
  sessionId: string;
  timestamp: Date;
  durationMs?: number; // Time spent on feature
  metadata?: Record<string, any>;
}

/**
 * Aggregated feature engagement stats per user
 */
export interface UserFeatureEngagement {
  id?: string;
  userId: string;
  feature: TrackableFeature;
  visitCount: number;
  totalTimeSpentMs: number;
  avgTimeSpentMs: number;
  actionsStarted: number;
  actionsCompleted: number;
  actionsAbandoned: number;
  completionRate: number; // actionsCompleted / actionsStarted
  lastVisit: Date;
  updatedAt: Date;
}

// ============= Smart Response Quality Metrics =============

/**
 * Smart interaction event for quality tracking
 */
export interface SmartInteractionEvent {
  id?: string;
  userId: string;
  groupId: string;
  sessionId: string;
  responseId: string; // ID of the smart response message
  feature: 'health_chat' | 'smart_assistant' | 'weekly_summary' | 'smart_insight';
  timestamp: Date;

  // Quality metrics
  responseLength: number; // Character count
  hadFollowUp: boolean; // User asked clarifying question within 2 min
  followUpTimestamp?: Date;
  actionTaken: boolean; // User clicked action button or applied suggestion
  actionType?: string;
  sessionContinued: boolean; // User sent another message after this
  sessionEndedAfter: boolean; // This was last message before session end

  // Response characteristics (for learning)
  wasDetailedResponse: boolean; // > 500 chars
  hadTechnicalTerms: boolean; // Detected clinical terminology
  topicCategories: string[]; // What the response was about
}

/**
 * Aggregated smart quality metrics per user
 */
export interface UserSmartQualityMetrics {
  id?: string;
  userId: string;
  totalInteractions: number;

  // Follow-up rate (lower = better understood)
  followUpCount: number;
  followUpRate: number;

  // Action completion (higher = more actionable)
  actionsTaken: number;
  actionRate: number;

  // Session continuation (higher = more engaged)
  sessionsContinued: number;
  continuationRate: number;

  // Response preferences (learned from engagement)
  preferredResponseLength: 'short' | 'medium' | 'long';
  avgResponseLengthEngaged: number; // Avg length of responses user engaged with

  updatedAt: Date;
}

// ============= User Preferences =============

/**
 * Verbosity preference levels
 */
export type VerbosityLevel = 'concise' | 'balanced' | 'detailed';

/**
 * Terminology preference levels
 */
export type TerminologyLevel = 'simple' | 'moderate' | 'clinical';

/**
 * User smart preferences (learned + manual)
 */
export interface UserSmartPreferences {
  id?: string;
  userId: string;

  // Manual settings (user can override)
  manualOverride: boolean; // If true, use manual settings instead of learned
  manualVerbosity?: VerbosityLevel;
  manualTerminology?: TerminologyLevel;
  manualFocusAreas?: string[];

  // Learned preferences
  learnedVerbosity: VerbosityLevel;
  learnedTerminology: TerminologyLevel;
  learnedFocusAreas: string[]; // Top 3 features/topics user engages with most

  // Confidence scores (0-1, only apply if > 0.6)
  verbosityConfidence: number;
  terminologyConfidence: number;
  focusAreasConfidence: number;

  // Learning metadata
  feedbackAnalyzed: number; // Number of feedback items analyzed
  engagementEventsAnalyzed: number;
  lastLearningUpdate: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get effective preferences (manual override or learned)
 */
export function getEffectivePreferences(prefs: UserSmartPreferences): {
  verbosity: VerbosityLevel;
  terminology: TerminologyLevel;
  focusAreas: string[];
} {
  if (prefs.manualOverride) {
    return {
      verbosity: prefs.manualVerbosity || 'balanced',
      terminology: prefs.manualTerminology || 'moderate',
      focusAreas: prefs.manualFocusAreas || [],
    };
  }

  return {
    verbosity: prefs.verbosityConfidence > 0.6 ? prefs.learnedVerbosity : 'balanced',
    terminology: prefs.terminologyConfidence > 0.6 ? prefs.learnedTerminology : 'moderate',
    focusAreas: prefs.focusAreasConfidence > 0.6 ? prefs.learnedFocusAreas : [],
  };
}

/**
 * Default preferences for new users
 */
export function getDefaultPreferences(userId: string): UserSmartPreferences {
  return {
    userId,
    manualOverride: false,
    learnedVerbosity: 'balanced',
    learnedTerminology: 'moderate',
    learnedFocusAreas: [],
    verbosityConfidence: 0,
    terminologyConfidence: 0,
    focusAreasConfidence: 0,
    feedbackAnalyzed: 0,
    engagementEventsAnalyzed: 0,
    lastLearningUpdate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============= Learning Configuration =============

/**
 * Configuration for preference learning
 */
export const LEARNING_CONFIG = {
  // Minimum events before learning is applied
  minFeedbackForLearning: 5,
  minEngagementForLearning: 10,

  // Confidence thresholds
  confidenceThreshold: 0.6,
  highConfidenceThreshold: 0.8,

  // Learning triggers
  relearningInterval: 10, // Re-analyze after every N new events

  // Response length thresholds
  shortResponseThreshold: 200, // chars
  longResponseThreshold: 500, // chars

  // Follow-up detection
  followUpTimeWindowMs: 2 * 60 * 1000, // 2 minutes

  // Session continuation
  sessionEndTimeoutMs: 5 * 60 * 1000, // 5 minutes of inactivity = session end
};
