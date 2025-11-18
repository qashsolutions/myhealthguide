/**
 * Medication Refill Prediction Service
 *
 * Phase 1: Conservative approach - high confidence thresholds
 * - Only alerts for medications with supply tracking enabled
 * - Requires 30+ days of consistent tracking data
 * - Only alerts for critical (non-PRN) medications
 * - Respects user dismissals (no re-alert for 14 days)
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import type {
  Medication,
  MedicationLog,
  Alert,
  AlertAction,
  AIFeatureSettings
} from '@/types';

interface RefillPrediction {
  medicationId: string;
  medicationName: string;
  currentQuantity: number;
  daysRemaining: number;
  estimatedRunOutDate: Date;
  shouldAlert: boolean;
  alertReason?: string;
  confidence: 'low' | 'medium' | 'high';
  dailyUsageRate: number;
}

/**
 * Calculate refill predictions for all medications in a group
 */
export async function calculateRefillPredictions(
  groupId: string,
  elderId: string
): Promise<RefillPrediction[]> {
  try {
    // Get all medications with supply tracking enabled
    const medicationsRef = collection(db, 'medications');
    const q = query(
      medicationsRef,
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('supply.enabled', '==', true)
    );

    const medicationsSnap = await getDocs(q);
    const predictions: RefillPrediction[] = [];

    for (const medDoc of medicationsSnap.docs) {
      const medication = { id: medDoc.id, ...medDoc.data() } as Medication;

      // Skip if no supply data
      if (!medication.supply) continue;

      // Calculate daily usage rate from historical logs
      const dailyUsage = await calculateDailyUsageRate(medication);

      // Not enough data for prediction
      if (dailyUsage === null) {
        predictions.push({
          medicationId: medication.id,
          medicationName: medication.name,
          currentQuantity: medication.supply.currentQuantity,
          daysRemaining: 0,
          estimatedRunOutDate: new Date(),
          shouldAlert: false,
          alertReason: 'Insufficient tracking data (< 30 days)',
          confidence: 'low',
          dailyUsageRate: 0
        });
        continue;
      }

      // Calculate days remaining
      const daysRemaining = medication.supply.currentQuantity / dailyUsage;
      const estimatedRunOutDate = new Date();
      estimatedRunOutDate.setDate(estimatedRunOutDate.getDate() + daysRemaining);

      // Determine if we should alert
      const { shouldAlert, reason } = await shouldGenerateRefillAlert(
        medication,
        daysRemaining,
        groupId
      );

      // Determine confidence based on data quality
      const confidence = await calculatePredictionConfidence(medication, dailyUsage);

      predictions.push({
        medicationId: medication.id,
        medicationName: medication.name,
        currentQuantity: medication.supply.currentQuantity,
        daysRemaining: Math.round(daysRemaining),
        estimatedRunOutDate,
        shouldAlert,
        alertReason: reason,
        confidence,
        dailyUsageRate: dailyUsage
      });
    }

    return predictions;
  } catch (error) {
    console.error('Error calculating refill predictions:', error);
    return [];
  }
}

/**
 * Calculate daily usage rate from medication logs
 * Returns null if insufficient data
 */
