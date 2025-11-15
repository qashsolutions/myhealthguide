/**
 * Trends Calculation Utility
 * Calculates weekly health trends for dashboard visualization
 */

import { startOfWeek, endOfWeek, subWeeks, format, eachWeekOfInterval } from 'date-fns';
import { MedicationLog, DietEntry } from '@/types';

export interface WeeklyData {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  complianceRate: number;
  missedDoses: number;
  totalDoses: number;
  dietEntries: number;
}

export interface TrendsData {
  weeks: WeeklyData[];
  overallCompliance: number;
  totalMissedDoses: number;
  averageDietEntriesPerWeek: number;
  significantChanges: Array<{
    weekLabel: string;
    type: 'compliance' | 'diet' | 'missed';
    change: number;
    direction: 'up' | 'down';
  }>;
}

/**
 * Calculate weekly trends for the specified number of weeks
 */
export function calculateWeeklyTrends(
  medicationLogs: MedicationLog[],
  dietEntries: DietEntry[],
  numberOfWeeks: number = 12
): TrendsData {
  const today = new Date();
  const weeks: WeeklyData[] = [];

  // Generate week intervals
  const weekIntervals = [];
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
    weekIntervals.push({ weekStart, weekEnd });
  }

  // Reverse so oldest week is first
  weekIntervals.reverse();

  // Calculate metrics for each week
  weekIntervals.forEach(({ weekStart, weekEnd }, index) => {
    // Filter logs for this week
    const weekMedLogs = medicationLogs.filter(log => {
      const logDate = log.scheduledTime instanceof Date
        ? log.scheduledTime
        : new Date(log.scheduledTime);
      return logDate >= weekStart && logDate <= weekEnd;
    });

    const weekDietEntries = dietEntries.filter(entry => {
      const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    // Calculate compliance
    const totalDoses = weekMedLogs.length;
    const takenDoses = weekMedLogs.filter(log => log.status === 'taken').length;
    const missedDoses = weekMedLogs.filter(log => log.status === 'missed').length;
    const complianceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    // Create week label
    const weekLabel = `Week ${index + 1}`;
    const shortDate = format(weekStart, 'MMM d');

    weeks.push({
      weekLabel: `${weekLabel}\n${shortDate}`,
      weekStart,
      weekEnd,
      complianceRate,
      missedDoses,
      totalDoses,
      dietEntries: weekDietEntries.length
    });
  });

  // Calculate overall metrics
  const totalDoses = medicationLogs.length;
  const takenDoses = medicationLogs.filter(log => log.status === 'taken').length;
  const overallCompliance = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;
  const totalMissedDoses = medicationLogs.filter(log => log.status === 'missed').length;
  const averageDietEntriesPerWeek = weeks.length > 0
    ? weeks.reduce((sum, week) => sum + week.dietEntries, 0) / weeks.length
    : 0;

  // Detect significant changes (>15% change from previous week)
  const significantChanges: TrendsData['significantChanges'] = [];
  const threshold = 15; // 15% change threshold

  for (let i = 1; i < weeks.length; i++) {
    const prevWeek = weeks[i - 1];
    const currWeek = weeks[i];

    // Check compliance change
    if (prevWeek.totalDoses > 0 && currWeek.totalDoses > 0) {
      const complianceChange = Math.abs(currWeek.complianceRate - prevWeek.complianceRate);
      if (complianceChange >= threshold) {
        significantChanges.push({
          weekLabel: currWeek.weekLabel,
          type: 'compliance',
          change: complianceChange,
          direction: currWeek.complianceRate > prevWeek.complianceRate ? 'up' : 'down'
        });
      }
    }

    // Check diet change
    if (prevWeek.dietEntries > 0) {
      const dietChangePercent = Math.abs(
        ((currWeek.dietEntries - prevWeek.dietEntries) / prevWeek.dietEntries) * 100
      );
      if (dietChangePercent >= threshold) {
        significantChanges.push({
          weekLabel: currWeek.weekLabel,
          type: 'diet',
          change: dietChangePercent,
          direction: currWeek.dietEntries > prevWeek.dietEntries ? 'up' : 'down'
        });
      }
    }

    // Check missed doses increase
    if (currWeek.missedDoses > prevWeek.missedDoses + 3) { // More than 3 additional missed doses
      significantChanges.push({
        weekLabel: currWeek.weekLabel,
        type: 'missed',
        change: currWeek.missedDoses - prevWeek.missedDoses,
        direction: 'up'
      });
    }
  }

  return {
    weeks,
    overallCompliance,
    totalMissedDoses,
    averageDietEntriesPerWeek,
    significantChanges
  };
}
