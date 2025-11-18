/**
 * Alert Analytics & Learning System (Phase 2)
 *
 * Tracks alert performance and learns from user behavior:
 * - Monitors dismissal rates by alert type
 * - Tracks action rates (how often users act vs dismiss)
 * - Calculates false positive rates
 * - Automatically adjusts thresholds based on patterns
 * - Provides analytics dashboard data
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
  orderBy,
  Timestamp
} from 'firebase/firestore';
import type {
  Alert,
  AlertType,
  AlertAnalytics,
  AlertDismissalReason,
  UserAlertPreferences
} from '@/types';

/**
 * Calculate alert analytics for a specific alert type over a period
 */
export async function calculateAlertAnalytics(
  groupId: string,
  alertType: AlertType,
  periodDays: number = 30,
  elderId?: string
): Promise<AlertAnalytics> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get all alerts of this type for the period
    let q = query(
      collection(db, 'alerts'),
      where('groupId', '==', groupId),
      where('type', '==', alertType),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );

    if (elderId) {
      q = query(q, where('elderId', '==', elderId));
    }

    const alertsSnap = await getDocs(q);
    const alerts = alertsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Alert[];

    // Calculate metrics
    const totalGenerated = alerts.length;
    const totalDismissed = alerts.filter((a) => a.status === 'dismissed').length;
    const totalActioned = alerts.filter((a) => a.status === 'actioned').length;
    const totalExpired = alerts.filter((a) => a.status === 'expired').length;

    // Dismissal reason breakdown
    const dismissalReasons: Record<AlertDismissalReason, number> = {
      not_relevant: 0,
      already_handled: 0,
      false_positive: 0,
      too_frequent: 0,
      low_priority: 0,
      other: 0
    };

    alerts.forEach((alert) => {
      if (alert.status === 'dismissed' && alert.dismissalReason) {
        const reason = alert.dismissalReason as AlertDismissalReason;
        dismissalReasons[reason]++;
      }
    });

    // Calculate timing metrics
    const timesToAction: number[] = [];
    const timesToDismiss: number[] = [];

    alerts.forEach((alert) => {
      if (alert.actionedAt) {
        const timeToAction = alert.actionedAt.getTime() - alert.createdAt.getTime();
        timesToAction.push(timeToAction);
      }
      if (alert.dismissedAt) {
        const timeToDismiss = alert.dismissedAt.getTime() - alert.createdAt.getTime();
        timesToDismiss.push(timeToDismiss);
      }
    });

    const averageTimeToAction =
      timesToAction.length > 0
        ? timesToAction.reduce((a, b) => a + b, 0) / timesToAction.length
        : undefined;

    const averageTimeToDismiss =
      timesToDismiss.length > 0
        ? timesToDismiss.reduce((a, b) => a + b, 0) / timesToDismiss.length
        : undefined;

    // Calculate rates
    const falsePositiveRate =
      totalGenerated > 0 ? (dismissalReasons.false_positive / totalGenerated) * 100 : 0;

    const actionRate = totalGenerated > 0 ? (totalActioned / totalGenerated) * 100 : 0;

    // Create analytics record
    const analytics: Omit<AlertAnalytics, 'id'> = {
      alertType,
      groupId,
      elderId,
      totalGenerated,
      totalDismissed,
      totalActioned,
      totalExpired,
      dismissalReasons,
      averageTimeToAction,
      averageTimeToDismiss,
      falsePositiveRate: Math.round(falsePositiveRate * 10) / 10,
      actionRate: Math.round(actionRate * 10) / 10,
      periodStart: startDate,
      periodEnd: endDate,
      calculatedAt: new Date()
    };

    // Save to Firestore for historical tracking
    const analyticsRef = await addDoc(collection(db, 'alertAnalytics'), analytics);

    return { ...analytics, id: analyticsRef.id };
  } catch (error) {
    console.error('Error calculating alert analytics:', error);
    throw error;
  }
}

/**
 * Get comprehensive analytics for all alert types
 */
