/**
 * Schedule & Calendar Management Service
 *
 * Handles:
 * - Shift scheduling and assignment
 * - Shift requests (caregiver → superadmin)
 * - Conflict detection (prevent double-booking)
 * - Recurring schedules
 * - Integration with clock in/out
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  and,
  limit
} from 'firebase/firestore';
import type {
  ScheduledShift,
  ShiftRequest,
  RecurringSchedule,
  ScheduleConflict
} from '@/types';
import { parse, format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { checkCaregiverAvailability } from './caregiverAvailability';
import { notifyShiftAssigned, notifyShiftRequestApproved, notifyShiftRequestRejected } from '@/lib/notifications/caregiverNotifications';

/**
 * Check for scheduling conflicts
 */
export async function checkScheduleConflicts(
  caregiverId: string,
  agencyId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string // When editing, exclude current shift
): Promise<ScheduleConflict | null> {
  try {
    // Check caregiver availability first
    const availabilityConflict = await checkCaregiverAvailability(
      caregiverId,
      agencyId,
      date,
      startTime,
      endTime
    );

    if (availabilityConflict) {
      return availabilityConflict;
    }

    // Query shifts for this caregiver on this date
    const shiftsQuery = query(
      collection(db, 'scheduledShifts'),
      where('caregiverId', '==', caregiverId),
      where('date', '==', Timestamp.fromDate(date)),
      where('status', 'in', ['scheduled', 'confirmed', 'in_progress', 'offered'])
    );

    const snapshot = await getDocs(shiftsQuery);
    const existingShifts = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        confirmedAt: doc.data().confirmedAt?.toDate(),
        cancelledAt: doc.data().cancelledAt?.toDate()
      })) as ScheduledShift[];

    // Filter out the shift being edited
    const relevantShifts = excludeShiftId
      ? existingShifts.filter(s => s.id !== excludeShiftId)
      : existingShifts;

    // Check for time overlap
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);

    for (const shift of relevantShifts) {
      const existingStart = parseTime(shift.startTime);
      const existingEnd = parseTime(shift.endTime);

      // Check if times overlap
      if (timesOverlap(newStart, newEnd, existingStart, existingEnd)) {
        return {
          type: 'caregiver_double_booked',
          message: `Caregiver is already scheduled from ${shift.startTime} to ${shift.endTime} with ${shift.elderName}`,
          conflictingShift: shift
        };
      }
    }

    return null; // No conflicts
  } catch (error) {
    console.error('Error checking schedule conflicts:', error);
    return null;
  }
}

/**
 * Parse time string to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
function timesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Create a scheduled shift (SuperAdmin)
 */
