/**
 * Missed Doses Detection Service
 *
 * Detects and alerts caregivers about:
 * - Missed medication doses (critical for health)
 * - Missed supplement doses
 * - Skipped meals (low meal logging)
 *
 * Alert Priorities:
 * - CRITICAL: 2+ consecutive missed critical medications
 * - WARNING: Single missed critical med, or pattern of missed doses
 * - INFO: Missed supplements, low meal logging
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
import { MedicationService } from '@/lib/firebase/medications';
import { DietService } from '@/lib/firebase/diet';
import type { Alert, AlertSeverity, MedicationLog, Medication, DietEntry } from '@/types';

const COLLECTION = 'alerts';

export interface MissedDosesSummary {
  medications: {
    totalMissed: number;
    criticalMissed: number;
    consecutiveMissed: number;
    missedList: Array<{
      medicationName: string;
      scheduledTime: Date;
      isCritical: boolean;
    }>;
  };
  supplements: {
    totalMissed: number;
    missedList: Array<{
      supplementName: string;
      scheduledTime: Date;
    }>;
  };
  meals: {
    todayCount: number;
    expectedCount: number;
    missedMeals: ('breakfast' | 'lunch' | 'dinner')[];
  };
}

/**
 * Detect missed doses for today and generate appropriate alerts
 */
export async function detectMissedDoses(
  groupId: string,
  elderId: string,
  elderName: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member'
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 1. Check medication logs for missed doses
    const medicationAlerts = await checkMissedMedications(
      groupId,
      elderId,
      elderName,
      userId,
      userRole,
      todayStart,
      now
    );
    alerts.push(...medicationAlerts);

    // 2. Check supplement logs for missed doses
    const supplementAlerts = await checkMissedSupplements(
      groupId,
      elderId,
      elderName,
      userId,
      userRole,
      todayStart,
      now
    );
    alerts.push(...supplementAlerts);

    // 3. Check meal logging
    const mealAlerts = await checkMissedMeals(
      groupId,
      elderId,
      elderName,
      userId,
      userRole,
      todayStart,
      now
    );
    alerts.push(...mealAlerts);

    return alerts;
  } catch (error) {
    console.error('Error detecting missed doses:', error);
    return [];
  }
}

/**
 * Check for missed medication doses
 */
async function checkMissedMedications(
  groupId: string,
  elderId: string,
  elderName: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member',
  todayStart: Date,
  now: Date
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Get today's medication logs
    const logs = await MedicationService.getLogsByDateRange(
      groupId,
      todayStart,
      now,
      userId,
      userRole
    );

    // Filter for this elder
    const elderLogs = logs.filter(l => l.elderId === elderId);

    // Get medications to check which are critical
    const medications = await MedicationService.getMedicationsByGroup(groupId, userId, userRole);
    // Filter for active medications (no endDate or endDate in future)
    const elderMeds = medications.filter(m =>
      m.elderId === elderId &&
      (!m.endDate || new Date(m.endDate) > now)
    );
    const medMap = new Map(elderMeds.map(m => [m.id, m]));

    // Find missed doses (status === 'missed')
    const missedLogs = elderLogs.filter(l => l.status === 'missed');

    if (missedLogs.length === 0) {
      return alerts;
    }

    // Categorize missed doses
    const criticalMissed: MedicationLog[] = [];
    const regularMissed: MedicationLog[] = [];

    missedLogs.forEach(log => {
      const med = medMap.get(log.medicationId);
      // Check if medication is scheduled (not 'asNeeded'/PRN)
      if (med?.frequency?.type !== 'asNeeded') {
        // Scheduled medications are considered more important
        criticalMissed.push(log);
      } else {
        regularMissed.push(log);
      }
    });

    // Check for consecutive missed doses (most concerning)
    const consecutiveMissed = checkConsecutiveMissed(elderLogs, medMap);

    // Generate appropriate alerts
    if (consecutiveMissed >= 3) {
      // CRITICAL: 3+ consecutive missed doses
      const alert = await createMissedDoseAlert(
        groupId,
        elderId,
        elderName,
        'critical',
        `${elderName} has missed ${consecutiveMissed} consecutive medication doses`,
        `This pattern of missed doses may indicate a health concern or barrier to medication adherence. Immediate follow-up recommended.`,
        missedLogs,
        medMap
      );
      alerts.push(alert);
    } else if (criticalMissed.length >= 2) {
      // WARNING: Multiple missed scheduled medications today
      const alert = await createMissedDoseAlert(
        groupId,
        elderId,
        elderName,
        'warning',
        `${elderName} has missed ${criticalMissed.length} scheduled medications today`,
        `Scheduled medications were not taken. Please check in with ${elderName}.`,
        criticalMissed,
        medMap
      );
      alerts.push(alert);
    } else if (criticalMissed.length === 1) {
      // INFO: Single missed scheduled medication
      const med = medMap.get(criticalMissed[0].medicationId);
      const alert = await createMissedDoseAlert(
        groupId,
        elderId,
        elderName,
        'info',
        `${elderName} missed ${med?.name || 'a medication'}`,
        `Scheduled for ${new Date(criticalMissed[0].scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. May need a reminder.`,
        criticalMissed,
        medMap
      );
      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('Error checking missed medications:', error);
    return [];
  }
}

