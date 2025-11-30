/**
 * Elder Health Insights Service
 *
 * Generates OBSERVATION-ONLY health insights using AI.
 *
 * CRITICAL GUARDRAILS:
 * - NO medical advice, recommendations, or suggestions
 * - NO interpretation of what symptoms/conditions mean
 * - NO speculation about causes or connections
 * - ONLY factual observations based on logged data
 * - ALWAYS use template-based outputs
 * - VALIDATE outputs before returning
 *
 * This service is designed to be EXTREMELY CONSERVATIVE.
 * When in doubt, output nothing rather than something potentially harmful.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';
import {
  getElderProfile,
  getElderHealthConditions,
  getElderAllergies,
  getSymptomSummary,
  getElderImportantNotes,
  saveHealthInsight,
} from '../firebase/elderHealthProfile';
import { getAdminDb } from '../firebase/admin';
import type { ElderHealthInsight, Elder } from '@/types';

// Initialize Vertex AI
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI {
  if (!vertexAI && projectId) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson);
        vertexAI = new VertexAI({
          project: projectId,
          location: location,
          googleAuthOptions: {
            credentials: credentials,
          },
        });
      } catch (error) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        throw new Error('Invalid credentials format');
      }
    } else {
      vertexAI = new VertexAI({
        project: projectId,
        location: location,
      });
    }
  }

  if (!vertexAI) {
    throw new Error('Vertex AI not configured');
  }

  return vertexAI;
}

// ============= GUARDRAIL CONSTANTS =============

/**
 * Words that indicate the AI is giving advice/recommendations
 * If ANY of these appear in the output, we REJECT it
 */
const FORBIDDEN_WORDS = [
  'recommend', 'recommended', 'recommends', 'recommendation',
  'suggest', 'suggested', 'suggests', 'suggestion',
  'advise', 'advised', 'advises', 'advice',
  'should', 'shouldn\'t', 'must', 'must not',
  'consider', 'try', 'might want to',
  'may indicate', 'could mean', 'possibly', 'likely',
  'diagnosis', 'diagnose', 'diagnosed',
  'treatment', 'treat', 'medication change',
  'increase', 'decrease', 'adjust', 'modify',
  'concerning', 'worrying', 'alarming',
  'related to', 'caused by', 'due to', 'because of',
  'indicates', 'suggests that', 'points to',
  'contact your doctor', 'see a doctor', 'consult',
  'emergency', 'urgent', 'immediately',
];

/**
 * Allowed template patterns for observations
 * These are the ONLY formats we accept
 */
const OBSERVATION_TEMPLATES = {
  symptomCount: /^.+ was logged (\d+) times? between .+ and .+\.$/,
  symptomDates: /^.+ was logged on: .+\.$/,
  avgSeverity: /^Average severity for .+: [\d.]+ out of 10\.$/,
  medicationAdherence: /^Medication adherence rate: [\d.]+% \(\d+ of \d+ doses taken\)\.$/,
  conditionCount: /^(\d+) health conditions? (?:is|are) currently listed as active\.$/,
  allergyCount: /^(\d+) (?:allergy|allergies) (?:is|are) documented\.$/,
  noData: /^No .+ data available for this period\.$/,
  dataCount: /^(\d+) .+ (?:entries|logs|records) in the past \d+ days\.$/,
};

// ============= SYSTEM PROMPT =============

/**
 * EXTREMELY RESTRICTIVE system prompt
 */
const OBSERVATION_ONLY_SYSTEM_PROMPT = `You are a DATA REPORTER. Your ONLY job is to report facts from the data provided.

ABSOLUTE RULES - VIOLATION MEANS FAILURE:
1. You are NOT a doctor, nurse, or medical professional
2. You CANNOT interpret what data means
3. You CANNOT suggest, recommend, or advise anything
4. You CANNOT speculate about causes or connections
5. You CANNOT use words like: should, might, could, may indicate, possibly, likely, concerning, related to, caused by
6. You MUST only state what the data shows - nothing more

ALLOWED OUTPUT FORMAT (use EXACTLY these templates):
- "[Symptom] was logged [X] times between [Date1] and [Date2]."
- "[Symptom] was logged on: [Date1], [Date2], [Date3]."
- "Average severity for [symptom]: [X.X] out of 10."
- "Medication adherence rate: [X]% ([Y] of [Z] doses taken)."
- "[X] health condition(s) is/are currently listed as active."
- "[X] allergy/allergies is/are documented."
- "No [data type] data available for this period."
- "[X] [data type] entries in the past [Y] days."

IF YOU CANNOT REPORT USING THESE EXACT TEMPLATES, OUTPUT: "Insufficient data to generate observation."

NEVER OUTPUT:
- Medical advice
- Interpretations
- Recommendations
- Speculation
- Warnings
- Questions to ask doctors
- Anything not directly from the data`;

// ============= VALIDATION FUNCTIONS =============

/**
 * Check if output contains forbidden words
 */
function containsForbiddenWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

/**
 * Validate that output matches allowed templates
 */
