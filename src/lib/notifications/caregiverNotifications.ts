/**
 * Caregiver Notification Service
 *
 * Handles in-app notifications for caregivers:
 * - Shift assignments
 * - Shift cancellations
 * - Shift swap requests
 * - Shift request approvals/rejections
 * - Shift reminders
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import type { CaregiverNotification, ScheduledShift, ShiftSwapRequest } from '@/types';
import { format } from 'date-fns';

/**
 * Create a notification for a caregiver
 */
async function createNotification(
  agencyId: string,
  caregiverId: string,
  type: CaregiverNotification['type'],
  title: string,
  message: string,
  priority: CaregiverNotification['priority'] = 'normal',
  actionRequired: boolean = false,
  actionUrl?: string,
  data?: Record<string, any>,
  expiresAt?: Date
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const notification: Omit<CaregiverNotification, 'id'> = {
      agencyId,
      caregiverId,
      type,
      title,
      message,
      data,
      priority,
      read: false,
      actionRequired,
      actionUrl,
      createdAt: new Date(),
      expiresAt
    };

    const notificationRef = await addDoc(collection(db, 'caregiverNotifications'), notification);
    return { success: true, notificationId: notificationRef.id };
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify caregiver of shift assignment
 */
export async function notifyShiftAssigned(
  agencyId: string,
  caregiverId: string,
  shift: ScheduledShift
): Promise<void> {
  const title = 'New Shift Assigned';
  const message = `You have been assigned a shift with ${shift.elderName} on ${format(shift.date, 'MMM d, yyyy')} from ${shift.startTime} to ${shift.endTime}.`;

  await createNotification(
    agencyId,
    caregiverId,
    'shift_assigned',
    title,
    message,
    'normal',
    false,
    '/dashboard/calendar',
    { shiftId: shift.id }
  );
}

/**
 * Notify caregiver of shift cancellation
 */
export async function notifyShiftCancelled(
  agencyId: string,
  caregiverId: string,
  shift: ScheduledShift,
  reason?: string
): Promise<void> {
  const title = 'Shift Cancelled';
  const message = `Your shift with ${shift.elderName} on ${format(shift.date, 'MMM d, yyyy')} from ${shift.startTime} to ${shift.endTime} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`;

  await createNotification(
    agencyId,
    caregiverId,
    'shift_cancelled',
    title,
    message,
    'high',
    false,
    '/dashboard/calendar',
    { shiftId: shift.id, reason }
  );
}

/**
 * Notify caregiver of shift swap request
 */
export async function notifyShiftSwapRequest(
  agencyId: string,
  targetCaregiverId: string,
  swapRequest: ShiftSwapRequest
): Promise<void> {
  const title = 'Shift Swap Request';
  const message = `${swapRequest.requestingCaregiverName} wants to swap their shift with ${swapRequest.shiftToSwap.elderName} on ${format(swapRequest.shiftToSwap.date, 'MMM d')} (${swapRequest.shiftToSwap.startTime}-${swapRequest.shiftToSwap.endTime}).`;

  await createNotification(
    agencyId,
    targetCaregiverId,
    'shift_swap_request',
    title,
    message,
    'high',
    true,
    '/dashboard/calendar',
    { swapRequestId: swapRequest.id },
    new Date(Date.now() + 48 * 60 * 60 * 1000) // Expires in 48 hours
  );
}

/**
 * Notify caregiver that their swap request was accepted
 */
export async function notifyShiftSwapAccepted(
  agencyId: string,
  requestingCaregiverId: string,
  swapRequest: ShiftSwapRequest,
  acceptedBy: string
): Promise<void> {
  const title = 'Shift Swap Accepted';
  const message = `Your shift swap request has been accepted! Your shift with ${swapRequest.shiftToSwap.elderName} on ${format(swapRequest.shiftToSwap.date, 'MMM d')} has been swapped.`;

  await createNotification(
    agencyId,
    requestingCaregiverId,
    'shift_swap_accepted',
    title,
    message,
    'normal',
    false,
    '/dashboard/calendar',
    { swapRequestId: swapRequest.id }
  );
}

/**
 * Notify caregiver that their shift request was approved
 */
export async function notifyShiftRequestApproved(
  agencyId: string,
  caregiverId: string,
  elderName: string,
  shiftDetails: string
): Promise<void> {
  const title = 'Shift Request Approved';
  const message = `Your shift request has been approved! You've been assigned to ${elderName} - ${shiftDetails}.`;

  await createNotification(
    agencyId,
    caregiverId,
    'shift_request_approved',
    title,
    message,
    'normal',
    false,
    '/dashboard/calendar'
  );
}

/**
 * Notify caregiver that their shift request was rejected
 */
export async function notifyShiftRequestRejected(
  agencyId: string,
  caregiverId: string,
  reason: string
): Promise<void> {
  const title = 'Shift Request Declined';
  const message = `Your shift request has been declined. ${reason}`;

  await createNotification(
    agencyId,
    caregiverId,
    'shift_request_rejected',
    title,
    message,
    'low',
    false
  );
}

/**
 * Send shift reminder (upcoming shift in 2 hours)
 */
export async function notifyShiftReminder(
  agencyId: string,
  caregiverId: string,
  shift: ScheduledShift
): Promise<void> {
  const title = 'Upcoming Shift Reminder';
  const message = `Reminder: You have a shift with ${shift.elderName} starting at ${shift.startTime} today.`;

  await createNotification(
    agencyId,
    caregiverId,
    'shift_reminder',
    title,
    message,
    'high',
    false,
    '/dashboard/shift-handoff',
    { shiftId: shift.id }
  );
}

/**
 * Get unread notifications for caregiver
 */
export async function getUnreadNotifications(
  caregiverId: string
): Promise<CaregiverNotification[]> {
  try {
    const notificationsQuery = query(
      collection(db, 'caregiverNotifications'),
      where('caregiverId', '==', caregiverId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate()
    })) as CaregiverNotification[];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
}

/**
 * Get all notifications for caregiver
 */
export async function getAllNotifications(
  caregiverId: string,
  limitCount: number = 50
): Promise<CaregiverNotification[]> {
  try {
    const notificationsQuery = query(
      collection(db, 'caregiverNotifications'),
      where('caregiverId', '==', caregiverId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate()
    })) as CaregiverNotification[];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const notificationRef = doc(db, 'caregiverNotifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read for a caregiver
 */
export async function markAllNotificationsAsRead(
  caregiverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const notificationsQuery = query(
      collection(db, 'caregiverNotifications'),
      where('caregiverId', '==', caregiverId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    const updatePromises = snapshot.docs.map(docSnap =>
      updateDoc(doc(db, 'caregiverNotifications', docSnap.id), {
        read: true,
        readAt: new Date()
      })
    );

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  caregiverId: string
): Promise<number> {
  try {
    const notificationsQuery = query(
      collection(db, 'caregiverNotifications'),
      where('caregiverId', '==', caregiverId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}