/**
 * Check for consecutive missed doses across multiple days
 */
function checkConsecutiveMissed(
  logs: MedicationLog[],
  medMap: Map<string, Medication>
): number {
  // Sort by scheduled time descending (most recent first)
  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
  );

  let consecutive = 0;
  for (const log of sortedLogs) {
    const med = medMap.get(log.medicationId);
    if (med?.frequency?.type !== 'asNeeded' && log.status === 'missed') {
      consecutive++;
    } else if (log.status === 'taken') {
      break; // Stop counting once we hit a taken dose
    }
  }

  return consecutive;
}

/**
 * Check for missed supplement doses
 */
async function checkMissedSupplements(
  groupId: string,
  elderId: string,
  elderName: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member',
  todayStart: Date,
  now: Date
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Query supplement logs for today
    const q = query(
      collection(db, 'supplement_logs'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('scheduledTime', '>=', Timestamp.fromDate(todayStart)),
      where('scheduledTime', '<=', Timestamp.fromDate(now))
    );

    const snap = await getDocs(q);
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const missedLogs = logs.filter((l: any) => l.status === 'missed');

    if (missedLogs.length >= 2) {
      // Get supplement names
      const supplementQ = query(
        collection(db, 'supplements'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId)
      );
      const supplementSnap = await getDocs(supplementQ);
      const supplementMap = new Map(
        supplementSnap.docs.map(doc => [doc.id, doc.data().name])
      );

      const missedNames = missedLogs.map((l: any) =>
        supplementMap.get(l.supplementId) || 'Unknown supplement'
      );

      const alert: Alert = {
        id: '',
        groupId,
        elderId,
        type: 'missed_doses',
        severity: 'info',
        title: `${elderName} missed ${missedLogs.length} supplements today`,
        message: `Missed: ${missedNames.slice(0, 3).join(', ')}${missedNames.length > 3 ? ` and ${missedNames.length - 3} more` : ''}.`,
        data: {
          category: 'supplements',
          count: missedLogs.length,
          supplements: missedNames,
          recommendations: ['Check if supplements are still needed', 'Consider setting reminders']
        },
        createdAt: new Date(),
        status: 'active',
        notificationSent: false,
        notificationChannels: ['dashboard'],
        viewedBy: []
      };

      // Save alert
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...alert,
        createdAt: Timestamp.fromDate(alert.createdAt)
      });
      alert.id = docRef.id;

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('Error checking missed supplements:', error);
    return [];
  }
}

/**
 * Check for missed meals (low meal logging)
 */
async function checkMissedMeals(
  groupId: string,
  elderId: string,
  elderName: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member',
  todayStart: Date,
  now: Date
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Get today's diet entries
    const entries = await DietService.getEntriesByDateRange(
      groupId,
      todayStart,
      now,
      userId,
      userRole
    );

    const elderEntries = entries.filter(e => e.elderId === elderId);

    // Determine expected meals based on current time
    const currentHour = now.getHours();
    const expectedMeals: ('breakfast' | 'lunch' | 'dinner')[] = [];

    if (currentHour >= 10) expectedMeals.push('breakfast'); // Should have had breakfast by 10 AM
    if (currentHour >= 14) expectedMeals.push('lunch');     // Should have had lunch by 2 PM
    if (currentHour >= 20) expectedMeals.push('dinner');    // Should have had dinner by 8 PM

    // Check which meals are logged
    const loggedMeals = new Set(elderEntries.map(e => e.meal));
    const missedMeals = expectedMeals.filter(m => !loggedMeals.has(m));

    if (missedMeals.length >= 2 && currentHour >= 14) {
      // WARNING: Multiple missed meals after lunch time
      const alert: Alert = {
        id: '',
        groupId,
        elderId,
        type: 'missed_doses',
        severity: 'warning',
        title: `No meals logged for ${elderName} today`,
        message: `Missing: ${missedMeals.join(', ')}. This may indicate reduced appetite or forgotten logging.`,
        data: {
          category: 'meals',
          missedMeals,
          loggedMeals: Array.from(loggedMeals),
          recommendations: [
            'Check in with elder about appetite',
            'Ensure meals are being provided',
            'Remind caregiver to log meals'
          ]
        },
        createdAt: new Date(),
        status: 'active',
        notificationSent: false,
        notificationChannels: ['dashboard'],
        viewedBy: []
      };

      const docRef = await addDoc(collection(db, COLLECTION), {
        ...alert,
        createdAt: Timestamp.fromDate(alert.createdAt)
      });
      alert.id = docRef.id;

      alerts.push(alert);
    } else if (missedMeals.length === 1 && missedMeals[0] === 'breakfast' && currentHour >= 11) {
      // INFO: Just breakfast missed
      const alert: Alert = {
        id: '',
        groupId,
        elderId,
        type: 'missed_doses',
        severity: 'info',
        title: `No breakfast logged for ${elderName}`,
        message: `Consider checking if ${elderName} had breakfast.`,
        data: {
          category: 'meals',
          missedMeals: ['breakfast'],
          recommendations: ['Verify breakfast was consumed', 'Log if already eaten']
        },
        createdAt: new Date(),
        status: 'active',
        notificationSent: false,
        notificationChannels: ['dashboard'],
        viewedBy: []
      };

      const docRef = await addDoc(collection(db, COLLECTION), {
        ...alert,
        createdAt: Timestamp.fromDate(alert.createdAt)
      });
      alert.id = docRef.id;

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('Error checking missed meals:', error);
    return [];
  }
}

