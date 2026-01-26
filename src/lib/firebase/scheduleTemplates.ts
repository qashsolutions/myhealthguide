/**
 * Schedule Templates Service
 *
 * Provides functionality for copying weekly schedules and managing schedule templates.
 */

import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { startOfWeek, endOfWeek, addDays, isSameDay, format } from 'date-fns';
import type { ScheduledShift } from '@/types';

// Schedule constants
const MAX_ELDERS_PER_CAREGIVER_PER_DAY = 3;

interface CopyWeekResult {
  success: boolean;
  shiftsCreated: number;
  error?: string;
}

interface WeekSummary {
  weekStart: Date;
  totalShifts: number;
  assignedShifts: number;
  unfilledShifts: number;
  uniqueElders: number;
  uniqueCaregivers: number;
}

/**
 * Get the last week that has scheduled shifts for an agency
 */
export async function getLastScheduledWeek(agencyId: string): Promise<WeekSummary | null> {
  try {
    // Query recent shifts ordered by date descending
    // Note: We filter out cancelled client-side to avoid needing a composite index
    const shiftsQuery = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      orderBy('date', 'desc'),
      limit(200)
    );

    const snapshot = await getDocs(shiftsQuery);

    if (snapshot.empty) {
      return null;
    }

    // Find the most recent shift and its week
    // Filter out cancelled/declined shifts client-side
    const shifts = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }) as ScheduledShift)
      .filter(s => !['cancelled', 'declined'].includes(s.status));

    if (shifts.length === 0 || !shifts[0].date) {
      return null;
    }

    // Get the week of the most recent shift
    const latestDate = shifts[0].date;
    const weekStart = startOfWeek(latestDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(latestDate, { weekStartsOn: 0 });

    // Filter shifts for that week
    const weekShifts = shifts.filter(
      s => s.date && s.date >= weekStart && s.date <= weekEnd
    );

    // Calculate summary
    const assignedShifts = weekShifts.filter(s => s.caregiverId).length;
    const uniqueElders = new Set(weekShifts.map(s => s.elderId)).size;
    const uniqueCaregivers = new Set(weekShifts.filter(s => s.caregiverId).map(s => s.caregiverId)).size;

    return {
      weekStart,
      totalShifts: weekShifts.length,
      assignedShifts,
      unfilledShifts: weekShifts.length - assignedShifts,
      uniqueElders,
      uniqueCaregivers,
    };
  } catch (error) {
    console.error('Error getting last scheduled week:', error);
    return null;
  }
}

/**
 * Get shifts for a specific week
 */
export async function getWeekShifts(
  agencyId: string,
  weekStart: Date
): Promise<ScheduledShift[]> {
  try {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

    const shiftsQuery = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      where('date', '>=', Timestamp.fromDate(weekStart)),
      where('date', '<=', Timestamp.fromDate(weekEnd))
    );

    const snapshot = await getDocs(shiftsQuery);

    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as ScheduledShift)
      .filter(s => s.status !== 'cancelled');
  } catch (error) {
    console.error('Error getting week shifts:', error);
    return [];
  }
}

/**
 * Copy shifts from source week to target week
 *
 * @param agencyId - Agency ID
 * @param sourceWeekStart - Start of source week (Sunday)
 * @param targetWeekStart - Start of target week (Sunday)
 * @param userId - User ID creating the shifts
 * @param options - Copy options
 */
