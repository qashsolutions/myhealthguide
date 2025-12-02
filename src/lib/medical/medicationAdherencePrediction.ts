/**
 * Medication Adherence Prediction System
 *
 * Predicts likelihood of medication non-adherence using:
 * - Historical medication log patterns
 * - Time-of-day trends
 * - Day-of-week patterns
 * - Medication complexity
 * - Recent adherence trends
 *
 * IMPORTANT: This is predictive analytics, NOT medical advice.
 * Used to proactively send reminders and support interventions.
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import type { MedicationLog, Medication } from '@/types';

export interface AdherenceRiskFactor {
  type: 'time_of_day' | 'day_of_week' | 'medication_complexity' | 'recent_trend' | 'frequency';
  description: string;
  severity: 'low' | 'moderate' | 'high';
  data: Record<string, any>;
  points: number;
}

export interface MedicationAdherencePrediction {
  id: string;
  groupId: string;
  elderId: string;
  medicationId: string;
  medicationName: string;
  predictionDate: Date;
  analysisPeriod: { start: Date; end: Date };

  // Adherence metrics
  currentAdherenceRate: number; // Percentage (0-100)
  trendDirection: 'improving' | 'stable' | 'declining';

  // Risk assessment
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  riskFactors: AdherenceRiskFactor[];

  // Predictions
  predictedMissedDoses: number; // Next 7 days
  highRiskTimes: string[]; // Times most likely to be missed (e.g., "08:00", "20:00")
  highRiskDays: string[]; // Days most likely to be missed (e.g., "Saturday", "Sunday")

  // Interventions
  recommendedInterventions: string[];

  // Metadata
  generatedAt: Date;
  status: 'active' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: Date;
}

/**
 * Predict adherence risk for a specific medication
 */
export async function predictMedicationAdherence(
  groupId: string,
  elderId: string,
  medicationId: string,
  medicationName: string,
  analysisDays: number = 30
): Promise<MedicationAdherencePrediction | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisDays);

    // Get medication logs for analysis period
    const logsQuery = query(
      collection(db, 'medication_logs'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('medicationId', '==', medicationId),
      where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
      where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('scheduledTime', 'desc')
    );

    const logsSnap = await getDocs(logsQuery);
    const logs = logsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime?.toDate(),
      takenAt: doc.data().takenAt?.toDate()
    } as unknown)) as MedicationLog[];

    if (logs.length < 7) {
      // Not enough data for prediction
      return null;
    }

    // Calculate adherence rate
    const adherenceRate = calculateAdherenceRate(logs);

    // Analyze patterns
    const riskFactors: AdherenceRiskFactor[] = [];
    let totalRiskScore = 0;

    // FACTOR 1: Time-of-day patterns
    const timeRiskFactor = analyzeTimeOfDayPatterns(logs);
    if (timeRiskFactor) {
      riskFactors.push(timeRiskFactor);
      totalRiskScore += timeRiskFactor.points;
    }

    // FACTOR 2: Day-of-week patterns
    const dayRiskFactor = analyzeDayOfWeekPatterns(logs);
    if (dayRiskFactor) {
      riskFactors.push(dayRiskFactor);
      totalRiskScore += dayRiskFactor.points;
    }

    // FACTOR 3: Recent trend
    const trendFactor = analyzeRecentTrend(logs);
    if (trendFactor) {
      riskFactors.push(trendFactor);
      totalRiskScore += trendFactor.points;
    }

    // FACTOR 4: Frequency complexity
    const frequencyFactor = analyzeFrequencyComplexity(logs);
    if (frequencyFactor) {
      riskFactors.push(frequencyFactor);
      totalRiskScore += frequencyFactor.points;
    }

    // Determine risk level
    const riskLevel = getRiskLevel(totalRiskScore, adherenceRate);

    // Determine trend direction
    const trendDirection = getTrendDirection(logs);

    // Predict high-risk times and days
    const highRiskTimes = identifyHighRiskTimes(logs);
    const highRiskDays = identifyHighRiskDays(logs);

    // Predict missed doses in next 7 days
    const predictedMissedDoses = predictMissedDoses(adherenceRate, 7);

    // Generate intervention recommendations
    const recommendedInterventions = generateInterventions(
      riskFactors,
      adherenceRate,
      highRiskTimes,
      highRiskDays
    );

    const prediction: Omit<MedicationAdherencePrediction, 'id'> = {
      groupId,
      elderId,
      medicationId,
      medicationName,
      predictionDate: new Date(),
      analysisPeriod: { start: startDate, end: endDate },
      currentAdherenceRate: adherenceRate,
      trendDirection,
      riskLevel,
      riskScore: totalRiskScore,
      riskFactors,
      predictedMissedDoses,
      highRiskTimes,
      highRiskDays,
      recommendedInterventions,
      generatedAt: new Date(),
      status: 'active'
    };

    // Save to Firestore
    const predictionRef = await addDoc(collection(db, 'medicationAdherencePredictions'), prediction);

    return { ...prediction, id: predictionRef.id };

  } catch (error) {
    console.error('Error predicting medication adherence:', error);
    return null;
  }
}

