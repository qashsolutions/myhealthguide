/**
 * Engagement Tracking Module
 *
 * Exports all engagement tracking functionality:
 * - Feature engagement tracking
 * - Smart quality metrics
 * - Preference learning
 */

// Feature tracking
export {
  trackFeatureView,
  trackActionStart,
  trackActionComplete,
  trackActionAbandon,
  getUserFeatureStats,
  getTopFeatures,
  setupVisibilityTracking,
  setupUnloadTracking,
} from './featureTracker';

// Smart metrics tracking
export {
  recordSmartResponse,
  recordUserFollowUp,
  recordActionTaken,
  recordSessionEnd,
  getUserSmartQualityMetrics,
  getRecentSmartInteractions,
  isFollowUpQuestion,
} from './smartMetricsTracker';

// Preference learning
export {
  getUserPreferences,
  saveUserPreferences,
  updateManualPreferences,
  learnUserPreferences,
  maybeLearnPreferences,
  shouldRelearn,
} from './preferenceLearner';
