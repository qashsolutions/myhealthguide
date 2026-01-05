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

  // Metadata
  includeInReport: boolean; // true for registered users
  createdAt: Date;
  updatedAt: Date;
  aiModelUsed: AIModel;
  responseTimeMs: number;
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
  assessment: string;
  possibleCauses: string[];
  recommendedNextSteps: string[];
  redFlagsToWatch: string[];
  questionsForDoctor: string[];
  disclaimer: string;
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