/**
 * Calculate overall adherence rate
 */
function calculateAdherenceRate(logs: MedicationLog[]): number {
  const total = logs.length;
  const taken = logs.filter(l => l.status === 'taken').length;
  return total > 0 ? Math.round((taken / total) * 100) : 0;
}

/**
 * Analyze time-of-day patterns
 */
function analyzeTimeOfDayPatterns(logs: MedicationLog[]): AdherenceRiskFactor | null {
  const timeGroups: Record<string, { total: number; missed: number }> = {};

  logs.forEach(log => {
    const hour = log.scheduledTime.getHours();
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

    if (!timeGroups[timeSlot]) {
      timeGroups[timeSlot] = { total: 0, missed: 0 };
    }

    timeGroups[timeSlot].total++;
    if (log.status === 'missed' || log.status === 'skipped') {
      timeGroups[timeSlot].missed++;
    }
  });

  // Find times with high miss rate
  const problematicTimes = Object.entries(timeGroups)
    .filter(([_, data]) => data.total >= 3 && (data.missed / data.total) > 0.3)
    .map(([time]) => time);

  if (problematicTimes.length > 0) {
    const severity: AdherenceRiskFactor['severity'] =
      problematicTimes.length >= 3 ? 'high' :
      problematicTimes.length >= 2 ? 'moderate' : 'low';

    return {
      type: 'time_of_day',
      description: `Frequently missed at ${problematicTimes.join(', ')}`,
      severity,
      data: { problematicTimes, timeGroups },
      points: severity === 'high' ? 25 : severity === 'moderate' ? 15 : 10
    };
  }

  return null;
}

/**
 * Analyze day-of-week patterns
 */
function analyzeDayOfWeekPatterns(logs: MedicationLog[]): AdherenceRiskFactor | null {
  const dayGroups: Record<string, { total: number; missed: number }> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  logs.forEach(log => {
    const dayName = dayNames[log.scheduledTime.getDay()];

    if (!dayGroups[dayName]) {
      dayGroups[dayName] = { total: 0, missed: 0 };
    }

    dayGroups[dayName].total++;
    if (log.status === 'missed' || log.status === 'skipped') {
      dayGroups[dayName].missed++;
    }
  });

  // Find days with high miss rate
  const problematicDays = Object.entries(dayGroups)
    .filter(([_, data]) => data.total >= 2 && (data.missed / data.total) > 0.4)
    .map(([day]) => day);

  if (problematicDays.length > 0) {
    return {
      type: 'day_of_week',
      description: `Lower adherence on ${problematicDays.join(', ')}`,
      severity: problematicDays.length >= 2 ? 'moderate' : 'low',
      data: { problematicDays, dayGroups },
      points: problematicDays.length >= 2 ? 20 : 10
    };
  }

  return null;
}

/**
 * Analyze recent adherence trend
 */
function analyzeRecentTrend(logs: MedicationLog[]): AdherenceRiskFactor | null {
  // Split logs into two halves to compare trends
  const midpoint = Math.floor(logs.length / 2);
  const recentLogs = logs.slice(0, midpoint); // Most recent (logs are sorted desc)
  const olderLogs = logs.slice(midpoint);

  const recentAdherence = calculateAdherenceRate(recentLogs);
  const olderAdherence = calculateAdherenceRate(olderLogs);

  const decline = olderAdherence - recentAdherence;

  if (decline >= 20) {
    return {
      type: 'recent_trend',
      description: `Adherence declined ${decline}% in recent period`,
      severity: 'high',
      data: { recentAdherence, olderAdherence, decline },
      points: 30
    };
  } else if (decline >= 10) {
    return {
      type: 'recent_trend',
      description: `Adherence declined ${decline}% in recent period`,
      severity: 'moderate',
      data: { recentAdherence, olderAdherence, decline },
      points: 15
    };
  }

  return null;
}

/**
 * Analyze medication frequency complexity
 */
function analyzeFrequencyComplexity(logs: MedicationLog[]): AdherenceRiskFactor | null {
  // Count unique times per day
  const timesPerDay = new Set(logs.map(l =>
    `${l.scheduledTime.getHours()}:${l.scheduledTime.getMinutes()}`
  )).size;

  if (timesPerDay >= 4) {
    return {
      type: 'medication_complexity',
      description: `Complex schedule: ${timesPerDay} times per day`,
      severity: 'high',
      data: { timesPerDay },
      points: 20
    };
  } else if (timesPerDay >= 3) {
    return {
      type: 'medication_complexity',
      description: `Multiple daily doses: ${timesPerDay} times per day`,
      severity: 'moderate',
      data: { timesPerDay },
      points: 10
    };
  }

  return null;
}

/**
 * Determine overall risk level
 */
