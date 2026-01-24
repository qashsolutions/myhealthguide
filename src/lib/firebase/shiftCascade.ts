/**
 * Shift Cascade System
 * Ranks eligible caregivers and orchestrates priority cascade offers
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { checkScheduleConflicts } from './scheduleShifts';
import { AgencyService } from './agencies';
import type { CascadeCandidate, CaregiverAssignment, Elder } from '@/types';
import { startOfWeek, endOfWeek } from 'date-fns';

/**
 * Rank caregivers for a cascade shift based on affinity/history scoring.
 * Returns sorted candidates (highest score first) with ineligible caregivers filtered out.
 */
export async function rankCaregiversForShift(
  agencyId: string,
  elderId: string,
  date: Date,
  startTime: string,
  endTime: string,
  preferredCaregiverId?: string
): Promise<CascadeCandidate[]> {
  // 1. Get all active assignments for this agency
  const assignments = await AgencyService.getAgencyAssignments(agencyId);

  // 2. Get the elder to check primaryCaregiverId
  const elders = await AgencyService.getAgencyElders(agencyId);
  const elder = elders.find(e => e.id === elderId);

  // 3. Collect unique active caregiver IDs
  const activeCaregiverIds = new Set<string>();
  assignments.forEach(a => {
    if (a.active) {
      activeCaregiverIds.add(a.caregiverId);
    }
  });

  if (activeCaregiverIds.size === 0) return [];

  // 4. Get caregiver names
  const caregiverNames = new Map<string, string>();
  for (const assignment of assignments) {
    if (!caregiverNames.has(assignment.caregiverId)) {
      caregiverNames.set(assignment.caregiverId, assignment.caregiverId);
    }
  }

  // Fetch real names from shifts or user docs
  try {
    const shiftsQuery = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      where('status', 'in', ['completed', 'scheduled', 'confirmed', 'in_progress'])
    );
    const shiftsSnap = await getDocs(shiftsQuery);
    shiftsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.caregiverId && data.caregiverName) {
        caregiverNames.set(data.caregiverId, data.caregiverName);
      }
    });
  } catch (err) {
    console.error('Error fetching caregiver names from shifts:', err);
  }

  // 5. Score each caregiver
  const candidates: CascadeCandidate[] = [];

  for (const caregiverId of activeCaregiverIds) {
    // Check for scheduling conflict
    const conflict = await checkScheduleConflicts(
      caregiverId,
      agencyId,
      date,
      startTime,
      endTime
    );

    if (conflict) {
      // Caregiver has a conflict, skip
      continue;
    }

    let score = 0;

    // +40: Primary caregiver for this elder
    if (elder?.primaryCaregiverId === caregiverId) {
      score += 40;
    }

    // +15: Assigned to this elder via caregiver_assignments
    const assignedToElder = assignments.some(
      a => a.caregiverId === caregiverId && a.active && a.elderIds.includes(elderId)
    );
    if (assignedToElder) {
      score += 15;
    }

    // +10: Owner's preferred choice
    if (preferredCaregiverId && caregiverId === preferredCaregiverId) {
      score += 10;
    }

    // +1 per completed shift with this elder (max +25)
    const completedCount = await getCompletedShiftCount(caregiverId, elderId, agencyId);
    score += Math.min(completedCount, 25);

    // +10 max: Lower workload this week (inverted)
    const weekWorkload = await getWeeklyShiftCount(caregiverId, agencyId, date);
    // 0 shifts = +10, 5+ shifts = +0
    score += Math.max(0, 10 - weekWorkload * 2);

    const name = caregiverNames.get(caregiverId) || `Caregiver ${caregiverId.substring(0, 6)}`;
    candidates.push({ caregiverId, caregiverName: name, score });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

/**
 * Get count of completed shifts for a caregiver with a specific elder
 */
async function getCompletedShiftCount(
  caregiverId: string,
  elderId: string,
  agencyId: string
): Promise<number> {
  try {
    const q = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      where('caregiverId', '==', caregiverId),
      where('elderId', '==', elderId),
      where('status', '==', 'completed')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.error('Error getting completed shift count:', err);
    return 0;
  }
}

/**
 * Get count of shifts for a caregiver in the same week as the target date
 */
async function getWeeklyShiftCount(
  caregiverId: string,
  agencyId: string,
  targetDate: Date
): Promise<number> {
  try {
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

    const q = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      where('caregiverId', '==', caregiverId),
      where('date', '>=', Timestamp.fromDate(weekStart)),
      where('date', '<=', Timestamp.fromDate(weekEnd)),
      where('status', 'in', ['scheduled', 'confirmed', 'in_progress', 'offered'])
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.error('Error getting weekly shift count:', err);
    return 0;
  }
}
