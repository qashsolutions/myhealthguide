/**
 * Timesheet & Shift Verification Types
 *
 * QR Code + GPS verification system for caregiver clock-in/out
 * with automatic timesheet generation and approval workflow.
 */

// ============= Address Types =============

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: GeoCoordinates;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

// ============= QR Code Types =============

export interface ElderQRCode {
  id: string;
  elderId: string;
  elderName: string;
  groupId: string;
  agencyId: string;
  secretKey: string;           // For validation
  locationName: string;        // "Home", "Facility A", etc.
  address: Address;            // Address for this QR location
  createdAt: Date;
  createdBy: string;           // Super admin who created
  active: boolean;
  regeneratedAt?: Date;        // If QR was regenerated
}

export interface QRCodeData {
  type: 'careguide_shift';
  version: 1;
  elderId: string;
  qrCodeId: string;
  secretKey: string;
}

// ============= GPS Verification Types =============

export interface GPSCapture {
  latitude: number;
  longitude: number;
  accuracy: number;            // Meters
  timestamp: Date;
}

export interface LocationVerification {
  gps: GPSCapture;
  elderAddress: Address;
  distanceMeters: number;
  verified: boolean;           // Within 8 meters
  overrideReason?: OverrideReason;
  deviceId?: string;
}

export type OverrideReason =
  | 'elder_at_hospital'
  | 'elder_at_doctor'
  | 'elder_at_family'
  | 'elder_traveling'
  | 'gps_unavailable'
  | 'emergency'
  | 'training_shift';

export const OVERRIDE_REASON_LABELS: Record<OverrideReason, string> = {
  elder_at_hospital: 'Loved one at hospital/medical facility',
  elder_at_doctor: "Loved one at doctor's appointment",
  elder_at_family: "Loved one at family member's home",
  elder_traveling: 'Loved one traveling/vacation',
  gps_unavailable: 'GPS/location service unavailable',
  emergency: 'Emergency situation',
  training_shift: 'Training/orientation shift',
};

// GPS verification thresholds
export const GPS_VERIFIED_RADIUS_METERS = 8;
export const GPS_WARNING_RADIUS_METERS = 3;

// ============= Clock In/Out Types =============

export interface ClockEvent {
  timestamp: Date;
  qrCodeId: string;
  qrScanned: boolean;
  gps: GPSCapture | null;
  locationVerified: boolean;
  distanceFromElder: number | null;  // meters
  overrideReason?: OverrideReason;
  deviceId?: string;
}

// Extended shift session with verification data
export interface VerifiedShiftSession {
  id: string;
  caregiverId: string;
  caregiverName: string;
  elderId: string;
  elderName: string;
  groupId: string;
  agencyId?: string;
  status: 'active' | 'completed' | 'cancelled';
  clockIn: ClockEvent;
  clockOut?: ClockEvent;
  activitiesLogged: number;      // Count of activities during shift
  createdAt: Date;
  updatedAt: Date;
}

// ============= Timesheet Entry Types =============

export type TimesheetEntryStatus = 'auto' | 'submitted' | 'approved' | 'rejected' | 'on_hold';

export interface TimesheetEntry {
  id: string;
  caregiverId: string;
  caregiverName: string;
  agencyId: string;
  elderId: string;
  elderName: string;
  shiftSessionId: string;
  date: Date;
  clockIn: Date;
  clockOut: Date;
  hoursWorked: number;           // Calculated decimal hours
  clockInVerified: boolean;
  clockOutVerified: boolean;
  clockInOverride?: OverrideReason;
  clockOutOverride?: OverrideReason;
  activitiesLogged: number;
  status: TimesheetEntryStatus;
  weekStartDate: Date;           // Monday of the week
  createdAt: Date;
  updatedAt: Date;
}

// ============= Timesheet Submission Types =============

export type TimesheetSubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'on_hold';

export interface TimesheetSubmission {
  id: string;
  caregiverId: string;
  caregiverName: string;
  agencyId: string;
  weekStartDate: Date;           // Monday
  weekEndDate: Date;             // Sunday
  totalHours: number;
  totalShifts: number;
  verifiedShifts: number;        // GPS verified count
  overrideShifts: number;        // Shifts with override
  entryIds: string[];            // References to timesheetEntries
  status: TimesheetSubmissionStatus;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;           // Super admin user ID
  reviewerName?: string;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Timesheet Summary Types =============

export interface WeeklyTimesheetSummary {
  weekStartDate: Date;
  weekEndDate: Date;
  entries: TimesheetEntry[];
  totalHours: number;
  totalShifts: number;
  verifiedShifts: number;
  overrideShifts: number;
  submission?: TimesheetSubmission;
  canSubmit: boolean;            // All shifts completed for the week
}

export interface CaregiverTimesheetStats {
  caregiverId: string;
  caregiverName: string;
  currentWeekHours: number;
  currentWeekShifts: number;
  pendingSubmissions: number;
  approvedThisMonth: number;
  totalHoursThisMonth: number;
}

// ============= Admin Approval Types =============

export interface TimesheetApprovalItem {
  submission: TimesheetSubmission;
  entries: TimesheetEntry[];
  caregiver: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  flags: TimesheetFlag[];
}

export interface TimesheetFlag {
  type: 'no_gps' | 'location_override' | 'no_activities' | 'long_shift' | 'short_shift';
  severity: 'warning' | 'error';
  message: string;
  entryId?: string;
}

export interface ApprovalAction {
  submissionId: string;
  action: 'approve' | 'reject' | 'on_hold';
  notes?: string;
  reviewedBy: string;
  reviewerName: string;
}

// ============= Notification Types =============

export type TimesheetNotificationType =
  | 'timesheet_submitted'
  | 'timesheet_approved'
  | 'timesheet_rejected'
  | 'timesheet_on_hold';

export interface TimesheetNotification {
  type: TimesheetNotificationType;
  submissionId: string;
  caregiverId: string;
  weekStartDate: Date;
  notes?: string;
}
