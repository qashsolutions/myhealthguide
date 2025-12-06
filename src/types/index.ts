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
  trialEndDate: Date | null; // 45 days from first use
  gracePeriodStartDate: Date | null; // When trial expired (48-hour countdown begins)
  gracePeriodEndDate: Date | null; // When data will be deleted (48 hours after expiration)
  dataExportRequested: boolean; // Whether user requested data export during grace period
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
  subscriptionTier: 'family' | 'single_agency' | 'multi_agency' | null; // null during trial
  // Stripe subscription tracking
  stripeCustomerId: string | null; // Stripe customer ID
  stripeSubscriptionId: string | null; // Stripe subscription ID
  subscriptionStartDate: Date | null; // When paid subscription started (for refund calculation)
  currentPeriodEnd: Date | null; // End of current billing period
  cancelAtPeriodEnd: boolean; // Whether subscription is set to cancel at period end
  pendingPlanChange: 'family' | 'single_agency' | 'multi_agency' | null; // Scheduled downgrade plan
  storageUsed: number; // Bytes used
  storageLimit: number; // Bytes allowed based on plan
  // Password management (HIPAA compliance)
  lastPasswordChange: Date | null; // Track password changes for 75-day expiration
  passwordExpiresAt: Date | null; // 75 days from last change
  passwordResetRequired: boolean; // Force password reset on next login
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
export type PermissionLevel = 'admin' | 'write' | 'read';
export type UserRole = 'admin' | 'caregiver' | 'caregiver_admin' | 'super_admin';

export interface Group {
  id: string;
  name: string;
  type: 'family' | 'agency';
  agencyId?: string;
  adminId: string;
  members: GroupMember[];
  memberIds: string[]; // For Firestore rules - array of user IDs for easy membership checking
  writeMemberIds: string[]; // User IDs with write permission (max 1) - for efficient Firestore rules checking
  elders: Elder[];
  subscription: Subscription;
  settings: GroupSettings;
  inviteCode: string; // 6-digit alphanumeric (encrypted)
  inviteCodeExpiry?: Date; // Optional expiry for invite code
  inviteCodeGeneratedAt: Date;
  inviteCodeGeneratedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  permissionLevel: PermissionLevel; // Simplified permission system
  permissions: Permission[]; // Legacy - kept for backward compatibility
  addedAt: Date;
  addedBy: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  approvedBy?: string;
}

export interface GroupMembership {
  groupId: string;
  role: 'admin' | 'member';
  permissionLevel: PermissionLevel;
  joinedAt: Date;
}

export interface PendingApproval {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
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
    medicationRefillAlerts: {
      enabled: boolean;
      defaultThresholdDays: number; // Default: 7 days
    };
    shiftHandoffNotes: {
      enabled: boolean;
      autoGenerate: boolean; // Auto-generate at shift end
    };
    emergencyPatternDetection: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high'; // Alert threshold: 10/8/6 points
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
export type AgencyRole = 'super_admin' | 'caregiver_admin' | 'caregiver' | 'family_member';

export interface Agency {
  id: string;
  name: string;
  superAdminId: string; // Owner of the agency
  type: 'individual' | 'professional'; // Individual family or professional agency
  groupIds: string[]; // All groups under this agency
  caregiverIds: string[]; // All caregivers in this agency
  maxEldersPerCaregiver: number; // Configurable limit (default: 3)
  subscription: Subscription;
  settings: AgencySettings;
  createdAt: Date;
  updatedAt: Date;

  // Billing fields (multi-agency tier only)
  activeElderCount?: number; // Count of active elders with subscriptions
  currentMonthlyTotal?: number; // Sum of all active elder subscriptions ($30 per elder)
  nextBillingDate?: Date; // Earliest next billing date across all elders
  totalRevenue?: number; // Lifetime revenue (informational)
  stripeCustomerId?: string; // Agency-level Stripe customer ID
  stripeSubscriptionIds?: string[]; // All active elder subscription IDs
}

export interface AgencyMembership {
  agencyId: string;
  role: AgencyRole;
  joinedAt: Date;
  // For caregiver_admin and caregiver roles
  assignedElderIds?: string[]; // Elders this caregiver can access
  assignedGroupIds?: string[]; // Groups this caregiver can access
}

export interface AgencySettings {
  notificationPreferences: NotificationPreferences;
  billing?: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    billingEmail: string;
    maxCaregivers?: number;
    maxElders?: number;
  };
}

