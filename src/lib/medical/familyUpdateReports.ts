/**
 * Automated Family Update Reports
 *
 * Generates weekly narrative emails for families
 * - Warm, conversational tone (not clinical)
 * - Highlights: compliance, activities, concerns
 * - User can preview/edit before sending
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import type { MedicationLog, DietEntry, Elder } from '@/types';

export interface FamilyUpdateReport {
  id: string;
  groupId: string;
  elderId: string;
  elderName: string;
  weekEnding: Date;
  dateRange: { start: Date; end: Date };
  summary: {
    headline: string; // "Great week for Mom!" or "Mom had a challenging week"
    medicationCompliance: {
      percentage: number;
      taken: number;
      total: number;
      summary: string; // "Took all medications on time"
    };
    dietSummary: {
      mealsLogged: number;
      averagePerDay: number;
      summary: string; // "Ate well throughout the week"
    };
    highlights: string[]; // Positive moments
    concerns: string[]; // Things to watch
    overallTone: 'positive' | 'neutral' | 'concerning';
  };
  narrativeText: string; // Full narrative email body
  generatedAt: Date;
  sentAt?: Date;
  sentTo: string[]; // User IDs who received it
  status: 'draft' | 'sent';
}

/**
 * Generate weekly family update for an elder
 */
export async function generateWeeklyFamilyUpdate(
  groupId: string,
  elderId: string,
  elderName: string
): Promise<FamilyUpdateReport> {
  try {
    // Calculate last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Gather data
    const medicationLogs = await getMedicationLogs(groupId, elderId, startDate, endDate);
    const dietEntries = await getDietEntries(groupId, elderId, startDate, endDate);

    // Analyze data
    const medCompliance = analyzeMedicationCompliance(medicationLogs);
    const dietSummary = analyzeDietSummary(dietEntries);
    const highlights = extractHighlights(medicationLogs, dietEntries);
    const concerns = extractConcerns(medicationLogs, dietEntries, medCompliance);

    // Determine overall tone
    const overallTone = determineOverallTone(medCompliance, dietSummary, concerns);

    // Generate headline
    const headline = generateHeadline(elderName, overallTone, medCompliance);

    // Generate narrative text
    const narrativeText = generateNarrativeEmail(
      elderName,
      medCompliance,
      dietSummary,
      highlights,
      concerns,
      overallTone
    );

    const report: Omit<FamilyUpdateReport, 'id'> = {
      groupId,
      elderId,
      elderName,
      weekEnding: endDate,
      dateRange: { start: startDate, end: endDate },
      summary: {
        headline,
        medicationCompliance: medCompliance,
        dietSummary,
        highlights,
        concerns,
        overallTone
      },
      narrativeText,
      generatedAt: new Date(),
      sentAt: undefined,
      sentTo: [],
      status: 'draft'
    };

    // Save to Firestore
    const reportRef = await addDoc(collection(db, 'familyUpdateReports'), report);

    return { ...report, id: reportRef.id };

  } catch (error) {
    console.error('Error generating family update:', error);
    throw error;
  }
}

