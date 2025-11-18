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
  Elder
} from '@/types';

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
  elderName: string
): Promise<ShiftHandoffNote | null> {
  try {
    // Get shift session
    const shiftQuery = query(
      collection(db, 'shiftSessions'),
      where('id', '==', shiftSessionId)
    );
    const shiftSnap = await getDocs(shiftQuery);

    if (shiftSnap.empty) {
      throw new Error('Shift session not found');
    }

    const shift = {
      id: shiftSnap.docs[0].id,
      ...shiftSnap.docs[0].data()
    } as ShiftSession;

    if (!shift.endTime) {
      throw new Error('Shift not ended yet');
    }

    // Gather shift data
    const shiftData = await gatherShiftData(
      groupId,
      elderId,
      shift.startTime,
      shift.endTime
    );

    // Analyze medications given during shift
    const medicationsGiven = analyzeMedicationsDuringShift(
      shiftData.medicationLogs,
      shift.startTime,
      shift.endTime
    );

    // Analyze meals during shift
    const mealsLogged = analyzeMealsDuringShift(
      shiftData.dietEntries,
      shift.startTime,
      shift.endTime
    );

    // Extract notable events from notes
    const notableEvents = extractNotableEvents(
      shiftData.medicationLogs,
      shiftData.dietEntries
    );

    // Determine mood from logs
    const mood = determineMoodFromLogs(
      shiftData.medicationLogs,
      shiftData.dietEntries,
      notableEvents
    );

    // Generate AI notes for next shift
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

    // Create handoff note
    const handoffNote: Omit<ShiftHandoffNote, 'id'> = {
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
      acknowledgedBy: undefined,
      acknowledgedAt: undefined
    };

    // Save to Firestore
    const handoffRef = await addDoc(collection(db, 'shiftHandoffNotes'), handoffNote);

    // Update shift session
    await updateDoc(doc(db, 'shiftSessions', shiftSessionId), {
      handoffNoteGenerated: true,
      handoffNoteId: handoffRef.id
    });

    return { ...handoffNote, id: handoffRef.id };
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
  // Get medication logs during shift
  const medLogsQuery = query(
    collection(db, 'medicationLogs'),
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

  // Get diet entries during shift
  const dietQuery = query(
    collection(db, 'dietEntries'),
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
  plannedDuration?: number
): Promise<string> {
  try {
    const shiftSession: Omit<ShiftSession, 'id'> = {
      groupId,
      elderId,
      caregiverId,
      agencyId,
      startTime: new Date(),
      endTime: undefined,
      status: 'active',
      plannedDuration,
      actualDuration: undefined,
      handoffNoteGenerated: false,
      handoffNoteId: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

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
  elderName: string
): Promise<ShiftHandoffNote | null> {
  try {
    // Update shift session
    const shiftRef = doc(db, 'shiftSessions', shiftSessionId);
    const endTime = new Date();

    await updateDoc(shiftRef, {
      endTime,
      status: 'completed',
      updatedAt: endTime
    });

    // Generate handoff note
    const handoffNote = await generateShiftHandoffNote(
      shiftSessionId,
      groupId,
      elderId,
      elderName
    );

    return handoffNote;
  } catch (error) {
    console.error('Error ending shift session:', error);
    return null;
  }
}
