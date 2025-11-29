/**
 * Weekly Health Summary Service
 *
 * Generates comprehensive weekly health summaries for elders.
 * Analyzes medication compliance, diet patterns, health changes,
 * and provides actionable insights for caregivers.
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { GroupService } from '@/lib/firebase/groups';
import { MedicationService } from '@/lib/firebase/medications';
import { DietService } from '@/lib/firebase/diet';
import type {
  MedicationLog,
  Medication,
  DietEntry,
  Elder
} from '@/types';

export interface WeeklySummaryData {
  id?: string;
  groupId: string;
  elderId: string;
  elderName: string;
  weekStart: Date;
  weekEnd: Date;
  generatedAt: Date;
  generatedBy: string;

  // Medication Summary
  medicationSummary: {
    overallCompliance: number;
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    byMedication: Array<{
      name: string;
      compliance: number;
      taken: number;
      missed: number;
      total: number;
    }>;
    complianceTrend: 'improving' | 'stable' | 'declining';
    missedDosePatterns?: string[];
  };

  // Diet Summary
  dietSummary: {
    totalMeals: number;
    averageMealsPerDay: number;
    mealsByType: {
      breakfast: number;
      lunch: number;
      dinner: number;
      snack: number;
    };
    nutritionConcerns: string[];
    hydrationNotes?: string;
  };

  // Health Observations
  healthObservations: {
    changes: Array<{
      type: 'positive' | 'negative' | 'neutral';
      category: 'medication' | 'diet' | 'activity' | 'mood';
      description: string;
    }>;
    symptomsReported: string[];
    notesHighlights: string[];
  };

  // Recommendations (data-based observations, not medical advice)
  insights: {
    priority: 'low' | 'medium' | 'high';
    items: string[];
  };

  // Week comparison
  comparison?: {
    complianceChange: number;
    mealsChange: number;
    trend: string;
  };
}

/**
 * Generate weekly summary for an elder
 */
export async function generateWeeklySummary(
  groupId: string,
  elderId: string,
  elderName: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member',
  weekOffset: number = 0 // 0 = current week, -1 = last week, etc.
): Promise<WeeklySummaryData | null> {
  try {
    // 1. Check feature flags
    const group = await GroupService.getGroup(groupId);
    const aiSettings = group?.settings?.aiFeatures;

    if (!aiSettings?.enabled || !aiSettings?.consent?.granted) {
      return null; // AI disabled
    }

    if (!aiSettings?.features?.weeklySummary?.enabled) {
      return null; // This feature disabled
    }

    // 2. Calculate week date range
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday

    // Find the start of the current week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDayOfWeek + (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);

    // End of week (Saturday night)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // For current week, end at now
    const effectiveEnd = weekOffset === 0 ? now : weekEnd;

    // 3. Fetch medication data
    const [medications, medicationLogs] = await Promise.all([
      MedicationService.getMedicationsByGroup(groupId, userId, userRole),
      MedicationService.getLogsByDateRange(groupId, weekStart, effectiveEnd, userId, userRole)
    ]);

    // Filter for this elder
    const elderMedications = medications.filter(m => m.elderId === elderId);
    const elderMedLogs = medicationLogs.filter(l => l.elderId === elderId);

    // 4. Fetch diet data
    const dietEntries = await DietService.getEntriesByDateRange(
      groupId,
      weekStart,
      effectiveEnd,
      userId,
      userRole
    );
    const elderDietEntries = dietEntries.filter(d => d.elderId === elderId);

    // 5. Calculate medication summary
    const medicationSummary = calculateMedicationSummary(elderMedications, elderMedLogs);

    // 6. Calculate diet summary
    const dietSummary = calculateDietSummary(elderDietEntries, weekStart, effectiveEnd);

    // 7. Extract health observations
    const healthObservations = extractHealthObservations(elderMedLogs, elderDietEntries);

    // 8. Generate insights
    const insights = generateInsights(medicationSummary, dietSummary, healthObservations);

    // 9. Get previous week for comparison
    const comparison = await calculateWeekComparison(
      groupId,
      elderId,
      userId,
      userRole,
      weekStart
    );

    // 10. Build summary
    const summary: WeeklySummaryData = {
      groupId,
      elderId,
      elderName,
      weekStart,
      weekEnd: effectiveEnd,
      generatedAt: new Date(),
      generatedBy: userId,
      medicationSummary,
      dietSummary,
      healthObservations,
      insights,
      comparison
    };

    // 11. Save to Firestore
    const docRef = await addDoc(collection(db, 'weeklySummaries'), {
      ...summary,
      weekStart: Timestamp.fromDate(weekStart),
      weekEnd: Timestamp.fromDate(effectiveEnd),
      generatedAt: Timestamp.fromDate(summary.generatedAt)
    });

    return { ...summary, id: docRef.id };

  } catch (error) {
    console.error('Error generating weekly summary:', error);
    return null;
  }
}

