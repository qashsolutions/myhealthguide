/**
 * User Alert Preferences Management (Phase 3)
 *
 * Allows users to customize alert behavior beyond AI learning:
 * - Set custom thresholds per alert type
 * - Exclude specific medications from refill alerts
 * - Configure quiet hours
 * - Choose notification channels
 * - Enable digest mode (batch alerts)
 * - Override AI sensitivity settings
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
  getDoc,
  deleteField
} from 'firebase/firestore';
import type { UserAlertPreferences, AlertType } from '@/types';

/**
 * Get user alert preferences (creates default if doesn't exist)
 */
export async function getUserAlertPreferences(
  userId: string,
  groupId: string
): Promise<UserAlertPreferences> {
  try {
    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const data = snap.docs[0].data();
      return {
        userId,
        groupId,
        ...data
      } as UserAlertPreferences;
    }

    // Create default preferences
    const defaultPreferences: Omit<UserAlertPreferences, 'userId' | 'groupId'> = {
      preferences: {
        medicationRefillAlerts: {
          enabled: true,
          thresholdDays: 7,
          excludedMedications: []
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
        alertTypePreferences: {} as any
      },
      updatedAt: new Date()
    };

    const ref = await addDoc(collection(db, 'userAlertPreferences'), {
      userId,
      groupId,
      ...defaultPreferences
    });

    return {
      userId,
      groupId,
      ...defaultPreferences
    };
  } catch (error) {
    console.error('Error getting user alert preferences:', error);
    throw error;
  }
}

/**
 * Update medication refill alert preferences
 */
export async function updateMedicationRefillPreferences(
  userId: string,
  groupId: string,
  preferences: {
    enabled?: boolean;
    thresholdDays?: number;
    excludedMedications?: string[];
    quietHours?: { start: string; end: string };
  }
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      // Build update object, excluding undefined values (Firestore doesn't accept undefined)
      const currentMedPrefs = currentPrefs.preferences.medicationRefillAlerts;
      const updatedMedPrefs: Record<string, any> = {
        enabled: preferences.enabled ?? currentMedPrefs.enabled,
        thresholdDays: preferences.thresholdDays ?? currentMedPrefs.thresholdDays,
        excludedMedications: preferences.excludedMedications ?? currentMedPrefs.excludedMedications
      };

      // Handle quietHours: use deleteField() to remove, or set if provided
      if (preferences.quietHours === undefined && currentMedPrefs.quietHours === undefined) {
        // Neither has quietHours, don't include it
      } else if (preferences.quietHours) {
        // User is setting quietHours
        updatedMedPrefs.quietHours = preferences.quietHours;
      } else if (preferences.quietHours === undefined && currentMedPrefs.quietHours) {
        // User is disabling quietHours - use deleteField()
        updatedMedPrefs.quietHours = deleteField();
      }

      await updateDoc(prefRef, {
        'preferences.medicationRefillAlerts': updatedMedPrefs,
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated medication refill preferences for user ${userId}`);
  } catch (error) {
    console.error('Error updating medication refill preferences:', error);
    throw error;
  }
}

/**
 * Update emergency alert preferences
 */
export async function updateEmergencyAlertPreferences(
  userId: string,
  groupId: string,
  preferences: {
    enabled?: boolean;
    sensitivity?: 'low' | 'medium' | 'high';
    requireMultipleFactors?: boolean;
    minimumRiskScore?: number;
    autoEscalate?: boolean;
  }
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      await updateDoc(prefRef, {
        'preferences.emergencyAlerts': {
          ...currentPrefs.preferences.emergencyAlerts,
          ...preferences
        },
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated emergency alert preferences for user ${userId}`);
  } catch (error) {
    console.error('Error updating emergency alert preferences:', error);
    throw error;
  }
}

/**
 * Update shift handoff alert preferences
 */
export async function updateShiftHandoffPreferences(
  userId: string,
  groupId: string,
  preferences: {
    enabled?: boolean;
    onlyShowNonRoutine?: boolean;
    notifyOnShiftEnd?: boolean;
  }
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      await updateDoc(prefRef, {
        'preferences.shiftHandoffAlerts': {
          ...currentPrefs.preferences.shiftHandoffAlerts,
          ...preferences
        },
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated shift handoff preferences for user ${userId}`);
  } catch (error) {
    console.error('Error updating shift handoff preferences:', error);
    throw error;
  }
}

/**
 * Update appointment reminder preferences
 */
export async function updateAppointmentReminderPreferences(
  userId: string,
  groupId: string,
  preferences: {
    enabled?: boolean;
    advanceNoticeDays?: number[];
    autoGenerateVisitPrep?: boolean;
  }
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      await updateDoc(prefRef, {
        'preferences.appointmentReminders': {
          ...currentPrefs.preferences.appointmentReminders,
          ...preferences
        },
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated appointment reminder preferences for user ${userId}`);
  } catch (error) {
    console.error('Error updating appointment reminder preferences:', error);
    throw error;
  }
}

/**
 * Update notification channel preferences
 */
