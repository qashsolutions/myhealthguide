/**
 * Symptom Checker Types
 * Types for the AI-powered symptom checking feature
 */

export type UserType = 'guest' | 'registered';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type AlcoholUse = 'none' | 'occasional' | 'regular';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type DietType = 'regular' | 'vegetarian' | 'vegan' | 'diabetic_friendly' | 'low_sodium' | 'gluten_free' | 'heart_healthy' | 'renal' | 'other';
export type AIModel = 'gemini' | 'claude';
export type UrgencyLevel = 'emergency' | 'urgent' | 'moderate' | 'low';
export type FeedbackRating = 'helpful' | 'not_helpful';

/**
 * Symptom Checker Query - stored in Firestore
 */
export interface SymptomCheckerQuery {
  id: string;

  // User identification
  userId: string | null; // null for guests
  userType: UserType;
  ipAddress: string; // for guest rate limiting

  // Elder info (registered users only)
  elderId: string | null;
  elderName: string | null;

  // Required patient info
  age: number;
  gender: Gender;
  symptomsDescription: string;

  // Optional health context
  medications: string | null;
  knownConditions: string | null;
  dietType: DietType | null;

  // Lifestyle info (optional)
  smoker: boolean | null;
  alcoholUse: AlcoholUse | null;
  activityLevel: ActivityLevel | null;

  // AI responses
  initialResponse: string;
  refinedResponse: string | null; // if user provided additional info

  // Urgency assessment
  urgencyLevel: UrgencyLevel;
  isEmergency: boolean;

  // User feedback
  feedbackRating: FeedbackRating | null;
  feedbackComment: string | null;
  feedbackTimestamp: Date | null;

  // Metadata
  includeInReport: boolean; // true for registered users
  createdAt: Date;
  updatedAt: Date;
  aiModelUsed: AIModel;
  responseTimeMs: number;

  // TTL for guest queries (7 days)
  expiresAt: Date | null; // null for registered users (permanent)
}

/**
 * Rate limit tracking document
 */
export interface SymptomCheckerRateLimit {
  id: string; // IP address for guests, userId for registered
  type: UserType;
  queriesUsedToday: number;
  date: string; // YYYY-MM-DD format for daily reset
  lastQueryTimestamp: Date;
}

/**
 * API Request types
 */
export interface SymptomCheckerRequest {
  // Required
  age: number;
  gender: Gender;
  symptomsDescription: string;

  // For registered users
  elderId?: string;
  elderName?: string;

  // Optional health context
  medications?: string;
  knownConditions?: string;
  dietType?: DietType;

  // Lifestyle
  smoker?: boolean;
  alcoholUse?: AlcoholUse;
  activityLevel?: ActivityLevel;

  // Refinement
  isRefinement?: boolean;
  previousQueryId?: string;
}

/**
 * API Response types
 */
export interface SymptomCheckerResponse {
  success: boolean;
  queryId: string;
  response: SymptomCheckerAIResponse;
  rateLimit: {
    used: number;
    remaining: number;
    limit: number;
  };
  aiModelUsed: AIModel;
}

export interface SymptomCheckerAIResponse {
  assessmentHeadline: string; // Short 10-word max summary for quick reading
  assessment: string;
  possibleCauses: string[];
  recommendedNextSteps: string[];
  redFlagsToWatch: string[];
  questionsForDoctor: string[];
  disclaimer: string;
  // New fields for enhanced features
  urgencyLevel: UrgencyLevel; // emergency, urgent, moderate, low
  isEmergency: boolean; // true if immediate 911 should be called
  emergencyReason?: string; // explanation if isEmergency is true
  aiNotice: string; // AI-generated notice about limitations
}

export interface SymptomCheckerErrorResponse {
  success: false;
  error: string;
  code?: 'RATE_LIMIT_EXCEEDED' | 'VALIDATION_ERROR' | 'AI_ERROR' | 'AUTH_ERROR' | 'ELDER_REQUIRED';
}

/**
 * Component prop types
 */
export interface SymptomCheckerFormData {
  age: string;
  gender: Gender | '';
  symptomsDescription: string;
  medications: string;
  knownConditions: string;
  dietType: DietType | '';
  smoker: boolean | null;
  alcoholUse: AlcoholUse | '';
  activityLevel: ActivityLevel | '';
}

export interface SymptomCheckerResultsProps {
  response: SymptomCheckerAIResponse;
  queryId: string;
  rateLimit: {
    used: number;
    remaining: number;
    limit: number;
  };
  onRefine: () => void;
  onNewCheck: () => void;
  isGuest: boolean;
}

/**
 * Constants
 */
export const RATE_LIMITS = {
  guest: 2,
  registered: 5,
} as const;

export const DIET_TYPE_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'diabetic_friendly', label: 'Diabetic-Friendly' },
  { value: 'low_sodium', label: 'Low Sodium' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'heart_healthy', label: 'Heart Healthy' },
  { value: 'renal', label: 'Renal Diet' },
  { value: 'other', label: 'Other' },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const ACTIVITY_LEVEL_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light activity' },
  { value: 'moderate', label: 'Moderate activity' },
  { value: 'active', label: 'Very active' },
];

export const ALCOHOL_USE_OPTIONS: { value: AlcoholUse; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'regular', label: 'Regular' },
];

export const URGENCY_LEVEL_CONFIG: {
  [key in UrgencyLevel]: { label: string; color: string; bgColor: string; borderColor: string; description: string };
} = {
  emergency: {
    label: 'Emergency',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-500',
    description: 'Seek immediate emergency care - Call 911',
  },
  urgent: {
    label: 'Urgent',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-500',
    description: 'See a doctor within 24 hours',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-500',
    description: 'Schedule an appointment soon',
  },
  low: {
    label: 'Low Urgency',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-500',
    description: 'Monitor symptoms at home',
  },
};

export const GUEST_RETENTION_DAYS = 7;
