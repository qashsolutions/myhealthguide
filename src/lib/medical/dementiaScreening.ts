/**
 * Dementia Screening & Behavioral Pattern Detection
 *
 * Analyzes behavioral and mood changes from care logs:
 * - Memory/cognitive changes (repetition, confusion)
 * - Social changes (withdrawal, reduced engagement)
 * - Personality changes (mood swings, agitation)
 * - ADL changes (Activities of Daily Living)
 *
 * CRITICAL: We NEVER diagnose. We ONLY flag patterns for professional assessment.
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc } from 'firebase/firestore';

export interface BehavioralPattern {
  type: 'memory' | 'social' | 'personality' | 'adl' | 'language';
  description: string;
  examples: string[]; // Specific log entries that show the pattern
  firstDetected: Date;
  frequency: number; // How many times observed
  severity: 'mild' | 'moderate' | 'concerning';
}

export interface DementiaScreeningReport {
  id: string;
  groupId: string;
  elderId: string;
  elderName: string;
  screeningDate: Date;
  period: { start: Date; end: Date };
  baselinePeriod?: { start: Date; end: Date }; // 30-day baseline for comparison
  patternsDetected: BehavioralPattern[];
  riskIndicators: {
    memoryIssues: boolean;
    confusionOrDisorientation: boolean;
    personalityChanges: boolean;
    socialWithdrawal: boolean;
    languageDifficulties: boolean;
    adlDecline: boolean;
  };
  overallRiskLevel: 'low' | 'moderate' | 'concerning';
  recommendationText: string; // NEVER diagnoses, always recommends professional assessment
  generatedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  status: 'pending_review' | 'reviewed' | 'dismissed';
}

/**
 * Red flag keywords grouped by category
 */
const MEMORY_KEYWORDS = [
  'forgot', 'forgetful', 'can\'t remember', 'doesn\'t recall', 'asked again',
  'repeated', 'same question', 'memory', 'confused about', 'thought it was'
];

const CONFUSION_KEYWORDS = [
  'confused', 'disoriented', 'lost', 'didn\'t know where', 'thought it was [day/year]',
  'didn\'t recognize', 'mixed up', 'wandering'
];

const PERSONALITY_KEYWORDS = [
  'agitated', 'angry', 'upset', 'mood swing', 'irritable', 'anxious',
  'paranoid', 'suspicious', 'accusatory', 'emotional', 'crying'
];

const SOCIAL_KEYWORDS = [
  'withdrawn', 'quiet', 'didn\'t want to', 'refused', 'isolated',
  'not interested', 'stopped', 'gave up', 'no longer enjoys'
];

const LANGUAGE_KEYWORDS = [
  'trouble speaking', 'can\'t find words', 'struggling to communicate',
  'unclear', 'nonsensical', 'rambling'
];

const ADL_KEYWORDS = [
  'needed help with', 'couldn\'t do', 'difficulty with', 'struggled to',
  'forgot how to', 'unable to', 'assistance required'
];

/**
 * Run dementia screening for an elder
 */