export async function getAllAlertAnalytics(
  groupId: string,
  periodDays: number = 30
): Promise<Record<AlertType, AlertAnalytics>> {
  const alertTypes: AlertType[] = [
    'medication_refill',
    'emergency_pattern',
    'health_change',
    'compliance_drop',
    'missed_doses',
    'shift_handoff',
    'appointment_reminder',
    'doctor_visit_prep'
  ];

  const analyticsMap: Record<string, AlertAnalytics> = {};

  for (const alertType of alertTypes) {
    try {
      const analytics = await calculateAlertAnalytics(groupId, alertType, periodDays);
      analyticsMap[alertType] = analytics;
    } catch (error) {
      console.error(`Error calculating analytics for ${alertType}:`, error);
    }
  }

  return analyticsMap as Record<AlertType, AlertAnalytics>;
}

/**
 * Determine if alert thresholds should be adjusted based on analytics
 */
export async function recommendThresholdAdjustments(
  groupId: string,
  alertType: AlertType
): Promise<{
  shouldAdjust: boolean;
  recommendation: string;
  newThreshold?: number;
  reasoning: string;
}> {
  try {
    const analytics = await calculateAlertAnalytics(groupId, alertType, 30);

    // RULE 1: High dismissal rate (>50%) = raise threshold (reduce alerts)
    const dismissalRate = (analytics.totalDismissed / analytics.totalGenerated) * 100;

    if (dismissalRate > 50 && analytics.totalGenerated >= 10) {
      return {
        shouldAdjust: true,
        recommendation: 'Increase alert threshold (reduce frequency)',
        reasoning: `${Math.round(dismissalRate)}% of ${alertType} alerts are dismissed. Users find these alerts too frequent or not relevant.`
      };
    }

    // RULE 2: High false positive rate (>30%) = raise threshold
    if (analytics.falsePositiveRate > 30 && analytics.totalGenerated >= 10) {
      return {
        shouldAdjust: true,
        recommendation: 'Increase alert threshold (improve accuracy)',
        reasoning: `${analytics.falsePositiveRate}% of ${alertType} alerts marked as false positives. Threshold too sensitive.`
      };
    }

    // RULE 3: High action rate (>70%) + low dismissal = lower threshold (more alerts)
    if (analytics.actionRate > 70 && dismissalRate < 20 && analytics.totalGenerated >= 5) {
      return {
        shouldAdjust: true,
        recommendation: 'Decrease alert threshold (catch more cases)',
        reasoning: `${analytics.actionRate}% of ${alertType} alerts result in action. Users find these valuable - consider catching more.`
      };
    }

    // RULE 4: "Too frequent" dismissals (>30%) = increase quiet period
    const tooFrequentRate =
      analytics.totalGenerated > 0
        ? (analytics.dismissalReasons.too_frequent / analytics.totalGenerated) * 100
        : 0;

    if (tooFrequentRate > 30) {
      return {
        shouldAdjust: true,
        recommendation: 'Increase quiet period between alerts',
        reasoning: `${Math.round(tooFrequentRate)}% of dismissals cite "too frequent". Users experiencing alert fatigue.`
      };
    }

    // No adjustment needed
    return {
      shouldAdjust: false,
      recommendation: 'Current threshold appears optimal',
      reasoning: `Action rate: ${analytics.actionRate}%, Dismissal rate: ${Math.round(dismissalRate)}%. Balanced performance.`
    };
  } catch (error) {
    console.error('Error recommending threshold adjustments:', error);
    return {
      shouldAdjust: false,
      recommendation: 'Unable to calculate',
      reasoning: 'Insufficient data for recommendation'
    };
  }
}

/**
 * Auto-tune alert thresholds based on analytics (Phase 2 learning)
 */
export async function autoTuneAlertThresholds(groupId: string): Promise<{
  adjustments: Array<{
    alertType: AlertType;
    action: string;
    reasoning: string;
  }>;
}> {
  const adjustments: Array<{
    alertType: AlertType;
    action: string;
    reasoning: string;
  }> = [];

  const alertTypes: AlertType[] = [
    'medication_refill',
    'emergency_pattern',
    'health_change',
    'compliance_drop'
  ];

  for (const alertType of alertTypes) {
    const recommendation = await recommendThresholdAdjustments(groupId, alertType);

    if (recommendation.shouldAdjust) {
      adjustments.push({
        alertType,
        action: recommendation.recommendation,
        reasoning: recommendation.reasoning
      });

      // Apply adjustments to group settings (Phase 2)
      await applyThresholdAdjustment(groupId, alertType, recommendation.recommendation);
    }
  }

  return { adjustments };
}

