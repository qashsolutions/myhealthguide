/**
 * Medication Schedule Conflict Detection
 *
 * Detects scheduling issues like:
 * - "Take with food" but scheduled before meals
 * - "Take on empty stomach" but scheduled with meals
 * - Two medications scheduled together that should be separated
 *
 * CRITICAL: We FLAG conflicts but DON'T recommend changes
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import type { Medication, MedicationScheduleConflict } from '@/types';

interface ScheduleRequirement {
  withFood?: boolean; // Must be taken with food
  emptyStomach?: boolean; // Must be taken on empty stomach
  separateFrom?: string[]; // Medication names to separate from
  timingNotes?: string; // Any FDA timing guidance
}

// Common medication timing requirements (simplified - in production, get from FDA API)
const COMMON_TIMING_REQUIREMENTS: Record<string, ScheduleRequirement> = {
  // Empty stomach medications
  levothyroxine: { emptyStomach: true, timingNotes: 'Take 30-60 minutes before breakfast' },
  omeprazole: { emptyStomach: true, timingNotes: 'Take before first meal of the day' },

  // With food medications
  metformin: { withFood: true, timingNotes: 'Take with meals to reduce stomach upset' },
  ibuprofen: { withFood: true, timingNotes: 'Take with food or milk' },
  naproxen: { withFood: true, timingNotes: 'Take with food or milk' },

  // Separation requirements
  calcium: {
    separateFrom: ['levothyroxine', 'iron'],
    timingNotes: 'Take at least 4 hours apart from thyroid medication'
  }
};

/**
 * Check for schedule conflicts in current medications
 */
export async function detectScheduleConflicts(
  groupId: string,
  elderId: string
): Promise<MedicationScheduleConflict[]> {
  try {
    // Get all active medications
    const medicationsQuery = query(
      collection(db, 'medications'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId)
    );

    const medicationsSnap = await getDocs(medicationsQuery);
    const medications = medicationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Medication[];

    // Filter active medications
    const activeMedications = medications.filter(med => {
      if (!med.endDate) return true;
      return new Date(med.endDate) >= new Date();
    });

    const conflicts: MedicationScheduleConflict[] = [];

    // Check each medication for conflicts
    for (const medication of activeMedications) {
      const medNameLower = medication.name.toLowerCase();
      const requirements = COMMON_TIMING_REQUIREMENTS[medNameLower];

      if (!requirements) continue; // No known timing requirements

      // Extract schedule times
      const scheduledTimes = medication.frequency.times;

      // CHECK 1: With food requirement
      if (requirements.withFood) {
        const conflict = checkWithFoodRequirement(medication, scheduledTimes);
        if (conflict) conflicts.push(conflict);
      }

      // CHECK 2: Empty stomach requirement
      if (requirements.emptyStomach) {
        const conflict = checkEmptyStomachRequirement(medication, scheduledTimes);
        if (conflict) conflicts.push(conflict);
      }

      // CHECK 3: Separation requirements
      if (requirements.separateFrom) {
        const separationConflicts = checkSeparationRequirements(
          medication,
          scheduledTimes,
          activeMedications,
          requirements.separateFrom,
          requirements.timingNotes
        );
        conflicts.push(...separationConflicts);
      }
    }

    return conflicts;

  } catch (error) {
    console.error('Error detecting schedule conflicts:', error);
    return [];
  }
}

/**
 * Check if "with food" medication is scheduled before typical meal times
 */
function checkWithFoodRequirement(
  medication: Medication,
  scheduledTimes: string[]
): MedicationScheduleConflict | null {
  // Typical meal times
  const mealTimes = ['07:00', '08:00', '12:00', '13:00', '18:00', '19:00'];

  const hasScheduledNearMeals = scheduledTimes.some(time => {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 7 && hour <= 20; // Reasonable eating hours
  });

  if (!hasScheduledNearMeals) {
    return {
      id: `conflict_${medication.id}_withfood`,
      medicationId: medication.id,
      medicationName: medication.name,
      conflictType: 'food_required',
      description: 'This medication should be taken with food',
      currentSchedule: {
        times: scheduledTimes,
        withMeals: false
      },
      conflict: `Scheduled at times that may not align with meals`,
      fdaGuidance: 'This medication is typically recommended to be taken with food',
      detectedAt: new Date()
    };
  }

  return null;
}

