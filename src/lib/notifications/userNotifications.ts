/**
 * User Notifications Service
 * Unified notification system for the bell icon
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles user_notifications collection
 * - Open/Closed: New notification types don't require code changes
 * - Interface Segregation: Clean interface for create/read/update
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CreateNotificationParams, UserNotification, NotificationType } from './types';

const COLLECTION_NAME = 'user_notifications';

/**
 * Create a new notification for a user
 */
export async function createUserNotification(params: CreateNotificationParams): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      userId: params.userId,
      groupId: params.groupId,
      elderId: params.elderId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority,
      actionUrl: params.actionUrl || null,
      sourceCollection: params.sourceCollection || null,
      sourceId: params.sourceId || null,
      data: params.data || null,
      read: false,
      dismissed: false,
      actionRequired: params.priority === 'high' || params.priority === 'critical',
      expiresAt: params.expiresAt ? Timestamp.fromDate(params.expiresAt) : null,
      createdAt: Timestamp.now()
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating user notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: {
    includeRead?: boolean;
    includeDismissed?: boolean;
    limitCount?: number;
    types?: NotificationType[];
  } = {}
): Promise<UserNotification[]> {
  try {
    const {
      includeRead = true,
      includeDismissed = false,
      limitCount = 50,
      types
    } = options;

    // Query without orderBy to avoid composite index requirement
    // Sort client-side instead
    let q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    let notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserNotification[];

    // Filter client-side (Firestore doesn't support multiple inequality filters well)
    if (!includeDismissed) {
      notifications = notifications.filter(n => !n.dismissed);
    }
    if (!includeRead) {
      notifications = notifications.filter(n => !n.read);
    }
    if (types && types.length > 0) {
      notifications = notifications.filter(n => types.includes(n.type));
    }

    // Sort client-side by createdAt descending (newest first)
    notifications.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notifications = await getUserNotifications(userId, {
      includeRead: false,
      includeDismissed: false
    });
    return notifications.length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, notificationId), {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notifications = await getUserNotifications(userId, {
      includeRead: false,
      includeDismissed: false
    });

    const batch = writeBatch(db);
    notifications.forEach(notification => {
      if (notification.id) {
        batch.update(doc(db, COLLECTION_NAME, notification.id), { read: true });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Dismiss a notification (hide from view)
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, notificationId), {
      dismissed: true
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    throw error;
  }
}

/**
 * Delete a notification permanently
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time notification updates
 * Returns an unsubscribe function
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void
): () => void {
  // Query without orderBy to avoid composite index requirement
  // Sort client-side instead
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('dismissed', '==', false),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserNotification[];

    // Sort client-side by createdAt descending (newest first)
    notifications.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    callback(notifications);
  }, (error) => {
    console.error('Error in notification subscription:', error);
  });
}

/**
 * Create notification when pending approval is created
 */
export async function notifyPendingApproval(params: {
  adminId: string;
  groupId: string;
  groupName: string;
  requestingUserName: string;
  approvalId: string;
}): Promise<string> {
  return createUserNotification({
    userId: params.adminId,
    groupId: params.groupId,
    type: 'pending_approval',
    title: 'New Join Request',
    message: `${params.requestingUserName} wants to join ${params.groupName}`,
    priority: 'medium',
    actionUrl: '/dashboard/settings?tab=group',
    sourceCollection: 'pending_approvals',
    sourceId: params.approvalId
  });
}

/**
 * Create notification when medication reminder is due
 */
export async function notifyMedicationReminder(params: {
  userId: string;
  groupId: string;
  elderId: string;
  elderName: string;
  medicationName: string;
  scheduledTime: string;
  reminderId: string;
}): Promise<string> {
  return createUserNotification({
    userId: params.userId,
    groupId: params.groupId,
    elderId: params.elderId,
    type: 'medication_reminder',
    title: `Medication Reminder`,
    message: `Time to give ${params.elderName} their ${params.medicationName}`,
    priority: 'high',
    actionUrl: `/dashboard/activity?elder=${params.elderId}`,
    sourceCollection: 'reminder_schedules',
    sourceId: params.reminderId
  });
}

/**
 * Create notification when dose is missed
 */
export async function notifyMissedDose(params: {
  userId: string;
  groupId: string;
  elderId: string;
  elderName: string;
  medicationNames: string[];
  severity: 'low' | 'medium' | 'high';
}): Promise<string> {
  const priority = params.severity === 'high' ? 'critical' :
                   params.severity === 'medium' ? 'high' : 'medium';

  return createUserNotification({
    userId: params.userId,
    groupId: params.groupId,
    elderId: params.elderId,
    type: 'missed_dose',
    title: `Missed Dose Alert`,
    message: `${params.elderName} missed: ${params.medicationNames.join(', ')}`,
    priority,
    actionUrl: `/dashboard/activity?elder=${params.elderId}`
  });
}

/**
 * Create notification when weekly summary is ready
 */
export async function notifyWeeklySummary(params: {
  userId: string;
  groupId: string;
  elderId: string;
  elderName: string;
  complianceRate: number;
  summaryId: string;
}): Promise<string> {
  const priority = params.complianceRate < 70 ? 'high' : 'low';

  return createUserNotification({
    userId: params.userId,
    groupId: params.groupId,
    elderId: params.elderId,
    type: 'weekly_summary',
    title: `Weekly Summary Ready`,
    message: `${params.elderName}: ${params.complianceRate}% medication compliance`,
    priority,
    actionUrl: `/dashboard/insights?elder=${params.elderId}`,
    sourceCollection: 'weeklySummaries',
    sourceId: params.summaryId
  });
}

/**
 * Create notification when refill is needed
 */
export async function notifyRefillNeeded(params: {
  userId: string;
  groupId: string;
  elderId: string;
  elderName: string;
  medicationName: string;
  daysRemaining: number;
}): Promise<string> {
  const priority = params.daysRemaining <= 3 ? 'critical' :
                   params.daysRemaining <= 7 ? 'high' : 'medium';

  return createUserNotification({
    userId: params.userId,
    groupId: params.groupId,
    elderId: params.elderId,
    type: 'refill_needed',
    title: `Refill Needed`,
    message: `${params.medicationName} for ${params.elderName} - ${params.daysRemaining} days left`,
    priority,
    actionUrl: `/dashboard/medications?elder=${params.elderId}`
  });
}

/**
 * Create notification for emergency pattern detected
 */
export async function notifyEmergencyPattern(params: {
  userId: string;
  groupId: string;
  elderId: string;
  elderName: string;
  patternDescription: string;
  alertId: string;
}): Promise<string> {
  return createUserNotification({
    userId: params.userId,
    groupId: params.groupId,
    elderId: params.elderId,
    type: 'emergency_pattern',
    title: `Health Alert`,
    message: `${params.elderName}: ${params.patternDescription}`,
    priority: 'critical',
    actionUrl: `/dashboard/alerts?elder=${params.elderId}`,
    sourceCollection: 'alerts',
    sourceId: params.alertId
  });
}
