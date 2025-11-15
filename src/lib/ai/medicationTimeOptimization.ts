/**
 * Medication Time Optimization
 * Analyzes missed dose patterns to suggest better medication times
 */

import { GroupService } from '@/lib/firebase/groups';
import { MedicationService } from '@/lib/firebase/medications';
import { MedicationLog } from '@/types';

export interface TimeSlotAnalysis {
  hour: number;
  missRate: number;
  total: number;
  missed: number;
  takenCount: number;
}

export interface TimeSuggestion {
  time: string;
  missRate: string;
  reason: string; // Observation note, not a recommendation
  complianceRate: number;
}

export interface ProblematicTime {
  time: string;
  missRate: string;
  missed: number;
  total: number;
}

export interface MedicationTimeOptimization {
  optimizationNeeded: boolean;
  message?: string;
  problematicTimes?: ProblematicTime[];
  suggestions?: TimeSuggestion[];
  recommendation?: string;
  analysisData?: {
    totalDoses: number;
    analysisPeriod: string;
    currentCompliance: string;
    potentialImprovement?: string;
  };
}

/**
 * Analyze medication logs and suggest optimal times
 */
export async function optimizeMedicationTimes(
  medicationId: string,
  groupId: string
): Promise<MedicationTimeOptimization | null> {
  try {
    // 1. Check feature flags
    const group = await GroupService.getGroup(groupId);
    const aiSettings = group?.settings?.aiFeatures;

    if (!aiSettings?.enabled || !aiSettings?.consent?.granted) {
      return null; // AI disabled
    }

    if (!aiSettings?.features?.medicationTimeOptimization?.enabled) {
      return null; // This feature disabled
    }

    // 2. Get 30 days of logs for this medication
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allLogs = await MedicationService.getLogsByDateRange(
      groupId,
      thirtyDaysAgo,
      new Date()
    );

    // Filter for this specific medication
    const logs = allLogs.filter(log => log.medicationId === medicationId);

    if (logs.length === 0) {
      return {
        optimizationNeeded: false,
        message: 'No medication logs found in the last 30 days. Start logging doses to get optimization suggestions.'
      };
    }

    // 3. Group by hour of day
    const missRateByHour: Record<number, { total: number; missed: number; taken: number }> = {};

    logs.forEach(log => {
      const scheduledTime = log.scheduledTime instanceof Date
        ? log.scheduledTime
        : new Date(log.scheduledTime);

      const hour = scheduledTime.getHours();

      if (!missRateByHour[hour]) {
        missRateByHour[hour] = { total: 0, missed: 0, taken: 0 };
      }

      missRateByHour[hour].total++;

      if (log.status === 'missed') {
        missRateByHour[hour].missed++;
      } else if (log.status === 'taken') {
        missRateByHour[hour].taken++;
      }
    });

    // 4. Calculate miss rates and compliance
    const hourAnalysis: TimeSlotAnalysis[] = Object.entries(missRateByHour).map(([hour, stats]) => ({
      hour: parseInt(hour),
      missRate: stats.missed / stats.total,
      total: stats.total,
      missed: stats.missed,
      takenCount: stats.taken
    }));

    // Calculate overall compliance
    const totalDoses = logs.length;
    const totalTaken = logs.filter(l => l.status === 'taken').length;
    const overallCompliance = (totalTaken / totalDoses) * 100;

    // 5. Find problematic times (>30% miss rate with at least 5 doses)
    const problematicTimes = hourAnalysis
      .filter(h => h.missRate > 0.3 && h.total >= 5)
      .sort((a, b) => b.missRate - a.missRate);

    if (problematicTimes.length === 0) {
      return {
        optimizationNeeded: false,
        message: 'Medication times are working well - no optimization needed',
        analysisData: {
          totalDoses,
          analysisPeriod: '30 days',
          currentCompliance: `${overallCompliance.toFixed(1)}%`
        }
      };
    }

    // 6. Find best times (lowest miss rate with at least 5 doses)
    const bestTimes = hourAnalysis
      .filter(h => h.total >= 5 && h.missRate < 0.3)
      .sort((a, b) => a.missRate - b.missRate)
      .slice(0, 3);

    // If no good alternatives exist, show times with best compliance
    const suggestions: TimeSuggestion[] = bestTimes.length > 0
      ? bestTimes.map(t => ({
          time: formatHour(t.hour),
          missRate: `${(t.missRate * 100).toFixed(0)}%`,
          reason: t.missRate < 0.1
            ? 'Historical data shows excellent compliance at this time'
            : t.missRate < 0.2
            ? 'Historical data shows very good compliance at this time'
            : 'Historical data shows good compliance at this time',
          complianceRate: ((1 - t.missRate) * 100)
        }))
      : hourAnalysis
          .filter(h => h.total >= 3)
          .sort((a, b) => a.missRate - b.missRate)
          .slice(0, 3)
          .map(t => ({
            time: formatHour(t.hour),
            missRate: `${(t.missRate * 100).toFixed(0)}%`,
            reason: 'Data shows better compliance pattern than problematic times',
            complianceRate: ((1 - t.missRate) * 100)
          }));

    // 7. Calculate potential improvement
    const worstMissRate = problematicTimes[0].missRate;
    const bestAlternativeMissRate = suggestions[0] ? parseFloat(suggestions[0].missRate) / 100 : worstMissRate;
    const potentialImprovement = ((worstMissRate - bestAlternativeMissRate) * 100).toFixed(0);

    // 8. Generate recommendation
    const recommendation = generateRecommendation(
      problematicTimes,
      suggestions,
      potentialImprovement
    );

    return {
      optimizationNeeded: true,
      problematicTimes: problematicTimes.map(t => ({
        time: formatHour(t.hour),
        missRate: `${(t.missRate * 100).toFixed(0)}%`,
        missed: t.missed,
        total: t.total
      })),
      suggestions,
      recommendation,
      analysisData: {
        totalDoses,
        analysisPeriod: '30 days',
        currentCompliance: `${overallCompliance.toFixed(1)}%`,
        potentialImprovement: `+${potentialImprovement}%`
      }
    };

  } catch (error) {
    console.error('Error optimizing medication times:', error);
    return null;
  }
}