async function getMedicationLogs(groupId: string, elderId: string, start: Date, end: Date) {
  const q = query(
    collection(db, 'medicationLogs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('scheduledTime', '>=', Timestamp.fromDate(start)),
    where('scheduledTime', '<=', Timestamp.fromDate(end)),
    orderBy('scheduledTime', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MedicationLog[];
}

async function getDietEntries(groupId: string, elderId: string, start: Date, end: Date) {
  const q = query(
    collection(db, 'dietEntries'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('timestamp', '>=', Timestamp.fromDate(start)),
    where('timestamp', '<=', Timestamp.fromDate(end)),
    orderBy('timestamp', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DietEntry[];
}

function analyzeMedicationCompliance(logs: MedicationLog[]) {
  const total = logs.length;
  const taken = logs.filter(l => l.status === 'taken').length;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

  let summary = '';
  if (percentage === 100) {
    summary = 'Took all medications on time!';
  } else if (percentage >= 90) {
    summary = `Took ${percentage}% of medications - excellent compliance`;
  } else if (percentage >= 75) {
    summary = `Took ${percentage}% of medications`;
  } else {
    summary = `Took ${percentage}% of medications - below usual`;
  }

  return { percentage, taken, total, summary };
}

function analyzeDietSummary(entries: DietEntry[]) {
  const mealsLogged = entries.length;
  const averagePerDay = mealsLogged / 7;

  let summary = '';
  if (averagePerDay >= 3) {
    summary = 'Ate well throughout the week';
  } else if (averagePerDay >= 2) {
    summary = 'Eating regularly';
  } else {
    summary = 'Appetite lower than usual';
  }

  return { mealsLogged, averagePerDay: Math.round(averagePerDay * 10) / 10, summary };
}

function extractHighlights(logs: MedicationLog[], entries: DietEntry[]): string[] {
  const highlights: string[] = [];

  // Check for perfect compliance
  const allTaken = logs.every(l => l.status === 'taken');
  if (allTaken && logs.length > 0) {
    highlights.push('Perfect medication compliance all week!');
  }

  // Check for good eating
  if (entries.length >= 18) {
    highlights.push('Great appetite - ate 3+ meals most days');
  }

  // Extract positive notes from logs
  logs.forEach(log => {
    if (log.notes) {
      const notesLower = log.notes.toLowerCase();
      if (notesLower.includes('walked') || notesLower.includes('exercise')) {
        highlights.push(`Stayed active: ${log.notes}`);
      }
      if (notesLower.includes('visited') || notesLower.includes('call')) {
        highlights.push(`Social connection: ${log.notes}`);
      }
    }
  });

  return highlights.slice(0, 3); // Max 3 highlights
}

function extractConcerns(
  logs: MedicationLog[],
  entries: DietEntry[],
  compliance: any
): string[] {
  const concerns: string[] = [];

  // Low compliance
  if (compliance.percentage < 75) {
    const missed = logs.filter(l => l.status === 'missed').length;
    concerns.push(`Missed ${missed} medication doses this week`);
  }

  // Poor appetite
  if (entries.length < 10) {
    concerns.push('Lower appetite than usual');
  }

  // Check for symptom mentions
  const symptomKeywords = ['pain', 'dizzy', 'nausea', 'tired'];
  logs.forEach(log => {
    if (log.notes) {
      symptomKeywords.forEach(symptom => {
        if (log.notes!.toLowerCase().includes(symptom)) {
          concerns.push(`Mentioned ${symptom} on ${new Date(log.scheduledTime).toLocaleDateString()}`);
        }
      });
    }
  });

  return concerns.slice(0, 3); // Max 3 concerns
}

function determineOverallTone(
  compliance: any,
  diet: any,
  concerns: string[]
): 'positive' | 'neutral' | 'concerning' {
  if (concerns.length >= 2) return 'concerning';
  if (compliance.percentage >= 90 && diet.averagePerDay >= 2.5) return 'positive';
  return 'neutral';
}

function generateHeadline(
  elderName: string,
  tone: string,
  compliance: any
): string {
  if (tone === 'positive' && compliance.percentage === 100) {
    return `Perfect week for ${elderName}!`;
  } else if (tone === 'positive') {
    return `Great week for ${elderName}!`;
  } else if (tone === 'concerning') {
    return `${elderName} had a challenging week`;
  } else {
    return `Weekly update for ${elderName}`;
  }
}

function generateNarrativeEmail(
  elderName: string,
  compliance: any,
  diet: any,
  highlights: string[],
  concerns: string[],
  tone: string
): string {
  let narrative = `Hi there,\n\nHere's your weekly update for ${elderName}.\n\n`;

  // Opening
  if (tone === 'positive') {
    narrative += `It was a great week! `;
  } else if (tone === 'concerning') {
    narrative += `This week had a few challenges. `;
  } else {
    narrative += `Overall, it was a good week. `;
  }

  // Medications
  narrative += `${compliance.summary}. `;

  // Diet
  narrative += `${diet.summary}, with ${diet.mealsLogged} meals logged throughout the week. `;

  // Highlights
  if (highlights.length > 0) {
    narrative += `\n\nSome highlights from the week:\n`;
    highlights.forEach(h => {
      narrative += `• ${h}\n`;
    });
  }

  // Concerns
  if (concerns.length > 0) {
    narrative += `\n\nA few things to keep an eye on:\n`;
    concerns.forEach(c => {
      narrative += `• ${c}\n`;
    });
    narrative += `\nWe recommend discussing these with the doctor if they continue.\n`;
  }

  // Closing
  narrative += `\n\nAs always, please reach out if you have any questions or concerns.\n\nWarm regards,\nYour Care Team`;

  return narrative;
}
