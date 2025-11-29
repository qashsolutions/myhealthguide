/**
 * Appointment Reminder Service
 *
 * Generates proactive appointment reminders:
 * - 7 days before: Early heads-up with visit prep prompt
 * - 3 days before: Reminder with prep materials
 * - 1 day before: Final reminder with logistics check
 * - Day of: Morning reminder with all details
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import type { Alert, AlertSeverity } from '@/types';

const ALERTS_COLLECTION = 'alerts';
const APPOINTMENTS_COLLECTION = 'appointments';

export interface Appointment {
  id: string;
  groupId: string;
  elderId: string;
  title: string;
  type: 'doctor' | 'specialist' | 'lab' | 'therapy' | 'other';
  provider?: string;
  location?: string;
  dateTime: Date;
  duration?: number;
  notes?: string;
  remindersSent?: number[];
  createdBy: string;
  createdAt: Date;
}

export interface AppointmentReminderConfig {
  advanceNoticeDays: number[];
  autoGenerateVisitPrep: boolean;
}

/**
 * Check for upcoming appointments and generate reminders
 */
export async function checkUpcomingAppointments(
  groupId: string,
  elderId: string,
  elderName: string,
  config: AppointmentReminderConfig = {
    advanceNoticeDays: [7, 3, 1, 0],
    autoGenerateVisitPrep: true
  }
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    const now = new Date();
    const maxLookAhead = Math.max(...config.advanceNoticeDays) + 1;
    const lookAheadDate = new Date(now);
    lookAheadDate.setDate(lookAheadDate.getDate() + maxLookAhead);

    // Query upcoming appointments
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('dateTime', '>=', Timestamp.fromDate(now)),
      where('dateTime', '<=', Timestamp.fromDate(lookAheadDate))
    );

    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const data = doc.data();
      const appointment: Appointment = {
        id: doc.id,
        ...data,
        dateTime: data.dateTime?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      } as Appointment;

      // Calculate days until appointment
      const appointmentDate = new Date(appointment.dateTime);
      const daysUntil = Math.ceil(
        (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should send a reminder for this interval
      const remindersSent = appointment.remindersSent || [];
      const shouldRemind = config.advanceNoticeDays.includes(daysUntil) &&
        !remindersSent.includes(daysUntil);

      if (shouldRemind) {
        const alert = await createAppointmentReminder(
          appointment,
          elderName,
          daysUntil,
          config.autoGenerateVisitPrep
        );

        if (alert) {
          alerts.push(alert);

          // Mark reminder as sent
          remindersSent.push(daysUntil);
          await updateDoc(doc.ref, { remindersSent });
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error checking upcoming appointments:', error);
    return [];
  }
}

/**
 * Create an appointment reminder alert
 */
async function createAppointmentReminder(
  appointment: Appointment,
  elderName: string,
  daysUntil: number,
  autoGenerateVisitPrep: boolean
): Promise<Alert | null> {
  try {
    let severity: AlertSeverity;
    let title: string;
    let message: string;
    let recommendations: string[] = [];

    const appointmentTime = new Date(appointment.dateTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const appointmentDate = new Date(appointment.dateTime).toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    if (daysUntil === 0) {
      // Day of appointment
      severity = 'warning';
      title = `📅 ${elderName}'s ${appointment.type} appointment TODAY`;
      message = `${appointment.title} at ${appointmentTime}${appointment.location ? ` - ${appointment.location}` : ''}.`;
      recommendations = [
        'Confirm transportation is arranged',
        'Gather insurance cards and ID',
        'Bring list of current medications',
        'Review any questions to ask'
      ];
    } else if (daysUntil === 1) {
      // Tomorrow
      severity = 'warning';
      title = `📅 ${elderName}'s ${appointment.type} appointment TOMORROW`;
      message = `${appointment.title} on ${appointmentDate} at ${appointmentTime}.`;
      recommendations = [
        'Confirm appointment with provider',
        'Prepare transportation',
        'Gather required documents'
      ];
      if (autoGenerateVisitPrep && appointment.type === 'doctor') {
        recommendations.push('Generate Doctor Visit Prep report');
      }
    } else if (daysUntil === 3) {
      // 3 days away
      severity = 'info';
      title = `📅 Upcoming: ${elderName}'s ${appointment.type} appointment in 3 days`;
      message = `${appointment.title} on ${appointmentDate} at ${appointmentTime}.`;
      recommendations = [
        'Review recent health changes to discuss',
        'Note any medication concerns'
      ];
      if (autoGenerateVisitPrep && appointment.type === 'doctor') {
        recommendations.push('Consider generating Doctor Visit Prep report');
      }
    } else if (daysUntil === 7) {
      // Week away
      severity = 'info';
      title = `📅 Reminder: ${elderName} has ${appointment.type} appointment next week`;
      message = `${appointment.title} on ${appointmentDate} at ${appointmentTime}.`;
      recommendations = [
        'Mark your calendar',
        'Arrange transportation if needed'
      ];
    } else {
      return null;
    }

    const alert: Alert = {
      id: '',
      groupId: appointment.groupId,
      elderId: appointment.elderId,
      type: 'appointment_reminder',
      severity,
      title,
      message,
      data: {
        appointmentId: appointment.id,
        appointmentType: appointment.type,
        appointmentTitle: appointment.title,
        dateTime: appointment.dateTime,
        location: appointment.location,
        provider: appointment.provider,
        daysUntil,
        recommendations
      },
      createdAt: new Date(),
      status: 'active',
      notificationSent: false,
      notificationChannels: ['dashboard'],
      viewedBy: []
    };

    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), {
      ...alert,
      createdAt: Timestamp.fromDate(alert.createdAt),
      data: {
        ...alert.data,
        dateTime: Timestamp.fromDate(new Date(appointment.dateTime))
      }
    });
    alert.id = docRef.id;

    return alert;
  } catch (error) {
    console.error('Error creating appointment reminder:', error);
    return null;
  }
}

/**
 * Get upcoming appointments for an elder
 */
export async function getUpcomingAppointments(
  groupId: string,
  elderId: string,
  daysAhead: number = 30
): Promise<Appointment[]> {
  try {
    const now = new Date();
    const lookAhead = new Date(now);
    lookAhead.setDate(lookAhead.getDate() + daysAhead);

    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('dateTime', '>=', Timestamp.fromDate(now)),
      where('dateTime', '<=', Timestamp.fromDate(lookAhead))
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateTime: data.dateTime?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      } as Appointment;
    }).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  } catch (error) {
    console.error('Error getting upcoming appointments:', error);
    return [];
  }
}

/**
 * Check all elders in a group for appointment reminders
 */
export async function checkGroupAppointments(
  groupId: string,
  config?: AppointmentReminderConfig
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Get all elders in group
    const eldersQ = query(
      collection(db, 'elders'),
      where('groupId', '==', groupId)
    );
    const eldersSnap = await getDocs(eldersQ);

    for (const elderDoc of eldersSnap.docs) {
      const elder = elderDoc.data();
      const elderAlerts = await checkUpcomingAppointments(
        groupId,
        elderDoc.id,
        elder.name || 'Elder',
        config
      );
      alerts.push(...elderAlerts);
    }

    return alerts;
  } catch (error) {
    console.error('Error checking group appointments:', error);
    return [];
  }
}