// Caregiver Assignment - tracks which caregivers are assigned to which elders
export interface CaregiverAssignment {
  id: string;
  agencyId: string;
  caregiverId: string; // User ID of the caregiver
  elderIds: string[]; // Array of elder IDs assigned to this caregiver
  groupId: string; // The group containing these elders
  role: 'caregiver_admin' | 'caregiver'; // caregiver_admin = admin for assigned elders only
  assignedAt: Date;
  assignedBy: string; // Super admin who made the assignment
  permissions: CaregiverPermissions;
  active: boolean;
}

export interface CaregiverPermissions {
  canEditMedications: boolean;
  canLogDoses: boolean;
  canViewReports: boolean;
  canManageSchedules: boolean;
  canInviteMembers: boolean; // Only family members to their assigned elders
}

// ============= Elder Subscription Types (Multi-Agency Billing) =============
export interface ElderSubscription {
  id: string;
  agencyId: string;
  elderId: string;
  elderName: string;
  caregiverId: string;

  // Billing
  subscriptionStatus: 'active' | 'cancelled' | 'refunded' | 'at_risk';
  monthlyRate: number; // 30 (stored for historical records)
  billingCycleStart: Date; // When elder was added
  billingCycleEnd: Date; // 31 days from start
  nextBillingDate: Date; // Next 31-day cycle

  // Stripe
  stripeSubscriptionId: string;
  stripeCustomerId: string; // Agency's customer ID
  stripePriceId: string;

  // Cancellation
  cancelledAt: Date | null;
  cancellationReason: string | null;
  refundIssued: boolean;
  refundAmount: number;
  refundIssuedAt: Date | null;

  // Metadata
  addedBy: string; // SuperAdmin who added elder
  createdAt: Date;
  updatedAt: Date;
}

// ============= Elder Types =============
export interface Elder {
  id: string;
  groupId: string;
  name: string;
  dateOfBirth?: Date; // Optional - only if exact DOB is known
  approximateAge?: number; // Used when exact DOB is not known
  userId?: string;
  profileImage?: string;
  notes: string;
  createdAt: Date;

  // Primary caregiver (elder-level admin) - has full management rights for this elder
  primaryCaregiverId?: string;
  primaryCaregiverName?: string;
  primaryCaregiverAssignedAt?: Date;
  primaryCaregiverAssignedBy?: string;

  // Extended Demographics
  preferredName?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  biologicalSex?: 'male' | 'female';
  languages?: string[];
  ethnicity?: string;

  // Physical Attributes
  height?: { value: number; unit: 'in' | 'cm' };
  weight?: { value: number; unit: 'lb' | 'kg' };
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

  // Known Conditions (baseline for AI context)
  knownConditions?: string[]; // e.g., ['diabetes', 'hypertension', 'dementia']

  // Care Preferences
  dietaryRestrictions?: string[];
  foodPreferences?: string[];
  foodDislikes?: string[];
  sleepSchedule?: { bedtime: string; wakeTime: string };
  mobilityLevel?: 'independent' | 'minimal_assistance' | 'moderate_assistance' | 'extensive_assistance' | 'dependent' | 'bedridden';
  cognitiveStatus?: 'sharp' | 'mild_decline' | 'moderate_decline' | 'severe_decline';
  communicationNotes?: string[];

  // Archive status
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
}

// ============= Elder Health Profile Types =============

export type ConditionSeverity = 'mild' | 'moderate' | 'severe';
export type ConditionStatus = 'active' | 'inactive' | 'resolved';

