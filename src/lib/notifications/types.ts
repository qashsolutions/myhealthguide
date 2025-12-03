/**
 * Unified Notification System Types
 * Single source of truth for all notification types
 */

import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'pending_approval'      // Someone wants to join group
  | 'medication_reminder'   // Medication due NOW
  | 'missed_dose'           // Dose was missed
  | 'weekly_summary'        // Weekly summary ready
  | 'shift_assigned'        // Caregiver: shift assigned
  | 'shift_cancelled'       // Caregiver: shift cancelled
  | 'shift_reminder'        // Caregiver: shift in 2 hours
  | 'shift_swap_request'    // Caregiver: someone wants to swap
  | 'refill_needed'         // Medication running low
  | 'emergency_pattern';    // Critical health pattern detected

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface UserNotification {
  id?: string;
  userId: string;           // Who receives the notification
  groupId: string;          // Related group
  elderId?: string;         // Related elder (if applicable)

  // Display
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;

  // State
  read: boolean;
  dismissed: boolean;
  actionRequired: boolean;
  actionUrl?: string;       // Where to navigate on click

  // Metadata
  sourceCollection?: string; // Original source (for reference)
  sourceId?: string;         // Original document ID
  expiresAt?: Timestamp | null;
  createdAt: Timestamp;
}

export interface CreateNotificationParams {
  userId: string;
  groupId: string;
  elderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  actionUrl?: string;
  sourceCollection?: string;
  sourceId?: string;
  expiresAt?: Date;
}
