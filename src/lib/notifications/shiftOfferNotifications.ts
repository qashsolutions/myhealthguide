/**
 * Shift Offer Notification Helpers
 * Sends notifications for cascade shift offers and unfilled shifts
 */

import { createUserNotification } from './userNotifications';
import { format } from 'date-fns';
import type { ScheduledShift } from '@/types';

/**
 * Notify a caregiver that a shift is available for them to accept/decline
 */
export async function notifyShiftOffer(
  userId: string,
  groupId: string,
  elderId: string,
  shift: ScheduledShift,
  offerExpiresAt: Date
): Promise<string> {
  const shiftDate = shift.date instanceof Date ? shift.date : new Date(shift.date);
  const dateStr = format(shiftDate, 'MMM d, yyyy');

  return createUserNotification({
    userId,
    groupId,
    elderId,
    type: 'shift_offer',
    title: 'Shift Available',
    message: `A shift with ${shift.elderName} on ${dateStr} (${shift.startTime}–${shift.endTime}) is available. Accept within 30 minutes.`,
    priority: 'high',
    actionUrl: '/dashboard/calendar',
    sourceCollection: 'scheduledShifts',
    sourceId: shift.id,
    data: {
      shiftId: shift.id,
      offerExpiresAt: offerExpiresAt.toISOString(),
      elderName: shift.elderName,
      date: dateStr,
      startTime: shift.startTime,
      endTime: shift.endTime
    },
    expiresAt: offerExpiresAt
  });
}

/**
 * Notify the agency owner that a cascade shift could not be filled
 */
export async function notifyShiftUnfilled(
  ownerId: string,
  groupId: string,
  elderId: string,
  shift: ScheduledShift
): Promise<string> {
  const shiftDate = shift.date instanceof Date ? shift.date : new Date(shift.date);
  const dateStr = format(shiftDate, 'MMM d, yyyy');

  return createUserNotification({
    userId: ownerId,
    groupId,
    elderId,
    type: 'shift_unfilled',
    title: 'Shift Unfilled',
    message: `No caregiver accepted the shift with ${shift.elderName} on ${dateStr} (${shift.startTime}–${shift.endTime}). Please assign manually.`,
    priority: 'high',
    actionUrl: '/dashboard/schedule',
    sourceCollection: 'scheduledShifts',
    sourceId: shift.id,
    data: {
      shiftId: shift.id,
      elderName: shift.elderName,
      date: dateStr,
      startTime: shift.startTime,
      endTime: shift.endTime
    }
  });
}