export async function copyWeekSchedule(
  agencyId: string,
  sourceWeekStart: Date,
  targetWeekStart: Date,
  userId: string,
  options: {
    copyAssignments?: boolean; // Whether to copy caregiver assignments (default: true)
    skipExisting?: boolean; // Skip if shift already exists for elder on that day (default: true)
  } = {}
): Promise<CopyWeekResult> {
  const { copyAssignments = true, skipExisting = true } = options;

  try {
    // Get source week shifts
    const sourceShifts = await getWeekShifts(agencyId, sourceWeekStart);

    if (sourceShifts.length === 0) {
      return {
        success: false,
        shiftsCreated: 0,
        error: 'No shifts found in source week',
      };
    }

    // Get target week existing shifts (to check for duplicates)
    const targetShifts = skipExisting
      ? await getWeekShifts(agencyId, targetWeekStart)
      : [];

    // Create a set of existing elder-date combinations in target week
    const existingElderDates = new Set(
      targetShifts.map(s => `${s.elderId}-${s.date ? format(s.date, 'yyyy-MM-dd') : ''}`)
    );

    // Track caregiver load per day (for 3-elder limit)
    // Map: caregiverId -> dateKey -> count
    const caregiverDayLoad = new Map<string, Map<string, number>>();
    targetShifts.forEach(s => {
      if (s.caregiverId && s.date) {
        const dateKey = format(s.date, 'yyyy-MM-dd');
        if (!caregiverDayLoad.has(s.caregiverId)) {
          caregiverDayLoad.set(s.caregiverId, new Map());
        }
        const dayMap = caregiverDayLoad.get(s.caregiverId)!;
        dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1);
      }
    });

    // Calculate day offset between weeks
    const dayOffset = Math.round(
      (targetWeekStart.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    let shiftsCreated = 0;
    const errors: string[] = [];

    // Copy each shift
    for (const sourceShift of sourceShifts) {
      if (!sourceShift.date) continue;

      // Calculate new date
      const newDate = addDays(sourceShift.date, dayOffset);
      const elderDateKey = `${sourceShift.elderId}-${format(newDate, 'yyyy-MM-dd')}`;

      // Skip if shift already exists for this elder on this day
      if (skipExisting && existingElderDates.has(elderDateKey)) {
        continue;
      }

      // Check caregiver's daily load (max 3 elders per day)
      const dateKey = format(newDate, 'yyyy-MM-dd');
      let canAssignCaregiver = copyAssignments && sourceShift.caregiverId;

      if (canAssignCaregiver && sourceShift.caregiverId) {
        const cgDayMap = caregiverDayLoad.get(sourceShift.caregiverId);
        const currentLoad = cgDayMap?.get(dateKey) || 0;
        if (currentLoad >= MAX_ELDERS_PER_CAREGIVER_PER_DAY) {
          // Caregiver at limit - create shift as unfilled
          canAssignCaregiver = false;
          errors.push(`${sourceShift.caregiverName} at max load on ${dateKey}, shift for ${sourceShift.elderName} created unfilled`);
        }
      }

      // Create new shift
      const newShift = {
        agencyId: sourceShift.agencyId,
        groupId: sourceShift.groupId,
        elderId: sourceShift.elderId,
        elderName: sourceShift.elderName,
        caregiverId: canAssignCaregiver ? sourceShift.caregiverId : '',
        caregiverName: canAssignCaregiver ? sourceShift.caregiverName : '',
        date: Timestamp.fromDate(newDate),
        startTime: sourceShift.startTime,
        endTime: sourceShift.endTime,
        duration: sourceShift.duration,
        status: canAssignCaregiver ? 'scheduled' : 'unfilled',
        notes: sourceShift.notes || '',
        isRecurring: false,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await addDoc(collection(db, 'scheduledShifts'), newShift);
        shiftsCreated++;
        existingElderDates.add(elderDateKey); // Track to prevent duplicates within batch

        // Update caregiver day load tracking
        if (canAssignCaregiver && sourceShift.caregiverId) {
          if (!caregiverDayLoad.has(sourceShift.caregiverId)) {
            caregiverDayLoad.set(sourceShift.caregiverId, new Map());
          }
          const cgDayMap = caregiverDayLoad.get(sourceShift.caregiverId)!;
          cgDayMap.set(dateKey, (cgDayMap.get(dateKey) || 0) + 1);
        }
      } catch (err) {
        console.error('Error creating shift:', err);
        errors.push(`Failed to create shift for ${sourceShift.elderName}`);
      }
    }

    return {
      success: shiftsCreated > 0,
      shiftsCreated,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error: any) {
    console.error('Error copying week schedule:', error);
    return {
      success: false,
      shiftsCreated: 0,
      error: error.message || 'Failed to copy schedule',
    };
  }
}

/**
 * Get a preview of what will be copied
 */
export async function getCopyPreview(
  agencyId: string,
  sourceWeekStart: Date,
  targetWeekStart: Date
): Promise<{
  sourceShifts: number;
  targetExisting: number;
  willCreate: number;
  elderNames: string[];
}> {
  const sourceShifts = await getWeekShifts(agencyId, sourceWeekStart);
  const targetShifts = await getWeekShifts(agencyId, targetWeekStart);

  // Calculate day offset
  const dayOffset = Math.round(
    (targetWeekStart.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check which shifts would be created
  const existingElderDates = new Set(
    targetShifts.map(s => `${s.elderId}-${s.date ? format(s.date, 'yyyy-MM-dd') : ''}`)
  );

  let willCreate = 0;
  const elderNamesSet = new Set<string>();

  for (const shift of sourceShifts) {
    if (!shift.date) continue;
    const newDate = addDays(shift.date, dayOffset);
    const elderDateKey = `${shift.elderId}-${format(newDate, 'yyyy-MM-dd')}`;

    if (!existingElderDates.has(elderDateKey)) {
      willCreate++;
      elderNamesSet.add(shift.elderName);
    }
  }

  return {
    sourceShifts: sourceShifts.length,
    targetExisting: targetShifts.length,
    willCreate,
    elderNames: Array.from(elderNamesSet).slice(0, 5), // First 5 names
  };
}