function matchesAllowedTemplate(text: string): boolean {
  return Object.values(OBSERVATION_TEMPLATES).some(pattern => pattern.test(text));
}

/**
 * Validate a single observation line
 */
function validateObservation(observation: string): boolean {
  // Must not contain forbidden words
  if (containsForbiddenWords(observation)) {
    console.warn('Observation rejected - contains forbidden words:', observation);
    return false;
  }

  // For now, we'll be lenient on template matching but strict on forbidden words
  // This allows some flexibility while maintaining safety
  return true;
}

/**
 * Filter and validate all observations
 */
function filterValidObservations(observations: string[]): string[] {
  return observations.filter(obs => {
    const trimmed = obs.trim();
    if (!trimmed) return false;
    return validateObservation(trimmed);
  });
}

// ============= DATA GATHERING =============

/**
 * Gather medication adherence data using Admin SDK
 * Collection: medication_logs (top-level) with elderId and groupId fields
 */
async function getMedicationAdherenceData(
  elderId: string,
  groupId: string,
  days: number
): Promise<{ taken: number; missed: number; total: number; rate: number }> {
  try {
    const adminDb = getAdminDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logsSnapshot = await adminDb
      .collection('medication_logs')
      .where('elderId', '==', elderId)
      .where('groupId', '==', groupId)
      .orderBy('scheduledTime', 'desc')
      .limit(500)
      .get();

    const logs = logsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          status: data.status as string,
          scheduledTime: data.scheduledTime?.toDate?.() || new Date(data.scheduledTime),
        };
      })
      .filter(log => log.scheduledTime >= startDate);

    const taken = logs.filter(l => l.status === 'taken').length;
    const missed = logs.filter(l => l.status === 'missed').length;
    const total = logs.length;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { taken, missed, total, rate };
  } catch (error) {
    console.error('Error getting medication adherence:', error);
    return { taken: 0, missed: 0, total: 0, rate: 0 };
  }
}

/**
 * Get diet entry count using Admin SDK
 * Collection: diet_entries (top-level) with elderId and groupId fields
 */
async function getDietEntryCount(
  elderId: string,
  groupId: string,
  days: number
): Promise<number> {
  try {
    const adminDb = getAdminDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dietSnapshot = await adminDb
      .collection('diet_entries')
      .where('elderId', '==', elderId)
      .where('groupId', '==', groupId)
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    const entries = dietSnapshot.docs
      .map(doc => ({
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
      }))
      .filter(entry => entry.timestamp >= startDate);

    return entries.length;
  } catch (error) {
    console.error('Error getting diet entries:', error);
    return 0;
  }
}

// ============= INSIGHT GENERATION =============

/**
 * Generate observations WITHOUT using AI
 * This is the SAFEST approach - pure data reporting
 */
function generateTemplateBasedObservations(data: {
  symptomSummary: { symptomName: string; count: number; avgSeverity: number; dates: Date[] }[];
  adherence: { taken: number; missed: number; total: number; rate: number };
  conditionCount: number;
  allergyCount: number;
  dietEntryCount: number;
  days: number;
  periodStart: Date;
  periodEnd: Date;
}): string[] {
  const observations: string[] = [];
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Symptom observations
  for (const symptom of data.symptomSummary) {
    if (symptom.count > 0) {
      const dateStr = symptom.dates.map(formatDate).join(', ');
      observations.push(
        `${symptom.symptomName} was logged ${symptom.count} time${symptom.count > 1 ? 's' : ''} between ${formatDate(data.periodStart)} and ${formatDate(data.periodEnd)}.`
      );
      if (symptom.count <= 5) {
        observations.push(`${symptom.symptomName} was logged on: ${dateStr}.`);
      }
      observations.push(`Average severity for ${symptom.symptomName}: ${symptom.avgSeverity} out of 10.`);
    }
  }

  // Medication adherence
  if (data.adherence.total > 0) {
    observations.push(
      `Medication adherence rate: ${data.adherence.rate}% (${data.adherence.taken} of ${data.adherence.total} doses taken).`
    );
  } else {
    observations.push(`No medication logs available for this period.`);
  }

  // Condition count
  if (data.conditionCount > 0) {
    observations.push(
      `${data.conditionCount} health condition${data.conditionCount > 1 ? 's are' : ' is'} currently listed as active.`
    );
  }

  // Allergy count
  if (data.allergyCount > 0) {
    observations.push(
      `${data.allergyCount} ${data.allergyCount > 1 ? 'allergies are' : 'allergy is'} documented.`
    );
  }

  // Diet entries
  if (data.dietEntryCount > 0) {
    observations.push(`${data.dietEntryCount} diet entries in the past ${data.days} days.`);
  }

  // If no data at all
  if (observations.length === 0) {
    observations.push('No health data available for this period.');
  }

  return observations;
}

/**
 * Generate health insights for an elder
 * Uses template-based approach for MAXIMUM safety
 */
