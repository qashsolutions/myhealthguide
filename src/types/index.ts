/**
 * TypeScript type definitions for MyHealth Guide
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  disclaimerAccepted?: boolean;
  disclaimerAcceptedAt?: Date;
  // Account deletion fields
  deletionRequested?: Date;
  deletionScheduled?: Date;
  deletionReason?: string;
  status?: 'active' | 'pending_deletion' | 'deleted';
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
}

// Authentication types
export interface SignupData {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  code?: string;
  message?: string;
  data?: any; // For additional response data
}

// Medication types
export interface Medication {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  prescribedFor?: string;
  notes?: string;
}

export interface MedicationCheckRequest {
  medications: Medication[];
  userAge?: number;
  healthConditions?: string[];
  checkType?: 'quick' | 'detailed';
}

export interface MedicationInteraction {
  medication1: string;
  medication2: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  recommendation: string;
  references?: string[];
}

export interface MedicationCheckResult {
  id: string;
  status: 'safe' | 'warning' | 'danger';
  overallRisk: 'safe' | 'warning' | 'danger';
  summary: string;
  interactions: MedicationInteraction[];
  generalAdvice: string;
  consultDoctorRecommended: boolean;
  checkedAt: Date;
  disclaimer: string;
  conflicts?: MedicationInteraction[];
  additionalInfo?: string;
}

// Health Q&A types
export interface HealthQuestion {
  id?: string;
  question: string;
  context?: string;
  category?: string;
}

export interface HealthAnswer {
  id: string;
  question: string;
  answer: string;
  sources?: string[];
  disclaimer: string;
  answeredAt: Date;
  // ADDED: Medication-specific details (when applicable)
  medicationDetails?: {
    brandNames?: string[];
    genericName?: string;
    pronunciation?: string;
    drugClasses?: string[];
    availability?: string;
    howUsed?: string;
  };
}

// Vertex AI types
export interface VertexAIRequest {
  prompt: string;
  parameters?: {
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
  };
  safety_settings?: SafetySetting[];
}

export interface VertexAIResponse {
  predictions: Array<{
    content: string;
    safetyAttributes?: {
      blocked: boolean;
      categories: string[];
      scores: number[];
    };
  }>;
  metadata?: {
    model: string;
    billableCharacterCount: number;
  };
}

export interface SafetySetting {
  category: string;
  threshold: 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH_AND_ABOVE' | 'BLOCK_NONE';
}

// Email types
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

export interface PasswordResetEmailData {
  userName: string;
  userEmail: string;
  resetLink: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  warning?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

// Form types
export interface FormError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  errors: FormError[];
  message?: string;
}

// Voice types
export interface VoiceCommand {
  command: string;
  action: string;
  parameters?: Record<string, any>;
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  rate: number;
  volume: number;
  voice?: string;
}

// Session types
export interface UserSession {
  user: User;
  token: string;
  expiresAt: Date;
  disclaimerAccepted: boolean;
}

// Preference types
export interface UserPreferences {
  fontSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  voiceEnabled: boolean;
  emailNotifications: boolean;
  medicationReminders: boolean;
}