/**
 * Apply threshold adjustment to group settings
 */
async function applyThresholdAdjustment(
  groupId: string,
  alertType: AlertType,
  action: string
): Promise<void> {
  try {
    const groupRef = doc(db, 'groups', groupId);

    // Adjustment logic based on alert type
    switch (alertType) {
      case 'medication_refill':
        if (action.includes('Increase')) {
          // Increase threshold from 7 days to 5 days (fewer alerts)
          await updateDoc(groupRef, {
            'settings.aiFeatures.features.medicationRefillAlerts.defaultThresholdDays': 5
          });
        } else if (action.includes('Decrease')) {
          // Decrease threshold from 7 days to 10 days (more alerts)
          await updateDoc(groupRef, {
            'settings.aiFeatures.features.medicationRefillAlerts.defaultThresholdDays': 10
          });
        }
        break;

      case 'emergency_pattern':
        if (action.includes('Increase')) {
          // Increase sensitivity threshold (fewer alerts)
          await updateDoc(groupRef, {
            'settings.aiFeatures.features.emergencyPatternDetection.sensitivity': 'low'
          });
        } else if (action.includes('Decrease')) {
          // Decrease threshold (more alerts)
          await updateDoc(groupRef, {
            'settings.aiFeatures.features.emergencyPatternDetection.sensitivity': 'high'
          });
        }
        break;

      case 'health_change':
        if (action.includes('Increase')) {
          await updateDoc(groupRef, {
            'settings.aiFeatures.features.healthChangeDetection.sensitivity': 'low'
          });
        } else if (action.includes('Decrease')) {
          await updateDoc(groupRef, {
            'settings.aiFeatures.features.healthChangeDetection.sensitivity': 'high'
          });
        }
        break;
    }

    console.log(`✅ Adjusted ${alertType} threshold for group ${groupId}: ${action}`);
  } catch (error) {
    console.error('Error applying threshold adjustment:', error);
  }
}

/**
 * Update user alert preferences based on individual behavior (Phase 3 personalization)
 */
