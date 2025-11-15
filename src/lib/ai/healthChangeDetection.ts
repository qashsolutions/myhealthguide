/**
 * Health Change Detection
 * Analyzes week-over-week changes in health data to detect significant declines or improvements
 */

import { GroupService } from '@/lib/firebase/groups';
import { MedicationService } from '@/lib/firebase/medications';
import { DietService } from '@/lib/firebase/diet';
import { MedicationLog, DietEntry } from '@/types';

export interface HealthChange {
  type: 'medication_compliance' | 'diet_intake' | 'missed_doses';
  percentChange: number;
  direction: 'improved' | 'declined' | 'increased' | 'decreased';
  thisWeek: number;
  lastWeek: number;
  description: string;
}

export interface HealthChangeAlert {
  detected: boolean;
  changes?: HealthChange[];
  severity?: 'info' | 'warning' | 'critical';
  recommendation?: string;
  message?: string;
  summary?: string;
}

/**
 * Detect significant health changes for an elder
 */
export async function detectHealthChanges(
  elderId: string,
  groupId: string
): Promise<HealthChangeAlert | null> {
  try {
    // 1. Check feature flags
    const group = await GroupService.getGroup(groupId);
    const aiSettings = group?.settings?.aiFeatures;

    if (!aiSettings?.enabled || !aiSettings?.consent?.granted) {
      return null; // AI disabled
    }

    if (!aiSettings?.features?.healthChangeDetection?.enabled) {
      return null; // This feature disabled
    }

    // 2. Get sensitivity threshold
    const sensitivity = aiSettings.features.healthChangeDetection.sensitivity || 'medium';
    const threshold = sensitivity === 'high' ? 0.15 : sensitivity === 'low' ? 0.35 : 0.25;

    // 3. Calculate date ranges
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);
    lastWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(thisWeekStart);

    // 4. Fetch data for both weeks
    const [thisWeekMeds, lastWeekMeds, thisWeekDiet, lastWeekDiet] = await Promise.all([
      MedicationService.getLogsByDateRange(groupId, thisWeekStart, now),
      MedicationService.getLogsByDateRange(groupId, lastWeekStart, lastWeekEnd),
      DietService.getEntriesByDateRange(groupId, thisWeekStart, now),
      DietService.getEntriesByDateRange(groupId, lastWeekStart, lastWeekEnd)
    ]);

    // 5. Filter by elder
    const thisWeekMedsForElder = thisWeekMeds.filter(m => m.elderId === elderId);
    const lastWeekMedsForElder = lastWeekMeds.filter(m => m.elderId === elderId);
    const thisWeekDietForElder = thisWeekDiet.filter(d => d.elderId === elderId);
    const lastWeekDietForElder = lastWeekDiet.filter(d => d.elderId === elderId);

    // 6. Calculate metrics
    const thisWeekCompliance = calculateCompliance(thisWeekMedsForElder);
    const lastWeekCompliance = calculateCompliance(lastWeekMedsForElder);

    const thisWeekMissed = countMissedDoses(thisWeekMedsForElder);
    const lastWeekMissed = countMissedDoses(lastWeekMedsForElder);

    const thisWeekMeals = thisWeekDietForElder.length;
    const lastWeekMeals = lastWeekDietForElder.length;

    // 7. Calculate percentage changes (avoid division by zero)
    const complianceChange = lastWeekCompliance > 0
      ? Math.abs((thisWeekCompliance - lastWeekCompliance) / lastWeekCompliance)
      : 0;

    const dietChange = lastWeekMeals > 0
      ? Math.abs((thisWeekMeals - lastWeekMeals) / lastWeekMeals)
      : 0;

    const missedDosesChange = lastWeekMissed > 0
      ? Math.abs((thisWeekMissed - lastWeekMissed) / lastWeekMissed)
      : 0;

    // 8. Detect significant changes
    const changes: HealthChange[] = [];

    if (complianceChange > threshold && lastWeekCompliance > 0) {
      changes.push({
        type: 'medication_compliance',
        percentChange: complianceChange,
        direction: thisWeekCompliance > lastWeekCompliance ? 'improved' : 'declined',
        thisWeek: thisWeekCompliance,
        lastWeek: lastWeekCompliance,
        description: `Medication compliance ${thisWeekCompliance > lastWeekCompliance ? 'improved' : 'declined'} from ${lastWeekCompliance.toFixed(0)}% to ${thisWeekCompliance.toFixed(0)}%`
      });
    }

    if (dietChange > threshold && lastWeekMeals > 0) {
      changes.push({
        type: 'diet_intake',
        percentChange: dietChange,
        direction: thisWeekMeals > lastWeekMeals ? 'increased' : 'decreased',
        thisWeek: thisWeekMeals,
        lastWeek: lastWeekMeals,
        description: `Meal logging ${thisWeekMeals > lastWeekMeals ? 'increased' : 'decreased'} from ${lastWeekMeals} to ${thisWeekMeals} entries per week`
      });
    }

    if (missedDosesChange > threshold && thisWeekMissed > lastWeekMissed) {
      changes.push({
        type: 'missed_doses',
        percentChange: missedDosesChange,
        direction: 'increased',
        thisWeek: thisWeekMissed,
        lastWeek: lastWeekMissed,
        description: `Missed doses increased from ${lastWeekMissed} to ${thisWeekMissed} this week`
      });
    }

    // 9. Generate alert if changes detected
    if (changes.length > 0) {
      const severity = determineSeverity(changes);
      const recommendation = generateRecommendation(changes);
      const summary = generateSummary(changes);

      return {
        detected: true,
        changes,
        severity,
        recommendation,
        summary
      };
    }

    // 10. No significant changes
    return {
      detected: false,
      message: 'No significant health changes detected this week',
      summary: `Health patterns remain stable (using ${sensitivity} sensitivity: ${(threshold * 100).toFixed(0)}% change threshold)`
    };

  } catch (error) {
    console.error('Error detecting health changes:', error);
    return null;
  }
}