export interface ElderHealthCondition {
  id?: string;
  elderId: string;
  groupId: string;
  conditionName: string;
  severity: ConditionSeverity;
  diagnosisDate?: Date;
  diagnosedBy?: string;
  status: ConditionStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AllergyType = 'medication' | 'food' | 'environmental' | 'other';
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export interface ElderAllergy {
  id?: string;
  elderId: string;
  groupId: string;
  allergen: string;
  type: AllergyType;
  reaction: string;
  severity: AllergySeverity;
  discoveredDate?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export type SymptomSeverity = 'mild' | 'moderate' | 'severe' | 'critical';

export interface ElderSymptom {
  id?: string;
  elderId: string;
  groupId: string;
  symptom: string;
  severity: SymptomSeverity;
  duration?: string;
  frequency?: string;
  triggers?: string[];
  observedAt: Date;
  loggedAt: Date;
  reportedBy: string;
  notes?: string;
}

export type NoteCategory = 'medical' | 'care_preference' | 'behavior' | 'communication' | 'general';

export interface ElderImportantNote {
  id?: string;
  elderId: string;
  groupId: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned?: boolean;
  isUrgent?: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactType = 'family' | 'friend' | 'doctor' | 'hospital' | 'pharmacy' | 'other';

export interface ElderEmergencyContact {
  id?: string;
  elderId: string;
  groupId: string;
  name: string;
  relationship: string;
  type: ContactType;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
  specialInstructions?: string;
  createdBy: string;
  createdAt: Date;
}

export type HealthInsightType = 'observation' | 'symptom_pattern' | 'medication_adherence' | 'health_trend' | 'summary';

export interface ElderHealthInsight {
  id?: string;
  elderId: string;
  groupId: string;
  insightType: HealthInsightType;
  observation: string;
  dataSource: 'template' | 'ai' | 'raw_data';
  dataPoints?: string[]; // References to actual data that supports this observation
  createdAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
  generatedBy: string;
  userRole: string;
  dismissedAt?: Date;
  dismissedBy?: string;
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
  // Supply tracking for refill prediction
  supply?: MedicationSupply;
}

export interface MedicationSupply {
  enabled: boolean; // Track supply for this medication
  currentQuantity: number; // Pills/doses remaining
  totalQuantity: number; // Total pills in bottle/pack
  unit: 'pills' | 'ml' | 'doses'; // Unit of measurement
  refillThresholdDays: number; // Alert when X days of supply left (default: 7)
  lastRefillDate?: Date;
  lastRefillQuantity?: number;
  trackingStartedAt: Date;
  autoDeduct: boolean; // Auto-reduce quantity when dose logged
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
  tier: 'family' | 'single_agency' | 'multi_agency';
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
// Note: No separate TRIAL limit - trial users get FAMILY limit (25 MB)
export const STORAGE_LIMITS = {
  FAMILY: 25 * 1024 * 1024, // 25 MB (1 admin + 1 member, max 2 elders)
  SINGLE_AGENCY: 50 * 1024 * 1024, // 50 MB (1 caregiver + 3 members, max 4 elders)
  MULTI_AGENCY: 500 * 1024 * 1024, // 500 MB (10 groups, 40 users, max 30 elders)
} as const;

// Plan limits
export const PLAN_LIMITS = {
  FAMILY: {
    maxElders: 1, // 1 elder (care recipient)
    maxMembers: 2, // 1 admin + 1 member
    maxGroups: 1,
    storage: STORAGE_LIMITS.FAMILY,
    price: 8.99,
  },
  SINGLE_AGENCY: {
    maxElders: 1, // 1 elder (care recipient)
    maxMembers: 4, // 1 admin + 3 members
    maxGroups: 1,
    storage: STORAGE_LIMITS.SINGLE_AGENCY,
    price: 14.99,
  },
  MULTI_AGENCY: {
    maxElders: 30, // 10 caregivers × max 3 elders each
    maxCaregivers: 10,
    maxEldersPerCaregiver: 3,
    maxGroups: 10,
    maxMembersPerGroup: 4, // 1 caregiver + 3 elders
    storage: STORAGE_LIMITS.MULTI_AGENCY,
    price: 30, // $30 per elder per 31 days (dynamically calculated based on active elders)
  },
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

// ============= Appointment Types =============
export interface Appointment {
  id: string;
  groupId: string;
  elderId: string;
  title: string; // e.g., "Dr. Smith - Cardiology"
  type: 'doctor' | 'dentist' | 'specialist' | 'therapy' | 'test' | 'other';
  provider?: string; // Doctor/provider name
  location?: string;
  date: Date;
  duration?: number; // Minutes
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reminderSent: boolean;
  visitSummaryGenerated: boolean; // Has AI generated prep summary
  visitSummaryId?: string; // Link to generated summary
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorVisitSummary {
  id: string;
  appointmentId: string;
  groupId: string;
  elderId: string;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    medicationCompliance: {
      overall: number; // Percentage
      byMedication: Array<{
        name: string;
        compliance: number;
        missedDoses: number;
        totalDoses: number;
      }>;
    };
    healthChanges: Array<{
      type: 'medication' | 'diet' | 'physical' | 'behavioral';
      description: string;
      severity: 'info' | 'warning' | 'critical';
      dateDetected: Date;
    }>;
    symptoms: Array<{
      symptom: string;
      frequency: number; // Days logged
      severity?: string;
      dates: Date[];
    }>;
    dietSummary: {
      averageMealsPerDay: number;
      concernsDetected: string[];
    };
    questionsForDoctor: string[]; // AI-generated questions based on patterns
    medicationList: Array<{
      name: string;
      dosage: string;
      frequency: string;
      compliance: number;
    }>;
  };
  exportedFormats: {
    pdf?: string; // Cloud Storage URL
    json?: string; // Cloud Storage URL
  };
  sharedWith: string[]; // User IDs who have access
}

// ============= Shift Session Types =============
export interface ShiftSession {
  id: string;
  groupId: string;
  elderId: string;
  caregiverId: string; // User ID of caregiver
  agencyId?: string;
  startTime: Date;
  endTime?: Date; // Null if shift still active
  status: 'active' | 'completed' | 'abandoned';
  plannedDuration?: number; // Minutes
  actualDuration?: number; // Minutes (calculated at shift end)
  handoffNoteGenerated: boolean;
  handoffNoteId?: string;
  checkInLocation?: string; // Optional geo-location
  checkOutLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftHandoffNote {
  id: string;
  shiftSessionId: string;
  groupId: string;
  elderId: string;
  caregiverId: string;
  generatedAt: Date;
  shiftPeriod: {
    start: Date;
    end: Date;
  };
  summary: {
    medicationsGiven: Array<{
      name: string;
      time: Date;
      status: 'on-time' | 'late' | 'missed';
      notes?: string;
    }>;
    mealsLogged: Array<{
      meal: string;
      time: Date;
      percentageEaten?: number;
      concerns?: string;
    }>;
    notableEvents: Array<{
      type: 'symptom' | 'mood' | 'incident' | 'visitor' | 'activity' | 'other';
      description: string;
      time: Date;
      severity?: 'info' | 'warning' | 'critical';
    }>;
    mood: {
      overall: 'good' | 'neutral' | 'upset' | 'withdrawn';
      notes?: string;
    };
    vitalSigns?: Array<{
      type: 'blood-pressure' | 'temperature' | 'weight' | 'other';
      value: string;
      time: Date;
    }>;
    notesForNextShift: string[]; // AI-generated + caregiver manual notes
  };
  // Silence flag for routine shifts
  isRoutineShift: boolean; // True if no notable events
  viewedBy: string[]; // User IDs who have read this handoff
  acknowledgedBy?: string; // Next caregiver who acknowledged
  acknowledgedAt?: Date;
}

// ============= Alert System Types =============
export type AlertType =
  | 'medication_refill'
  | 'emergency_pattern'
  | 'health_change'
  | 'compliance_drop'
  | 'missed_doses'
  | 'shift_handoff'
  | 'appointment_reminder'
  | 'doctor_visit_prep';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  groupId: string;
  elderId?: string; // Optional - some alerts are group-level
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data: Record<string, any>; // Type-specific data
  actions?: AlertAction[]; // Available user actions
  status: 'active' | 'dismissed' | 'actioned' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  dismissedAt?: Date;
  dismissedBy?: string;
  dismissalReason?: string; // User-selected reason
  actionedAt?: Date;
  actionedBy?: string;
  actionTaken?: string;
  // Notification tracking
  notificationSent: boolean;
  notificationChannels: ('dashboard' | 'sms' | 'email' | 'push')[];
  viewedBy: string[]; // User IDs who have seen this alert
  viewedAt?: Date;
}

export interface AlertAction {
  id: string;
  label: string; // e.g., "Mark as Refilled", "Contact Doctor", "Dismiss"
  type: 'primary' | 'secondary' | 'dismiss';
  action: string; // Action identifier for handling
}

// Alert dismissal reasons for learning
export type AlertDismissalReason =
  | 'not_relevant'
  | 'already_handled'
  | 'false_positive'
  | 'too_frequent'
  | 'low_priority'
  | 'other';

// Alert analytics for Phase 2 learning
export interface AlertAnalytics {
  id: string;
  alertType: AlertType;
  groupId: string;
  elderId?: string;
  // Aggregate stats
  totalGenerated: number;
  totalDismissed: number;
  totalActioned: number;
  totalExpired: number;
  // Dismissal breakdown
  dismissalReasons: Record<AlertDismissalReason, number>;
  averageTimeToAction?: number; // Milliseconds
  averageTimeToDismiss?: number; // Milliseconds
  // Learning metrics
  falsePositiveRate: number; // Percentage
  actionRate: number; // Percentage of alerts acted upon
  // Period
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

// ============= Emergency Pattern Detection Types =============
export interface EmergencyPattern {
  id: string;
  groupId: string;
  elderId: string;
  detectedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  riskScore: number; // 0-15 scale
  severity: AlertSeverity; // Based on score thresholds
  factors: EmergencyFactor[];
  recommendations: string[];
  status: 'detected' | 'alerted' | 'reviewed' | 'resolved';
  alertId?: string; // Link to generated alert
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface EmergencyFactor {
  type: 'medication_compliance' | 'diet_intake' | 'falls' | 'pain' | 'mood' | 'vital_signs' | 'sleep';
  description: string;
  points: number; // Contribution to risk score
  data: Record<string, any>; // Supporting data
  severity: 'info' | 'warning' | 'critical';
}

// ============= User Alert Preferences (Phase 3) =============
export interface UserAlertPreferences {
  userId: string;
  groupId: string;
  preferences: {
    medicationRefillAlerts: {
      enabled: boolean;
      thresholdDays: number; // Override default
      excludedMedications: string[]; // Medication IDs to never alert
      quietHours?: { start: string; end: string }; // e.g., "22:00" to "08:00"
    };
    emergencyAlerts: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high';
      requireMultipleFactors: boolean;
      minimumRiskScore: number; // Custom threshold
      autoEscalate: boolean; // Auto-notify emergency contacts
    };
    shiftHandoffAlerts: {
      enabled: boolean;
      onlyShowNonRoutine: boolean; // Hide routine shift summaries
      notifyOnShiftEnd: boolean;
    };
    appointmentReminders: {
      enabled: boolean;
      advanceNoticeDays: number[]; // e.g., [7, 3, 1] = 7 days, 3 days, 1 day before
      autoGenerateVisitPrep: boolean;
    };
    notificationChannels: {
      dashboard: boolean;
      sms: boolean;
      email: boolean;
      push: boolean;
    };
    digestMode: {
      enabled: boolean; // Batch alerts into daily digest instead of real-time
      deliveryTime: string; // e.g., "09:00"
    };
  };
  learningData: {
    // Phase 2 learning metrics per alert type
    alertTypePreferences: Record<AlertType, {
      dismissalRate: number;
      actionRate: number;
      avgResponseTime: number; // Milliseconds
      lastAdjustedAt?: Date;
    }>;
  };
  updatedAt: Date;
}

// ============= Medical Disclaimer & Consent Types =============

export type MedicalFeatureType =
  | 'medication_interactions'
  | 'side_effects'
  | 'schedule_conflicts'
  | 'dementia_screening'
  | 'all_medical_features';

export interface MedicalDisclaimerConsent {
  id: string;
  userId: string;
  groupId: string;
  featureType: MedicalFeatureType;
  disclaimerVersion: string; // e.g., "v1.0" - increment when disclaimer changes
  consentGiven: boolean;
  consentText: string; // Full text user agreed to (for legal record)
  // Proof of reading
  timeSpentReading: number; // Milliseconds - ensure they actually read it
  scrolledToBottom: boolean; // Must scroll to end before agreeing
  // Consent details
  consentedAt: Date;
  ipAddress?: string; // Optional for audit trail
  userAgent?: string; // Browser info
  // Re-consent tracking
  expiresAt: Date; // Consent expires after 90 days
  isActive: boolean; // False if expired or revoked
  revokedAt?: Date;
  revokedReason?: string;
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalFeatureAccessLog {
  id: string;
  userId: string;
  groupId: string;
  elderId?: string;
  featureType: MedicalFeatureType;
  action: 'viewed' | 'acknowledged' | 'dismissed';
  // What they viewed
  interactionData?: {
    medicationIds?: string[];
    interactionCount?: number;
    severity?: 'minor' | 'moderate' | 'major' | 'contraindicated';
  };
  // Consent verification
  consentId: string; // Link to the consent record
  consentValid: boolean; // Was consent active when accessed?
  // Audit
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============= Medication Interaction Types (FDA API) =============

export interface DrugInteraction {
  id: string;
  medication1Id: string;
  medication1Name: string;
  medication2Id: string;
  medication2Name: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  clinicalEffects?: string[];
  mechanismOfAction?: string;
  management?: string; // What FDA says to do (NOT our recommendation)
  source: 'fda' | 'openfda' | 'drugbank'; // Data source
  sourceUrl?: string; // Link to FDA page
  lastVerified: Date;
  detectedAt: Date;
}

export interface MedicationSideEffect {
  id: string;
  medicationId: string;
  medicationName: string;
  sideEffect: string;
  frequency: 'common' | 'uncommon' | 'rare' | 'very_rare';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  // Correlation with logged symptoms
  possibleMatch: boolean; // True if this symptom logged in notes
  symptomLogDates?: Date[]; // When symptom was mentioned
  daysAfterMedicationStart?: number; // Timing correlation
  source: 'fda' | 'openfda';
  sourceUrl?: string;
  detectedAt: Date;
}

export interface MedicationScheduleConflict {
  id: string;
  medicationId: string;
  medicationName: string;
  conflictType: 'food_required' | 'empty_stomach' | 'avoid_combination' | 'timing_issue';
  description: string;
  currentSchedule: {
    times: string[]; // Scheduled times
    withMeals: boolean;
  };
  conflict: string; // Description of the conflict
  fdaGuidance?: string; // What FDA label says
  detectedAt: Date;
}

// ============= Dementia Screening Types =============

export interface DementiaScreening {
  id: string;
  groupId: string;
  elderId: string;
  screeningDate: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  riskScore: number; // 0-10 scale
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  indicators: DementiaIndicator[];
  baseline: {
    period: string; // e.g., "30 days"
    behaviors: Record<string, number>; // Baseline frequency
  };
  recommendations: string[]; // ONLY "discuss with doctor", never diagnostic
  // Consent verification
  consentId: string;
  viewedBy: string[];
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  // Status
  status: 'detected' | 'reviewed' | 'discussed_with_doctor' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface DementiaIndicator {
  type:
    | 'memory_issues'
    | 'confusion'
    | 'repetition'
    | 'personality_change'
    | 'withdrawal'
    | 'language_difficulty'
    | 'disorientation'
    | 'poor_judgment';
  description: string;
  frequency: number; // How many times observed
  severity: 'mild' | 'moderate' | 'concerning';
  examples: Array<{
    date: Date;
    context: string; // From which log/note
    quote?: string; // Actual text from note
  }>;
  changeFromBaseline: number; // Percentage change
  points: number; // Contribution to risk score
}

// ============= Caregiver Burnout Types =============

export interface CaregiverBurnoutAssessment {
  id: string;
  agencyId: string;
  caregiverId: string;
  assessmentDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  burnoutRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: BurnoutFactor[];
  recommendations: string[];
  // Tracking
  alertGenerated: boolean;
  alertId?: string;
  reviewedBy?: string; // Agency admin
  reviewedAt?: Date;
  actionTaken?: string;
}

export interface BurnoutFactor {
  type:
    | 'overtime_hours'
    | 'consecutive_days'
    | 'high_elder_count'
    | 'difficult_assignments'
    | 'no_breaks'
    | 'negative_sentiment'
    | 'frequent_incidents';
  description: string;
  severity: 'low' | 'moderate' | 'high';
  data: Record<string, any>;
  points: number; // Contribution to risk score
}

// ============= Schedule/Calendar Types =============

export interface ScheduledShift {
  id: string;
  agencyId: string;
  groupId: string;
  elderId: string;
  elderName: string; // Denormalized for display
  caregiverId: string;
  caregiverName: string; // Denormalized for display
  date: Date; // Date of the shift
  startTime: string; // "09:00" format
  endTime: string; // "17:00" format
  duration: number; // Minutes
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  isRecurring: boolean; // Part of a recurring schedule
  recurringScheduleId?: string; // Link to RecurringSchedule
  shiftSessionId?: string; // Linked to actual ShiftSession when clocked in
  createdBy: string; // SuperAdmin who created/assigned
  createdAt: Date;
  updatedAt: Date;
  confirmedBy?: string; // Caregiver who confirmed
  confirmedAt?: Date;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface ShiftRequest {
  id: string;
  agencyId: string;
  caregiverId: string;
  caregiverName: string; // Denormalized
  requestType: 'specific' | 'recurring'; // One-time or recurring request
  // For specific requests
  specificDate?: Date;
  // For recurring requests
  recurringDays?: number[]; // [0,1,2,3,4,5,6] for Sun-Sat
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  preferredElders?: string[]; // Elder IDs they prefer (optional)
  notes?: string; // Why they want this shift
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: Date;
  reviewedBy?: string; // SuperAdmin
  reviewedAt?: Date;
  reviewNotes?: string; // Admin's response
  // If approved, these shifts are created
  createdShiftIds?: string[]; // ScheduledShift IDs created from this request
}

export interface RecurringSchedule {
  id: string;
  agencyId: string;
  groupId: string;
  elderId: string;
  caregiverId: string;
  daysOfWeek: number[]; // [0,1,2,3,4,5,6] for Sun-Sat
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  startDate: Date; // When recurring schedule begins
  endDate?: Date; // Optional end date
  active: boolean; // Can be paused/resumed
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Conflict detection result
export interface ScheduleConflict {
  type: 'caregiver_double_booked' | 'elder_has_shift' | 'caregiver_unavailable';
  message: string;
  conflictingShift?: ScheduledShift;
}

// Shift swap request
export interface ShiftSwapRequest {
  id: string;
  agencyId: string;
  requestingCaregiverId: string;
  requestingCaregiverName: string;
  targetCaregiverId?: string; // Optional - can be "anyone available"
  targetCaregiverName?: string;
  shiftToSwapId: string; // The shift they want to give away
  shiftToSwap: {
    elderId: string;
    elderName: string;
    date: Date;
    startTime: string;
    endTime: string;
  };
  offerShiftId?: string; // Optional - shift they're offering in exchange
  offerShift?: {
    elderId: string;
    elderName: string;
    date: Date;
    startTime: string;
    endTime: string;
  };
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'admin_approved';
  requestedAt: Date;
  acceptedBy?: string; // Caregiver who accepted
  acceptedAt?: Date;
  reviewedBy?: string; // SuperAdmin who reviewed
  reviewedAt?: Date;
  reviewNotes?: string;
}

// Caregiver availability
export interface CaregiverAvailability {
  id: string;
  agencyId: string;
  caregiverId: string;
  // Weekly recurring availability (default schedule)
  weeklyAvailability: {
    dayOfWeek: number; // 0-6 (Sun-Sat)
    available: boolean;
    timeSlots?: Array<{
      startTime: string; // "09:00"
      endTime: string; // "17:00"
    }>;
  }[];
  // Specific date overrides (for time off, special availability)
  dateOverrides: {
    date: Date;
    available: boolean;
    reason?: string; // "Vacation", "Doctor appointment", etc.
    timeSlots?: Array<{
      startTime: string;
      endTime: string;
    }>;
  }[];
  // Preferences
  maxShiftsPerWeek?: number;
  maxHoursPerWeek?: number;
  preferredElders?: string[]; // Elder IDs they prefer to work with
  unavailableElders?: string[]; // Elder IDs they can't work with
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Caregiver notification
export interface CaregiverNotification {
  id: string;
  agencyId: string;
  caregiverId: string;
  type: 'shift_assigned' | 'shift_cancelled' | 'shift_swap_request' | 'shift_swap_accepted' | 'shift_request_approved' | 'shift_request_rejected' | 'shift_reminder';
  title: string;
  message: string;
  data?: Record<string, any>; // Type-specific data
  priority: 'low' | 'normal' | 'high';
  read: boolean;
  actionRequired: boolean; // Requires caregiver action (e.g., accept swap)
  actionUrl?: string; // Link to relevant page
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date; // For time-sensitive notifications
}