export async function runDementiaScreening(
  groupId: string,
  elderId: string,
  elderName: string,
  screeningPeriodDays: number = 30
): Promise<DementiaScreeningReport | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - screeningPeriodDays);

    // Get baseline period (30-60 days ago) for comparison
    const baselineEnd = new Date(startDate);
    const baselineStart = new Date(baselineEnd);
    baselineStart.setDate(baselineStart.getDate() - 30);

    // Gather all care logs from the period
    const currentLogs = await getCareLogs(groupId, elderId, startDate, endDate);
    const baselineLogs = await getCareLogs(groupId, elderId, baselineStart, baselineEnd);

    if (currentLogs.length === 0) {
      return null; // Not enough data
    }

    // Analyze patterns
    const patternsDetected: BehavioralPattern[] = [];

    // PATTERN 1: Memory issues
    const memoryPattern = detectPattern(
      currentLogs,
      baselineLogs,
      MEMORY_KEYWORDS,
      'memory',
      'Memory or recall difficulties'
    );
    if (memoryPattern) patternsDetected.push(memoryPattern);

    // PATTERN 2: Confusion/Disorientation
    const confusionPattern = detectPattern(
      currentLogs,
      baselineLogs,
      CONFUSION_KEYWORDS,
      'memory',
      'Confusion or disorientation'
    );
    if (confusionPattern) patternsDetected.push(confusionPattern);

    // PATTERN 3: Personality changes
    const personalityPattern = detectPattern(
      currentLogs,
      baselineLogs,
      PERSONALITY_KEYWORDS,
      'personality',
      'Mood or personality changes'
    );
    if (personalityPattern) patternsDetected.push(personalityPattern);

    // PATTERN 4: Social withdrawal
    const socialPattern = detectPattern(
      currentLogs,
      baselineLogs,
      SOCIAL_KEYWORDS,
      'social',
      'Reduced social engagement or withdrawal'
    );
    if (socialPattern) patternsDetected.push(socialPattern);

    // PATTERN 5: Language difficulties
    const languagePattern = detectPattern(
      currentLogs,
      baselineLogs,
      LANGUAGE_KEYWORDS,
      'language',
      'Communication or language difficulties'
    );
    if (languagePattern) patternsDetected.push(languagePattern);

    // PATTERN 6: ADL decline
    const adlPattern = detectPattern(
      currentLogs,
      baselineLogs,
      ADL_KEYWORDS,
      'adl',
      'Difficulty with daily activities'
    );
    if (adlPattern) patternsDetected.push(adlPattern);

    // Determine risk indicators
    const riskIndicators = {
      memoryIssues: patternsDetected.some(p => p.type === 'memory' && MEMORY_KEYWORDS.some(k => p.description.toLowerCase().includes(k))),
      confusionOrDisorientation: patternsDetected.some(p => CONFUSION_KEYWORDS.some(k => p.description.toLowerCase().includes(k))),
      personalityChanges: patternsDetected.some(p => p.type === 'personality'),
      socialWithdrawal: patternsDetected.some(p => p.type === 'social'),
      languageDifficulties: patternsDetected.some(p => p.type === 'language'),
      adlDecline: patternsDetected.some(p => p.type === 'adl')
    };

    // Calculate overall risk level
    const overallRiskLevel = calculateRiskLevel(patternsDetected, riskIndicators);

    // Generate recommendation text (NEVER diagnoses)
    const recommendationText = generateRecommendationText(
      elderName,
      patternsDetected,
      overallRiskLevel
    );

    const report: Omit<DementiaScreeningReport, 'id'> = {
      groupId,
      elderId,
      elderName,
      screeningDate: new Date(),
      period: { start: startDate, end: endDate },
      baselinePeriod: { start: baselineStart, end: baselineEnd },
      patternsDetected,
      riskIndicators,
      overallRiskLevel,
      recommendationText,
      generatedAt: new Date(),
      status: 'pending_review'
    };

    // Save to Firestore
    const reportRef = await addDoc(collection(db, 'dementiaScreenings'), report);

    return { ...report, id: reportRef.id };

  } catch (error) {
    console.error('Error running dementia screening:', error);
    return null;
  }
}

/**
 * Get care logs (medication logs with notes, diet entries with notes, etc.)
 */
async function getCareLogs(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const logs: any[] = [];

  // Get medication logs with notes
  const medLogsQuery = query(
    collection(db, 'medicationLogs'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('takenAt', '>=', Timestamp.fromDate(startDate)),
    where('takenAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('takenAt', 'desc')
  );

  const medLogsSnap = await getDocs(medLogsQuery);
  medLogsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.notes && data.notes.trim().length > 0) {
      logs.push({
        id: doc.id,
        type: 'medication',
        notes: data.notes,
        timestamp: data.takenAt?.toDate(),
        date: data.takenAt?.toDate()
      });
    }
  });

  // Get diet entries with notes
  const dietLogsQuery = query(
    collection(db, 'dietEntries'),
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'desc')
  );

  const dietLogsSnap = await getDocs(dietLogsQuery);
  dietLogsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.notes && data.notes.trim().length > 0) {
      logs.push({
        id: doc.id,
        type: 'diet',
        notes: data.notes,
        timestamp: data.timestamp?.toDate(),
        date: data.timestamp?.toDate()
      });
    }
  });

  return logs;
}

/**
 * Detect behavioral pattern from logs
 */
