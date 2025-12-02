/**
 * Compliance Calculation Utility
 * Centralized logic for calculating medication, supplement, and overall compliance
 */

import type { MedicationLog, SupplementLog, DietEntry } from '@/types';
import { isToday, startOfDay, endOfDay } from 'date-fns';

export interface ComplianceStats {
  taken: number;
  missed: number;
  pending: number;
  total: number;
  percentage: number;
}

export interface QuickInsightsData {
  medications: ComplianceStats;
  supplements: ComplianceStats;
  mealsLogged: number;
  overallCompliance: number;
  pendingItems: number;
  completedItems: number;
}

/**
 * Calculate compliance stats from logs
 */
export function calculateComplianceStats(
  logs: Array<{ status: string }>,
  totalScheduled?: number
): ComplianceStats {
  const taken = logs.filter(l => l.status === 'taken').length;
  const missed = logs.filter(l => l.status === 'missed' || l.status === 'skipped').length;
  const late = logs.filter(l => l.status === 'late').length;
  const logged = taken + missed + late;

  // If totalScheduled provided, calculate pending
  const pending = totalScheduled ? Math.max(0, totalScheduled - logged) : 0;
  const total = totalScheduled || logged;

  // Compliance = taken / (taken + missed + late), pending doesn't count against
  const completedTotal = taken + missed + late;
  const percentage = completedTotal > 0
    ? Math.round((taken / completedTotal) * 100)
    : (pending > 0 ? 100 : 100); // If nothing logged yet and there's pending, show 100%

  return {
    taken,
    missed: missed + late, // Combine missed and late for simplicity
    pending,
    total,
    percentage
  };
}

/**
 * Calculate medication compliance for a date range
 */
export function calculateMedicationCompliance(
  logs: MedicationLog[],
  elderId?: string
): ComplianceStats {
  const filtered = elderId
    ? logs.filter(l => l.elderId === elderId)
    : logs;

  return calculateComplianceStats(filtered);
}

/**
 * Calculate supplement compliance for a date range
 */
export function calculateSupplementCompliance(
  logs: SupplementLog[],
  elderId?: string
): ComplianceStats {
  const filtered = elderId
    ? logs.filter(l => l.elderId === elderId)
    : logs;

  return calculateComplianceStats(filtered);
}

/**
 * Count meals logged for today
 */
export function countTodaysMeals(
  entries: DietEntry[],
  elderId?: string
): number {
  const filtered = elderId
    ? entries.filter(e => e.elderId === elderId)
    : entries;

  return filtered.filter(e => {
    const timestamp = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
    return isToday(timestamp);
  }).length;
}

/**
 * Calculate quick insights from schedule items
 * Used by Activity page where we have schedule-based data
 */
export function calculateQuickInsightsFromSchedule(
  scheduleItems: Array<{
    type: 'medication' | 'supplement';
    status: 'pending' | 'taken' | 'skipped' | 'late';
  }>,
  mealsLogged: number
): QuickInsightsData {
  const medItems = scheduleItems.filter(s => s.type === 'medication');
  const suppItems = scheduleItems.filter(s => s.type === 'supplement');

  const medTaken = medItems.filter(s => s.status === 'taken').length;
  const medMissed = medItems.filter(s => s.status === 'skipped' || s.status === 'late').length;
  const medPending = medItems.filter(s => s.status === 'pending').length;
  const medTotal = medItems.length;
  const medCompleted = medTaken + medMissed;
  const medCompliance = medCompleted > 0 ? Math.round((medTaken / medCompleted) * 100) : 100;

  const suppTaken = suppItems.filter(s => s.status === 'taken').length;
  const suppMissed = suppItems.filter(s => s.status === 'skipped' || s.status === 'late').length;
  const suppPending = suppItems.filter(s => s.status === 'pending').length;
  const suppTotal = suppItems.length;
  const suppCompleted = suppTaken + suppMissed;
  const suppCompliance = suppCompleted > 0 ? Math.round((suppTaken / suppCompleted) * 100) : 100;

  // Overall compliance (weighted average of meds and supplements)
  const totalCompleted = medCompleted + suppCompleted;
  const totalTaken = medTaken + suppTaken;
  const overallCompliance = totalCompleted > 0
    ? Math.round((totalTaken / totalCompleted) * 100)
    : 100;

  return {
    medications: {
      taken: medTaken,
      missed: medMissed,
      pending: medPending,
      total: medTotal,
      percentage: medCompliance
    },
    supplements: {
      taken: suppTaken,
      missed: suppMissed,
      pending: suppPending,
      total: suppTotal,
      percentage: suppCompliance
    },
    mealsLogged,
    overallCompliance,
    pendingItems: medPending + suppPending,
    completedItems: medCompleted + suppCompleted
  };
}

/**
 * Calculate quick insights from logs
 * Used when we have raw log data from Firestore
 */
export function calculateQuickInsightsFromLogs(
  medicationLogs: MedicationLog[],
  supplementLogs: SupplementLog[],
  dietEntries: DietEntry[],
  elderId?: string
): QuickInsightsData {
  const medStats = calculateMedicationCompliance(medicationLogs, elderId);
  const suppStats = calculateSupplementCompliance(supplementLogs, elderId);
  const mealsLogged = countTodaysMeals(dietEntries, elderId);

  // Overall compliance
  const totalCompleted = (medStats.taken + medStats.missed) + (suppStats.taken + suppStats.missed);
  const totalTaken = medStats.taken + suppStats.taken;
  const overallCompliance = totalCompleted > 0
    ? Math.round((totalTaken / totalCompleted) * 100)
    : 100;

  return {
    medications: medStats,
    supplements: suppStats,
    mealsLogged,
    overallCompliance,
    pendingItems: medStats.pending + suppStats.pending,
    completedItems: totalCompleted
  };
}

/**
 * Get compliance status label
 */
export function getComplianceStatus(percentage: number): {
  label: string;
  variant: 'default' | 'destructive' | 'secondary';
  color: string;
} {
  if (percentage >= 90) {
    return { label: 'Excellent', variant: 'default', color: 'green' };
  } else if (percentage >= 75) {
    return { label: 'Good', variant: 'default', color: 'blue' };
  } else if (percentage >= 50) {
    return { label: 'Needs Attention', variant: 'secondary', color: 'yellow' };
  } else {
    return { label: 'Critical', variant: 'destructive', color: 'red' };
  }
}
