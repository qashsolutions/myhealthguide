/**
 * Doctor Visit Prep Automation Service
 *
 * Phase 1: Human-triggered generation with AI-powered summary
 * - User manually triggers summary generation
 * - AI analyzes last 30 days of health data
 * - Generates comprehensive report for doctor visit
 * - User reviews before sharing (no auto-send to doctors)
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import type {
  Appointment,
  DoctorVisitSummary,
  MedicationLog,
  Medication,
  DietEntry,
  Supplement,
  SupplementLog,
  Elder
} from '@/types';

interface HealthDataForVisit {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  dietEntries: DietEntry[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  dateRange: { start: Date; end: Date };
}

/**
 * Generate comprehensive doctor visit summary
 */
export async function generateDoctorVisitSummary(
  appointmentId: string,
  groupId: string,
  elderId: string,
  elderName: string,
  daysToInclude: number = 30
): Promise<DoctorVisitSummary | null> {
  try {
    // Get appointment details
    const appointmentsRef = collection(db, 'appointments');
    const appointmentQuery = query(
      appointmentsRef,
      where('id', '==', appointmentId)
    );
    const appointmentSnap = await getDocs(appointmentQuery);

    if (appointmentSnap.empty) {
      throw new Error('Appointment not found');
    }

    const appointment = {
      id: appointmentSnap.docs[0].id,
      ...appointmentSnap.docs[0].data()
    } as Appointment;

    // Calculate date range (default: last 30 days before appointment)
    const endDate = new Date(appointment.date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysToInclude);

    // Gather all health data for the period
    const healthData = await gatherHealthData(groupId, elderId, startDate, endDate);

    // Analyze medication compliance
    const medicationCompliance = analyzeMedicationCompliance(
      healthData.medications,
      healthData.medicationLogs,
      startDate,
      endDate
    );

    // Detect health changes and patterns
    const healthChanges = await detectHealthChanges(
      groupId,
      elderId,
      healthData,
      startDate,
      endDate
    );

    // Extract symptoms from notes
    const symptoms = extractSymptomsFromLogs(healthData.medicationLogs, healthData.dietEntries);

    // Analyze diet patterns
    const dietSummary = analyzeDietPatterns(healthData.dietEntries, daysToInclude);

    // Generate questions for doctor based on detected patterns
    const questionsForDoctor = generateDoctorQuestions(
      medicationCompliance,
      healthChanges,
      symptoms,
      dietSummary
    );

    // Create medication list with compliance
    const medicationList = healthData.medications.map((med) => {
      const medCompliance = medicationCompliance.byMedication.find(
        (m) => m.name === med.name
      );

      return {
        name: med.name,
        dosage: med.dosage,
        frequency: formatFrequency(med.frequency),
        compliance: medCompliance?.compliance || 0
      };
    });

    // Create visit summary
    const visitSummary: Omit<DoctorVisitSummary, 'id'> = {
      appointmentId,
      groupId,
      elderId,
      generatedAt: new Date(),
      dateRange: { start: startDate, end: endDate },
      summary: {
        medicationCompliance,
        healthChanges,
        symptoms,
        dietSummary,
        questionsForDoctor,
        medicationList
      },
      exportedFormats: {},
      sharedWith: []
    };

    // Save to Firestore
    const summaryRef = await addDoc(collection(db, 'doctorVisitSummaries'), visitSummary);

    return { ...visitSummary, id: summaryRef.id };
  } catch (error) {
    console.error('Error generating doctor visit summary:', error);
    return null;
  }
}

/**
 * Gather all relevant health data for the period
 */
async function gatherHealthData(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<HealthDataForVisit> {
  // Get medications
  const medicationsQuery = query(
    collection(db, 'medications'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId)
  );
  const medicationsSnap = await getDocs(medicationsQuery);
  const medications = medicationsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as Medication[];

  // Get medication logs for period
  const medLogsQuery = query(
    collection(db, 'medicationLogs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
    where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('scheduledTime', 'desc')
  );
  const medLogsSnap = await getDocs(medLogsQuery);
  const medicationLogs = medLogsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as MedicationLog[];

  // Get diet entries
  const dietQuery = query(
    collection(db, 'dietEntries'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'desc')
  );
  const dietSnap = await getDocs(dietQuery);
  const dietEntries = dietSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as DietEntry[];

  // Get supplements
  const supplementsQuery = query(
    collection(db, 'supplements'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId)
  );
  const supplementsSnap = await getDocs(supplementsQuery);
  const supplements = supplementsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as Supplement[];

  // Get supplement logs
  const suppLogsQuery = query(
    collection(db, 'supplementLogs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
    where('scheduledTime', '<=', Timestamp.fromDate(endDate))
  );
  const suppLogsSnap = await getDocs(suppLogsQuery);
  const supplementLogs = suppLogsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })) as SupplementLog[];

  return {
    medications,
    medicationLogs,
    dietEntries,
    supplements,
    supplementLogs,
    dateRange: { start: startDate, end: endDate }
  };
}