export async function updateNotificationChannels(
  userId: string,
  groupId: string,
  channels: {
    dashboard?: boolean;
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  }
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      await updateDoc(prefRef, {
        'preferences.notificationChannels': {
          ...currentPrefs.preferences.notificationChannels,
          ...channels
        },
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated notification channels for user ${userId}`);
  } catch (error) {
    console.error('Error updating notification channels:', error);
    throw error;
  }
}

/**
 * Enable/disable digest mode
 */
export async function updateDigestMode(
  userId: string,
  groupId: string,
  digestMode: {
    enabled: boolean;
    deliveryTime?: string;
  }
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      await updateDoc(prefRef, {
        'preferences.digestMode': {
          enabled: digestMode.enabled,
          deliveryTime: digestMode.deliveryTime || currentPrefs.preferences.digestMode.deliveryTime
        },
        updatedAt: new Date()
      });
    }

    console.log(`✅ Updated digest mode for user ${userId}`);
  } catch (error) {
    console.error('Error updating digest mode:', error);
    throw error;
  }
}

/**
 * Exclude a medication from refill alerts
 */
export async function excludeMedicationFromRefillAlerts(
  userId: string,
  groupId: string,
  medicationId: string
): Promise<void> {
  try {
    const currentPrefs = await getUserAlertPreferences(userId, groupId);

    const excludedMeds = currentPrefs.preferences.medicationRefillAlerts.excludedMedications;

    if (!excludedMeds.includes(medicationId)) {
      excludedMeds.push(medicationId);

      await updateMedicationRefillPreferences(userId, groupId, {
        excludedMedications: excludedMeds
      });
    }

    console.log(`✅ Excluded medication ${medicationId} from refill alerts`);
  } catch (error) {
    console.error('Error excluding medication from refill alerts:', error);
    throw error;
  }
}

/**
 * Check if user should receive alert based on preferences
 */
export async function shouldReceiveAlert(
  userId: string,
  groupId: string,
  alertType: AlertType,
  alertData?: Record<string, any>
): Promise<boolean> {
  try {
    const preferences = await getUserAlertPreferences(userId, groupId);

    // Check if in quiet hours
    if (preferences.preferences.medicationRefillAlerts.quietHours) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = preferences.preferences.medicationRefillAlerts.quietHours;

      if (currentTime >= start && currentTime <= end) {
        console.log(`User ${userId} in quiet hours - suppressing alert`);
        return false;
      }
    }

    // Check alert-specific preferences
    switch (alertType) {
      case 'medication_refill':
        if (!preferences.preferences.medicationRefillAlerts.enabled) {
          return false;
        }

        // Check if medication is excluded
        if (
          alertData?.medicationId &&
          preferences.preferences.medicationRefillAlerts.excludedMedications.includes(
            alertData.medicationId
          )
        ) {
          return false;
        }
        break;

      case 'emergency_pattern':
        if (!preferences.preferences.emergencyAlerts.enabled) {
          return false;
        }

        // Check minimum risk score
        if (
          alertData?.riskScore &&
          alertData.riskScore < preferences.preferences.emergencyAlerts.minimumRiskScore
        ) {
          return false;
        }
        break;

      case 'shift_handoff':
        if (!preferences.preferences.shiftHandoffAlerts.enabled) {
          return false;
        }

        // Check if should only show non-routine
        if (
          preferences.preferences.shiftHandoffAlerts.onlyShowNonRoutine &&
          alertData?.isRoutineShift
        ) {
          return false;
        }
        break;

      case 'appointment_reminder':
      case 'doctor_visit_prep':
        if (!preferences.preferences.appointmentReminders.enabled) {
          return false;
        }
        break;
    }

    return true;
  } catch (error) {
    console.error('Error checking if user should receive alert:', error);
    return true; // Default to sending alert on error
  }
}

/**
 * Get recommended alert channels for user
 */
export async function getRecommendedAlertChannels(
  userId: string,
  groupId: string,
  alertSeverity: 'info' | 'warning' | 'critical'
): Promise<('dashboard' | 'sms' | 'email' | 'push')[]> {
  try {
    const preferences = await getUserAlertPreferences(userId, groupId);
    const channels: ('dashboard' | 'sms' | 'email' | 'push')[] = [];

    const enabledChannels = preferences.preferences.notificationChannels;

    // Dashboard always included if enabled
    if (enabledChannels.dashboard) {
      channels.push('dashboard');
    }

    // Critical alerts: use ALL enabled channels
    if (alertSeverity === 'critical') {
      if (enabledChannels.sms) channels.push('sms');
      if (enabledChannels.email) channels.push('email');
      if (enabledChannels.push) channels.push('push');
      return channels;
    }

    // Warning alerts: SMS + Push (if enabled)
    if (alertSeverity === 'warning') {
      if (enabledChannels.push) channels.push('push');
      if (enabledChannels.sms) channels.push('sms');
      return channels;
    }

    // Info alerts: Push only (if enabled)
    if (alertSeverity === 'info') {
      if (enabledChannels.push) channels.push('push');
      return channels;
    }

    return channels;
  } catch (error) {
    console.error('Error getting recommended alert channels:', error);
    return ['dashboard']; // Default fallback
  }
}

/**
 * Reset preferences to defaults
 */
export async function resetAlertPreferencesToDefaults(
  userId: string,
  groupId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, 'userAlertPreferences'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const prefRef = doc(db, 'userAlertPreferences', snap.docs[0].id);

      await updateDoc(prefRef, {
        preferences: {
          medicationRefillAlerts: {
            enabled: true,
            thresholdDays: 7,
            excludedMedications: []
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
        updatedAt: new Date()
      });
    }

    console.log(`✅ Reset alert preferences to defaults for user ${userId}`);
  } catch (error) {
    console.error('Error resetting alert preferences:', error);
    throw error;
  }
}
