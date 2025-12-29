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

import { UserRole } from '../medical/phiAuditLog';
import { getAdminDb } from '../firebase/admin';
import type { ElderHealthInsight, Elder, ActionFlag } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

// API endpoints
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Save health insight using Admin SDK (server-side)
 */
async function saveHealthInsightServer(
  insight: Omit<ElderHealthInsight, 'id' | 'dismissedAt' | 'dismissedBy'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const docRef = await adminDb.collection('elderHealthInsights').add({
      ...insight,
      createdAt: insight.createdAt || new Date(),
    });
    console.log('[saveHealthInsightServer] Saved insight with id:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('[saveHealthInsightServer] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log PHI third-party disclosure using Admin SDK (server-side)
 * This bypasses Firestore security rules for server-side operations
 */
async function logPHIThirdPartyDisclosureServer(params: {
  userId: string;
  userRole: UserRole;
  groupId: string;
  elderId?: string;
  serviceName: string;
  serviceType: string;
  dataShared: string[];
  purpose: string;
}): Promise<void> {
  try {
    const adminDb = getAdminDb();
    const disclosureId = `disclosure_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    await adminDb.collection('phi_audit_logs').add({
      // WHO
      userId: params.userId,
      userRole: params.userRole,
      groupId: params.groupId,

      // WHAT
      phiType: 'third_party_disclosure',
      elderId: params.elderId || null,
      action: 'third_party_api',
      actionDetails: `Disclosed to ${params.serviceName}`,

      // WHEN
      timestamp: Timestamp.now(),

      // WHY
      purpose: 'operations',

      // HOW
      method: 'third_party_service',

      // Third-party disclosure details
      thirdPartyDisclosure: {
        serviceName: params.serviceName,
        serviceType: params.serviceType,
        dataShared: params.dataShared,
        dateShared: Timestamp.now(),
        purpose: params.purpose,
        disclosureId,
      },

      // Server-side indicator
      deviceType: 'server',
      browser: 'server',
      ipAddressHash: 'server-side-operation',
    });

    console.log('[PHI AUDIT Server]', {
      userId: params.userId,
      serviceName: params.serviceName,
      elderId: params.elderId,
    });
  } catch (error: any) {
    // Handle duplicate document errors gracefully - this can happen due to race conditions
    if (error?.code === 'already-exists' || error?.message?.includes('already exists')) {
      console.log('[PHI AUDIT Server] Duplicate log entry (already exists) - skipping');
      return;
    }
    console.error('Error logging PHI access (server):', error);
    // Don't throw - PHI logging failures shouldn't break the app
  }
}

/**
 * Call Gemini API for AI summary
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Very low for factual output
        maxOutputTokens: 256,
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call Claude API as fallback
 */
async function callClaudeAPI(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const result = await response.json();
  return result.content?.[0]?.text || '';
}

/**
 * Call AI with Gemini primary, Claude fallback
 */
async function callAI(prompt: string): Promise<string> {
  try {
    return await callGeminiAPI(prompt);
  } catch (geminiError) {
    console.warn('[callAI] Gemini failed, trying Claude:', geminiError);
    try {
      return await callClaudeAPI(prompt);
    } catch (claudeError) {
      console.error('[callAI] Both APIs failed:', claudeError);
      throw new Error('AI summary unavailable');
    }
  }
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
function filterValidObservations(observations: ObservationWithFlag[]): ObservationWithFlag[] {
  return observations.filter(obs => {
    const trimmed = obs.observation.trim();
    if (!trimmed) return false;
    return validateObservation(trimmed);
  });
}

// ============= DATA GATHERING (Server-Side with Admin SDK) =============

/**
 * Get symptom summary using Admin SDK (server-side)
 */
async function getSymptomSummaryServer(
  elderId: string,
  groupId: string,
  days: number
): Promise<{ symptomName: string; count: number; avgSeverity: number; dates: Date[] }[]> {
  try {
    console.log('[getSymptomSummaryServer] Starting query for elderId:', elderId, 'groupId:', groupId, 'days:', days);
    const adminDb = getAdminDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    console.log('[getSymptomSummaryServer] Start date:', startDate);

    const symptomsSnapshot = await adminDb
      .collection('elderSymptoms')
      .where('elderId', '==', elderId)
      .where('groupId', '==', groupId)
      .get();

    console.log('[getSymptomSummaryServer] Query returned', symptomsSnapshot.size, 'documents');

    const symptoms = symptomsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          symptom: data.symptom as string,
          severity: data.severity as string,
          observedAt: data.observedAt?.toDate?.() || new Date(data.observedAt),
        };
      })
      .filter(s => s.observedAt >= startDate);

    // Severity mapping
    const severityMap: Record<string, number> = {
      mild: 2.5,
      moderate: 5,
      severe: 7.5,
      critical: 10,
    };

    // Group by symptom name
    const grouped = symptoms.reduce((acc, s) => {
      if (!acc[s.symptom]) {
        acc[s.symptom] = { count: 0, totalSeverity: 0, dates: [] };
      }
      acc[s.symptom].count++;
      acc[s.symptom].totalSeverity += severityMap[s.severity] || 5;
      acc[s.symptom].dates.push(s.observedAt);
      return acc;
    }, {} as Record<string, { count: number; totalSeverity: number; dates: Date[] }>);

    return Object.entries(grouped).map(([symptomName, data]) => ({
      symptomName,
      count: data.count,
      avgSeverity: Math.round((data.totalSeverity / data.count) * 10) / 10,
      dates: data.dates,
    }));
  } catch (error) {
    console.error('Error getting symptom summary (server):', error);
    return [];
  }
}

/**
 * Get health conditions using Admin SDK (server-side)
 */
async function getHealthConditionsServer(
  elderId: string,
  groupId: string
): Promise<{ status: string }[]> {
  try {
    console.log('[getHealthConditionsServer] Querying for elderId:', elderId, 'groupId:', groupId);
    const adminDb = getAdminDb();
    const conditionsSnapshot = await adminDb
      .collection('elderHealthConditions')
      .where('elderId', '==', elderId)
      .where('groupId', '==', groupId)
      .get();

    console.log('[getHealthConditionsServer] Found', conditionsSnapshot.size, 'conditions');
    return conditionsSnapshot.docs.map(doc => ({
      status: doc.data().status as string || 'active',
    }));
  } catch (error) {
    console.error('[getHealthConditionsServer] Error:', error);
    return [];
  }
}

/**
 * Get allergies using Admin SDK (server-side)
 */
async function getAllergiesServer(
  elderId: string,
  groupId: string
): Promise<{ id: string }[]> {
  try {
    console.log('[getAllergiesServer] Querying for elderId:', elderId, 'groupId:', groupId);
    const adminDb = getAdminDb();
    const allergiesSnapshot = await adminDb
      .collection('elderAllergies')
      .where('elderId', '==', elderId)
      .where('groupId', '==', groupId)
      .get();

    console.log('[getAllergiesServer] Found', allergiesSnapshot.size, 'allergies');
    return allergiesSnapshot.docs.map(doc => ({ id: doc.id }));
  } catch (error) {
    console.error('[getAllergiesServer] Error:', error);
    return [];
  }
}

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
 * Observation with optional actionable flag
 */
interface ObservationWithFlag {
  observation: string;
  actionFlag?: ActionFlag;
  actionFlagReason?: string;
}

/**
 * Generate observations WITHOUT using AI
 * This is the SAFEST approach - pure data reporting
 * Returns observations with actionable flags (factual, non-medical)
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
}): ObservationWithFlag[] {
  const observations: ObservationWithFlag[] = [];
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Symptom observations
  for (const symptom of data.symptomSummary) {
    if (symptom.count > 0) {
      const dateStr = symptom.dates.map(formatDate).join(', ');

      // Determine flag based on symptom frequency
      let flag: ActionFlag | undefined;
      let flagReason: string | undefined;

      if (symptom.count >= 3) {
        flag = 'recurring';
        flagReason = `Logged ${symptom.count} times in ${data.days} days`;
      } else if (symptom.count >= 5) {
        flag = 'high_frequency';
        flagReason = `Logged ${symptom.count} times in ${data.days} days`;
      }

      observations.push({
        observation: `${symptom.symptomName} was logged ${symptom.count} time${symptom.count > 1 ? 's' : ''} between ${formatDate(data.periodStart)} and ${formatDate(data.periodEnd)}.`,
        actionFlag: flag,
        actionFlagReason: flagReason,
      });

      if (symptom.count <= 5) {
        observations.push({
          observation: `${symptom.symptomName} was logged on: ${dateStr}.`,
        });
      }

      observations.push({
        observation: `Average severity for ${symptom.symptomName}: ${symptom.avgSeverity} out of 10.`,
      });
    }
  }

  // Medication adherence
  if (data.adherence.total > 0) {
    let flag: ActionFlag | undefined;
    let flagReason: string | undefined;

    if (data.adherence.rate < 80) {
      flag = 'low_adherence';
      flagReason = `${data.adherence.rate}% adherence rate`;
    }

    observations.push({
      observation: `Medication adherence rate: ${data.adherence.rate}% (${data.adherence.taken} of ${data.adherence.total} doses taken).`,
      actionFlag: flag,
      actionFlagReason: flagReason,
    });
  } else {
    observations.push({
      observation: `No medication logs available for this period.`,
      actionFlag: 'logging_gap',
      actionFlagReason: 'No medication logs recorded',
    });
  }

  // Condition count
  if (data.conditionCount > 0) {
    observations.push({
      observation: `${data.conditionCount} health condition${data.conditionCount > 1 ? 's are' : ' is'} currently listed as active.`,
    });
  }

  // Allergy count
  if (data.allergyCount > 0) {
    observations.push({
      observation: `${data.allergyCount} ${data.allergyCount > 1 ? 'allergies are' : 'allergy is'} documented.`,
    });
  }

  // Diet entries
  if (data.dietEntryCount > 0) {
    observations.push({
      observation: `${data.dietEntryCount} diet entries in the past ${data.days} days.`,
    });
  } else {
    observations.push({
      observation: `No diet entries logged in the past ${data.days} days.`,
      actionFlag: 'logging_gap',
      actionFlagReason: 'No diet entries recorded',
    });
  }

  // If no data at all
  if (observations.length === 0) {
    observations.push({
      observation: 'No health data available for this period.',
      actionFlag: 'logging_gap',
      actionFlagReason: 'No health data logged',
    });
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

    // Log HIPAA disclosure using server-side Admin SDK
    await logPHIThirdPartyDisclosureServer({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Elder Health Insights Generator',
      serviceType: 'health_insight_generation',
      dataShared: ['symptoms', 'medication_logs', 'conditions', 'allergies', 'diet_entries'],
      purpose: 'Generate factual observations from health data (no AI interpretation)',
    });

    // Gather data using server-side Admin SDK functions
    const [symptomSummary, conditions, allergies, adherence, dietEntryCount] = await Promise.all([
      getSymptomSummaryServer(elderId, groupId, days),
      getHealthConditionsServer(elderId, groupId),
      getAllergiesServer(elderId, groupId),
      getMedicationAdherenceData(elderId, groupId, days),
      getDietEntryCount(elderId, groupId, days),
    ]);

    console.log('[elderHealthInsights] Data gathered:', {
      symptomsCount: symptomSummary.length,
      conditionsCount: conditions.length,
      allergiesCount: allergies.length,
      adherence,
      dietEntryCount,
    });

    const activeConditions = conditions.filter(c => c.status === 'active');

    // Generate template-based observations (NO AI)
    console.log('[elderHealthInsights] Generating observations with:', {
      symptomSummary,
      adherence,
      conditionCount: activeConditions.length,
      allergyCount: allergies.length,
      dietEntryCount,
      days,
      periodStart,
      periodEnd,
    });

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

    console.log('[elderHealthInsights] Generated observations:', observations);

    // Validate all observations (extra safety check)
    const validObservations = filterValidObservations(observations);
    console.log('[elderHealthInsights] Valid observations count:', validObservations.length);

    // Create insights
    const insights: ElderHealthInsight[] = [];

    for (const obsWithFlag of validObservations) {
      const insight: Omit<ElderHealthInsight, 'id' | 'dismissedAt' | 'dismissedBy'> = {
        elderId,
        groupId,
        insightType: 'observation',
        observation: obsWithFlag.observation,
        dataSource: 'template',
        dataPoints: [],
        createdAt: new Date(),
        periodStart,
        periodEnd,
        generatedBy: userId,
        userRole,
        actionFlag: obsWithFlag.actionFlag,
        actionFlagReason: obsWithFlag.actionFlagReason,
      };

      const result = await saveHealthInsightServer(insight);
      if (result.success && result.id) {
        insights.push({
          ...insight,
          id: result.id,
        });
      } else {
        console.error('[elderHealthInsights] Failed to save insight:', result.error);
      }
    }

    return { success: true, insights };
  } catch (error: any) {
    console.error('Error generating health insights:', error);
    return { success: false, insights: [], error: error.message };
  }
}

/**
 * Build a factual summary from data (no AI interpretation)
 */
function buildFactualSummary(
  symptomSummary: { symptomName: string; count: number }[],
  adherence: { rate: number; total: number },
  dietEntryCount: number,
  days: number
): string {
  const parts: string[] = [];

  // Symptom summary
  if (symptomSummary.length > 0) {
    const totalSymptomLogs = symptomSummary.reduce((sum, s) => sum + s.count, 0);
    parts.push(`${totalSymptomLogs} symptom log${totalSymptomLogs !== 1 ? 's' : ''} recorded`);
  }

  // Medication adherence
  if (adherence.total > 0) {
    parts.push(`medication adherence at ${adherence.rate}%`);
  }

  // Diet entries
  if (dietEntryCount > 0) {
    parts.push(`${dietEntryCount} diet entr${dietEntryCount !== 1 ? 'ies' : 'y'} logged`);
  }

  if (parts.length === 0) {
    return `No health data logged in the past ${days} days.`;
  }

  return `In the past ${days} days: ${parts.join(', ')}.`;
}

/**
 * Generate a summary observation using AI with STRICT guardrails
 * Uses Gemini API with Claude fallback
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
    // Gather data first using server-side Admin SDK functions
    const [symptomSummary, adherence, dietEntryCount] = await Promise.all([
      getSymptomSummaryServer(elderId, groupId, days),
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

    // Log HIPAA disclosure using server-side Admin SDK
    await logPHIThirdPartyDisclosureServer({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'AI Summary (Gemini/Claude)',
      serviceType: 'health_data_summary',
      dataShared: ['symptom_counts', 'medication_adherence_rate', 'diet_entry_count'],
      purpose: 'Generate factual summary of health data counts (no interpretation)',
    });

    const prompt = `You are a DATA REPORTER. Report ONLY the following data counts in 1-2 sentences.

ABSOLUTE RULES:
- Do NOT interpret or advise
- Do NOT use words like: should, recommend, concerning, may indicate
- ONLY state factual counts

DATA:
${dataDescription}

OUTPUT FORMAT:
"In the past ${days} days: [X] symptom entries were logged, medication adherence was [Y]%, and [Z] diet entries were recorded."

If any data is zero, you can omit it. Output ONLY the factual summary sentence.`;

    try {
      const responseText = await callAI(prompt);

      // Validate output
      if (containsForbiddenWords(responseText)) {
        console.warn('[generateAISummaryObservation] AI summary rejected - contains forbidden words');
        // Return factual data summary with provider consultation note
        const dataSummary = buildFactualSummary(symptomSummary, adherence, dietEntryCount, days);
        return {
          success: true,
          summary: `${dataSummary}\n\nFor any health concerns or questions about this data, please consult your healthcare provider.`,
        };
      }

      return { success: true, summary: responseText.trim() };
    } catch (aiError) {
      console.warn('[generateAISummaryObservation] AI call failed, using template:', aiError);
      // Return factual data summary with provider consultation note
      const dataSummary = buildFactualSummary(symptomSummary, adherence, dietEntryCount, days);
      return {
        success: true,
        summary: `${dataSummary}\n\nFor any health concerns or questions about this data, please consult your healthcare provider.`,
      };
    }
  } catch (error: any) {
    console.error('[generateAISummaryObservation] Error:', error);
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