/**
 * Calculate medication compliance summary
 */
function calculateMedicationSummary(
  medications: Medication[],
  logs: MedicationLog[]
): WeeklySummaryData['medicationSummary'] {
  const totalDoses = logs.length;
  const takenDoses = logs.filter(l => l.status === 'taken').length;
  const missedDoses = logs.filter(l => l.status === 'missed').length;
  const overallCompliance = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

  // By medication breakdown
  const byMedication = medications.map(med => {
    const medLogs = logs.filter(l => l.medicationId === med.id);
    const taken = medLogs.filter(l => l.status === 'taken').length;
    const missed = medLogs.filter(l => l.status === 'missed').length;
    const total = medLogs.length;
    const compliance = total > 0 ? Math.round((taken / total) * 100) : 100;

    return {
      name: med.name,
      compliance,
      taken,
      missed,
      total
    };
  }).filter(m => m.total > 0); // Only include medications with logs

  // Analyze missed dose patterns
  const missedDosePatterns = analyzeMissedDosePatterns(logs);

  // Determine trend (would need historical data for accurate trend)
  const complianceTrend: 'improving' | 'stable' | 'declining' =
    overallCompliance >= 90 ? 'stable' :
    overallCompliance >= 70 ? 'stable' : 'declining';

  return {
    overallCompliance,
    totalDoses,
    takenDoses,
    missedDoses,
    byMedication,
    complianceTrend,
    missedDosePatterns
  };
}

/**
 * Analyze patterns in missed doses
 */
function analyzeMissedDosePatterns(logs: MedicationLog[]): string[] {
  const patterns: string[] = [];
  const missedLogs = logs.filter(l => l.status === 'missed');

  if (missedLogs.length === 0) return patterns;

  // Group by hour
  const missedByHour: Record<number, number> = {};
  missedLogs.forEach(log => {
    const hour = new Date(log.scheduledTime).getHours();
    missedByHour[hour] = (missedByHour[hour] || 0) + 1;
  });

  // Find problematic times
  const totalMissed = missedLogs.length;
  Object.entries(missedByHour).forEach(([hour, count]) => {
    const percentage = (count / totalMissed) * 100;
    if (percentage >= 30) {
      const hourNum = parseInt(hour);
      const timeStr = hourNum < 12 ? `${hourNum || 12}:00 AM` :
                      hourNum === 12 ? '12:00 PM' : `${hourNum - 12}:00 PM`;
      patterns.push(`${Math.round(percentage)}% of missed doses occur around ${timeStr}`);
    }
  });

  // Group by day of week
  const missedByDay: Record<number, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  missedLogs.forEach(log => {
    const day = new Date(log.scheduledTime).getDay();
    missedByDay[day] = (missedByDay[day] || 0) + 1;
  });

  Object.entries(missedByDay).forEach(([day, count]) => {
    const percentage = (count / totalMissed) * 100;
    if (percentage >= 25) {
      patterns.push(`Higher miss rate on ${dayNames[parseInt(day)]}s (${Math.round(percentage)}%)`);
    }
  });

  return patterns;
}

/**
 * Calculate diet summary
 */
function calculateDietSummary(
  entries: DietEntry[],
  weekStart: Date,
  weekEnd: Date
): WeeklySummaryData['dietSummary'] {
  const totalMeals = entries.length;

  // Calculate days in range
  const daysInRange = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const averageMealsPerDay = totalMeals > 0 ? Math.round((totalMeals / daysInRange) * 10) / 10 : 0;

  // Count by meal type
  const mealsByType = {
    breakfast: entries.filter(e => e.meal === 'breakfast').length,
    lunch: entries.filter(e => e.meal === 'lunch').length,
    dinner: entries.filter(e => e.meal === 'dinner').length,
    snack: entries.filter(e => e.meal === 'snack').length
  };

  // Extract nutrition concerns from AI analysis
  const nutritionConcerns: string[] = [];
  const seenConcerns = new Set<string>();

  entries.forEach(entry => {
    if (entry.aiAnalysis?.concerns) {
      entry.aiAnalysis.concerns.forEach(concern => {
        if (!seenConcerns.has(concern)) {
          seenConcerns.add(concern);
          nutritionConcerns.push(concern);
        }
      });
    }
  });

  // Check for meal pattern issues
  if (mealsByType.breakfast < daysInRange * 0.5) {
    nutritionConcerns.push('Breakfast logged less than 50% of days');
  }
  if (averageMealsPerDay < 2) {
    nutritionConcerns.push('Low meal logging frequency - may indicate reduced appetite or incomplete logging');
  }

  return {
    totalMeals,
    averageMealsPerDay,
    mealsByType,
    nutritionConcerns
  };
}

