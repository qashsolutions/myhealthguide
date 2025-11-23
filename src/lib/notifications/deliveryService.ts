/**
 * Unified Notification Delivery Service
 *
 * Firebase-only implementation:
 * - FCM Push Notifications (via Firebase Cloud Messaging)
 * - Dashboard Notifications (via Firestore 'alerts' collection)
 *
 * Respects user preferences from userAlertPreferences
 * NO third-party services (no Twilio, no Resend)
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import {
  getUserAlertPreferences,
  shouldReceiveAlert,
  getRecommendedAlertChannels
} from '@/lib/ai/userAlertPreferences';
import type { AlertType, EmergencyPattern } from '@/types';

export interface NotificationPayload {
  userId: string;
  groupId: string;
  elderId?: string;
  alertType: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionButtons?: Array<{
    label: string;
    action: 'dismiss' | 'view' | 'acknowledge' | 'order_refill' | 'call_doctor';
    url?: string;
  }>;
}

export interface DeliveryResult {
  success: boolean;
  deliveredChannels: string[];
  failedChannels: string[];
  errors?: string[];
  alertId?: string;
}

/**
 * Main delivery function - respects user preferences
 */
export async function deliverNotification(
  payload: NotificationPayload
): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    success: false,
    deliveredChannels: [],
    failedChannels: [],
    errors: []
  };

  try {
    // Check if user should receive this alert
    const shouldSend = await shouldReceiveAlert(
      payload.userId,
      payload.groupId,
      payload.alertType,
      payload.data
    );

    if (!shouldSend) {
      console.log(`User ${payload.userId} filtered out alert type ${payload.alertType}`);
      result.success = true; // Not an error, just filtered
      return result;
    }

    // Get recommended channels based on severity and user preferences
    const channels = await getRecommendedAlertChannels(
      payload.userId,
      payload.groupId,
      payload.severity
    );

    console.log(`Delivering ${payload.severity} alert to channels:`, channels);

    // Deliver to each enabled channel
    const deliveryPromises: Promise<void>[] = [];

    if (channels.includes('dashboard')) {
      deliveryPromises.push(
        deliverToDashboard(payload)
          .then((alertId) => {
            result.alertId = alertId;
            result.deliveredChannels.push('dashboard');
            return undefined;
          })
          .catch((err) => {
            result.failedChannels.push('dashboard');
            result.errors?.push(`Dashboard: ${err.message}`);
            return undefined;
          })
      );
    }

    if (channels.includes('push')) {
      deliveryPromises.push(
        deliverToFCM(payload)
          .then(() => {
            result.deliveredChannels.push('push');
            return undefined;
          })
          .catch((err) => {
            result.failedChannels.push('push');
            result.errors?.push(`Push: ${err.message}`);
            return undefined;
          })
      );
    }

    // SMS and Email hooks (requires Firebase Extensions - document but don't implement)
    if (channels.includes('sms')) {
      console.log('⚠️  SMS requested but not configured. Add Firebase Extension: Twilio SMS');
      result.failedChannels.push('sms');
      result.errors?.push('SMS: Requires Firebase Extension (Twilio)');
    }

    if (channels.includes('email')) {
      console.log('⚠️  Email requested but not configured. Add Firebase Extension: Trigger Email');
      result.failedChannels.push('email');
      result.errors?.push('Email: Requires Firebase Extension (Trigger Email)');
    }

    await Promise.all(deliveryPromises);

    result.success = result.deliveredChannels.length > 0;
    return result;
  } catch (error) {
    console.error('Error in deliverNotification:', error);
    result.errors?.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Deliver to Dashboard (Firestore alerts collection)
 */
async function deliverToDashboard(payload: NotificationPayload): Promise<string> {
  try {
    const alertDoc = await addDoc(collection(db, 'alerts'), {
      userId: payload.userId,
      groupId: payload.groupId,
      elderId: payload.elderId || null,
      type: payload.alertType,
      severity: payload.severity,
      title: payload.title,
      message: payload.body,
      data: payload.data || {},
      actionUrl: payload.actionUrl || null,
      actionButtons: payload.actionButtons || [],
      status: 'active',
      read: false,
      dismissed: false,
      acknowledged: false,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      )
    });

    console.log(`✅ Dashboard alert created: ${alertDoc.id}`);
    return alertDoc.id;
  } catch (error) {
    console.error('Error delivering to dashboard:', error);
    throw error;
  }
}

/**
 * Deliver to FCM Push (queues for Firebase Cloud Function)
 */