/**
 * Calculate medication compliance percentage
 */
function calculateCompliance(logs: MedicationLog[]): number {
  if (logs.length === 0) return 100;
  const taken = logs.filter(l => l.status === 'taken').length;
  return (taken / logs.length) * 100;
}

/**
 * Count missed doses
 */
function countMissedDoses(logs: MedicationLog[]): number {
  return logs.filter(l => l.status === 'missed').length;
}

/**
 * Determine severity based on changes
 */
function determineSeverity(changes: HealthChange[]): 'info' | 'warning' | 'critical' {
  // Critical if multiple declines or very large change
  const hasMultipleDeclines = changes.filter(c =>
    c.direction === 'declined' || c.direction === 'decreased'
  ).length >= 2;

  const hasLargeChange = changes.some(c => c.percentChange > 0.5);

  if (hasMultipleDeclines || hasLargeChange) {
    return 'critical';
  }

  // Warning if any decline
  const hasDecline = changes.some(c =>
    c.direction === 'declined' || c.direction === 'decreased'
  );

  if (hasDecline) {
    return 'warning';
  }

  return 'info';
}

/**
 * Generate observation note based on changes (NOT medical recommendations)
 */
function generateRecommendation(changes: HealthChange[]): string {
  const medChange = changes.find(c => c.type === 'medication_compliance');
  const dietChange = changes.find(c => c.type === 'diet_intake');
  const missedChange = changes.find(c => c.type === 'missed_doses');

  // Multiple declines - serious concern
  if (
    (medChange?.direction === 'declined') &&
    (dietChange?.direction === 'decreased')
  ) {
    return 'Data shows significant decline in both medication compliance and diet logging. This pattern may be worth discussing with a healthcare provider.';
  }

  // Medication compliance decline
  if (medChange?.direction === 'declined' || missedChange) {
    return 'Data shows medication compliance has declined. This pattern has been flagged for review.';
  }

  // Diet intake decrease
  if (dietChange?.direction === 'decreased') {
    const percentDecrease = (dietChange.percentChange * 100).toFixed(0);
    if (dietChange.percentChange > 0.3) {
      return `Data shows meal logging decreased by ${percentDecrease}%. This pattern may warrant discussion with a healthcare provider if it continues.`;
    }
    return `Data shows meal logging decreased by ${percentDecrease}%. Pattern has been flagged for monitoring.`;
  }

  // Improvements
  if (
    (medChange?.direction === 'improved') ||
    (dietChange?.direction === 'increased')
  ) {
    return 'Data shows positive changes in health tracking patterns.';
  }

  return 'Data shows changes in health tracking patterns. Continue monitoring trends.';
}

/**
 * Generate summary text
 */
function generateSummary(changes: HealthChange[]): string {
  if (changes.length === 1) {
    return changes[0].description;
  }

  const parts = changes.map(c => {
    if (c.type === 'medication_compliance') {
      return `medication compliance ${c.direction}`;
    } else if (c.type === 'diet_intake') {
      return `meal intake ${c.direction}`;
    } else {
      return `missed doses ${c.direction}`;
    }
  });

  return `Multiple changes: ${parts.join(', ')}`;
}
