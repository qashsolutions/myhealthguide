/**
 * Caregiver Availability Management Service
 *
 * Handles caregiver availability:
 * - Weekly recurring availability
 * - Specific date overrides (time off, special availability)
 * - Availability checking for scheduling
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
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import type { CaregiverAvailability, ScheduleConflict } from '@/types';
import { isSameDay, parse } from 'date-fns';

/**
 * Get or create caregiver availability
 */
export async function getCaregiverAvailability(
  caregiverId: string,
  agencyId: string
): Promise<CaregiverAvailability | null> {
  try {
    const availabilityQuery = query(
      collection(db, 'caregiverAvailability'),
      where('caregiverId', '==', caregiverId),
      where('agencyId', '==', agencyId)
    );

    const snapshot = await getDocs(availabilityQuery);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        dateOverrides: doc.data().dateOverrides?.map((override: any) => ({
          ...override,
          date: override.date?.toDate()
        })) || [],
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as CaregiverAvailability;
    }

    // Create default availability (available all week, 9am-5pm)
    const defaultAvailability: Omit<CaregiverAvailability, 'id'> = {
      agencyId,
      caregiverId,
      weeklyAvailability: [
        { dayOfWeek: 0, available: false }, // Sunday
        { dayOfWeek: 1, available: true, timeSlots: [{ startTime: '09:00', endTime: '17:00' }] }, // Monday
        { dayOfWeek: 2, available: true, timeSlots: [{ startTime: '09:00', endTime: '17:00' }] }, // Tuesday
        { dayOfWeek: 3, available: true, timeSlots: [{ startTime: '09:00', endTime: '17:00' }] }, // Wednesday
        { dayOfWeek: 4, available: true, timeSlots: [{ startTime: '09:00', endTime: '17:00' }] }, // Thursday
        { dayOfWeek: 5, available: true, timeSlots: [{ startTime: '09:00', endTime: '17:00' }] }, // Friday
        { dayOfWeek: 6, available: false }, // Saturday
      ],
      dateOverrides: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const availabilityRef = await addDoc(collection(db, 'caregiverAvailability'), defaultAvailability);

    return {
      id: availabilityRef.id,
      ...defaultAvailability
    };
  } catch (error) {
    console.error('Error getting caregiver availability:', error);
    return null;
  }
}

/**
 * Update caregiver weekly availability
 */