/**
 * Analyze medication compliance for the period
 */
function analyzeMedicationCompliance(
  medications: Medication[],
  logs: MedicationLog[],
  startDate: Date,
  endDate: Date
) {
  const byMedication = medications.map((med) => {
    const medLogs = logs.filter((log) => log.medicationId === med.id);
    const takenLogs = medLogs.filter((log) => log.status === 'taken');
    const missedLogs = medLogs.filter((log) => log.status === 'missed');

    const totalDoses = medLogs.length;
    const compliance = totalDoses > 0 ? (takenLogs.length / totalDoses) * 100 : 0;

    return {
      name: med.name,
      compliance: Math.round(compliance),
      missedDoses: missedLogs.length,
      totalDoses: totalDoses
    };
  });

  // Calculate overall compliance
  const totalLogs = logs.length;
  const totalTaken = logs.filter((log) => log.status === 'taken').length;
  const overall = totalLogs > 0 ? Math.round((totalTaken / totalLogs) * 100) : 0;

  return {
    overall,
    byMedication
  };
}

/**
 * Detect significant health changes during period
 */
async function detectHealthChanges(
  groupId: string,
  elderId: string,
  healthData: HealthDataForVisit,
  startDate: Date,
  endDate: Date
) {
  const changes: Array<{
    type: 'medication' | 'diet' | 'physical' | 'behavioral';
    description: string;
    severity: 'info' | 'warning' | 'critical';
    dateDetected: Date;
  }> = [];

  // Check for compliance drops
  const complianceByWeek = calculateWeeklyCompliance(healthData.medicationLogs, startDate, endDate);
  if (complianceByWeek.length >= 2) {
    const firstWeek = complianceByWeek[0];
    const lastWeek = complianceByWeek[complianceByWeek.length - 1];
    const drop = firstWeek - lastWeek;

    if (drop > 15) {
      changes.push({
        type: 'medication',
        description: `Medication compliance decreased from ${firstWeek}% to ${lastWeek}% over the period`,
        severity: drop > 30 ? 'critical' : 'warning',
        dateDetected: endDate
      });
    }
  }

  // Check for diet pattern changes
  const dietByWeek = calculateWeeklyDietIntake(healthData.dietEntries, startDate, endDate);
  if (dietByWeek.length >= 2) {
    const firstWeek = dietByWeek[0];
    const lastWeek = dietByWeek[dietByWeek.length - 1];
    const change = ((lastWeek - firstWeek) / firstWeek) * 100;

    if (Math.abs(change) > 20) {
      changes.push({
        type: 'diet',
        description: `Diet intake ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(change))}%`,
        severity: change < -30 ? 'warning' : 'info',
        dateDetected: endDate
      });
    }
  }

  return changes;
}

/**
 * Extract symptom mentions from notes
 */
function extractSymptomsFromLogs(
  medicationLogs: MedicationLog[],
  dietEntries: DietEntry[]
) {
  const symptomKeywords = [
    'pain',
    'headache',
    'nausea',
    'dizzy',
    'tired',
    'fatigue',
    'fever',
    'cough',
    'shortness of breath',
    'chest pain',
    'confusion',
    'weakness'
  ];

  const symptomMap = new Map<string, { frequency: number; dates: Date[] }>();

  // Check medication log notes
  medicationLogs.forEach((log) => {
    if (log.notes) {
      const notesLower = log.notes.toLowerCase();
      symptomKeywords.forEach((symptom) => {
        if (notesLower.includes(symptom)) {
          const existing = symptomMap.get(symptom) || { frequency: 0, dates: [] };
          existing.frequency++;
          existing.dates.push(new Date(log.scheduledTime));
          symptomMap.set(symptom, existing);
        }
      });
    }
  });

  // Check diet entry notes
  dietEntries.forEach((entry) => {
    if (entry.notes) {
      const notesLower = entry.notes.toLowerCase();
      symptomKeywords.forEach((symptom) => {
        if (notesLower.includes(symptom)) {
          const existing = symptomMap.get(symptom) || { frequency: 0, dates: [] };
          existing.frequency++;
          existing.dates.push(new Date(entry.timestamp));
          symptomMap.set(symptom, existing);
        }
      });
    }
  });

  return Array.from(symptomMap.entries()).map(([symptom, data]) => ({
    symptom,
    frequency: data.frequency,
    dates: data.dates
  }));
}

