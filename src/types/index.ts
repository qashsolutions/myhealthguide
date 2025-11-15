import { Timestamp } from 'firebase/firestore';

// ============= User Types =============
export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  phoneNumberHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  firstName: string;
  lastName: string;
  profileImage?: string;
  groups: GroupMembership[];
  agencies: AgencyMembership[];
  preferences: UserPreferences;
  trialStartDate: Date | null; // Date of FIRST USE (not signup)
  trialEndDate: Date | null; // 14 days from first use
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
  subscriptionTier: 'single' | 'family' | 'agency' | null; // null during trial
  storageUsed: number; // Bytes used
  storageLimit: number; // Bytes allowed based on plan
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: {
    sms: boolean;
    email: boolean;
  };
}

// ============= Group Types =============
export interface Group {
  id: string;
  name: string;
  type: 'family' | 'agency';
  agencyId?: string;
  adminId: string;
  members: GroupMember[];
  memberIds: string[]; // For Firestore rules - array of user IDs for easy membership checking
  elders: Elder[];
  subscription: Subscription;
  settings: GroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  permissions: Permission[];
  addedAt: Date;
  addedBy: string;
}

export interface GroupMembership {
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface GroupSettings {
  notificationRecipients: string[];
  notificationPreferences: NotificationPreferences;
  aiFeatures?: AIFeatureSettings;
}

export interface AIFeatureSettings {
  enabled: boolean; // Master toggle for all AI features
  consent: {
    granted: boolean;
    grantedAt?: Date;
    grantedBy?: string;
  };
  features: {
    healthChangeDetection: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high'; // 15%, 25%, 35% threshold
    };
    medicationTimeOptimization: {
      enabled: boolean;
      autoSuggest: boolean; // Show suggestions automatically
    };
    weeklySummary: {
      enabled: boolean;
      recipients: string[]; // User IDs to receive summary
      schedule: 'sunday' | 'monday'; // When to send
    };
    doctorVisitPrep: {
      enabled: boolean;
    };
  };
}

export interface NotificationPreferences {
  enabled: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
  types: NotificationType[];
}

export type NotificationType = 'missed_doses' | 'diet_alerts' | 'supplement_alerts';

// ============= Agency Types =============
export interface Agency {
  id: string;
  name: string;
  adminId: string;
  subscription: Subscription;
  groups: string[];
  settings: AgencySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyMembership {
  agencyId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface AgencySettings {
  notificationPreferences: NotificationPreferences;
}

// ============= Elder Types =============
export interface Elder {
  id: string;
  groupId: string;
  name: string;
  dateOfBirth: Date;
  userId?: string;
  profileImage?: string;
  notes: string;
  createdAt: Date;
}

// ============= Medication Types =============
export interface Medication {
  id: string;
  groupId: string;
  elderId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  instructions?: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  reminders: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicationFrequency {
  type: 'daily' | 'weekly' | 'asNeeded';
  times: string[];
  days?: number[];
}

export interface MedicationLog {
  id: string;
  groupId: string;
  elderId: string;
  medicationId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  loggedBy?: string;
  method: 'manual' | 'voice';
  voiceTranscript?: string;
  notes?: string;
  aiAnalysis?: AIAnalysis;
  createdAt: Date;
}

// ============= Supplement Types =============
export interface Supplement {
  id: string;
  groupId: string;
  elderId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplementLog {
  id: string;
  groupId: string;
  elderId: string;
  supplementId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  loggedBy?: string;
  method: 'manual' | 'voice';
  voiceTranscript?: string;
  notes?: string;
  createdAt: Date;
}

// ============= Diet Types =============
export interface DietEntry {
  id: string;
  groupId: string;
  elderId: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: string[];
  timestamp: Date;
  loggedBy: string;
  method: 'manual' | 'voice';
  voiceTranscript?: string;
  notes?: string;
  aiAnalysis?: DietAnalysis;
  createdAt: Date;
}

export interface DietAnalysis {
  nutritionScore: number;
  concerns: string[];
  recommendations: string[];
}

// ============= AI Types =============
export interface AIAnalysis {
  flag: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AISummary {
  id: string;
  groupId: string;
  elderId: string;
  date: Date;
  summary: DailySummary;
  generatedAt: Date;
}

export interface DailySummary {
  medicationCompliance: ComplianceData;
  supplementCompliance: ComplianceData;
  dietSummary: DietSummaryData;
  overallInsights: string[];
  missedDoses: MissedDose[];
}

export interface ComplianceData {
  taken: number;
  missed: number;
  percentage: number;
}

export interface DietSummaryData {
  mealsLogged: number;
  concernsDetected: string[];
  recommendations: string[];
}

export interface MissedDose {
  medicationName: string;
  scheduledTime: string;
  elderId: string;
}

// ============= Activity Log Types =============
export interface ActivityLog {
  id: string;
  groupId: string;
  elderId?: string;
  userId: string;
  action: string;
  entityType: 'medication' | 'supplement' | 'diet' | 'group' | 'user';
  entityId: string;
  details: Record<string, any>;
  timestamp: Date;
}

// ============= Subscription Types =============
export interface Subscription {
  tier: 'single' | 'family' | 'agency';
  status: 'trial' | 'active' | 'cancelled';
  trialEndsAt: Date;
  currentPeriodEnd: Date;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

// ============= Storage Types =============
export interface StorageMetadata {
  id: string;
  userId: string;
  groupId?: string;
  filePath: string; // Full path in Firebase Storage
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // Bytes
  category: 'profile' | 'elder' | 'document';
  uploadedAt: Date;
}

// Storage limits in bytes
export const STORAGE_LIMITS = {
  TRIAL: 25 * 1024 * 1024, // 25 MB
  SINGLE: 25 * 1024 * 1024, // 25 MB
  FAMILY: 50 * 1024 * 1024, // 50 MB
  AGENCY: 200 * 1024 * 1024, // 200 MB
} as const;

// Individual file size limits
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5 MB
  DOCUMENT: 10 * 1024 * 1024, // 10 MB
} as const;

// ============= Permission Types =============
export type Permission =
  | 'view_all'
  | 'edit_medications'
  | 'edit_supplements'
  | 'edit_diet'
  | 'log_doses'
  | 'manage_members'
  | 'manage_settings'
  | 'view_insights';

// ============= Auth Types =============
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface OTPRequest {
  email: string;
  phoneNumber: string;
  turnstileToken: string;
}

export interface OTPVerification {
  email: string;
  phoneNumber: string;
  emailOTP: string;
  phoneOTP: string;
}

// ============= API Response Types =============
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