export async function updateUserAlertPreferencesFromBehavior(
  userId: string,
  groupId: string
): Promise<void> {
  try {
    // Get user's alert interaction history
    const alertsQuery = query(
      collection(db, 'alerts'),
      where('groupId', '==', groupId),
      where('dismissedBy', '==', userId)
    );

    const alertsSnap = await getDocs(alertsQuery);
    const dismissedAlerts = alertsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Alert[];

    // Calculate per-alert-type preferences
    const alertTypeStats = new Map<
      AlertType,
      {
        dismissed: number;
        actioned: number;
        totalResponseTime: number;
        responses: number;
      }
    >();

    dismissedAlerts.forEach((alert) => {
      const existing = alertTypeStats.get(alert.type) || {
        dismissed: 0,
        actioned: 0,
        totalResponseTime: 0,
        responses: 0
      };

      if (alert.status === 'dismissed') {
        existing.dismissed++;
      } else if (alert.status === 'actioned') {
        existing.actioned++;
      }

      if (alert.dismissedAt || alert.actionedAt) {
        const responseTime = alert.dismissedAt
          ? alert.dismissedAt.getTime() - alert.createdAt.getTime()
          : alert.actionedAt
          ? alert.actionedAt.getTime() - alert.createdAt.getTime()
          : 0;

        existing.totalResponseTime += responseTime;
        existing.responses++;
      }

      alertTypeStats.set(alert.type, existing);
    });

    // Build user preferences
    const alertTypePreferences: Record<string, any> = {};

    alertTypeStats.forEach((stats, alertType) => {
      const total = stats.dismissed + stats.actioned;
      const dismissalRate = total > 0 ? (stats.dismissed / total) * 100 : 0;
      const actionRate = total > 0 ? (stats.actioned / total) * 100 : 0;
      const avgResponseTime = stats.responses > 0 ? stats.totalResponseTime / stats.responses : 0;

      alertTypePreferences[alertType] = {
        dismissalRate,
        actionRate,
        avgResponseTime,
        lastAdjustedAt: new Date()
      };
    });

    // Save or update user preferences
    const preferencesQuery = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const preferencesSnap = await getDocs(preferencesQuery);

    if (preferencesSnap.empty) {
      // Create new preferences
      await addDoc(collection(db, 'userAlertPreferences'), {
        userId,
        groupId,
        preferences: {
          // Default preferences - will be customized by user in Phase 3 UI
          medicationRefillAlerts: {
            enabled: true,
            thresholdDays: 7,
            excludedMedications: [],
            quietHours: undefined
          },
          emergencyAlerts: {
            enabled: true,
            sensitivity: 'medium',
            requireMultipleFactors: true,
            minimumRiskScore: 8,
            autoEscalate: false
          },
          shiftHandoffAlerts: {
            enabled: true,
            onlyShowNonRoutine: true,
            notifyOnShiftEnd: false
          },
          appointmentReminders: {
            enabled: true,
            advanceNoticeDays: [7, 3, 1],
            autoGenerateVisitPrep: true
          },
          notificationChannels: {
            dashboard: true,
            sms: true,
            email: false,
            push: true
          },
          digestMode: {
            enabled: false,
            deliveryTime: '09:00'
          }
        },
        learningData: {
          alertTypePreferences
        },
        updatedAt: new Date()
      });
    } else {
      // Update existing preferences
      const preferencesRef = doc(db, 'userAlertPreferences', preferencesSnap.docs[0].id);
      await updateDoc(preferencesRef, {
        'learningData.alertTypePreferences': alertTypePreferences,
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated alert preferences for user ${userId} based on behavior`);
  } catch (error) {
    console.error('Error updating user alert preferences:', error);
  }
}

/**
 * Get alert performance summary for dashboard
 */
export async function getAlertPerformanceSummary(groupId: string): Promise<{
  totalAlerts: number;
  actionRate: number;
  dismissalRate: number;
  topPerformingAlertType: string;
  worstPerformingAlertType: string;
  recommendedAdjustments: number;
}> {
  try {
    const analyticsMap = await getAllAlertAnalytics(groupId, 30);

    let totalAlerts = 0;
    let totalActioned = 0;
    let totalDismissed = 0;

    let bestActionRate = 0;
    let worstActionRate = 100;
    let topPerformingAlertType = '';
    let worstPerformingAlertType = '';

    let recommendedAdjustments = 0;

    Object.entries(analyticsMap).forEach(([alertType, analytics]) => {
      totalAlerts += analytics.totalGenerated;
      totalActioned += analytics.totalActioned;
      totalDismissed += analytics.totalDismissed;

      if (analytics.actionRate > bestActionRate) {
        bestActionRate = analytics.actionRate;
        topPerformingAlertType = alertType;
      }

      if (analytics.actionRate < worstActionRate && analytics.totalGenerated > 0) {
        worstActionRate = analytics.actionRate;
        worstPerformingAlertType = alertType;
      }
    });

    // Check for recommended adjustments
    for (const alertType of Object.keys(analyticsMap) as AlertType[]) {
      const recommendation = await recommendThresholdAdjustments(groupId, alertType);
      if (recommendation.shouldAdjust) {
        recommendedAdjustments++;
      }
    }

    return {
      totalAlerts,
      actionRate: totalAlerts > 0 ? Math.round((totalActioned / totalAlerts) * 100) : 0,
      dismissalRate: totalAlerts > 0 ? Math.round((totalDismissed / totalAlerts) * 100) : 0,
      topPerformingAlertType,
      worstPerformingAlertType,
      recommendedAdjustments
    };
  } catch (error) {
    console.error('Error getting alert performance summary:', error);
    throw error;
  }
}