/**
 * Analyze diet patterns
 */
function analyzeDietPatterns(dietEntries: DietEntry[], days: number) {
  const averageMealsPerDay = dietEntries.length / days;

  // Extract concerns from AI analysis
  const concernsDetected: string[] = [];
  dietEntries.forEach((entry) => {
    if (entry.aiAnalysis?.concerns) {
      entry.aiAnalysis.concerns.forEach((concern) => {
        if (!concernsDetected.includes(concern)) {
          concernsDetected.push(concern);
        }
      });
    }
  });

  return {
    averageMealsPerDay: Math.round(averageMealsPerDay * 10) / 10,
    concernsDetected
  };
}

/**
 * Generate intelligent questions for doctor based on patterns
 */
function generateDoctorQuestions(
  medicationCompliance: any,
  healthChanges: any[],
  symptoms: any[],
  dietSummary: any
): string[] {
  const questions: string[] = [];

  // Compliance-related questions
  if (medicationCompliance.overall < 80) {
    questions.push(
      `Medication compliance is ${medicationCompliance.overall}%. Should we adjust the medication schedule or simplify the regimen?`
    );
  }

  medicationCompliance.byMedication.forEach((med: any) => {
    if (med.compliance < 70 && med.missedDoses > 5) {
      questions.push(
        `${med.name} has ${med.missedDoses} missed doses (${med.compliance}% compliance). Is this medication still necessary, or should timing be adjusted?`
      );
    }
  });

  // Health change questions
  healthChanges.forEach((change) => {
    if (change.severity === 'warning' || change.severity === 'critical') {
      questions.push(`Observed change: ${change.description}. Should this be investigated further?`);
    }
  });

  // Symptom questions
  symptoms.forEach((symptom) => {
    if (symptom.frequency >= 3) {
      questions.push(
        `${symptom.symptom} reported ${symptom.frequency} times over the past month. Is this concerning?`
      );
    }
  });

  // Diet questions
  if (dietSummary.averageMealsPerDay < 2) {
    questions.push(
      `Average meals per day is ${dietSummary.averageMealsPerDay}. Should we be concerned about nutrition or appetite?`
    );
  }

  if (dietSummary.concernsDetected.length > 0) {
    questions.push(
      `Nutritional concerns detected: ${dietSummary.concernsDetected.join(', ')}. Should dietary changes be considered?`
    );
  }

  return questions;
}

/**
 * Helper: Calculate weekly compliance trend
 */
function calculateWeeklyCompliance(
  logs: MedicationLog[],
  startDate: Date,
  endDate: Date
): number[] {
  const weeks: number[] = [];
  const daysInPeriod = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const numWeeks = Math.ceil(daysInPeriod / 7);

  for (let i = 0; i < numWeeks; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekLogs = logs.filter((log) => {
      const logDate = new Date(log.scheduledTime);
      return logDate >= weekStart && logDate < weekEnd;
    });

    const takenLogs = weekLogs.filter((log) => log.status === 'taken');
    const compliance = weekLogs.length > 0 ? (takenLogs.length / weekLogs.length) * 100 : 0;

    weeks.push(Math.round(compliance));
  }

  return weeks;
}

/**
 * Helper: Calculate weekly diet intake
 */
function calculateWeeklyDietIntake(
  dietEntries: DietEntry[],
  startDate: Date,
  endDate: Date
): number[] {
  const weeks: number[] = [];
  const daysInPeriod = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const numWeeks = Math.ceil(daysInPeriod / 7);

  for (let i = 0; i < numWeeks; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekEntries = dietEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= weekStart && entryDate < weekEnd;
    });

    weeks.push(weekEntries.length);
  }

  return weeks;
}

/**
 * Helper: Format medication frequency for display
 */
function formatFrequency(frequency: any): string {
  if (frequency.type === 'asNeeded') {
    return 'As needed';
  }

  if (frequency.type === 'daily') {
    return `${frequency.times.length}x daily at ${frequency.times.join(', ')}`;
  }

  if (frequency.type === 'weekly') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = frequency.days?.map((d: number) => dayNames[d]).join(', ') || '';
    return `Weekly on ${days} at ${frequency.times.join(', ')}`;
  }

  return 'Unknown';
}