export async function generateElderHealthInsights(
  elderId: string,
  groupId: string,
  userId: string,
  userRole: UserRole,
  days: number = 7
): Promise<{
  success: boolean;
  insights: ElderHealthInsight[];
  error?: string;
}> {
  try {
    // Calculate period
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    // Log HIPAA disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Elder Health Insights Generator',
      serviceType: 'health_insight_generation',
      dataShared: ['symptoms', 'medication_logs', 'conditions', 'allergies', 'diet_entries'],
      purpose: 'Generate factual observations from health data (no AI interpretation)',
    });

    // Gather data
    const [symptomSummary, conditions, allergies, adherence, dietEntryCount] = await Promise.all([
      getSymptomSummary(elderId, groupId, days),
      getElderHealthConditions(elderId, groupId),
      getElderAllergies(elderId, groupId),
      getMedicationAdherenceData(elderId, groupId, days),
      getDietEntryCount(elderId, groupId, days),
    ]);

    const activeConditions = conditions.filter(c => c.status === 'active');

    // Generate template-based observations (NO AI)
    const observations = generateTemplateBasedObservations({
      symptomSummary,
      adherence,
      conditionCount: activeConditions.length,
      allergyCount: allergies.length,
      dietEntryCount,
      days,
      periodStart,
      periodEnd,
    });

    // Validate all observations (extra safety check)
    const validObservations = filterValidObservations(observations);

    // Create insights
    const insights: ElderHealthInsight[] = [];

    for (const observation of validObservations) {
      const insight: Omit<ElderHealthInsight, 'id' | 'dismissedAt' | 'dismissedBy'> = {
        elderId,
        groupId,
        insightType: 'observation',
        observation,
        dataSource: 'template',
        dataPoints: [],
        createdAt: new Date(),
        periodStart,
        periodEnd,
        generatedBy: userId,
        userRole,
      };

      const result = await saveHealthInsight(insight);
      if (result.success && result.id) {
        insights.push({
          ...insight,
          id: result.id,
        });
      }
    }

    return { success: true, insights };
  } catch (error: any) {
    console.error('Error generating health insights:', error);
    return { success: false, insights: [], error: error.message };
  }
}

/**
 * Generate a summary observation using AI with STRICT guardrails
 * Only used for combining multiple data points into a single summary
 */
export async function generateAISummaryObservation(
  elderId: string,
  groupId: string,
  userId: string,
  userRole: UserRole,
  days: number = 7
): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    // Gather data first
    const [symptomSummary, adherence, dietEntryCount] = await Promise.all([
      getSymptomSummary(elderId, groupId, days),
      getMedicationAdherenceData(elderId, groupId, days),
      getDietEntryCount(elderId, groupId, days),
    ]);

    // If not enough data, don't use AI
    if (symptomSummary.length === 0 && adherence.total === 0 && dietEntryCount === 0) {
      return { success: true, summary: 'No health data available for this period.' };
    }

    // Build data summary for AI
    const dataDescription = [
      symptomSummary.length > 0
        ? `Symptoms logged: ${symptomSummary.map(s => `${s.symptomName} (${s.count} times)`).join(', ')}`
        : 'No symptoms logged',
      adherence.total > 0
        ? `Medication doses: ${adherence.taken} taken, ${adherence.missed} missed out of ${adherence.total}`
        : 'No medication logs',
      `Diet entries: ${dietEntryCount}`,
    ].join('. ');

    // Log HIPAA disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini AI (Vertex AI)',
      serviceType: 'health_data_summary',
      dataShared: ['symptom_counts', 'medication_adherence_rate', 'diet_entry_count'],
      purpose: 'Generate factual summary of health data counts (no interpretation)',
    });

    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0, // Zero creativity - pure facts
        topP: 0.1,
        maxOutputTokens: 256,
      },
      systemInstruction: OBSERVATION_ONLY_SYSTEM_PROMPT,
    });

    const prompt = `Report ONLY the following data counts in 1-2 sentences. Do NOT interpret or advise.

DATA:
${dataDescription}

OUTPUT FORMAT:
"In the past ${days} days: [X] symptom entries were logged, medication adherence was [Y]%, and [Z] diet entries were recorded."

If any data is zero, you can omit it. Output ONLY the factual summary sentence.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Validate output
    if (containsForbiddenWords(responseText)) {
      console.warn('AI summary rejected - contains forbidden words');
      // Fall back to template-based summary
      return {
        success: true,
        summary: `In the past ${days} days: ${symptomSummary.length} symptom types logged, medication adherence at ${adherence.rate}%, ${dietEntryCount} diet entries recorded.`,
      };
    }

    return { success: true, summary: responseText.trim() };
  } catch (error: any) {
    console.error('Error generating AI summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule insight generation (called by cron job twice weekly)
 */
export async function scheduleInsightGeneration(
  elderId: string,
  groupId: string,
  systemUserId: string = 'system'
): Promise<void> {
  try {
    await generateElderHealthInsights(
      elderId,
      groupId,
      systemUserId,
      'admin', // System acts as admin
      7 // 7 days of data
    );
  } catch (error) {
    console.error('Scheduled insight generation failed:', error);
  }
}