async function calculateDailyUsageRate(medication: Medication): Promise<number | null> {
  if (!medication.supply) return null;

  const trackingStartDate = medication.supply.trackingStartedAt;
  const daysSinceTracking = Math.floor(
    (Date.now() - trackingStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // CONSERVATIVE THRESHOLD: Require 30+ days of data
  if (daysSinceTracking < 30) {
    return null;
  }

  // Get medication logs since tracking started
  const logsRef = collection(db, 'medicationLogs');
  const q = query(
    logsRef,
    where('medicationId', '==', medication.id),
    where('status', '==', 'taken'),
    where('createdAt', '>=', Timestamp.fromDate(trackingStartDate))
  );

  const logsSnap = await getDocs(q);
  const totalDosesTaken = logsSnap.size;

  if (totalDosesTaken === 0) return null;

  // Calculate average daily usage
  const dailyUsage = totalDosesTaken / daysSinceTracking;

  return dailyUsage;
}

/**
 * Determine if we should generate a refill alert
 */
async function shouldGenerateRefillAlert(
  medication: Medication,
  daysRemaining: number,
  groupId: string
): Promise<{ shouldAlert: boolean; reason?: string }> {
  if (!medication.supply) {
    return { shouldAlert: false, reason: 'Supply tracking not enabled' };
  }

  // CHECK 1: Is medication PRN (as-needed)?
  if (medication.frequency.type === 'asNeeded') {
    return { shouldAlert: false, reason: 'PRN medications excluded (unpredictable usage)' };
  }

  // CHECK 2: Has medication ended?
  if (medication.endDate && new Date(medication.endDate) < new Date()) {
    return { shouldAlert: false, reason: 'Medication discontinued' };
  }

  // CHECK 3: Is supply above threshold?
  const thresholdDays = medication.supply.refillThresholdDays;
  if (daysRemaining > thresholdDays) {
    return { shouldAlert: false, reason: `Supply sufficient (${Math.round(daysRemaining)} days remaining)` };
  }

  // CHECK 4: Was this alert recently dismissed?
  const recentlyDismissed = await wasAlertRecentlyDismissed(
    medication.id,
    groupId,
    'medication_refill'
  );

  if (recentlyDismissed) {
    return { shouldAlert: false, reason: 'Alert dismissed within past 14 days' };
  }

  // CHECK 5: Was medication recently refilled?
  if (medication.supply.lastRefillDate) {
    const daysSinceRefill = Math.floor(
      (Date.now() - medication.supply.lastRefillDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceRefill < 7) {
      return { shouldAlert: false, reason: 'Recently refilled (< 7 days ago)' };
    }
  }

  // All checks passed - generate alert
  return {
    shouldAlert: true,
    reason: `Low supply: ~${Math.round(daysRemaining)} days remaining`
  };
}

/**
 * Calculate prediction confidence based on data quality
 */
async function calculatePredictionConfidence(
  medication: Medication,
  dailyUsage: number
): Promise<'low' | 'medium' | 'high'> {
  if (!medication.supply) return 'low';

  const trackingDays = Math.floor(
    (Date.now() - medication.supply.trackingStartedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get expected daily doses based on frequency
  const expectedDailyDoses = medication.frequency.times.length;
  const usageVariance = Math.abs(dailyUsage - expectedDailyDoses);

  // HIGH confidence: 60+ days tracking + usage matches schedule
  if (trackingDays >= 60 && usageVariance < 0.5) {
    return 'high';
  }

  // MEDIUM confidence: 30-59 days tracking OR moderate variance
  if (trackingDays >= 30 && usageVariance < 1.0) {
    return 'medium';
  }

  // LOW confidence: < 30 days or high variance
  return 'low';
}

/**
 * Check if alert was recently dismissed
 */
async function wasAlertRecentlyDismissed(
  medicationId: string,
  groupId: string,
  alertType: string
): Promise<boolean> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const alertsRef = collection(db, 'alerts');
  const q = query(
    alertsRef,
    where('groupId', '==', groupId),
    where('type', '==', alertType),
    where('data.medicationId', '==', medicationId),
    where('status', '==', 'dismissed'),
    where('dismissedAt', '>=', Timestamp.fromDate(fourteenDaysAgo))
  );

  const dismissedAlertsSnap = await getDocs(q);
  return !dismissedAlertsSnap.empty;
}

/**
 * Generate refill alerts for medications that need them
 */
export async function generateRefillAlerts(
  groupId: string,
  elderId: string,
  elderName: string
): Promise<Alert[]> {
  try {
    // Check if feature is enabled
    const groupDoc = await getDocs(
      query(collection(db, 'groups'), where('id', '==', groupId))
    );

    if (groupDoc.empty) return [];

    const groupData = groupDoc.docs[0].data();
    const aiFeatures = groupData.settings?.aiFeatures as AIFeatureSettings | undefined;

    if (!aiFeatures?.enabled || !aiFeatures.features.medicationRefillAlerts?.enabled) {
      return [];
    }

    // Get refill predictions
    const predictions = await calculateRefillPredictions(groupId, elderId);

    // Generate alerts for medications that need them
    const alerts: Alert[] = [];

    for (const prediction of predictions) {
      if (!prediction.shouldAlert) continue;

      // PHASE 1: Only alert for MEDIUM or HIGH confidence predictions
      if (prediction.confidence === 'low') continue;

      // Create alert
      const alert: Omit<Alert, 'id'> = {
        groupId,
        elderId,
        type: 'medication_refill',
        severity: prediction.daysRemaining <= 3 ? 'warning' : 'info',
        title: `Medication Refill Needed`,
        message: `${prediction.medicationName} for ${elderName} is running low. Approximately ${prediction.daysRemaining} days of supply remaining.`,
        data: {
          medicationId: prediction.medicationId,
          medicationName: prediction.medicationName,
          currentQuantity: prediction.currentQuantity,
          daysRemaining: prediction.daysRemaining,
          estimatedRunOutDate: prediction.estimatedRunOutDate,
          confidence: prediction.confidence,
          dailyUsageRate: prediction.dailyUsageRate
        },
        actions: [
          {
            id: 'mark_refilled',
            label: 'Mark as Refilled',
            type: 'primary',
            action: 'mark_refilled'
          },
          {
            id: 'snooze',
            label: 'Remind in 3 Days',
            type: 'secondary',
            action: 'snooze_3_days'
          },
          {
            id: 'stop_medication',
            label: 'I Stopped This Med',
            type: 'secondary',
            action: 'discontinue_medication'
          },
          {
            id: 'dismiss',
            label: 'Dismiss',
            type: 'dismiss',
            action: 'dismiss'
          }
        ],
        status: 'active',
        createdAt: new Date(),
        expiresAt: prediction.estimatedRunOutDate, // Expires when medication runs out
        notificationSent: false,
        notificationChannels: ['dashboard', 'push'],
        viewedBy: []
      };

      // Save to Firestore
      const alertRef = await addDoc(collection(db, 'alerts'), alert);
      alerts.push({ ...alert, id: alertRef.id });
    }

    return alerts;
  } catch (error) {
    console.error('Error generating refill alerts:', error);
    return [];
  }
}

/**
 * Handle user action on refill alert
 */
export async function handleRefillAlertAction(
  alertId: string,
  action: string,
  userId: string,
  medicationId: string,
  newQuantity?: number
): Promise<void> {
  const alertRef = doc(db, 'alerts', alertId);
  const medicationRef = doc(db, 'medications', medicationId);

  switch (action) {
    case 'mark_refilled':
      // Update medication supply
      if (newQuantity) {
        await updateDoc(medicationRef, {
          'supply.currentQuantity': newQuantity,
          'supply.lastRefillDate': new Date(),
          'supply.lastRefillQuantity': newQuantity,
          updatedAt: new Date()
        });
      }

      // Mark alert as actioned
      await updateDoc(alertRef, {
        status: 'actioned',
        actionedAt: new Date(),
        actionedBy: userId,
        actionTaken: 'Marked as refilled'
      });
      break;

    case 'snooze_3_days':
      // Update alert expiry to 3 days from now
      const snoozeDate = new Date();
      snoozeDate.setDate(snoozeDate.getDate() + 3);

      await updateDoc(alertRef, {
        expiresAt: snoozeDate,
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: userId,
        dismissalReason: 'Snoozed for 3 days'
      });
      break;

    case 'discontinue_medication':
      // Mark medication as discontinued
      await updateDoc(medicationRef, {
        endDate: new Date(),
        'supply.enabled': false,
        updatedAt: new Date()
      });

      // Dismiss alert
      await updateDoc(alertRef, {
        status: 'actioned',
        actionedAt: new Date(),
        actionedBy: userId,
        actionTaken: 'Medication discontinued'
      });
      break;

    case 'dismiss':
      // Track dismissal for learning
      await updateDoc(alertRef, {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: userId
      });
      break;
  }
}

/**
 * Automatically deduct quantity when dose is logged (if enabled)
 */
export async function autoDeductMedicationQuantity(
  medicationId: string
): Promise<void> {
  try {
    const medicationRef = doc(db, 'medications', medicationId);
    const medicationDoc = await getDocs(
      query(collection(db, 'medications'), where('id', '==', medicationId))
    );

    if (medicationDoc.empty) return;

    const medication = medicationDoc.docs[0].data() as Medication;

    if (!medication.supply?.enabled || !medication.supply.autoDeduct) {
      return;
    }

    // Deduct 1 unit (could be enhanced to parse dosage)
    const newQuantity = Math.max(0, medication.supply.currentQuantity - 1);

    await updateDoc(medicationRef, {
      'supply.currentQuantity': newQuantity,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error auto-deducting medication quantity:', error);
  }
}