function getRiskLevel(
  riskScore: number,
  adherenceRate: number
): 'low' | 'moderate' | 'high' | 'critical' {
  // Combine risk score and adherence rate
  if (riskScore >= 70 || adherenceRate < 60) return 'critical';
  if (riskScore >= 50 || adherenceRate < 75) return 'high';
  if (riskScore >= 30 || adherenceRate < 85) return 'moderate';
  return 'low';
}

/**
 * Determine trend direction
 */
function getTrendDirection(logs: MedicationLog[]): 'improving' | 'stable' | 'declining' {
  const midpoint = Math.floor(logs.length / 2);
  const recentAdherence = calculateAdherenceRate(logs.slice(0, midpoint));
  const olderAdherence = calculateAdherenceRate(logs.slice(midpoint));

  const diff = recentAdherence - olderAdherence;

  if (diff >= 10) return 'improving';
  if (diff <= -10) return 'declining';
  return 'stable';
}

/**
 * Identify high-risk times
 */
function identifyHighRiskTimes(logs: MedicationLog[]): string[] {
  const timeGroups: Record<string, { total: number; missed: number }> = {};

  logs.forEach(log => {
    const hour = log.scheduledTime.getHours();
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

    if (!timeGroups[timeSlot]) {
      timeGroups[timeSlot] = { total: 0, missed: 0 };
    }

    timeGroups[timeSlot].total++;
    if (log.status === 'missed' || log.status === 'skipped') {
      timeGroups[timeSlot].missed++;
    }
  });

  return Object.entries(timeGroups)
    .filter(([_, data]) => data.total >= 3 && (data.missed / data.total) > 0.25)
    .map(([time]) => time)
    .sort();
}

/**
 * Identify high-risk days
 */
function identifyHighRiskDays(logs: MedicationLog[]): string[] {
  const dayGroups: Record<string, { total: number; missed: number }> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  logs.forEach(log => {
    const dayName = dayNames[log.scheduledTime.getDay()];

    if (!dayGroups[dayName]) {
      dayGroups[dayName] = { total: 0, missed: 0 };
    }

    dayGroups[dayName].total++;
    if (log.status === 'missed' || log.status === 'skipped') {
      dayGroups[dayName].missed++;
    }
  });

  return Object.entries(dayGroups)
    .filter(([_, data]) => data.total >= 2 && (data.missed / data.total) > 0.3)
    .map(([day]) => day);
}

/**
 * Predict number of missed doses in next N days
 */
function predictMissedDoses(adherenceRate: number, days: number): number {
  // Assume average frequency of 2-3 doses per day
  const avgDosesPerDay = 2.5;
  const totalExpectedDoses = avgDosesPerDay * days;
  const missRate = (100 - adherenceRate) / 100;

  return Math.round(totalExpectedDoses * missRate);
}

/**
 * Generate intervention recommendations
 */
function generateInterventions(
  riskFactors: AdherenceRiskFactor[],
  adherenceRate: number,
  highRiskTimes: string[],
  highRiskDays: string[]
): string[] {
  const interventions: string[] = [];

  // Time-based interventions
  if (highRiskTimes.length > 0) {
    interventions.push(`Send extra reminders at ${highRiskTimes.join(', ')}`);
    interventions.push(`Consider adjusting medication schedule to avoid problematic times`);
  }

  // Day-based interventions
  if (highRiskDays.length > 0) {
    interventions.push(`Increase reminder frequency on ${highRiskDays.join(', ')}`);
  }

  // Complexity interventions
  if (riskFactors.some(f => f.type === 'medication_complexity')) {
    interventions.push('Discuss medication schedule simplification with doctor');
    interventions.push('Consider using pill organizer or medication dispenser');
  }

  // Trend interventions
  if (riskFactors.some(f => f.type === 'recent_trend' && f.severity === 'high')) {
    interventions.push('Schedule check-in call to discuss adherence challenges');
    interventions.push('Review potential barriers to medication-taking');
  }

  // General interventions
  if (adherenceRate < 75) {
    interventions.push('Enable push notifications for medication reminders');
    interventions.push('Involve family member for medication support');
  }

  return interventions;
}

/**
 * Get all medication adherence predictions for an elder
 */
export async function getAllAdherencePredictions(
  groupId: string,
  elderId: string
): Promise<MedicationAdherencePrediction[]> {
  try {
    const predictionsQuery = query(
      collection(db, 'medicationAdherencePredictions'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('status', '==', 'active'),
      orderBy('riskScore', 'desc')
    );

    const predictionsSnap = await getDocs(predictionsQuery);
    return predictionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      predictionDate: doc.data().predictionDate?.toDate(),
      analysisPeriod: {
        start: doc.data().analysisPeriod?.start?.toDate(),
        end: doc.data().analysisPeriod?.end?.toDate()
      },
      generatedAt: doc.data().generatedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    })) as MedicationAdherencePrediction[];

  } catch (error) {
    console.error('Error getting adherence predictions:', error);
    return [];
  }
}
