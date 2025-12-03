/**
 * Notifications Firebase Service
 * Phase 3: FCM Push Notifications
 * Phase 5: SMS Notifications
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from './config';
import { NotificationPreferences } from '@/types';
// DISABLED: Using Firebase Auth instead of Twilio
// import {
//   sendMedicationReminder,
//   sendMissedDoseAlert,
//   sendDailySummary,
//   sendComplianceAlert,
//   SMSResponse
// } from '@/lib/sms/twilioService';

// Temporary type definition (Twilio code disabled)
interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationLog {
  id: string;
  groupId: string;
  elderId: string;
  type: 'medication_reminder' | 'medication_missed' | 'supplement_reminder' | 'daily_summary' | 'weekly_summary' | 'compliance_alert';
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'scheduled';
  messageId?: string;
  error?: string;
  sentAt?: Date;
  scheduledFor?: Date;
  createdAt: Date;
}

export interface ReminderSchedule {
  id: string;
  groupId: string;
  elderId: string;
  medicationId?: string;
  supplementId?: string;
  type: 'medication' | 'supplement';
  scheduledTime: Date;
  recipients: string[];
  enabled: boolean;
  createdAt: Date;
}

export class NotificationService {
  /**
   * Get group notification preferences
   */
  static async getGroupNotificationPreferences(groupId: string): Promise<NotificationPreferences | null> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) {
        return null;
      }

      const data = groupDoc.data();
      return data.settings?.notificationPreferences || null;
    } catch (error: any) {
      // Return null for permission errors (expected for new users without groups)
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        return null;
      }
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update group notification preferences
   */
  static async updateGroupNotificationPreferences(
    groupId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        'settings.notificationPreferences': preferences,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification recipients for a group
   */
  static async getNotificationRecipients(groupId: string): Promise<string[]> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) {
        return [];
      }

      const data = groupDoc.data();
      return data.settings?.notificationRecipients || [];
    } catch (error: any) {
      // Return empty array for permission errors (expected for new users without groups)
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        return [];
      }
      console.error('Error fetching notification recipients:', error);
      throw error;
    }
  }

  /**
   * Update notification recipients
   */
  static async updateNotificationRecipients(groupId: string, recipients: string[]): Promise<void> {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        'settings.notificationRecipients': recipients,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating notification recipients:', error);
      throw error;
    }
  }

  /**
   * Send medication reminder SMS
   */
  static async sendMedicationReminderSMS(params: {
    groupId: string;
    elderId: string;
    elderName: string;
    medicationName: string;
    scheduledTime: string;
  }): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients(params.groupId);
      const preferences = await this.getGroupNotificationPreferences(params.groupId);

      if (!preferences?.enabled || !preferences.types.includes('missed_doses')) {
        console.log('Notifications disabled or type not enabled');
        return;
      }

      for (const recipient of recipients) {
        // DISABLED: Twilio SMS - use Firebase Phone Auth instead
        const result: SMSResponse = { success: false, error: 'SMS disabled - use Firebase Auth' };
        /* const result = await sendMedicationReminder({
          to: recipient,
          elderName: params.elderName,
          medicationName: params.medicationName,
          scheduledTime: params.scheduledTime
        }); */

        // Log the notification
        await this.logNotification({
          groupId: params.groupId,
          elderId: params.elderId,
          type: 'medication_reminder',
          recipient,
          message: `Reminder: ${params.elderName} - ${params.medicationName} due at ${params.scheduledTime}`,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error sending medication reminder:', error);
      throw error;
    }
  }

  /**
   * Send missed dose alert SMS
   */
  static async sendMissedDoseAlertSMS(params: {
    groupId: string;
    elderId: string;
    elderName: string;
    medicationName: string;
    missedTime: string;
  }): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients(params.groupId);
      const preferences = await this.getGroupNotificationPreferences(params.groupId);

      if (!preferences?.enabled || !preferences.types.includes('missed_doses')) {
        console.log('Notifications disabled or type not enabled');
        return;
      }

      for (const recipient of recipients) {
        // DISABLED: Twilio SMS - use Firebase Phone Auth instead
        const result: SMSResponse = { success: false, error: 'SMS disabled - use Firebase Auth' };
        /* const result = await sendMissedDoseAlert({
          to: recipient,
          elderName: params.elderName,
          medicationName: params.medicationName,
          missedTime: params.missedTime
        }); */

        await this.logNotification({
          groupId: params.groupId,
          elderId: params.elderId,
          type: 'medication_missed',
          recipient,
          message: `Alert: ${params.elderName} missed ${params.medicationName} at ${params.missedTime}`,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error sending missed dose alert:', error);
      throw error;
    }
  }

  /**
   * Send daily compliance summary
   */
  static async sendDailySummarySMS(params: {
    groupId: string;
    elderId: string;
    elderName: string;
    complianceRate: number;
  }): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients(params.groupId);
      const preferences = await this.getGroupNotificationPreferences(params.groupId);

      if (!preferences?.enabled || preferences.frequency === 'realtime') {
        return;
      }

      for (const recipient of recipients) {
        // DISABLED: Twilio SMS - use Firebase Phone Auth instead
        const result: SMSResponse = { success: false, error: 'SMS disabled - use Firebase Auth' };
        /* const result = await sendDailySummary({
          to: recipient,
          elderName: params.elderName,
          complianceRate: params.complianceRate
        }); */

        await this.logNotification({
          groupId: params.groupId,
          elderId: params.elderId,
          type: 'daily_summary',
          recipient,
          message: `Daily summary for ${params.elderName}: ${params.complianceRate}% compliance`,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error sending daily summary:', error);
      throw error;
    }
  }

  /**
   * Send compliance alert
   */
  static async sendComplianceAlertSMS(params: {
    groupId: string;
    elderId: string;
    elderName: string;
    complianceRate: number;
  }): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients(params.groupId);
      const preferences = await this.getGroupNotificationPreferences(params.groupId);

      if (!preferences?.enabled) {
        return;
      }

      // Only send if compliance is below 80%
      if (params.complianceRate >= 80) {
        return;
      }

      for (const recipient of recipients) {
        // DISABLED: Twilio SMS - use Firebase Phone Auth instead
        const result: SMSResponse = { success: false, error: 'SMS disabled - use Firebase Auth' };
        /* const result = await sendComplianceAlert({
          to: recipient,
          elderName: params.elderName,
          complianceRate: params.complianceRate
        }); */

        await this.logNotification({
          groupId: params.groupId,
          elderId: params.elderId,
          type: 'compliance_alert',
          recipient,
          message: `Compliance alert for ${params.elderName}: ${params.complianceRate}%`,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error sending compliance alert:', error);
      throw error;
    }
  }

  /**
   * Send weekly summary notification
   * This creates an in-app notification and logs it for tracking
   */
  static async sendWeeklySummaryNotification(params: {
    groupId: string;
    elderId: string;
    elderName: string;
    weekStart: Date;
    weekEnd: Date;
    medicationCompliance: number;
    totalMeals: number;
    insightsPriority: 'low' | 'medium' | 'high';
    topInsights: string[];
  }): Promise<void> {
    try {
      const recipients = await this.getNotificationRecipients(params.groupId);
      const preferences = await this.getGroupNotificationPreferences(params.groupId);

      if (!preferences?.enabled) {
        console.log('Notifications disabled for group');
        return;
      }

      const weekRange = `${params.weekStart.toLocaleDateString()} - ${params.weekEnd.toLocaleDateString()}`;
      const message = `Weekly summary for ${params.elderName} (${weekRange}): ${params.medicationCompliance}% medication compliance, ${params.totalMeals} meals logged. Priority: ${params.insightsPriority}`;

      // Create in-app notification for each recipient
      for (const recipient of recipients) {
        // Log the notification (will show in notification history)
        await this.logNotification({
          groupId: params.groupId,
          elderId: params.elderId,
          type: 'weekly_summary',
          recipient,
          message,
          status: 'sent'
        });
      }

      // Also store as a user notification for in-app display
      await addDoc(collection(db, 'user_notifications'), {
        groupId: params.groupId,
        elderId: params.elderId,
        type: 'weekly_summary',
        title: `Weekly Summary: ${params.elderName}`,
        message: message,
        priority: params.insightsPriority,
        insights: params.topInsights.slice(0, 3),
        weekStart: Timestamp.fromDate(params.weekStart),
        weekEnd: Timestamp.fromDate(params.weekEnd),
        read: false,
        createdAt: Timestamp.now()
      });

    } catch (error) {
      console.error('Error sending weekly summary notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user/group
   */
  static async getUnreadNotifications(groupId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'user_notifications'),
        where('groupId', '==', groupId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        weekStart: doc.data().weekStart?.toDate(),
        weekEnd: doc.data().weekEnd?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'user_notifications', notificationId), {
        read: true,
        readAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Log notification to database
   */
  static async logNotification(params: {
    groupId: string;
    elderId: string;
    type: NotificationLog['type'];
    recipient: string;
    message: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
    scheduledFor?: Date;
  }): Promise<void> {
    try {
      await addDoc(collection(db, 'notification_logs'), {
        ...params,
        sentAt: params.status === 'sent' ? Timestamp.now() : null,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Get notification logs for a group
   */
  static async getNotificationLogs(
    groupId: string,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    try {
      const q = query(
        collection(db, 'notification_logs'),
        where('groupId', '==', groupId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
        scheduledFor: doc.data().scheduledFor?.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as NotificationLog[];
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      throw error;
    }
  }

  /**
   * Create reminder schedule
   */
  static async createReminderSchedule(schedule: Omit<ReminderSchedule, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docData = {
        ...schedule,
        scheduledTime: Timestamp.fromDate(schedule.scheduledTime),
        createdAt: Timestamp.now()
      };

      // Debug: Log exact data being sent to Firestore
      console.log('Creating reminder schedule with data:', JSON.stringify({
        groupId: docData.groupId,
        elderId: docData.elderId,
        type: docData.type,
        enabled: docData.enabled,
        recipients: docData.recipients
      }));

      const docRef = await addDoc(collection(db, 'reminder_schedules'), docData);

      return docRef.id;
    } catch (error) {
      console.error('Error creating reminder schedule:', error);
      throw error;
    }
  }

  /**
   * Get reminder schedules for a group
   */
  static async getReminderSchedules(groupId: string): Promise<ReminderSchedule[]> {
    try {
      const q = query(
        collection(db, 'reminder_schedules'),
        where('groupId', '==', groupId),
        where('enabled', '==', true)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledTime: doc.data().scheduledTime.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as ReminderSchedule[];
    } catch (error) {
      console.error('Error fetching reminder schedules:', error);
      throw error;
    }
  }

  /**
   * Toggle reminder schedule
   */
  static async toggleReminderSchedule(scheduleId: string, enabled: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'reminder_schedules', scheduleId), {
        enabled
      });
    } catch (error) {
      console.error('Error toggling reminder schedule:', error);
      throw error;
    }
  }

  /**
   * Delete reminder schedule
   */
  static async deleteReminderSchedule(scheduleId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'reminder_schedules', scheduleId), {
        enabled: false,
        deletedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting reminder schedule:', error);
      throw error;
    }
  }

  // ============= FCM Push Notifications =============

  /**
   * Check if FCM is supported in this browser
   */
  static isFCMSupported(): boolean {
    return typeof window !== 'undefined' &&
           'Notification' in window &&
           'serviceWorker' in navigator &&
           'PushManager' in window;
  }

  /**
   * Request notification permission from user
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (!this.isFCMSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token for current device
   */
  static async getFCMToken(): Promise<string | null> {
    if (!this.isFCMSupported()) {
      return null;
    }

    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const messaging = getMessaging(app);

      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VAPID key not configured');
        return null;
      }

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration
      });

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to Firestore for a user
   */
  static async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const tokenRef = doc(db, `users/${userId}/fcm_tokens/${token}`);

      await setDoc(tokenRef, {
        token,
        userId,
        deviceType: 'web',
        createdAt: Timestamp.now(),
        lastUsedAt: Timestamp.now()
      }, { merge: true });

      console.log('FCM token saved successfully');
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Setup FCM for a user (request permission + get token + save)
   */
  static async setupFCMForUser(userId: string): Promise<string | null> {
    try {
      if (!this.isFCMSupported()) {
        return null;
      }

      // Request permission
      const granted = await this.requestNotificationPermission();
      if (!granted) {
        return null;
      }

      // Get token
      const token = await this.getFCMToken();
      if (!token) {
        return null;
      }

      // Save token
      await this.saveFCMToken(userId, token);

      return token;
    } catch (error) {
      console.error('Error setting up FCM:', error);
      return null;
    }
  }

  /**
   * Listen for foreground FCM messages
   */
  static setupFCMListener(callback: (payload: any) => void): (() => void) | null {
    if (!this.isFCMSupported()) {
      return null;
    }

    try {
      const messaging = getMessaging(app);

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground FCM message received:', payload);
        callback(payload);

        // Show browser notification
        if (payload.notification) {
          new Notification(payload.notification.title || 'Notification', {
            body: payload.notification.body,
            icon: payload.notification.icon || '/icon-192.png',
            badge: '/icon-badge.png',
            data: payload.data
          });
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up FCM listener:', error);
      return null;
    }
  }

  /**
   * Send admin notification about pending approval
   * This queues the notification for a Cloud Function to process
   */
  static async notifyAdminOfPendingApproval(params: {
    adminId: string;
    groupId: string;
    groupName: string;
    requestingUserName: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, 'notification_queue'), {
        type: 'pending_approval',
        userId: params.adminId,
        title: 'New Join Request',
        body: `${params.requestingUserName} wants to join ${params.groupName}`,
        data: {
          groupId: params.groupId,
          type: 'pending_approval',
          link: '/dashboard/settings?tab=group'
        },
        status: 'pending',
        createdAt: Timestamp.now()
      });

      console.log('Admin notification queued successfully');
    } catch (error) {
      console.error('Error queuing admin notification:', error);
      throw error;
    }
  }
}