/**
 * Check if "empty stomach" medication is scheduled near meal times
 */
function checkEmptyStomachRequirement(
  medication: Medication,
  scheduledTimes: string[]
): MedicationScheduleConflict | null {
  const earlyMorningTimes = scheduledTimes.filter(time => {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 6 && hour <= 8;
  });

  if (earlyMorningTimes.length === 0) {
    return {
      id: `conflict_${medication.id}_emptystomach`,
      medicationId: medication.id,
      medicationName: medication.name,
      conflictType: 'empty_stomach',
      description: 'This medication should be taken on an empty stomach',
      currentSchedule: {
        times: scheduledTimes,
        withMeals: false
      },
      conflict: `Scheduled times may conflict with meals`,
      fdaGuidance: 'This medication is typically taken 30-60 minutes before breakfast',
      detectedAt: new Date()
    };
  }

  return null;
}

/**
 * Check if medications that should be separated are scheduled together
 */
function checkSeparationRequirements(
  medication: Medication,
  scheduledTimes: string[],
  allMedications: Medication[],
  separateFromNames: string[],
  timingNotes?: string
): MedicationScheduleConflict[] {
  const conflicts: MedicationScheduleConflict[] = [];

  for (const otherMed of allMedications) {
    if (otherMed.id === medication.id) continue;

    const otherNameLower = otherMed.name.toLowerCase();
    const shouldSeparate = separateFromNames.some(name =>
      otherNameLower.includes(name.toLowerCase())
    );

    if (!shouldSeparate) continue;

    // Check if any times overlap or are too close
    const hasOverlap = scheduledTimes.some(time1 =>
      otherMed.frequency.times.some(time2 => {
        const diff = Math.abs(timeToMinutes(time1) - timeToMinutes(time2));
        return diff < 240; // Less than 4 hours apart
      })
    );

    if (hasOverlap) {
      conflicts.push({
        id: `conflict_${medication.id}_separation_${otherMed.id}`,
        medicationId: medication.id,
        medicationName: medication.name,
        conflictType: 'avoid_combination',
        description: `Should be taken separately from ${otherMed.name}`,
        currentSchedule: {
          times: scheduledTimes,
          withMeals: false
        },
        conflict: `Scheduled within 4 hours of ${otherMed.name} (${otherMed.frequency.times.join(', ')})`,
        fdaGuidance: timingNotes || 'These medications should be taken at least 4 hours apart',
        detectedAt: new Date()
      });
    }
  }

  return conflicts;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Save detected conflict to database
 */
export async function saveScheduleConflict(
  groupId: string,
  elderId: string,
  conflict: MedicationScheduleConflict
): Promise<string> {
  try {
    const conflictRecord = {
      ...conflict,
      groupId,
      elderId,
      status: 'active',
      reviewedBy: null,
      reviewedAt: null
    };

    const conflictRef = await addDoc(collection(db, 'scheduleConflicts'), conflictRecord);
    return conflictRef.id;

  } catch (error) {
    console.error('Error saving schedule conflict:', error);
    throw error;
  }
}

/**
 * Run conflict check and save any found
 */
export async function runScheduleConflictCheck(
  groupId: string,
  elderId: string
): Promise<{ count: number; conflicts: MedicationScheduleConflict[] }> {
  try {
    const conflicts = await detectScheduleConflicts(groupId, elderId);

    // Save each detected conflict
    for (const conflict of conflicts) {
      await saveScheduleConflict(groupId, elderId, conflict);
    }

    return {
      count: conflicts.length,
      conflicts
    };

  } catch (error) {
    console.error('Error running schedule conflict check:', error);
    return { count: 0, conflicts: [] };
  }
}
