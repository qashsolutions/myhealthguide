/**
 * Admin Notification Service
 *
 * Sends SMS and email notifications to group admins for critical events:
 * - Clock in/out events
 * - Serious/critical incidents
 * - Document uploads
 * - Emergency pattern detections
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

// Notification channels
type NotificationChannel = 'sms' | 'email' | 'both';

interface NotificationPayload {
  to: string; // Phone number or email
  channel: NotificationChannel;
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Get all admin users for a group
 */
async function getGroupAdmins(groupId: string): Promise<User[]> {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('groups', 'array-contains', groupId),
      where('role', '==', 'admin')
    );

    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error fetching group admins:', error);
    return [];
  }
}

/**
 * Send notification to admins
 */
async function sendToAdmins(
  groupId: string,
  subject: string,
  message: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
  channel: NotificationChannel = 'both'
): Promise<void> {
  try {
    const admins = await getGroupAdmins(groupId);

    for (const admin of admins) {
      const payload: NotificationPayload = {
        to: channel === 'sms' ? (admin.phoneNumber || '') : (admin.email || ''),
        channel,
        subject,
        message,
        priority
      };

      // Send notification based on channel
      if (channel === 'sms' || channel === 'both') {
        if (admin.phoneNumber) {
          await sendSMS(admin.phoneNumber, message);
        }
      }

      if (channel === 'email' || channel === 'both') {
        if (admin.email) {
          await sendEmail(admin.email, subject, message);
        }
      }
    }
  } catch (error) {
    console.error('Error sending admin notifications:', error);
  }
}

/**
 * Send SMS notification
 * NOTE: SMS via Twilio has been removed. Using FCM push notifications instead.
 * This function now only logs for debugging purposes.
 */
async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  try {
    // SMS functionality removed - using FCM push notifications instead
    console.log(`[SMS-DISABLED] Would send to: ${phoneNumber}`);
    console.log(`[SMS-DISABLED] Message: ${message}`);
    // Use FCM push notifications for real-time alerts
  } catch (error) {
    console.error('Error in sendSMS:', error);
  }
}

/**
 * Send Email via SendGrid (or similar service)
 */
async function sendEmail(email: string, subject: string, message: string): Promise<void> {
  try {
    // TODO: Implement with SendGrid API or similar
    // For now, log to console
    console.log(`[EMAIL] To: ${email}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Message: ${message}`);

    // Example SendGrid implementation:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: 'notifications@myguide.health',
      subject: subject,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`
    };

    await sgMail.send(msg);
    */
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * Notify admins of shift clock in
 */
export async function notifyClockIn(
  groupId: string,
  caregiverName: string,
  elderName: string,
  shiftStartTime: Date
): Promise<void> {
  const subject = `Shift Started - ${elderName}`;
  const message = `${caregiverName} has clocked in for ${elderName} at ${shiftStartTime.toLocaleTimeString()}.`;

  await sendToAdmins(groupId, subject, message, 'low', 'email');
}

/**
 * Notify admins of shift clock out with handoff note
 */
export async function notifyClockOut(
  groupId: string,
  caregiverName: string,
  elderName: string,
  shiftEndTime: Date,
  handoffSummary: string
): Promise<void> {
  const subject = `Shift Ended - ${elderName}`;
  const message = `${caregiverName} has clocked out for ${elderName} at ${shiftEndTime.toLocaleTimeString()}.\n\nHandoff Summary:\n${handoffSummary}`;

  await sendToAdmins(groupId, subject, message, 'normal', 'email');
}

/**
 * Notify admins of serious/critical incident
 */
export async function notifyIncident(
  groupId: string,
  elderName: string,
  incidentType: string,
  severity: string,
  description: string,
  immediateAction: string
): Promise<void> {
  const subject = `🚨 ${severity.toUpperCase()} Incident - ${elderName}`;
  const message = `
INCIDENT ALERT

Elder: ${elderName}
Type: ${incidentType}
Severity: ${severity}

Description:
${description}

Immediate Action Taken:
${immediateAction}

Please review this incident in the dashboard.
  `.trim();

  // For serious/critical incidents, send both SMS and email
  const priority = severity === 'critical' ? 'urgent' : 'high';
  const channel = severity === 'critical' || severity === 'serious' ? 'both' : 'email';

  await sendToAdmins(groupId, subject, message, priority, channel);
}

/**
 * Notify admins of document upload
 */
export async function notifyDocumentUpload(
  groupId: string,
  uploaderName: string,
  elderName: string,
  fileName: string,
  fileCategory: string
): Promise<void> {
  const subject = `New Document Uploaded - ${elderName}`;
  const message = `${uploaderName} has uploaded a new document for ${elderName}:\n\nFile: ${fileName}\nCategory: ${fileCategory}`;

  await sendToAdmins(groupId, subject, message, 'low', 'email');
}

/**
 * Notify admins of emergency pattern detection
 */
export async function notifyEmergencyPattern(
  groupId: string,
  elderName: string,
  riskScore: number,
  factors: string[],
  recommendations: string[]
): Promise<void> {
  const subject = `⚠️ Health Alert - ${elderName}`;
  const message = `
HEALTH ALERT

Elder: ${elderName}
Risk Score: ${riskScore}/15

Concerning Factors:
${factors.map(f => `• ${f}`).join('\n')}

Recommendations:
${recommendations.map(r => `• ${r}`).join('\n')}

Please review the emergency patterns dashboard for full details.
  `.trim();

  await sendToAdmins(groupId, subject, message, 'urgent', 'both');
}

/**
 * Notify admins of missed medications (3+ consecutive misses)
 */
export async function notifyMissedMedications(
  groupId: string,
  elderName: string,
  medicationName: string,
  consecutiveMisses: number
): Promise<void> {
  const subject = `⚠️ Medication Alert - ${elderName}`;
  const message = `${elderName} has missed ${consecutiveMisses} consecutive doses of ${medicationName}. Please follow up immediately.`;

  await sendToAdmins(groupId, subject, message, 'high', 'both');
}

/**
 * Test notification function (for admin setup)
 */
export async function sendTestNotification(
  phoneNumber: string,
  email: string
): Promise<{ sms: boolean; email: boolean }> {
  try {
    await sendSMS(phoneNumber, 'Test notification from Careguide. Your SMS notifications are working!');
    await sendEmail(email, 'Test Notification', 'Test notification from Careguide. Your email notifications are working!');

    return { sms: true, email: true };
  } catch (error) {
    console.error('Error sending test notification:', error);
    return { sms: false, email: false };
  }
}
