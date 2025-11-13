/**
 * Twilio SMS Service
 * Phase 5: SMS Notifications
 */

import { formatPhoneNumber } from '@/lib/utils/phoneUtils';

interface SMSOptions {
  to: string;
  message: string;
  scheduledFor?: Date;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SMSTemplate {
  type: 'medication_reminder' | 'medication_missed' | 'supplement_reminder' | 'daily_summary' | 'compliance_alert';
  elderName: string;
  itemName?: string;
  time?: string;
  complianceRate?: number;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS({ to, message }: SMSOptions): Promise<SMSResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[DEV MODE] SMS would be sent to:', to);
    console.log('[DEV MODE] Message:', message);
    return {
      success: true,
      messageId: `mock_${Date.now()}`
    };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: formatPhoneNumber(to),
          Body: message
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send SMS');
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.sid
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate SMS message from template
 */
export function generateSMSMessage(template: SMSTemplate): string {
  switch (template.type) {
    case 'medication_reminder':
      return `⏰ Reminder: ${template.elderName} - ${template.itemName} due at ${template.time}. Reply TAKEN to confirm.`;

    case 'medication_missed':
      return `⚠️ Alert: ${template.elderName} missed ${template.itemName} scheduled for ${template.time}. Please check in.`;

    case 'supplement_reminder':
      return `💊 Reminder: ${template.elderName} - ${template.itemName} supplement due at ${template.time}.`;

    case 'daily_summary':
      return `📊 Daily Summary for ${template.elderName}: ${template.complianceRate}% compliance today. ${template.complianceRate && template.complianceRate < 80 ? 'Review missed doses in app.' : 'Great job!'}`;

    case 'compliance_alert':
      return `⚠️ Compliance Alert: ${template.elderName} has ${template.complianceRate}% compliance this week. Action may be needed.`;

    default:
      return 'myguide.health notification';
  }
}

/**
 * Send medication reminder
 */
export async function sendMedicationReminder(params: {
  to: string;
  elderName: string;
  medicationName: string;
  scheduledTime: string;
}): Promise<SMSResponse> {
  const message = generateSMSMessage({
    type: 'medication_reminder',
    elderName: params.elderName,
    itemName: params.medicationName,
    time: params.scheduledTime
  });

  return sendSMS({ to: params.to, message });
}

/**
 * Send missed dose alert
 */
export async function sendMissedDoseAlert(params: {
  to: string;
  elderName: string;
  medicationName: string;
  missedTime: string;
}): Promise<SMSResponse> {
  const message = generateSMSMessage({
    type: 'medication_missed',
    elderName: params.elderName,
    itemName: params.medicationName,
    time: params.missedTime
  });

  return sendSMS({ to: params.to, message });
}

/**
 * Send daily summary
 */
export async function sendDailySummary(params: {
  to: string;
  elderName: string;
  complianceRate: number;
}): Promise<SMSResponse> {
  const message = generateSMSMessage({
    type: 'daily_summary',
    elderName: params.elderName,
    complianceRate: params.complianceRate
  });

  return sendSMS({ to: params.to, message });
}

/**
 * Send compliance alert
 */
export async function sendComplianceAlert(params: {
  to: string;
  elderName: string;
  complianceRate: number;
}): Promise<SMSResponse> {
  const message = generateSMSMessage({
    type: 'compliance_alert',
    elderName: params.elderName,
    complianceRate: params.complianceRate
  });

  return sendSMS({ to: params.to, message });
}

/**
 * Parse incoming SMS for commands
 */
export function parseSMSCommand(message: string): {
  command: 'taken' | 'missed' | 'skip' | 'help' | 'unknown';
  original: string;
} {
  const normalized = message.toLowerCase().trim();

  if (['taken', 'done', 'yes', 'confirmed', 'confirm'].includes(normalized)) {
    return { command: 'taken', original: message };
  }

  if (['missed', 'no', 'forgot'].includes(normalized)) {
    return { command: 'missed', original: message };
  }

  if (['skip', 'skipped', 'not needed', 'cancel'].includes(normalized)) {
    return { command: 'skip', original: message };
  }

  if (['help', 'info', '?'].includes(normalized)) {
    return { command: 'help', original: message };
  }

  return { command: 'unknown', original: message };
}

/**
 * Generate help message for SMS commands
 */
export function getHelpMessage(): string {
  return `myguide.health SMS Commands:\n• TAKEN - Confirm medication taken\n• MISSED - Report missed dose\n• SKIP - Skip this dose\n• HELP - Show this message\n\nVisit myguide.health for more.`;
}

/**
 * Validate phone number for SMS
 */
export function validatePhoneForSMS(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // US phone numbers should be 10 digits (without country code) or 11 (with +1)
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Schedule SMS for future delivery
 * Note: Requires Twilio's Messaging Service or external scheduler (Firebase Functions)
 */
export async function scheduleSMS(options: SMSOptions): Promise<SMSResponse> {
  if (!options.scheduledFor) {
    return sendSMS(options);
  }

  // For development, just log
  console.log('[DEV MODE] SMS scheduled for:', options.scheduledFor);
  console.log('[DEV MODE] Will send to:', options.to);
  console.log('[DEV MODE] Message:', options.message);

  // In production, this would:
  // 1. Store in Firestore with scheduled time
  // 2. Firebase Function triggered by schedule
  // 3. Send SMS at scheduled time

  return {
    success: true,
    messageId: `scheduled_${Date.now()}`
  };
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSMS(recipients: string[], message: string): Promise<SMSResponse[]> {
  const promises = recipients.map(to => sendSMS({ to, message }));
  return Promise.all(promises);
}

/**
 * Get SMS delivery status
 */
export async function getSMSStatus(messageId: string): Promise<{
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorCode?: string;
}> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { status: 'delivered' }; // Mock for development
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageId}.json`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      }
    );

    const data = await response.json();

    return {
      status: data.status,
      errorCode: data.error_code
    };
  } catch (error) {
    console.error('Error fetching SMS status:', error);
    return { status: 'failed' };
  }
}