/**
 * Format hour as readable time string
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

/**
 * Generate data observation note (NOT medical recommendations)
 */
function generateRecommendation(
  problematicTimes: TimeSlotAnalysis[],
  suggestions: TimeSuggestion[],
  potentialImprovement: string
): string {
  if (suggestions.length === 0) {
    return 'Insufficient data to identify time-based patterns. Continue logging doses to build more insights.';
  }

  const worstTime = formatHour(problematicTimes[0].hour);
  const worstMissRate = (problematicTimes[0].missRate * 100).toFixed(0);
  const bestTime = suggestions[0].time;
  const bestMissRate = suggestions[0].missRate;

  // Multiple problematic times
  if (problematicTimes.length > 1) {
    return `Data shows ${problematicTimes.length} time slots with higher miss rates. ${worstTime} shows ${worstMissRate}% miss rate, while ${bestTime} shows ${bestMissRate} miss rate. This pattern may be worth discussing with a healthcare provider.`;
  }

  // Single problematic time
  if (parseFloat(potentialImprovement) >= 20) {
    return `Data analysis: ${worstTime} shows ${worstMissRate}% miss rate, while ${bestTime} shows ${bestMissRate} miss rate with up to ${potentialImprovement}% difference in compliance. Discuss timing patterns with healthcare provider if adjustments are needed.`;
  }

  return `Data shows ${worstTime} has ${worstMissRate}% miss rate compared to ${bestTime} with ${bestMissRate} miss rate. Healthcare provider can assess if timing adjustments are appropriate.`;
}

/**
 * Analyze all medications for an elder and return optimization opportunities
 */
export async function analyzeAllMedicationTimes(
  elderId: string,
  groupId: string
): Promise<Array<{
  medicationId: string;
  medicationName: string;
  optimization: MedicationTimeOptimization;
}> | null> {
  try {
    // 1. Check feature flags
    const group = await GroupService.getGroup(groupId);
    const aiSettings = group?.settings?.aiFeatures;

    if (!aiSettings?.enabled || !aiSettings?.consent?.granted) {
      return null;
    }

    if (!aiSettings?.features?.medicationTimeOptimization?.enabled) {
      return null;
    }

    // 2. Get all active medications for this elder
    const allMedications = await MedicationService.getMedicationsByGroup(groupId);
    const now = new Date();
    const elderMedications = allMedications.filter(
      med => med.elderId === elderId && (!med.endDate || new Date(med.endDate) > now)
    );

    // 3. Analyze each medication
    const results = [];

    for (const medication of elderMedications) {
      const optimization = await optimizeMedicationTimes(medication.id!, groupId);

      if (optimization && optimization.optimizationNeeded) {
        results.push({
          medicationId: medication.id!,
          medicationName: medication.name,
          optimization
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error analyzing all medication times:', error);
    return null;
  }
}
