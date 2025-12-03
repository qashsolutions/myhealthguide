/**
 * Emergency Pattern Detection Service
 *
 * Phase 1: Multi-factor scoring with high threshold
 * - Combines multiple health signals into risk score (0-15)
 * - Only alerts when score >= 8 (multiple concerning factors)
 * - Provides clear severity levels and actionable recommendations
 * - Max 1 alert per week unless score >= 12 (severe)
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import type {
  EmergencyPattern,
  EmergencyFactor,
  Alert,
  MedicationLog,
  DietEntry,
  AlertSeverity
} from '@/types';

interface RiskScoreResult {
  totalScore: number;
  factors: EmergencyFactor[];
  severity: AlertSeverity;
  shouldAlert: boolean;
}

/**
 * Detect emergency patterns for an elder (run daily or on-demand)
 */
export async function detectEmergencyPatterns(
  groupId: string,
  elderId: string,
  elderName: string,
  sensitivityLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<EmergencyPattern | null> {
  try {
    // Check if we recently alerted (prevent alert fatigue)
    const recentlyAlerted = await wasRecentlyAlerted(groupId, elderId, 'emergency_pattern');

    if (recentlyAlerted) {
      console.log('Emergency pattern recently alerted - skipping to prevent fatigue');
      return null;
    }

    // Analyze last 7 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Calculate risk score across all factors
    const riskScore = await calculateEmergencyRiskScore(
      groupId,
      elderId,
      startDate,
      endDate,
      sensitivityLevel
    );

    // Determine if we should alert based on sensitivity and score
    const alertThreshold = getAlertThreshold(sensitivityLevel);

    if (!riskScore.shouldAlert || riskScore.totalScore < alertThreshold) {
      return null;
    }

    // Generate recommendations based on factors
    const recommendations = generateEmergencyRecommendations(riskScore.factors);

    // Create emergency pattern record
    const pattern: Omit<EmergencyPattern, 'id'> = {
      groupId,
      elderId,
      detectedAt: new Date(),
      dateRange: { start: startDate, end: endDate },
      riskScore: riskScore.totalScore,
      severity: riskScore.severity,
      factors: riskScore.factors,
      recommendations,
      status: 'detected',
      alertId: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNotes: undefined
    };

    // Save to Firestore
    const patternRef = await addDoc(collection(db, 'emergencyPatterns'), pattern);
    const patternId = patternRef.id;

    // Generate alert
    const alert = await generateEmergencyAlert(
      { ...pattern, id: patternId },
      elderName
    );

    // Update pattern with alert ID
    if (alert) {
      await updateDoc(doc(db, 'emergencyPatterns', patternId), {
        alertId: alert.id,
        status: 'alerted'
      });
    }

    return { ...pattern, id: patternId };
  } catch (error) {
    console.error('Error detecting emergency patterns:', error);
    return null;
  }
}

/**
 * Calculate emergency risk score across all factors
 */
async function calculateEmergencyRiskScore(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date,
  sensitivity: 'low' | 'medium' | 'high'
): Promise<RiskScoreResult> {
  const factors: EmergencyFactor[] = [];
  let totalScore = 0;

  // FACTOR 1: Medication Compliance Decline
  const complianceFactor = await analyzeMedicationCompliance(
    groupId,
    elderId,
    startDate,
    endDate,
    sensitivity
  );
  if (complianceFactor) {
    factors.push(complianceFactor);
    totalScore += complianceFactor.points;
  }

  // FACTOR 2: Diet Intake Decline
  const dietFactor = await analyzeDietIntake(groupId, elderId, startDate, endDate, sensitivity);
  if (dietFactor) {
    factors.push(dietFactor);
    totalScore += dietFactor.points;
  }

  // FACTOR 3: Pain Mentions
  const painFactor = await analyzePainMentions(groupId, elderId, startDate, endDate);
  if (painFactor) {
    factors.push(painFactor);
    totalScore += painFactor.points;
  }

  // FACTOR 4: Mood Changes
  const moodFactor = await analyzeMoodChanges(groupId, elderId, startDate, endDate);
  if (moodFactor) {
    factors.push(moodFactor);
    totalScore += moodFactor.points;
  }

  // FACTOR 5: Consecutive Missed Doses (critical medications)
  const missedDosesFactor = await analyzeConsecutiveMissedDoses(
    groupId,
    elderId,
    startDate,
    endDate
  );
  if (missedDosesFactor) {
    factors.push(missedDosesFactor);
    totalScore += missedDosesFactor.points;
  }

  // Determine severity and whether to alert
  const severity = getSeverityFromScore(totalScore);
  const shouldAlert = factors.length >= 2; // REQUIRE multiple factors

  return {
    totalScore,
    factors,
    severity,
    shouldAlert
  };
}

/**
 * FACTOR 1: Medication compliance decline
 */
async function analyzeMedicationCompliance(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date,
  sensitivity: 'low' | 'medium' | 'high'
): Promise<EmergencyFactor | null> {
  try {
    // Get logs for current week
    const currentWeekLogs = await getMedicationLogs(groupId, elderId, startDate, endDate);

    // Get logs for previous week (for comparison)
    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekLogs = await getMedicationLogs(groupId, elderId, prevWeekStart, startDate);

    // Calculate compliance rates
    const currentCompliance = calculateComplianceRate(currentWeekLogs);
    const prevCompliance = calculateComplianceRate(prevWeekLogs);

    // Check for significant decline
    const decline = prevCompliance - currentCompliance;

    // Sensitivity thresholds
    const thresholds = {
      low: 35, // Only alert on 35%+ drop
      medium: 25, // Alert on 25%+ drop
      high: 20 // Alert on 20%+ drop
    };

    if (decline >= thresholds[sensitivity]) {
      return {
        type: 'medication_compliance',
        description: `Medication compliance dropped from ${prevCompliance}% to ${currentCompliance}% over past 7 days`,
        points: decline >= 30 ? 4 : decline >= 20 ? 3 : 2,
        data: {
          currentCompliance,
          prevCompliance,
          decline,
          currentWeekMissed: currentWeekLogs.filter((l) => l.status === 'missed').length
        },
        severity: decline >= 30 ? 'critical' : decline >= 20 ? 'warning' : 'info'
      };
    }

    return null;
  } catch (error) {
    console.error('Error analyzing medication compliance:', error);
    return null;
  }
}

/**
 * FACTOR 2: Diet intake decline
 */
async function analyzeDietIntake(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date,
  sensitivity: 'low' | 'medium' | 'high'
): Promise<EmergencyFactor | null> {
  try {
    const dietQuery = query(
      collection(db, 'diet_entries'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate))
    );
    const dietSnap = await getDocs(dietQuery);
    const currentWeekEntries = dietSnap.size;

    // Get previous week for comparison
    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevDietQuery = query(
      collection(db, 'diet_entries'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('timestamp', '>=', Timestamp.fromDate(prevWeekStart)),
      where('timestamp', '<=', Timestamp.fromDate(startDate))
    );
    const prevDietSnap = await getDocs(prevDietQuery);
    const prevWeekEntries = prevDietSnap.size;

    // Calculate decline
    if (prevWeekEntries === 0) return null; // No baseline

    const decline = ((prevWeekEntries - currentWeekEntries) / prevWeekEntries) * 100;

    // Thresholds
    const thresholds = {
      low: 40, // 40%+ decline
      medium: 30, // 30%+ decline
      high: 25 // 25%+ decline
    };

    if (decline >= thresholds[sensitivity]) {
      return {
        type: 'diet_intake',
        description: `Diet intake decreased by ${Math.round(decline)}% compared to previous week (${prevWeekEntries} → ${currentWeekEntries} meals)`,
        points: decline >= 40 ? 3 : 2,
        data: {
          currentWeekMeals: currentWeekEntries,
          prevWeekMeals: prevWeekEntries,
          declinePercentage: Math.round(decline)
        },
        severity: decline >= 40 ? 'warning' : 'info'
      };
    }

    return null;
  } catch (error) {
    console.error('Error analyzing diet intake:', error);
    return null;
  }
}

/**
 * FACTOR 3: Pain mentions in logs
 */
async function analyzePainMentions(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<EmergencyFactor | null> {
  try {
    const medLogs = await getMedicationLogs(groupId, elderId, startDate, endDate);
    const dietLogs = await getDietEntries(groupId, elderId, startDate, endDate);

    const painKeywords = ['pain', 'hurts', 'ache', 'sore', 'discomfort'];
    const severePainKeywords = ['severe pain', 'intense pain', 'unbearable', 'excruciating'];

    let painCount = 0;
    let severePainCount = 0;
    const painDates: Date[] = [];

    // Check medication logs
    medLogs.forEach((log) => {
      if (log.notes) {
        const notesLower = log.notes.toLowerCase();
        if (severePainKeywords.some((kw) => notesLower.includes(kw))) {
          severePainCount++;
          painDates.push(new Date(log.createdAt));
        } else if (painKeywords.some((kw) => notesLower.includes(kw))) {
          painCount++;
          painDates.push(new Date(log.createdAt));
        }
      }
    });

    // Check diet logs
    dietLogs.forEach((entry) => {
      if (entry.notes) {
        const notesLower = entry.notes.toLowerCase();
        if (severePainKeywords.some((kw) => notesLower.includes(kw))) {
          severePainCount++;
          painDates.push(new Date(entry.timestamp));
        } else if (painKeywords.some((kw) => notesLower.includes(kw))) {
          painCount++;
          painDates.push(new Date(entry.timestamp));
        }
      }
    });

    // Alert if pain mentioned 3+ times OR severe pain 2+ times
    if (painCount >= 3 || severePainCount >= 2) {
      return {
        type: 'pain',
        description: `Pain reported ${painCount + severePainCount} times in past 7 days${severePainCount > 0 ? ` (${severePainCount} severe)` : ''}`,
        points: severePainCount >= 2 ? 3 : 2,
        data: {
          painMentions: painCount,
          severePainMentions: severePainCount,
          dates: painDates
        },
        severity: severePainCount >= 2 ? 'warning' : 'info'
      };
    }

    return null;
  } catch (error) {
    console.error('Error analyzing pain mentions:', error);
    return null;
  }
}

/**
 * FACTOR 4: Mood changes
 */
async function analyzeMoodChanges(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<EmergencyFactor | null> {
  try {
    const medLogs = await getMedicationLogs(groupId, elderId, startDate, endDate);
    const dietLogs = await getDietEntries(groupId, elderId, startDate, endDate);

    const concerningMoodKeywords = ['withdrawn', 'depressed', 'sad', 'upset', 'angry', 'agitated', 'confused'];

    let moodCount = 0;
    const consecutiveDays = new Set<string>();

    // Check logs
    [...medLogs, ...dietLogs].forEach((log: any) => {
      if (log.notes) {
        const notesLower = log.notes.toLowerCase();
        if (concerningMoodKeywords.some((kw) => notesLower.includes(kw))) {
          moodCount++;
          const dateStr = new Date(log.createdAt || log.timestamp).toDateString();
          consecutiveDays.add(dateStr);
        }
      }
    });

    // Alert if concerning mood mentioned 3+ times across 2+ days
    if (moodCount >= 3 && consecutiveDays.size >= 2) {
      return {
        type: 'mood',
        description: `Concerning mood changes noted ${moodCount} times across ${consecutiveDays.size} days`,
        points: consecutiveDays.size >= 3 ? 2 : 1,
        data: {
          moodMentions: moodCount,
          daysAffected: consecutiveDays.size
        },
        severity: consecutiveDays.size >= 3 ? 'warning' : 'info'
      };
    }

    return null;
  } catch (error) {
    console.error('Error analyzing mood changes:', error);
    return null;
  }
}

/**
 * FACTOR 5: Consecutive missed doses of critical medications
 */
async function analyzeConsecutiveMissedDoses(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<EmergencyFactor | null> {
  try {
    const medLogs = await getMedicationLogs(groupId, elderId, startDate, endDate);

    // Group by medication
    const byMedication = new Map<string, MedicationLog[]>();
    medLogs.forEach((log) => {
      const existing = byMedication.get(log.medicationId) || [];
      existing.push(log);
      byMedication.set(log.medicationId, existing);
    });

    // Find consecutive misses
    let maxConsecutiveMisses = 0;
    let medicationWithMisses = '';

    byMedication.forEach((logs, medId) => {
      const sortedLogs = logs.sort(
        (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );

      let consecutiveMisses = 0;
      sortedLogs.forEach((log) => {
        if (log.status === 'missed') {
          consecutiveMisses++;
          if (consecutiveMisses > maxConsecutiveMisses) {
            maxConsecutiveMisses = consecutiveMisses;
            medicationWithMisses = medId;
          }
        } else {
          consecutiveMisses = 0;
        }
      });
    });

    // Alert if 3+ consecutive misses
    if (maxConsecutiveMisses >= 3) {
      return {
        type: 'medication_compliance',
        description: `${maxConsecutiveMisses} consecutive missed doses detected for critical medication`,
        points: maxConsecutiveMisses >= 4 ? 4 : 3,
        data: {
          consecutiveMisses: maxConsecutiveMisses,
          medicationId: medicationWithMisses
        },
        severity: maxConsecutiveMisses >= 4 ? 'critical' : 'warning'
      };
    }

    return null;
  } catch (error) {
    console.error('Error analyzing consecutive missed doses:', error);
    return null;
  }
}

/**
 * Generate actionable recommendations based on factors
 */
function generateEmergencyRecommendations(factors: EmergencyFactor[]): string[] {
  const recommendations: string[] = [];

  factors.forEach((factor) => {
    switch (factor.type) {
      case 'medication_compliance':
        recommendations.push('Contact healthcare provider to review medication regimen');
        recommendations.push('Check for side effects or barriers to medication adherence');
        break;

      case 'diet_intake':
        recommendations.push('Monitor appetite and food preferences closely');
        recommendations.push('Consider consultation with nutritionist or doctor');
        break;

      case 'pain':
        if (factor.severity === 'warning' || factor.severity === 'critical') {
          recommendations.push('Schedule urgent medical evaluation for pain management');
        } else {
          recommendations.push('Discuss pain management with healthcare provider');
        }
        break;

      case 'mood':
        recommendations.push('Increase social interaction and activities');
        recommendations.push('Consider consultation with mental health professional');
        break;

      case 'falls':
        recommendations.push('Immediate safety assessment required');
        recommendations.push('Contact doctor to evaluate fall risk and prevention');
        break;
    }
  });

  // Always add general recommendation
  recommendations.push('Document all observations and share with family/healthcare team');

  return recommendations;
}

/**
 * Generate emergency alert
 */
async function generateEmergencyAlert(
  pattern: EmergencyPattern,
  elderName: string
): Promise<Alert | null> {
  try {
    const factorDescriptions = pattern.factors.map((f) => `• ${f.description}`).join('\n');

    const alert: Omit<Alert, 'id'> = {
      groupId: pattern.groupId,
      elderId: pattern.elderId,
      type: 'emergency_pattern',
      severity: pattern.severity,
      title: `⚠️ Health Alert for ${elderName}`,
      message: `Multiple concerning patterns detected (Risk Score: ${pattern.riskScore}/15):\n\n${factorDescriptions}`,
      data: {
        patternId: pattern.id,
        riskScore: pattern.riskScore,
        factors: pattern.factors,
        recommendations: pattern.recommendations
      },
      actions: [
        {
          id: 'contact_doctor',
          label: 'Contact Healthcare Provider',
          type: 'primary',
          action: 'contact_doctor'
        },
        {
          id: 'schedule_checkup',
          label: 'Schedule Check-In',
          type: 'secondary',
          action: 'schedule_checkup'
        },
        {
          id: 'mark_reviewed',
          label: 'Mark as Reviewed',
          type: 'secondary',
          action: 'mark_reviewed'
        }
      ],
      status: 'active',
      createdAt: new Date(),
      notificationSent: false,
      notificationChannels: ['dashboard', 'push', 'sms'], // Critical alerts go to all channels
      viewedBy: []
    };

    const alertRef = await addDoc(collection(db, 'alerts'), alert);
    return { ...alert, id: alertRef.id };
  } catch (error) {
    console.error('Error generating emergency alert:', error);
    return null;
  }
}

/**
 * Helper functions
 */

async function getMedicationLogs(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<MedicationLog[]> {
  const q = query(
    collection(db, 'medication_logs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
    where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('scheduledTime', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MedicationLog[];
}

async function getDietEntries(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<DietEntry[]> {
  const q = query(
    collection(db, 'diet_entries'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as DietEntry[];
}

function calculateComplianceRate(logs: MedicationLog[]): number {
  if (logs.length === 0) return 0;
  const taken = logs.filter((l) => l.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
}

function getSeverityFromScore(score: number): AlertSeverity {
  if (score >= 10) return 'critical';
  if (score >= 6) return 'warning';
  return 'info';
}

function getAlertThreshold(sensitivity: 'low' | 'medium' | 'high'): number {
  return {
    low: 10, // Only alert on critical situations
    medium: 8, // Alert on warning+ situations
    high: 6 // Alert on any concerning pattern
  }[sensitivity];
}

async function wasRecentlyAlerted(
  groupId: string,
  elderId: string,
  alertType: string
): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const q = query(
    collection(db, 'alerts'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('type', '==', alertType),
    where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

// Export for use in other modules
import { updateDoc, doc } from 'firebase/firestore';