/**
 * Extract health observations from logs
 */
function extractHealthObservations(
  medLogs: MedicationLog[],
  dietEntries: DietEntry[]
): WeeklySummaryData['healthObservations'] {
  const changes: WeeklySummaryData['healthObservations']['changes'] = [];
  const symptomsReported: string[] = [];
  const notesHighlights: string[] = [];

  // Symptom keywords to look for
  const symptomKeywords = [
    'pain', 'headache', 'nausea', 'dizzy', 'tired', 'fatigue',
    'fever', 'cough', 'cold', 'weak', 'confused', 'anxious',
    'couldn\'t sleep', 'no appetite', 'vomit', 'diarrhea'
  ];

  // Check medication log notes
  medLogs.forEach(log => {
    if (log.notes && log.notes.trim()) {
      const notesLower = log.notes.toLowerCase();

      // Check for symptoms
      symptomKeywords.forEach(symptom => {
        if (notesLower.includes(symptom) && !symptomsReported.includes(symptom)) {
          symptomsReported.push(symptom);
        }
      });

      // Add significant notes
      if (log.notes.length > 10) {
        const date = new Date(log.scheduledTime).toLocaleDateString();
        notesHighlights.push(`${date}: ${log.notes}`);
      }
    }
  });

  // Check diet entry notes
  dietEntries.forEach(entry => {
    if (entry.notes && entry.notes.trim()) {
      const notesLower = entry.notes.toLowerCase();

      symptomKeywords.forEach(symptom => {
        if (notesLower.includes(symptom) && !symptomsReported.includes(symptom)) {
          symptomsReported.push(symptom);
        }
      });

      if (entry.notes.length > 10) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        notesHighlights.push(`${date} (meal): ${entry.notes}`);
      }
    }
  });

  // Limit highlights to most recent 5
  const limitedHighlights = notesHighlights.slice(-5);

  // Generate change observations
  const takenCount = medLogs.filter(l => l.status === 'taken').length;
  const totalCount = medLogs.length;

  if (totalCount > 0) {
    const compliance = (takenCount / totalCount) * 100;
    if (compliance >= 95) {
      changes.push({
        type: 'positive',
        category: 'medication',
        description: 'Excellent medication compliance this week'
      });
    } else if (compliance < 70) {
      changes.push({
        type: 'negative',
        category: 'medication',
        description: 'Medication compliance below 70% - may need attention'
      });
    }
  }

  if (symptomsReported.length > 0) {
    changes.push({
      type: 'neutral',
      category: 'mood',
      description: `Symptoms mentioned in notes: ${symptomsReported.join(', ')}`
    });
  }

  return {
    changes,
    symptomsReported,
    notesHighlights: limitedHighlights
  };
}

/**
 * Generate actionable insights (data observations, not medical advice)
 */
function generateInsights(
  medicationSummary: WeeklySummaryData['medicationSummary'],
  dietSummary: WeeklySummaryData['dietSummary'],
  healthObservations: WeeklySummaryData['healthObservations']
): WeeklySummaryData['insights'] {
  const items: string[] = [];
  let priority: 'low' | 'medium' | 'high' = 'low';

  // Medication insights
  if (medicationSummary.overallCompliance < 70) {
    items.push(`Medication compliance is ${medicationSummary.overallCompliance}%. Consider reviewing medication schedule.`);
    priority = 'high';
  } else if (medicationSummary.overallCompliance < 85) {
    items.push(`Medication compliance at ${medicationSummary.overallCompliance}%. Minor improvement possible.`);
    if (priority === 'low') priority = 'medium';
  }

  // Add missed dose pattern insights
  if (medicationSummary.missedDosePatterns && medicationSummary.missedDosePatterns.length > 0) {
    items.push(...medicationSummary.missedDosePatterns);
  }

  // Low compliance medications
  const lowComplianceMeds = medicationSummary.byMedication.filter(m => m.compliance < 70 && m.total >= 3);
  lowComplianceMeds.forEach(med => {
    items.push(`${med.name} has ${med.compliance}% compliance (${med.missed} missed of ${med.total} doses)`);
  });

  // Diet insights
  if (dietSummary.averageMealsPerDay < 2) {
    items.push('Low meal frequency recorded. Verify if all meals are being logged.');
    if (priority === 'low') priority = 'medium';
  }

  if (dietSummary.nutritionConcerns.length > 0) {
    items.push(`Nutrition notes: ${dietSummary.nutritionConcerns.slice(0, 2).join('; ')}`);
  }

  // Symptom insights
  if (healthObservations.symptomsReported.length >= 3) {
    items.push(`Multiple symptoms noted this week. Consider discussing with healthcare provider.`);
    priority = 'high';
  }

  // If no issues
  if (items.length === 0) {
    items.push('Health tracking looks good this week. Keep up the great work!');
  }

  return { priority, items };
}

