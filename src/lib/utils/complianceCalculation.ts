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
 * Parse time string like "7 am", "12 pm", "2:30 pm" to { hours, minutes }
 */
function parseTimeString(time: string): { hours: number; minutes: number } {
  const match = time.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return { hours: 0, minutes: 0 };

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Check if a scheduled time has passed (is overdue)
 */
function isOverdue(scheduledTime: string): boolean {
  const now = new Date();
  const { hours, minutes } = parseTimeString(scheduledTime);
  const scheduledDate = new Date();
  scheduledDate.setHours(hours, minutes, 0, 0);

  // Add 30-minute grace period
  scheduledDate.setMinutes(scheduledDate.getMinutes() + 30);

  return now > scheduledDate;
}

/**
 * Calculate quick insights from schedule items
 * Used by Activity page where we have schedule-based data
 * Now considers time - pending items past their scheduled time count as overdue/missed
 */
export function calculateQuickInsightsFromSchedule(
  scheduleItems: Array<{
    type: 'medication' | 'supplement';
    status: 'pending' | 'taken' | 'skipped' | 'late';
    time?: string; // Optional time for overdue detection
  }>,
  mealsLogged: number
): QuickInsightsData {
  const medItems = scheduleItems.filter(s => s.type === 'medication');
  const suppItems = scheduleItems.filter(s => s.type === 'supplement');

  // For medications
  const medTaken = medItems.filter(s => s.status === 'taken').length;
  const medSkipped = medItems.filter(s => s.status === 'skipped' || s.status === 'late').length;
  const medPendingItems = medItems.filter(s => s.status === 'pending');
  // Count overdue pending items as missed
  const medOverdue = medPendingItems.filter(s => s.time && isOverdue(s.time)).length;
  const medPending = medPendingItems.length - medOverdue;
  const medMissed = medSkipped + medOverdue;
  const medTotal = medItems.length;
  const medCompleted = medTaken + medMissed;
  const medCompliance = medCompleted > 0 ? Math.round((medTaken / medCompleted) * 100) : 100;

  // For supplements
  const suppTaken = suppItems.filter(s => s.status === 'taken').length;
  const suppSkipped = suppItems.filter(s => s.status === 'skipped' || s.status === 'late').length;
  const suppPendingItems = suppItems.filter(s => s.status === 'pending');
  // Count overdue pending items as missed
  const suppOverdue = suppPendingItems.filter(s => s.time && isOverdue(s.time)).length;
  const suppPending = suppPendingItems.length - suppOverdue;
  const suppMissed = suppSkipped + suppOverdue;
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
 * NOTE: This is a synchronous fallback. For AI-driven personalized status,
 * use the /api/ai-analytics endpoint with type='compliance-status'
 *
 * @param percentage - Current compliance percentage
 * @param context - Optional context for smarter status calculation
 */
export function getComplianceStatus(
  percentage: number,
  context?: {
    historicalAverage?: number;
    hasCriticalMedications?: boolean;
    recentTrend?: 'improving' | 'stable' | 'declining';
  }
): {
  label: string;
  variant: 'default' | 'destructive' | 'secondary';
  color: string;
  insight?: string;
} {
  // Use context-aware calculation if context provided
  if (context) {
    const { historicalAverage, hasCriticalMedications, recentTrend } = context;

    // Personalized thresholds based on context
    const baselineDeviation = historicalAverage
      ? percentage - historicalAverage
      : 0;

    // Critical medication patients need higher standards
    const excellentThreshold = hasCriticalMedications ? 95 : 90;
    const goodThreshold = hasCriticalMedications ? 85 : 75;
    const concernThreshold = hasCriticalMedications ? 70 : 50;

    // Declining trend shifts thresholds up (more conservative)
    const trendAdjustment = recentTrend === 'declining' ? 5 : recentTrend === 'improving' ? -5 : 0;

    if (percentage >= excellentThreshold - trendAdjustment) {
      return {
        label: 'Excellent',
        variant: 'default',
        color: 'green',
        insight: baselineDeviation > 5 ? 'Above historical average' : undefined,
      };
    } else if (percentage >= goodThreshold - trendAdjustment) {
      return {
        label: 'Good',
        variant: 'default',
        color: 'blue',
        insight: recentTrend === 'improving' ? 'Trending upward' : undefined,
      };
    } else if (percentage >= concernThreshold - trendAdjustment) {
      return {
        label: 'Needs Attention',
        variant: 'secondary',
        color: 'yellow',
        insight: baselineDeviation < -10 ? 'Below historical average' : 'Monitor closely',
      };
    } else {
      return {
        label: 'Critical',
        variant: 'destructive',
        color: 'red',
        insight: hasCriticalMedications ? 'Critical medications at risk' : 'Immediate attention needed',
      };
    }
  }

  // Fallback to simple thresholds when no context
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