function detectPattern(
  currentLogs: any[],
  baselineLogs: any[],
  keywords: string[],
  patternType: BehavioralPattern['type'],
  description: string
): BehavioralPattern | null {
  const matchingLogs: any[] = [];
  let firstDetected: Date | null = null;

  // Find logs that contain keywords
  currentLogs.forEach(log => {
    const notesLower = log.notes.toLowerCase();
    const hasKeyword = keywords.some(keyword => notesLower.includes(keyword.toLowerCase()));

    if (hasKeyword) {
      matchingLogs.push(log);
      if (!firstDetected || log.date < firstDetected) {
        firstDetected = log.date;
      }
    }
  });

  // Compare with baseline frequency
  const baselineMatches = baselineLogs.filter(log => {
    const notesLower = log.notes.toLowerCase();
    return keywords.some(keyword => notesLower.includes(keyword.toLowerCase()));
  });

  const currentFrequency = matchingLogs.length;
  const baselineFrequency = baselineMatches.length;

  // Only flag if frequency has increased significantly OR is high in current period
  const isSignificant = currentFrequency >= 3 ||
                        (baselineFrequency > 0 && currentFrequency > baselineFrequency * 1.5);

  if (!isSignificant) {
    return null;
  }

  // Determine severity
  let severity: BehavioralPattern['severity'] = 'mild';
  if (currentFrequency >= 10) {
    severity = 'concerning';
  } else if (currentFrequency >= 5) {
    severity = 'moderate';
  }

  // Extract example quotes (max 3)
  const examples = matchingLogs
    .slice(0, 3)
    .map(log => `${log.date.toLocaleDateString()}: "${log.notes}"`);

  return {
    type: patternType,
    description,
    examples,
    firstDetected: firstDetected || new Date(),
    frequency: currentFrequency,
    severity
  };
}

/**
 * Calculate overall risk level
 */
function calculateRiskLevel(
  patterns: BehavioralPattern[],
  indicators: DementiaScreeningReport['riskIndicators']
): 'low' | 'moderate' | 'concerning' {
  const indicatorCount = Object.values(indicators).filter(Boolean).length;
  const concerningPatterns = patterns.filter(p => p.severity === 'concerning').length;
  const moderatePatterns = patterns.filter(p => p.severity === 'moderate').length;

  // CONCERNING: 3+ indicators OR 2+ concerning patterns OR memory+confusion together
  if (
    indicatorCount >= 3 ||
    concerningPatterns >= 2 ||
    (indicators.memoryIssues && indicators.confusionOrDisorientation)
  ) {
    return 'concerning';
  }

  // MODERATE: 2 indicators OR 1 concerning pattern OR 2+ moderate patterns
  if (indicatorCount >= 2 || concerningPatterns >= 1 || moderatePatterns >= 2) {
    return 'moderate';
  }

  return 'low';
}

/**
 * Generate recommendation text (NEVER diagnoses)
 */
function generateRecommendationText(
  elderName: string,
  patterns: BehavioralPattern[],
  riskLevel: string
): string {
  if (patterns.length === 0) {
    return `No significant behavioral changes detected for ${elderName} during this screening period. Continue routine monitoring.`;
  }

  let text = `Our monitoring system has detected the following behavioral patterns for ${elderName}:\n\n`;

  patterns.forEach(pattern => {
    text += `• ${pattern.description} (observed ${pattern.frequency} times)\n`;
  });

  text += '\n';

  if (riskLevel === 'concerning') {
    text += `RECOMMENDATION: We strongly recommend scheduling an appointment with ${elderName}'s healthcare provider to discuss these changes. `;
    text += `These patterns may warrant a professional cognitive assessment.\n\n`;
  } else if (riskLevel === 'moderate') {
    text += `RECOMMENDATION: Consider discussing these changes with ${elderName}'s healthcare provider at the next appointment. `;
    text += `They may recommend additional monitoring or evaluation.\n\n`;
  } else {
    text += `RECOMMENDATION: Continue monitoring. If these patterns persist or worsen, consult with ${elderName}'s healthcare provider.\n\n`;
  }

  text += `IMPORTANT: This screening is NOT a diagnosis. Only a qualified healthcare professional can diagnose cognitive conditions. `;
  text += `This report is meant to help identify potential changes that should be brought to a doctor's attention.`;

  return text;
}

/**
 * Get all screening reports for an elder
 */
export async function getDementiaScreenings(
  groupId: string,
  elderId: string
): Promise<DementiaScreeningReport[]> {
  try {
    const screeningsQuery = query(
      collection(db, 'dementiaScreenings'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      orderBy('screeningDate', 'desc')
    );

    const screeningsSnap = await getDocs(screeningsQuery);
    return screeningsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      screeningDate: doc.data().screeningDate?.toDate(),
      period: {
        start: doc.data().period?.start?.toDate(),
        end: doc.data().period?.end?.toDate()
      },
      baselinePeriod: doc.data().baselinePeriod ? {
        start: doc.data().baselinePeriod.start?.toDate(),
        end: doc.data().baselinePeriod.end?.toDate()
      } : undefined,
      patternsDetected: doc.data().patternsDetected?.map((p: any) => ({
        ...p,
        firstDetected: p.firstDetected?.toDate()
      })),
      generatedAt: doc.data().generatedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    })) as DementiaScreeningReport[];

  } catch (error) {
    console.error('Error getting dementia screenings:', error);
    return [];
  }
}