/**
 * Compare with previous week
 */
async function calculateWeekComparison(
  groupId: string,
  elderId: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member',
  currentWeekStart: Date
): Promise<WeeklySummaryData['comparison'] | undefined> {
  try {
    // Previous week dates
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currentWeekStart);
    prevWeekEnd.setTime(prevWeekEnd.getTime() - 1);

    // Fetch previous week data
    const [prevMedLogs, prevDietEntries] = await Promise.all([
      MedicationService.getLogsByDateRange(groupId, prevWeekStart, prevWeekEnd, userId, userRole),
      DietService.getEntriesByDateRange(groupId, prevWeekStart, prevWeekEnd, userId, userRole)
    ]);

    const prevElderMedLogs = prevMedLogs.filter(l => l.elderId === elderId);
    const prevElderDietEntries = prevDietEntries.filter(d => d.elderId === elderId);

    // Calculate previous week metrics
    const prevTotalDoses = prevElderMedLogs.length;
    const prevTakenDoses = prevElderMedLogs.filter(l => l.status === 'taken').length;
    const prevCompliance = prevTotalDoses > 0 ? (prevTakenDoses / prevTotalDoses) * 100 : 100;
    const prevMeals = prevElderDietEntries.length;

    // Current week (will be calculated in caller, but we need to fetch again for comparison)
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    const now = new Date();
    const effectiveEnd = now < currentWeekEnd ? now : currentWeekEnd;

    const [currMedLogs, currDietEntries] = await Promise.all([
      MedicationService.getLogsByDateRange(groupId, currentWeekStart, effectiveEnd, userId, userRole),
      DietService.getEntriesByDateRange(groupId, currentWeekStart, effectiveEnd, userId, userRole)
    ]);

    const currElderMedLogs = currMedLogs.filter(l => l.elderId === elderId);
    const currElderDietEntries = currDietEntries.filter(d => d.elderId === elderId);

    const currTotalDoses = currElderMedLogs.length;
    const currTakenDoses = currElderMedLogs.filter(l => l.status === 'taken').length;
    const currCompliance = currTotalDoses > 0 ? (currTakenDoses / currTotalDoses) * 100 : 100;
    const currMeals = currElderDietEntries.length;

    // Calculate changes
    const complianceChange = Math.round(currCompliance - prevCompliance);
    const mealsChange = currMeals - prevMeals;

    // Generate trend description
    let trend = '';
    if (complianceChange > 5) {
      trend = `Medication compliance improved by ${complianceChange}%`;
    } else if (complianceChange < -5) {
      trend = `Medication compliance decreased by ${Math.abs(complianceChange)}%`;
    } else {
      trend = 'Medication compliance stable compared to last week';
    }

    if (mealsChange > 3) {
      trend += `. Meal logging increased.`;
    } else if (mealsChange < -3) {
      trend += `. Meal logging decreased.`;
    }

    return {
      complianceChange,
      mealsChange,
      trend
    };

  } catch (error) {
    console.error('Error calculating week comparison:', error);
    return undefined;
  }
}

/**
 * Get past weekly summaries for an elder
 */
export async function getWeeklySummaries(
  groupId: string,
  elderId: string,
  limitCount: number = 4
): Promise<WeeklySummaryData[]> {
  try {
    const q = query(
      collection(db, 'weeklySummaries'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      orderBy('weekStart', 'desc'),
      // Note: limit import would be needed, using limitCount in filter for now
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.slice(0, limitCount).map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        weekStart: data.weekStart?.toDate() || new Date(),
        weekEnd: data.weekEnd?.toDate() || new Date(),
        generatedAt: data.generatedAt?.toDate() || new Date()
      } as WeeklySummaryData;
    });

  } catch (error) {
    console.error('Error fetching weekly summaries:', error);
    return [];
  }
}