async function deliverToFCM(payload: NotificationPayload): Promise<void> {
  try {
    // Queue the notification for Firebase Cloud Function to process
    await addDoc(collection(db, 'fcm_notification_queue'), {
      userId: payload.userId,
      groupId: payload.groupId,
      title: payload.title,
      body: payload.body,
      data: {
        type: payload.alertType,
        severity: payload.severity,
        url: payload.actionUrl || '/dashboard/insights',
        ...payload.data
      },
      webpush: {
        fcmOptions: {
          link: payload.actionUrl || '/dashboard/insights'
        },
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          requireInteraction: payload.severity === 'critical',
          tag: `${payload.alertType}-${Date.now()}`
        }
      },
      status: 'pending',
      createdAt: Timestamp.now()
    });

    console.log('✅ FCM notification queued');
  } catch (error) {
    console.error('Error queuing FCM notification:', error);
    throw error;
  }
}

/**
 * Batch deliver notifications to multiple users
 */
export async function batchDeliverNotifications(
  payloads: NotificationPayload[]
): Promise<DeliveryResult[]> {
  const results = await Promise.all(
    payloads.map(payload => deliverNotification(payload))
  );

  return results;
}

/**
 * Send emergency pattern alert (critical severity)
 */
export async function sendEmergencyPatternAlert(
  userId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  pattern: EmergencyPattern
): Promise<DeliveryResult> {
  return deliverNotification({
    userId,
    groupId,
    elderId,
    alertType: 'emergency_pattern',
    severity: pattern.severity === 'critical' ? 'critical' : 'warning',
    title: `⚠️  Emergency Pattern Detected: ${elderName}`,
    body: `Risk Score: ${pattern.riskScore}/15 - ${pattern.factors.length} concerning patterns detected`,
    data: {
      patternId: pattern.id,
      riskScore: pattern.riskScore,
      factorCount: pattern.factors.length
    },
    actionUrl: '/dashboard/insights',
    actionButtons: [
      {
        label: 'View Details',
        action: 'view',
        url: '/dashboard/insights'
      },
      ...(pattern.severity === 'critical' ? [{
        label: 'Contact Healthcare Provider',
        action: 'call_doctor' as const
      }] : []),
      {
        label: 'Dismiss',
        action: 'dismiss' as const
      }
    ]
  });
}

/**
 * Send medication refill alert
 */
export async function sendMedicationRefillAlert(
  userId: string,
  groupId: string,
  elderId: string,
  medicationId: string,
  medicationName: string,
  daysRemaining: number,
  urgency: 'critical' | 'high' | 'medium' | 'low'
): Promise<DeliveryResult> {
  const severityMap = {
    critical: 'critical' as const,
    high: 'warning' as const,
    medium: 'warning' as const,
    low: 'info' as const
  };

  return deliverNotification({
    userId,
    groupId,
    elderId,
    alertType: 'medication_refill',
    severity: severityMap[urgency],
    title: urgency === 'critical' ? '🚨 Urgent: Medication Running Out' : '💊 Medication Refill Needed',
    body: `${medicationName}: ${daysRemaining} days of supply remaining`,
    data: {
      medicationId,
      medicationName,
      daysRemaining,
      urgency
    },
    actionUrl: '/dashboard/medications',
    actionButtons: [
      {
        label: 'Order Refill',
        action: 'order_refill'
      },
      {
        label: 'View Medications',
        action: 'view',
        url: '/dashboard/medications'
      },
      {
        label: 'Dismiss',
        action: 'dismiss'
      }
    ]
  });
}

/**
 * Send health change alert
 */
export async function sendHealthChangeAlert(
  userId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  changeType: 'medication_compliance' | 'diet_intake' | 'missed_doses',
  changeDescription: string,
  severity: 'info' | 'warning' | 'critical'
): Promise<DeliveryResult> {
  return deliverNotification({
    userId,
    groupId,
    elderId,
    alertType: 'health_change',
    severity,
    title: severity === 'critical' ? `⚠️  Significant Health Change: ${elderName}` : `📊 Health Pattern Change: ${elderName}`,
    body: changeDescription,
    data: {
      changeType
    },
    actionUrl: '/dashboard/insights',
    actionButtons: [
      {
        label: 'View Insights',
        action: 'view',
        url: '/dashboard/insights'
      },
      {
        label: 'Acknowledge',
        action: 'acknowledge'
      }
    ]
  });
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(alertId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'alerts', alertId), {
      read: true,
      readAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    throw error;
  }
}

/**
 * Dismiss alert
 */
export async function dismissAlert(alertId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'alerts', alertId), {
      dismissed: true,
      dismissedAt: Timestamp.now(),
      status: 'dismissed'
    });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
}

/**
 * Acknowledge alert
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'alerts', alertId), {
      acknowledged: true,
      acknowledgedAt: Timestamp.now(),
      status: 'acknowledged'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

/**
 * Get active alerts for user
 */
export async function getActiveAlertsForUser(
  userId: string,
  groupId: string
): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', userId),
      where('groupId', '==', groupId),
      where('status', '==', 'active'),
      where('dismissed', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting active alerts:', error);
    throw error;
  }
}
