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

  // Detect significant changes using adaptive thresholds
  // NOTE: For full AI-driven analysis, use /api/ai-analytics with type='trends'
  const significantChanges: TrendsData['significantChanges'] = [];

  // Calculate baseline variance for adaptive thresholds
  const complianceRates = weeks.filter(w => w.totalDoses > 0).map(w => w.complianceRate);
  const avgCompliance = complianceRates.length > 0
    ? complianceRates.reduce((sum, r) => sum + r, 0) / complianceRates.length
    : 0;
  const complianceStdDev = complianceRates.length > 1
    ? Math.sqrt(complianceRates.reduce((sum, r) => sum + Math.pow(r - avgCompliance, 2), 0) / complianceRates.length)
    : 10;

  // Adaptive threshold: 1.5 standard deviations, minimum 10%, maximum 25%
  const adaptiveComplianceThreshold = Math.min(25, Math.max(10, complianceStdDev * 1.5));

  // For diet entries, calculate relative threshold based on average
  const dietCounts = weeks.map(w => w.dietEntries);
  const avgDiet = dietCounts.reduce((sum, d) => sum + d, 0) / dietCounts.length;
  const adaptiveDietThreshold = avgDiet > 10 ? 20 : avgDiet > 5 ? 30 : 50; // More lenient for low-volume

  // For missed doses, threshold based on average total doses
  const avgTotalDoses = weeks.reduce((sum, w) => sum + w.totalDoses, 0) / weeks.length;
  const adaptiveMissedThreshold = Math.max(2, Math.round(avgTotalDoses * 0.1)); // 10% of average total doses

  for (let i = 1; i < weeks.length; i++) {
    const prevWeek = weeks[i - 1];
    const currWeek = weeks[i];

    // Check compliance change with adaptive threshold
    if (prevWeek.totalDoses > 0 && currWeek.totalDoses > 0) {
      const complianceChange = Math.abs(currWeek.complianceRate - prevWeek.complianceRate);
      if (complianceChange >= adaptiveComplianceThreshold) {
        significantChanges.push({
          weekLabel: currWeek.weekLabel,
          type: 'compliance',
          change: complianceChange,
          direction: currWeek.complianceRate > prevWeek.complianceRate ? 'up' : 'down'
        });
      }
    }

    // Check diet change with adaptive threshold
    if (prevWeek.dietEntries > 0) {
      const dietChangePercent = Math.abs(
        ((currWeek.dietEntries - prevWeek.dietEntries) / prevWeek.dietEntries) * 100
      );
      if (dietChangePercent >= adaptiveDietThreshold) {
        significantChanges.push({
          weekLabel: currWeek.weekLabel,
          type: 'diet',
          change: dietChangePercent,
          direction: currWeek.dietEntries > prevWeek.dietEntries ? 'up' : 'down'
        });
      }
    }

    // Check missed doses increase with adaptive threshold
    if (currWeek.missedDoses > prevWeek.missedDoses + adaptiveMissedThreshold) {
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