export async function createScheduledShift(
  agencyId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  caregiverId: string,
  caregiverName: string,
  date: Date,
  startTime: string,
  endTime: string,
  notes: string | undefined,
  createdBy: string,
  isRecurring: boolean = false,
  recurringScheduleId?: string
): Promise<{ success: boolean; shiftId?: string; error?: string; conflict?: ScheduleConflict }> {
  try {
    // Calculate duration
    const duration = parseTime(endTime) - parseTime(startTime);

    // Build shift object, excluding undefined fields (Firestore doesn't accept undefined)
    const shift: Record<string, any> = {
      agencyId,
      groupId,
      elderId,
      elderName,
      caregiverId,
      caregiverName,
      date,
      startTime,
      endTime,
      duration,
      status: 'scheduled',
      isRecurring,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they have values
    if (notes) {
      shift.notes = notes;
    }
    if (recurringScheduleId) {
      shift.recurringScheduleId = recurringScheduleId;
    }

    const shiftRef = await addDoc(collection(db, 'scheduledShifts'), shift);

    // Send notification to caregiver
    await notifyShiftAssigned(agencyId, caregiverId, {
      id: shiftRef.id,
      ...shift
    } as ScheduledShift);

    return { success: true, shiftId: shiftRef.id };
  } catch (error: any) {
    console.error('Error creating scheduled shift:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a cascade shift (Auto-Assign mode)
 * Calls server-side API route which uses Admin SDK to bypass Firestore rules
 * for cross-user notification creation.
 */
export async function createCascadeShift(
  agencyId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  date: Date,
  startTime: string,
  endTime: string,
  notes: string | undefined,
  createdBy: string,
  preferredCaregiverId?: string,
  _ownerId?: string
): Promise<{ success: boolean; shiftId?: string; error?: string }> {
  try {
    const { authenticatedFetch } = await import('@/lib/api/authenticatedFetch');

    const response = await authenticatedFetch('/api/shifts/create-cascade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agencyId,
        groupId,
        elderId,
        elderName,
        date: date.toISOString(),
        startTime,
        endTime,
        notes,
        preferredCaregiverId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create cascade shift' };
    }

    return { success: true, shiftId: data.shiftId };
  } catch (error: any) {
    console.error('Error creating cascade shift:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get scheduled shifts for a date range
 */
export async function getScheduledShifts(
  agencyId: string,
  startDate: Date,
  endDate: Date,
  caregiverId?: string // Optional: filter by caregiver
): Promise<ScheduledShift[]> {
  try {
    // Simplified query - filter by agencyId only (and optionally caregiverId)
    // Filter by date range and sort in memory to avoid composite index requirements
    let shiftsQuery;

    if (caregiverId) {
      shiftsQuery = query(
        collection(db, 'scheduledShifts'),
        where('agencyId', '==', agencyId),
        where('caregiverId', '==', caregiverId),
        limit(500)
      );
    } else {
      shiftsQuery = query(
        collection(db, 'scheduledShifts'),
        where('agencyId', '==', agencyId),
        limit(500)
      );
    }

    const snapshot = await getDocs(shiftsQuery);

    // Map and filter by date range in memory
    const shifts = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        confirmedAt: doc.data().confirmedAt?.toDate(),
        cancelledAt: doc.data().cancelledAt?.toDate()
      })) as ScheduledShift[];

    // Filter by date range
    const filteredShifts = shifts.filter(shift => {
      if (!shift.date) return false;
      return shift.date >= startDate && shift.date <= endDate;
    });

    // Sort by date, then by startTime
    filteredShifts.sort((a, b) => {
      const dateCompare = (a.date?.getTime() || 0) - (b.date?.getTime() || 0);
      if (dateCompare !== 0) return dateCompare;
      // Sort by startTime string (e.g., "09:00")
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return filteredShifts;
  } catch (error) {
    console.error('Error getting scheduled shifts:', error);
    return [];
  }
}

/**
 * Confirm a scheduled shift (Caregiver)
 */
export async function confirmScheduledShift(
  shiftId: string,
  caregiverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shiftRef = doc(db, 'scheduledShifts', shiftId);
    await updateDoc(shiftRef, {
      status: 'confirmed',
      confirmedBy: caregiverId,
      confirmedAt: new Date(),
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error confirming shift:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a scheduled shift
 */
export async function cancelScheduledShift(
  shiftId: string,
  cancelledBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shiftRef = doc(db, 'scheduledShifts', shiftId);
    await updateDoc(shiftRef, {
      status: 'cancelled',
      cancelledBy,
      cancelledAt: new Date(),
      cancellationReason: reason,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling shift:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a shift request (Caregiver)
 */
export async function createShiftRequest(
  agencyId: string,
  caregiverId: string,
  caregiverName: string,
  requestType: 'specific' | 'recurring',
  startTime: string,
  endTime: string,
  specificDate?: Date,
  recurringDays?: number[],
  preferredElders?: string[],
  notes?: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const request: Omit<ShiftRequest, 'id'> = {
      agencyId,
      caregiverId,
      caregiverName,
      requestType,
      specificDate,
      recurringDays,
      startTime,
      endTime,
      preferredElders,
      notes,
      status: 'pending',
      requestedAt: new Date()
    };

    const requestRef = await addDoc(collection(db, 'shiftRequests'), request);
    return { success: true, requestId: requestRef.id };
  } catch (error: any) {
    console.error('Error creating shift request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get shift requests for an agency
 */
export async function getShiftRequests(
  agencyId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<ShiftRequest[]> {
  try {
    let requestsQuery;

    if (status) {
      requestsQuery = query(
        collection(db, 'shiftRequests'),
        where('agencyId', '==', agencyId),
        where('status', '==', status),
        orderBy('requestedAt', 'desc')
      );
    } else {
      requestsQuery = query(
        collection(db, 'shiftRequests'),
        where('agencyId', '==', agencyId),
        orderBy('requestedAt', 'desc')
      );
    }

    const snapshot = await getDocs(requestsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      specificDate: doc.data().specificDate?.toDate(),
      requestedAt: doc.data().requestedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    })) as ShiftRequest[];
  } catch (error) {
    console.error('Error getting shift requests:', error);
    return [];
  }
}

/**
 * Approve shift request and create scheduled shift (SuperAdmin)
 */
export async function approveShiftRequest(
  requestId: string,
  reviewedBy: string,
  assignedElderId: string,
  assignedElderName: string,
  assignedGroupId: string,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the request
    const requestRef = doc(db, 'shiftRequests', requestId);
    const requestSnap = await getDocs(
      query(collection(db, 'shiftRequests'), where('__name__', '==', requestId))
    );

    if (requestSnap.empty) {
      return { success: false, error: 'Request not found' };
    }

    const request = {
      id: requestSnap.docs[0].id,
      ...requestSnap.docs[0].data(),
      specificDate: requestSnap.docs[0].data().specificDate?.toDate(),
      requestedAt: requestSnap.docs[0].data().requestedAt?.toDate()
    } as ShiftRequest;

    const createdShiftIds: string[] = [];

    // Create scheduled shift(s) based on request type
    if (request.requestType === 'specific' && request.specificDate) {
      const result = await createScheduledShift(
        request.agencyId,
        assignedGroupId,
        assignedElderId,
        assignedElderName,
        request.caregiverId,
        request.caregiverName,
        request.specificDate,
        request.startTime,
        request.endTime,
        reviewNotes,
        reviewedBy,
        false
      );

      if (result.success && result.shiftId) {
        createdShiftIds.push(result.shiftId);
      } else {
        return { success: false, error: result.error };
      }
    } else if (request.requestType === 'recurring' && request.recurringDays) {
      // Create recurring schedule (simplified for now - creates shifts for next 4 weeks)
      const today = new Date();
      const endDate = addDays(today, 28); // 4 weeks

      for (let date = today; date <= endDate; date = addDays(date, 1)) {
        const dayOfWeek = date.getDay();
        if (request.recurringDays.includes(dayOfWeek)) {
          const result = await createScheduledShift(
            request.agencyId,
            assignedGroupId,
            assignedElderId,
            assignedElderName,
            request.caregiverId,
            request.caregiverName,
            date,
            request.startTime,
            request.endTime,
            reviewNotes,
            reviewedBy,
            true
          );

          if (result.success && result.shiftId) {
            createdShiftIds.push(result.shiftId);
          }
        }
      }
    }

    // Update request status
    await updateDoc(requestRef, {
      status: 'approved',
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes,
      createdShiftIds
    });

    // Send notification to caregiver
    await notifyShiftRequestApproved(
      request.agencyId,
      request.caregiverId,
      assignedElderName,
      request.requestType === 'specific'
        ? `${format(request.specificDate!, 'MMM d, yyyy')} ${request.startTime}-${request.endTime}`
        : `Recurring: ${request.recurringDays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} ${request.startTime}-${request.endTime}`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error approving shift request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject shift request (SuperAdmin)
 */
export async function rejectShiftRequest(
  requestId: string,
  reviewedBy: string,
  reviewNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the request to get caregiver info
    const requestSnap = await getDocs(
      query(collection(db, 'shiftRequests'), where('__name__', '==', requestId))
    );

    if (!requestSnap.empty) {
      const request = requestSnap.docs[0].data();

      // Send notification to caregiver
      await notifyShiftRequestRejected(
        request.agencyId,
        request.caregiverId,
        reviewNotes || 'Your shift request was declined.'
      );
    }

    const requestRef = doc(db, 'shiftRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting shift request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Link scheduled shift to shift session when caregiver clocks in
 */
export async function linkShiftToSession(
  scheduledShiftId: string,
  shiftSessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shiftRef = doc(db, 'scheduledShifts', scheduledShiftId);
    await updateDoc(shiftRef, {
      status: 'in_progress',
      shiftSessionId,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error linking shift to session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark shift as completed
 */
export async function completeScheduledShift(
  scheduledShiftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shiftRef = doc(db, 'scheduledShifts', scheduledShiftId);
    await updateDoc(shiftRef, {
      status: 'completed',
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error completing shift:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get caregiver's upcoming shifts
 */
export async function getCaregiverUpcomingShifts(
  caregiverId: string,
  maxResults: number = 10
): Promise<ScheduledShift[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simplified query - filter by caregiverId only, filter dates/status in memory
    const shiftsQuery = query(
      collection(db, 'scheduledShifts'),
      where('caregiverId', '==', caregiverId),
      limit(200)
    );

    const snapshot = await getDocs(shiftsQuery);
    const allShifts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      confirmedAt: doc.data().confirmedAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate()
    })) as ScheduledShift[];

    // Filter by date >= today and status in ['scheduled', 'confirmed']
    const filteredShifts = allShifts.filter(shift => {
      if (!shift.date || shift.date < today) return false;
      return shift.status === 'scheduled' || shift.status === 'confirmed';
    });

    // Sort by date, then by startTime
    filteredShifts.sort((a, b) => {
      const dateCompare = (a.date?.getTime() || 0) - (b.date?.getTime() || 0);
      if (dateCompare !== 0) return dateCompare;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return filteredShifts.slice(0, maxResults);
  } catch (error) {
    console.error('Error getting upcoming shifts:', error);
    return [];
  }
}

/**
 * Find scheduled shift for clock-in
 * Looks for a shift scheduled within the next 30 minutes
 */
export async function findScheduledShiftForClockIn(
  caregiverId: string,
  elderId: string
): Promise<ScheduledShift | null> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    // Get today's shifts for this caregiver and elder
    const shiftsQuery = query(
      collection(db, 'scheduledShifts'),
      where('caregiverId', '==', caregiverId),
      where('elderId', '==', elderId),
      where('date', '==', Timestamp.fromDate(today)),
      where('status', 'in', ['scheduled', 'confirmed'])
    );

    const snapshot = await getDocs(shiftsQuery);
    const shifts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      confirmedAt: doc.data().confirmedAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate()
    })) as ScheduledShift[];

    // Find shift starting within next 30 minutes
    for (const shift of shifts) {
      const shiftStartTime = parseTime(shift.startTime);
      const timeDiff = shiftStartTime - currentTime;

      // Allow clock-in up to 15 minutes early or 30 minutes late
      if (timeDiff >= -15 && timeDiff <= 30) {
        return shift;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding scheduled shift for clock-in:', error);
    return null;
  }
}
