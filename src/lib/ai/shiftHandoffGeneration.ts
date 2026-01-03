/**
 * Shift Handoff Note Generation Service
 *
 * Phase 1: Context-aware, intelligent silence
 * - Auto-generates handoff notes at shift end (if enabled)
 * - Only includes NOTABLE events (not robotic logs)
 * - Marks routine shifts with "no concerns" summary
 * - Provides actionable notes for next caregiver
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import type {
  ShiftSession,
  ShiftHandoffNote,
  MedicationLog,
  DietEntry,
  SupplementLog,
  Elder
} from '@/types';
import { generateSOAPNote, shouldSendFamilyNotification, formatFamilyNotification } from './soapNoteGenerator';

interface NotableEvent {
  type: 'symptom' | 'mood' | 'incident' | 'visitor' | 'activity' | 'other';
  description: string;
  time: Date;
  severity?: 'info' | 'warning' | 'critical';
}

/**
 * Generate shift handoff note when caregiver ends shift
 */
export async function generateShiftHandoffNote(
  shiftSessionId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  caregiverName?: string
): Promise<ShiftHandoffNote | null> {
  try {
    // Get shift session by document ID
    const shiftRef = doc(db, 'shiftSessions', shiftSessionId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      console.error('[ShiftHandoff] Shift session not found:', shiftSessionId);
      throw new Error('Shift session not found');
    }

    const shiftData = shiftSnap.data();

    // Convert Firestore Timestamps to JavaScript Dates
    const convertTimestamp = (ts: any): Date => {
      if (!ts) return new Date();
      if (ts instanceof Date) return ts;
      if (typeof ts === 'object' && 'seconds' in ts) {
        return new Date(ts.seconds * 1000);
      }
      return new Date(ts);
    };

    const shift = {
      id: shiftSnap.id,
      ...shiftData,
      startTime: convertTimestamp(shiftData.startTime),
      endTime: convertTimestamp(shiftData.endTime),
      createdAt: convertTimestamp(shiftData.createdAt),
      updatedAt: convertTimestamp(shiftData.updatedAt),
    } as ShiftSession;

    if (!shift.endTime) {
      throw new Error('Shift not ended yet');
    }

    // Gather shift data (now includes supplements)
    const gatheredData = await gatherShiftData(
      groupId,
      elderId,
      shift.startTime,
      shift.endTime
    );

    // Analyze medications given during shift
    const medicationsGiven = analyzeMedicationsDuringShift(
      gatheredData.medicationLogs,
      shift.startTime,
      shift.endTime
    );

    // Analyze meals during shift
    const mealsLogged = analyzeMealsDuringShift(
      gatheredData.dietEntries,
      shift.startTime,
      shift.endTime
    );

    // Extract notable events from notes
    const notableEvents = extractNotableEvents(
      gatheredData.medicationLogs,
      gatheredData.dietEntries
    );

    // Determine mood from logs
    const mood = determineMoodFromLogs(
      gatheredData.medicationLogs,
      gatheredData.dietEntries,
      notableEvents
    );

    // Generate AI notes for next shift (legacy format)
    const notesForNextShift = generateNextShiftNotes(
      medicationsGiven,
      mealsLogged,
      notableEvents,
      mood
    );

    // Determine if this is a routine shift (no notable events)
    const isRoutineShift = isShiftRoutine(
      medicationsGiven,
      mealsLogged,
      notableEvents,
      mood
    );

    // Generate SOAP note using AI/rule-based system
    const soapNote = await generateSOAPNote({
      elderName,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      caregiverName: caregiverName || 'Caregiver',
      medicationLogs: gatheredData.medicationLogs,
      supplementLogs: gatheredData.supplementLogs,
      dietEntries: gatheredData.dietEntries,
      notableEvents,
      mood,
    });

    // Create handoff note - exclude undefined fields for Firestore
    const handoffNote: Record<string, any> = {
      shiftSessionId,
      groupId,
      elderId,
      caregiverId: shift.caregiverId,
      generatedAt: new Date(),
      shiftPeriod: {
        start: shift.startTime,
        end: shift.endTime
      },
      summary: {
        medicationsGiven,
        mealsLogged,
        notableEvents,
        mood,
        notesForNextShift
      },
      isRoutineShift,
      viewedBy: [],
      // Add SOAP note
      soapNote: {
        ...soapNote,
        // Convert dates to Firestore-compatible format
        generatedAt: soapNote.generatedAt,
        objective: {
          ...soapNote.objective,
          medications: soapNote.objective.medications.map(m => ({
            ...m,
            time: m.time
          })),
          supplements: soapNote.objective.supplements.map(s => ({
            ...s,
            time: s.time
          })),
          nutrition: soapNote.objective.nutrition.map(n => ({
            ...n,
            time: n.time
          })),
        }
      }
    };

    // Save to Firestore
    const handoffRef = await addDoc(collection(db, 'shiftHandoffNotes'), handoffNote);

    // Update shift session
    await updateDoc(doc(db, 'shiftSessions', shiftSessionId), {
      handoffNoteGenerated: true,
      handoffNoteId: handoffRef.id
    });

    // Check if family notification should be sent
    if (shouldSendFamilyNotification(soapNote)) {
      const alertMessage = formatFamilyNotification(soapNote, elderName);
      console.log('Family notification triggered:', alertMessage);

      // Send push notifications to family members
      await sendFamilyPushNotifications(
        groupId,
        elderId,
        elderName,
        alertMessage,
        shift.caregiverId,
        handoffRef.id
      );

      // Update the handoff note with notification status
      await updateDoc(handoffRef, {
        'soapNote.plan.familyAlertSent': true,
        'soapNote.plan.familyAlertMessage': alertMessage
      });
    }

    return { ...handoffNote, id: handoffRef.id } as ShiftHandoffNote;
  } catch (error) {
    console.error('Error generating shift handoff note:', error);
    return null;
  }
}