/**
 * Create and save a missed dose alert
 */
async function createMissedDoseAlert(
  groupId: string,
  elderId: string,
  elderName: string,
  severity: AlertSeverity,
  title: string,
  message: string,
  missedLogs: MedicationLog[],
  medMap: Map<string, Medication>
): Promise<Alert> {
  const missedMeds = missedLogs.map(log => {
    const med = medMap.get(log.medicationId);
    return {
      name: med?.name || 'Unknown medication',
      scheduledTime: new Date(log.scheduledTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      dosage: med?.dosage || ''
    };
  });

  const recommendations: string[] = [];
  if (severity === 'critical') {
    recommendations.push('Contact elder immediately');
    recommendations.push('Check for any barriers to medication access');
    recommendations.push('Review medication schedule with healthcare provider');
  } else if (severity === 'warning') {
    recommendations.push('Check in with elder');
    recommendations.push('Verify medications are accessible');
  } else {
    recommendations.push('Send a reminder to take medication');
  }

  const alert: Alert = {
    id: '',
    groupId,
    elderId,
    type: 'missed_doses',
    severity,
    title,
    message,
    data: {
      category: 'medications',
      missedMedications: missedMeds,
      count: missedLogs.length,
      recommendations
    },
    createdAt: new Date(),
    status: 'active',
    notificationSent: false,
    notificationChannels: severity === 'critical' ? ['dashboard', 'sms', 'push'] : ['dashboard'],
    viewedBy: []
  };

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...alert,
    createdAt: Timestamp.fromDate(alert.createdAt)
  });
  alert.id = docRef.id;

  return alert;
}

/**
 * Get summary of missed doses for today (for dashboard display)
 */
export async function getMissedDosesSummary(
  groupId: string,
  elderId: string,
  userId: string,
  userRole: 'admin' | 'caregiver' | 'member'
): Promise<MissedDosesSummary> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const summary: MissedDosesSummary = {
    medications: {
      totalMissed: 0,
      criticalMissed: 0,
      consecutiveMissed: 0,
      missedList: []
    },
    supplements: {
      totalMissed: 0,
      missedList: []
    },
    meals: {
      todayCount: 0,
      expectedCount: 0,
      missedMeals: []
    }
  };

  try {
    // Medications
    const medLogs = await MedicationService.getLogsByDateRange(
      groupId,
      todayStart,
      now,
      userId,
      userRole
    );
    const elderMedLogs = medLogs.filter(l => l.elderId === elderId);
    const missedMedLogs = elderMedLogs.filter(l => l.status === 'missed');

    const medications = await MedicationService.getMedicationsByGroup(groupId, userId, userRole);
    const medMap = new Map(medications.map(m => [m.id, m]));

    summary.medications.totalMissed = missedMedLogs.length;
    summary.medications.criticalMissed = missedMedLogs.filter(l => {
      const med = medMap.get(l.medicationId);
      return med?.frequency?.type !== 'asNeeded';
    }).length;
    summary.medications.consecutiveMissed = checkConsecutiveMissed(elderMedLogs, medMap);
    summary.medications.missedList = missedMedLogs.map(log => ({
      medicationName: medMap.get(log.medicationId)?.name || 'Unknown',
      scheduledTime: new Date(log.scheduledTime),
      isCritical: medMap.get(log.medicationId)?.frequency?.type !== 'asNeeded'
    }));

    // Diet
    const dietEntries = await DietService.getEntriesByDateRange(
      groupId,
      todayStart,
      now,
      userId,
      userRole
    );
    const elderDietEntries = dietEntries.filter(e => e.elderId === elderId);
    const loggedMeals = new Set(elderDietEntries.map(e => e.meal));

    const currentHour = now.getHours();
    const expectedMeals: ('breakfast' | 'lunch' | 'dinner')[] = [];
    if (currentHour >= 10) expectedMeals.push('breakfast');
    if (currentHour >= 14) expectedMeals.push('lunch');
    if (currentHour >= 20) expectedMeals.push('dinner');

    summary.meals.todayCount = elderDietEntries.filter(e =>
      e.meal === 'breakfast' || e.meal === 'lunch' || e.meal === 'dinner'
    ).length;
    summary.meals.expectedCount = expectedMeals.length;
    summary.meals.missedMeals = expectedMeals.filter(m => !loggedMeals.has(m));

    return summary;
  } catch (error) {
    console.error('Error getting missed doses summary:', error);
    return summary;
  }
}
