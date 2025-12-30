/**
 * AI Feedback System Types
 *
 * Continuous user feedback loop for improving AI features:
 * 1. Rating feedback (thumbs up/down)
 * 2. Action feedback (apply/ignore suggestions)
 * 3. Correction feedback (user corrections to AI outputs)
 */

// Target types for feedback
export type FeedbackTargetType =
  | 'health_chat'
  | 'weekly_summary'
  | 'ai_insight'
  | 'smart_assistant'
  | 'medication_optimization'
  | 'refill_alert'
  | 'health_change'
  | 'compliance_prediction'
  | 'burnout_detection'
  | 'drug_interaction';

// Feedback categories
export type FeedbackType = 'rating' | 'action' | 'correction';

// Rating values
export type FeedbackRating = 'helpful' | 'not_helpful';

// Action values for suggestions
export type FeedbackAction =
  | 'applied'      // User applied the suggestion
  | 'ignored'      // User ignored the suggestion
  | 'correct'      // AI prediction was correct
  | 'not_needed'   // AI suggestion not needed
  | 'valid'        // Valid concern raised by AI
  | 'false_alarm'; // False alarm / false positive

// Reason categories for ratings
export type FeedbackReason =
  | 'accurate'
  | 'inaccurate'
  | 'relevant'
  | 'not_relevant'
  | 'helpful'
  | 'confusing'
  | 'too_generic'
  | 'actionable'
  | 'too_technical'  // Response used too much clinical jargon
  | 'too_simple'     // Response was too basic, needed more detail
  | 'too_long'       // Response was too verbose
  | 'too_short'      // Response was too brief
  | 'other';

// Correction types
export type CorrectionType =
  | 'wrong_value'      // e.g., compliance % is wrong
  | 'false_positive'   // Alert was a false alarm
  | 'false_negative'   // Missed something important
  | 'failed_prediction' // Prediction didn't happen
  | 'timing_wrong'     // Right prediction, wrong timing
  | 'other';

/**
 * Main feedback document stored in Firestore
 */
export interface AIFeedback {
  id: string;

  // What was rated
  feedbackType: FeedbackType;
  targetType: FeedbackTargetType;
  targetId: string; // ID of the response/insight being rated

  // Who rated
  userId: string;
  groupId: string;
  elderId?: string;

  // Rating data (for feedbackType: 'rating')
  rating?: FeedbackRating;
  reason?: FeedbackReason;
  comment?: string;

  // Action data (for feedbackType: 'action')
  action?: FeedbackAction;
  actionTaken?: boolean; // Did user actually implement the suggestion?

  // Correction data (for feedbackType: 'correction')
  correctionType?: CorrectionType;
  originalValue?: string;
  correctedValue?: string;
  explanation?: string;

  // Context snapshot (for AI learning)
  contextSnapshot?: FeedbackContext;

  // Metadata
  createdAt: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
}

/**
 * Context captured with feedback for AI learning
 */
export interface FeedbackContext {
  // Elder context
  elderAge?: number;
  elderConditions?: string[];
  elderMedicationCount?: number;

  // AI context
  aiModelUsed?: string;
  promptVersion?: string;
  confidenceScore?: number;

  // Response context
  responseLength?: number;
  responseType?: string;

  // Session context
  previousFeedbackCount?: number;
  sessionDuration?: number;
}

/**
 * Aggregated feedback stats for dashboard
 */
export interface FeedbackStats {
  totalFeedback: number;

  // Rating breakdown
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number;

  // Action breakdown
  appliedCount: number;
  ignoredCount: number;
  applicationRate: number;

  // Correction breakdown
  correctionCount: number;
  falsePositiveCount: number;
  falseNegativeCount: number;

  // By target type
  byTargetType: Record<FeedbackTargetType, {
    total: number;
    helpful: number;
    notHelpful: number;
  }>;

  // Top reasons
  topReasons: Array<{
    reason: FeedbackReason;
    count: number;
    percentage: number;
  }>;

  // Trends
  trendsLastWeek: {
    helpfulTrend: 'up' | 'down' | 'stable';
    totalFeedbackTrend: 'up' | 'down' | 'stable';
    percentageChange: number;
  };
}

/**
 * Feedback filter options for queries
 */
export interface FeedbackFilter {
  userId?: string;
  groupId?: string;
  elderId?: string;
  feedbackType?: FeedbackType;
  targetType?: FeedbackTargetType;
  rating?: FeedbackRating;
  startDate?: Date;
  endDate?: Date;
  resolved?: boolean;
}

/**
 * Props for FeedbackButtons component
 */
export interface FeedbackButtonsProps {
  targetType: FeedbackTargetType;
  targetId: string;
  elderId?: string;
  onFeedbackSubmitted?: (feedback: AIFeedback) => void;
  size?: 'sm' | 'md' | 'lg';
  showComment?: boolean;
  className?: string;
}

/**
 * Props for ActionFeedback component
 */
export interface ActionFeedbackProps {
  targetType: FeedbackTargetType;
  targetId: string;
  elderId?: string;
  primaryAction: {
    label: string;
    action: FeedbackAction;
  };
  secondaryAction: {
    label: string;
    action: FeedbackAction;
  };
  onActionTaken?: (feedback: AIFeedback) => void;
  className?: string;
}

/**
 * Props for CorrectionDialog component
 */
export interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: FeedbackTargetType;
  targetId: string;
  elderId?: string;
  originalValue: string;
  valueLabel?: string;
  onCorrectionSubmitted?: (feedback: AIFeedback) => void;
}