/**
 * Gather all data logged during shift
 */
async function gatherShiftData(
  groupId: string,
  elderId: string,
  startTime: Date,
  endTime: Date
) {
  // Get medication logs during shift (collection is snake_case in Firestore)
  const medLogsQuery = query(
    collection(db, 'medication_logs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('createdAt', '>=', Timestamp.fromDate(startTime)),
    where('createdAt', '<=', Timestamp.fromDate(endTime)),
    orderBy('createdAt', 'desc')
  );
  const medLogsSnap = await getDocs(medLogsQuery);
  const medicationLogs = medLogsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as MedicationLog[];

  // Get supplement logs during shift (collection is snake_case in Firestore)
  const suppLogsQuery = query(
    collection(db, 'supplement_logs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('timestamp', '>=', Timestamp.fromDate(startTime)),
    where('timestamp', '<=', Timestamp.fromDate(endTime)),
    orderBy('timestamp', 'desc')
  );
  const suppLogsSnap = await getDocs(suppLogsQuery);
  const supplementLogs = suppLogsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as SupplementLog[];

  // Get diet entries during shift (collection is snake_case in Firestore)
  const dietQuery = query(
    collection(db, 'diet_entries'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('timestamp', '>=', Timestamp.fromDate(startTime)),
    where('timestamp', '<=', Timestamp.fromDate(endTime)),
    orderBy('timestamp', 'desc')
  );
  const dietSnap = await getDocs(dietQuery);
  const dietEntries = dietSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as DietEntry[];

  return {
    medicationLogs,
    supplementLogs,
    dietEntries
  };
}

/**
 * Analyze medications given during shift
 */
function analyzeMedicationsDuringShift(
  logs: MedicationLog[],
  shiftStart: Date,
  shiftEnd: Date
) {
  // Get medications from Firestore (we need names)
  const medicationsGiven = logs.map((log) => {
    let status: 'on-time' | 'late' | 'missed' = 'on-time';

    if (log.status === 'missed') {
      status = 'missed';
    } else if (log.status === 'taken' && log.actualTime) {
      const scheduledTime = new Date(log.scheduledTime);
      const actualTime = new Date(log.actualTime);
      const diffMinutes = (actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60);

      if (diffMinutes > 30) {
        status = 'late';
      }
    }

    return {
      name: log.medicationId, // Will need to join with medication name in UI
      time: log.actualTime || log.scheduledTime,
      status,
      notes: log.notes
    };
  });

  return medicationsGiven;
}

/**
 * Analyze meals during shift
 */
function analyzeMealsDuringShift(dietEntries: DietEntry[], shiftStart: Date, shiftEnd: Date) {
  const mealsLogged = dietEntries.map((entry) => {
    // Extract percentage eaten from notes if available
    let percentageEaten: number | undefined;
    if (entry.notes) {
      const percentMatch = entry.notes.match(/(\d+)%/);
      if (percentMatch) {
        percentageEaten = parseInt(percentMatch[1]);
      }
    }

    // Extract concerns from notes
    let concerns: string | undefined;
    const concernKeywords = ['refused', 'declined', 'poor appetite', 'not hungry', 'barely ate'];
    if (entry.notes) {
      const notesLower = entry.notes.toLowerCase();
      const foundConcerns = concernKeywords.filter((kw) => notesLower.includes(kw));
      if (foundConcerns.length > 0) {
        concerns = entry.notes;
      }
    }

    return {
      meal: entry.meal,
      time: entry.timestamp,
      percentageEaten,
      concerns
    };
  });

  return mealsLogged;
}

/**
 * Extract notable events from logs
 * INTELLIGENCE: Only include events that next caregiver needs to know
 */
function extractNotableEvents(
  medicationLogs: MedicationLog[],
  dietEntries: DietEntry[]
): NotableEvent[] {
  const events: NotableEvent[] = [];

  // Symptom keywords with severity
  const symptomKeywords = {
    critical: ['chest pain', 'difficulty breathing', 'severe pain', 'confusion', 'fall', 'fell'],
    warning: [
      'pain',
      'headache',
      'nausea',
      'dizzy',
      'vomiting',
      'fever',
      'cough',
      'weakness',
      'shortness of breath'
    ],
    info: ['tired', 'fatigue', 'restless', 'anxious']
  };

  // Mood keywords
  const moodKeywords = ['upset', 'angry', 'withdrawn', 'sad', 'depressed', 'agitated', 'confused'];

  // Incident keywords
  const incidentKeywords = ['fall', 'fell', 'accident', 'incident', 'emergency', 'called 911'];

  // Activity keywords (positive events)
  const activityKeywords = ['walked', 'exercise', 'visitor', 'called', 'video call', 'played'];

  // Check medication logs
  medicationLogs.forEach((log) => {
    if (!log.notes) return;

    const notesLower = log.notes.toLowerCase();
    const logTime = log.actualTime || log.scheduledTime;

    // Check for critical symptoms
    symptomKeywords.critical.forEach((symptom) => {
      if (notesLower.includes(symptom)) {
        events.push({
          type: 'symptom',
          description: log.notes || '',
          time: logTime,
          severity: 'critical'
        });
      }
    });

    // Check for warning symptoms
    symptomKeywords.warning.forEach((symptom) => {
      if (notesLower.includes(symptom)) {
        events.push({
          type: 'symptom',
          description: log.notes || '',
          time: logTime,
          severity: 'warning'
        });
      }
    });

    // Check for mood issues
    moodKeywords.forEach((mood) => {
      if (notesLower.includes(mood)) {
        events.push({
          type: 'mood',
          description: log.notes || '',
          time: logTime,
          severity: 'info'
        });
      }
    });

    // Check for incidents
    incidentKeywords.forEach((incident) => {
      if (notesLower.includes(incident)) {
        events.push({
          type: 'incident',
          description: log.notes || '',
          time: logTime,
          severity: 'critical'
        });
      }
    });

    // Check for activities (positive)
    activityKeywords.forEach((activity) => {
      if (notesLower.includes(activity)) {
        events.push({
          type: 'activity',
          description: log.notes || '',
          time: logTime,
          severity: 'info'
        });
      }
    });
  });

  // Check diet entries
  dietEntries.forEach((entry) => {
    if (!entry.notes) return;

    const notesLower = entry.notes.toLowerCase();

    // Refusal to eat is notable
    if (
      notesLower.includes('refused') ||
      notesLower.includes('declined') ||
      notesLower.includes('not hungry')
    ) {
      events.push({
        type: 'other',
        description: `${entry.meal}: ${entry.notes}`,
        time: entry.timestamp,
        severity: 'warning'
      });
    }
  });

  // Remove duplicates and sort by time
  return events
    .filter(
      (event, index, self) =>
        index === self.findIndex((e) => e.description === event.description && e.time === event.time)
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Determine overall mood from shift logs
 */
function determineMoodFromLogs(
  medicationLogs: MedicationLog[],
  dietEntries: DietEntry[],
  notableEvents: NotableEvent[]
): {
  overall: 'good' | 'neutral' | 'upset' | 'withdrawn';
  notes?: string;
} {
  // Check for mood-related events
  const moodEvents = notableEvents.filter((e) => e.type === 'mood');

  if (moodEvents.length > 0) {
    const lastMoodEvent = moodEvents[moodEvents.length - 1];
    const description = lastMoodEvent.description.toLowerCase();

    if (description.includes('withdrawn') || description.includes('depressed')) {
      return { overall: 'withdrawn', notes: lastMoodEvent.description };
    }

    if (
      description.includes('upset') ||
      description.includes('angry') ||
      description.includes('agitated')
    ) {
      return { overall: 'upset', notes: lastMoodEvent.description };
    }

    return { overall: 'neutral', notes: lastMoodEvent.description };
  }

  // Check if there are positive activities
  const activityEvents = notableEvents.filter((e) => e.type === 'activity');
  if (activityEvents.length > 2) {
    return { overall: 'good', notes: 'Active and engaged during shift' };
  }

  // Default to good if no mood issues reported
  return { overall: 'good' };
}

/**
 * Generate intelligent notes for next shift
 */
function generateNextShiftNotes(
  medicationsGiven: any[],
  mealsLogged: any[],
  notableEvents: NotableEvent[],
  mood: any
): string[] {
  const notes: string[] = [];

  // Medication-related notes
  const missedMeds = medicationsGiven.filter((m) => m.status === 'missed');
  if (missedMeds.length > 0) {
    notes.push(
      `${missedMeds.length} medication dose(s) missed during this shift - follow up on next scheduled times`
    );
  }

  const lateMeds = medicationsGiven.filter((m) => m.status === 'late');
  if (lateMeds.length > 1) {
    notes.push('Some medications given late - consider reminder adjustments');
  }

  // Meal-related notes
  const poorAppetite = mealsLogged.filter((m) => m.percentageEaten && m.percentageEaten < 50);
  if (poorAppetite.length > 0) {
    notes.push(
      `Poor appetite noted (${poorAppetite.map((m) => m.meal).join(', ')}) - monitor food intake closely`
    );
  }

  // Symptom follow-ups
  const symptoms = notableEvents.filter((e) => e.type === 'symptom');
  if (symptoms.length > 0) {
    symptoms.forEach((symptom) => {
      if (symptom.severity === 'critical' || symptom.severity === 'warning') {
        notes.push(`Follow up on: ${symptom.description.substring(0, 100)}`);
      }
    });
  }

  // Mood follow-ups
  if (mood.overall === 'withdrawn' || mood.overall === 'upset') {
    notes.push(`Mood was ${mood.overall} - check in and provide extra attention`);
  }

  // Incident follow-ups
  const incidents = notableEvents.filter((e) => e.type === 'incident');
  if (incidents.length > 0) {
    notes.push('Incident occurred during shift - review incident log and continue monitoring');
  }

  return notes;
}

/**
 * Determine if shift is routine (no notable concerns)
 * INTELLIGENCE: Reduces noise for routine shifts
 */
function isShiftRoutine(
  medicationsGiven: any[],
  mealsLogged: any[],
  notableEvents: NotableEvent[],
  mood: any
): boolean {
  // NOT routine if there are missed medications
  if (medicationsGiven.some((m) => m.status === 'missed')) {
    return false;
  }

  // NOT routine if meals were refused or poorly eaten
  if (mealsLogged.some((m) => m.concerns || (m.percentageEaten && m.percentageEaten < 50))) {
    return false;
  }

  // NOT routine if there are warning or critical events
  if (notableEvents.some((e) => e.severity === 'warning' || e.severity === 'critical')) {
    return false;
  }

  // NOT routine if mood is concerning
  if (mood.overall === 'withdrawn' || mood.overall === 'upset') {
    return false;
  }

  // Routine shift = all medications on time, meals eaten normally, no concerns
  return true;
}

/**
 * Acknowledge handoff note (next caregiver marks as read)
 */
export async function acknowledgeHandoffNote(
  handoffNoteId: string,
  caregiverId: string
): Promise<void> {
  try {
    const handoffRef = doc(db, 'shiftHandoffNotes', handoffNoteId);

    await updateDoc(handoffRef, {
      acknowledgedBy: caregiverId,
      acknowledgedAt: new Date(),
      viewedBy: [caregiverId] // Add to viewed list
    });
  } catch (error) {
    console.error('Error acknowledging handoff note:', error);
  }
}

/**
 * Start a new shift session
 */
export async function startShiftSession(
  groupId: string,
  elderId: string,
  caregiverId: string,
  agencyId?: string,
  plannedDuration?: number,
  scheduledShiftId?: string,
  plannedStartTime?: string,
  plannedEndTime?: string
): Promise<string> {
  try {
    const now = new Date();

    // Build session data without undefined values (Firestore doesn't accept undefined)
    const shiftSession: Record<string, any> = {
      groupId,
      elderId,
      caregiverId,
      startTime: now,
      actualStartTime: now, // Track actual vs planned
      status: 'active',
      handoffNoteGenerated: false,
      createdAt: now,
      updatedAt: now
    };

    // Only add optional fields if they have values
    if (agencyId) shiftSession.agencyId = agencyId;
    if (plannedDuration) shiftSession.plannedDuration = plannedDuration;
    if (scheduledShiftId) shiftSession.scheduledShiftId = scheduledShiftId;
    if (plannedStartTime) shiftSession.plannedStartTime = plannedStartTime;
    if (plannedEndTime) shiftSession.plannedEndTime = plannedEndTime;

    const sessionRef = await addDoc(collection(db, 'shiftSessions'), shiftSession);
    return sessionRef.id;
  } catch (error) {
    console.error('Error starting shift session:', error);
    throw error;
  }
}

/**
 * End shift session and generate handoff note
 */
export async function endShiftSession(
  shiftSessionId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  caregiverName?: string
): Promise<ShiftHandoffNote | null> {
  try {
    // Get shift session to retrieve scheduled shift info
    const shiftRef = doc(db, 'shiftSessions', shiftSessionId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Shift session not found');
    }

    const shiftData = shiftSnap.data();
    const endTime = new Date();
    const startTime = shiftData.startTime?.toDate ? shiftData.startTime.toDate() : new Date(shiftData.startTime);

    // Calculate actual duration in minutes
    const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Update shift session with actual end time and duration
    await updateDoc(shiftRef, {
      endTime,
      actualEndTime: endTime,
      actualDuration,
      status: 'completed',
      updatedAt: endTime
    });

    // If linked to a scheduled shift, update it with actual times
    if (shiftData.scheduledShiftId) {
      const scheduledShiftRef = doc(db, 'scheduledShifts', shiftData.scheduledShiftId);
      const scheduledSnap = await getDoc(scheduledShiftRef);

      if (scheduledSnap.exists()) {
        const scheduledData = scheduledSnap.data();
        const plannedDuration = scheduledData.duration || 0;

        // Calculate variance (positive = worked longer, negative = worked shorter)
        const durationVariance = actualDuration - plannedDuration;

        await updateDoc(scheduledShiftRef, {
          status: 'completed',
          actualStartTime: startTime,
          actualEndTime: endTime,
          actualDuration,
          durationVariance,
          shiftSessionId,
          completedAt: endTime,
          updatedAt: endTime
        });
      }
    }

    // Generate handoff note with SOAP format
    const handoffNote = await generateShiftHandoffNote(
      shiftSessionId,
      groupId,
      elderId,
      elderName,
      caregiverName
    );

    return handoffNote;
  } catch (error) {
    console.error('Error ending shift session:', error);
    return null;
  }
}

/**
 * Send push notifications to family members about shift handoff
 */
async function sendFamilyPushNotifications(
  groupId: string,
  elderId: string,
  elderName: string,
  alertMessage: string,
  caregiverId: string,
  handoffNoteId: string
): Promise<void> {
  try {
    // Get group by document ID to find family members
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      console.log('Group not found for notifications:', groupId);
      return;
    }

    const groupData = groupSnap.data();
    const members = groupData.members || [];

    // Get all member user IDs except the caregiver who created the note
    const familyMemberIds = members
      .filter((m: any) => m.userId !== caregiverId)
      .map((m: any) => m.userId);

    if (familyMemberIds.length === 0) {
      console.log('No family members to notify');
      return;
    }

    // Queue FCM notifications for each family member
    const notificationPromises = familyMemberIds.map(async (userId: string) => {
      try {
        await addDoc(collection(db, 'fcm_notification_queue'), {
          userId,
          title: `Care Update: ${elderName}`,
          body: alertMessage,
          data: {
            type: 'shift_handoff_alert',
            groupId,
            elderId,
            handoffNoteId,
            url: '/dashboard/shift-handoff'
          },
          webpush: {
            fcmOptions: {
              link: '/dashboard/shift-handoff'
            },
            notification: {
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: `handoff-${handoffNoteId}`,
              requireInteraction: true
            }
          },
          status: 'pending',
          createdAt: new Date()
        });
        console.log(`Queued notification for user: ${userId}`);
      } catch (err) {
        console.error(`Failed to queue notification for ${userId}:`, err);
      }
    });

    await Promise.all(notificationPromises);
    console.log(`Queued ${familyMemberIds.length} family notifications`);
  } catch (error) {
    console.error('Error sending family notifications:', error);
  }
}