export async function updateWeeklyAvailability(
  availabilityId: string,
  weeklyAvailability: CaregiverAvailability['weeklyAvailability']
): Promise<{ success: boolean; error?: string }> {
  try {
    const availabilityRef = doc(db, 'caregiverAvailability', availabilityId);
    await updateDoc(availabilityRef, {
      weeklyAvailability,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating weekly availability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add date override (time off or special availability)
 */
export async function addDateOverride(
  availabilityId: string,
  date: Date,
  available: boolean,
  reason?: string,
  timeSlots?: Array<{ startTime: string; endTime: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current availability
    const availabilityRef = doc(db, 'caregiverAvailability', availabilityId);
    const availabilitySnap = await getDoc(availabilityRef);

    if (!availabilitySnap.exists()) {
      return { success: false, error: 'Availability not found' };
    }

    const availability = availabilitySnap.data() as Omit<CaregiverAvailability, 'id'>;
    const dateOverrides = availability.dateOverrides || [];

    // Remove existing override for this date if exists
    const filteredOverrides = dateOverrides.filter(
      (override: any) => !isSameDay(override.date?.toDate(), date)
    );

    // Add new override
    filteredOverrides.push({
      date,
      available,
      reason,
      timeSlots
    });

    await updateDoc(availabilityRef, {
      dateOverrides: filteredOverrides,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error adding date override:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove date override
 */
export async function removeDateOverride(
  availabilityId: string,
  date: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const availabilityRef = doc(db, 'caregiverAvailability', availabilityId);
    const availabilitySnap = await getDoc(availabilityRef);

    if (!availabilitySnap.exists()) {
      return { success: false, error: 'Availability not found' };
    }

    const availability = availabilitySnap.data() as Omit<CaregiverAvailability, 'id'>;
    const dateOverrides = availability.dateOverrides || [];

    const filteredOverrides = dateOverrides.filter(
      (override: any) => !isSameDay(override.date?.toDate(), date)
    );

    await updateDoc(availabilityRef, {
      dateOverrides: filteredOverrides,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error removing date override:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update preferences
 */
export async function updateAvailabilityPreferences(
  availabilityId: string,
  maxShiftsPerWeek?: number,
  maxHoursPerWeek?: number,
  preferredElders?: string[],
  unavailableElders?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const availabilityRef = doc(db, 'caregiverAvailability', availabilityId);
    await updateDoc(availabilityRef, {
      maxShiftsPerWeek,
      maxHoursPerWeek,
      preferredElders,
      unavailableElders,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating preferences:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if caregiver is available at specific date/time
 */
export async function checkCaregiverAvailability(
  caregiverId: string,
  agencyId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<ScheduleConflict | null> {
  try {
    const availability = await getCaregiverAvailability(caregiverId, agencyId);

    if (!availability) {
      return null; // No availability set, assume available
    }

    const dayOfWeek = date.getDay();

    // Check for date override first
    const dateOverride = availability.dateOverrides.find(override =>
      isSameDay(override.date, date)
    );

    if (dateOverride) {
      if (!dateOverride.available) {
        return {
          type: 'caregiver_unavailable',
          message: `Caregiver is unavailable on this date${dateOverride.reason ? `: ${dateOverride.reason}` : ''}`
        };
      }

      // Check time slots if specified
      if (dateOverride.timeSlots && dateOverride.timeSlots.length > 0) {
        const isInTimeSlot = dateOverride.timeSlots.some(slot =>
          isTimeInRange(startTime, endTime, slot.startTime, slot.endTime)
        );

        if (!isInTimeSlot) {
          return {
            type: 'caregiver_unavailable',
            message: 'Shift time is outside caregiver\'s available time slots'
          };
        }
      }

      return null; // Override says available
    }

    // Check weekly availability
    const weeklyAvail = availability.weeklyAvailability.find(
      avail => avail.dayOfWeek === dayOfWeek
    );

    if (!weeklyAvail || !weeklyAvail.available) {
      return {
        type: 'caregiver_unavailable',
        message: 'Caregiver is not available on this day of the week'
      };
    }

    // Check time slots
    if (weeklyAvail.timeSlots && weeklyAvail.timeSlots.length > 0) {
      const isInTimeSlot = weeklyAvail.timeSlots.some(slot =>
        isTimeInRange(startTime, endTime, slot.startTime, slot.endTime)
      );

      if (!isInTimeSlot) {
        return {
          type: 'caregiver_unavailable',
          message: 'Shift time is outside caregiver\'s available time slots'
        };
      }
    }

    return null; // Available
  } catch (error) {
    console.error('Error checking caregiver availability:', error);
    return null;
  }
}

/**
 * Helper: Check if shift time range is within available time range
 */
function isTimeInRange(
  shiftStart: string,
  shiftEnd: string,
  availStart: string,
  availEnd: string
): boolean {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const shiftStartMin = parseTime(shiftStart);
  const shiftEndMin = parseTime(shiftEnd);
  const availStartMin = parseTime(availStart);
  const availEndMin = parseTime(availEnd);

  return shiftStartMin >= availStartMin && shiftEndMin <= availEndMin;
}

/**
 * Get all caregivers available for a specific date/time
 */
export async function getAvailableCaregivers(
  agencyId: string,
  date: Date,
  startTime: string,
  endTime: string,
  caregiverIds: string[]
): Promise<string[]> {
  try {
    const availableIds: string[] = [];

    for (const caregiverId of caregiverIds) {
      const conflict = await checkCaregiverAvailability(
        caregiverId,
        agencyId,
        date,
        startTime,
        endTime
      );

      if (!conflict) {
        availableIds.push(caregiverId);
      }
    }

    return availableIds;
  } catch (error) {
    console.error('Error getting available caregivers:', error);
    return [];
  }
}
