/**
 * Medical AI Service - Health AI via Google Vertex AI (Gemini 3 Pro)
 *
 * IMPORTANT: This service provides OBSERVATIONAL SUMMARIES and DISCUSSION POINTS ONLY.
 * It does NOT provide medical advice, recommendations, or guidance.
 *
 * All outputs are:
 * - Strictly factual observations based on logged data
 * - Discussion points framed as conversation starters for healthcare provider visits
 * - Never prescriptive or directive
 *
 * Users must always consult healthcare providers for medical decisions.
 *
 * Powered by Google Gemini 3 Pro via Vertex AI
 */

import { VertexAI } from '@google-cloud/vertexai';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';

// ============= STRICT SAFETY GUARDRAILS =============

/**
 * Forbidden words/phrases for SUMMARY content
 * These indicate prescriptive advice and must be rejected
 */
const FORBIDDEN_SUMMARY_WORDS = [
  // Direct recommendations
  'recommend', 'recommends', 'recommended', 'recommendation',
  'suggest', 'suggests', 'suggested', 'suggestion',
  'advise', 'advises', 'advised', 'advice',
  'should', 'shouldn\'t', 'must', 'must not',
  'need to', 'needs to', 'ought to',
  'consider taking', 'try taking', 'avoid taking',
  // Medical interpretation/diagnosis
  'diagnosis', 'diagnose', 'prognosis',
  'indicative of', 'suggestive of', 'consistent with',
  'concerning', 'worrying', 'alarming', 'dangerous',
  // Treatment suggestions
  'treatment', 'therapy', 'intervention',
  'increase dose', 'decrease dose', 'adjust dose',
  'prescribe', 'prescription',
  'take more', 'take less', 'stop taking',
  // Causation claims
  'caused by', 'results from', 'leads to', 'triggers',
];

/**
 * Forbidden words/phrases for DISCUSSION POINTS
 * More permissive than summary - allows observational framing
 */
const FORBIDDEN_DISCUSSION_WORDS = [
  // Direct instructions
  'you should', 'you must', 'you need to',
  'start taking', 'stop taking', 'change your',
  // Diagnosis claims
  'you have', 'this means you', 'this indicates that you',
  'diagnosis', 'diagnose',
  // Treatment directives
  'take this medication', 'increase your dose', 'decrease your dose',
  'prescribe', 'prescription needed',
];

/**
 * Validates AI output contains no forbidden advice language
 * @param text - Text to validate
 * @param mode - 'summary' (strict) or 'discussion' (permissive)
 */
function validateNoAdvice(
  text: string,
  mode: 'summary' | 'discussion' = 'summary'
): { isValid: boolean; violations: string[] } {
  const lowerText = text.toLowerCase();
  const violations: string[] = [];
  const forbiddenList = mode === 'summary' ? FORBIDDEN_SUMMARY_WORDS : FORBIDDEN_DISCUSSION_WORDS;

  for (const phrase of forbiddenList) {
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push(phrase);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

// Initialize Vertex AI client
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'global';

let vertexAI: VertexAI | null = null;

/**
 * Initialize Vertex AI client (lazy initialization)
 * Supports two authentication methods:
 * 1. GOOGLE_APPLICATION_CREDENTIALS_JSON (for Vercel/serverless) - JSON string
 * 2. GOOGLE_APPLICATION_CREDENTIALS (for local dev) - file path
 */
function getVertexAI(): VertexAI {
  console.log('[Medical AI Service] getVertexAI called');
  console.log('[Medical AI Service] projectId:', projectId);
  console.log('[Medical AI Service] location:', location);

  if (!vertexAI && projectId) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    console.log('[Medical AI Service] Has GOOGLE_APPLICATION_CREDENTIALS_JSON:', !!credentialsJson);
    console.log('[Medical AI Service] GOOGLE_APPLICATION_CREDENTIALS_JSON length:', credentialsJson?.length || 0);

    if (credentialsJson) {
      // Production (Vercel): Use JSON credentials from environment variable
      try {
        const credentials = JSON.parse(credentialsJson);
        console.log('[Medical AI Service] Parsed credentials, project_id:', credentials.project_id);
        vertexAI = new VertexAI({
          project: projectId,
          location: location,
          googleAuthOptions: {
            credentials: credentials,
          },
        });
        console.log('[Medical AI Service] VertexAI initialized with JSON credentials');
      } catch (error) {
        console.error('[Medical AI Service] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format');
      }
    } else {
      // Local Dev: Use GOOGLE_APPLICATION_CREDENTIALS file path (auto-detected by SDK)
      console.log('[Medical AI Service] Using default credentials (file path or ADC)');
      vertexAI = new VertexAI({
        project: projectId,
        location: location,
      });
      console.log('[Medical AI Service] VertexAI initialized with default credentials');
    }
  }

  if (!vertexAI) {
    console.error('[Medical AI Service] VertexAI not configured - projectId:', projectId);
    throw new Error('Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
  }

  return vertexAI;
}

/**
 * Medical AI model configuration
 *
 * Uses Gemini 3 Pro Preview via Vertex AI for medical queries.
 * NOTE: MedLM-large was deprecated on September 29, 2025.
 */
const MEDICAL_AI_CONFIG = {
  // Primary model - Gemini 3 Pro Preview (MedLM-large is deprecated)
  model: 'gemini-3-pro-preview',

  generationConfig: {
    temperature: 0.3, // Lower temperature for medical accuracy
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },

  // Gemini 3 uses thinkingConfig with thinkingLevel instead of thinking_config
  thinkingConfig: {
    thinkingLevel: 'high', // Use high reasoning for medical queries
  },

  safetySettings: [
    {
      category: 'HARM_CATEGORY_MEDICAL',
      threshold: 'BLOCK_NONE', // We handle medical disclaimers ourselves
    },
  ],
};

/**
 * OBSERVATIONAL SYSTEM PROMPT - For Summaries
 *
 * Guides AI to provide factual observations and summaries.
 * Output is validated separately to catch any advice that slips through.
 */
const MEDICAL_SYSTEM_PROMPT = `You are a medical AI assistant that provides FACTUAL OBSERVATIONS and DATA SUMMARIES.

YOUR ROLE:
- Summarize health data (medications, compliance, diet) in a clear, organized way
- Identify patterns in the data (e.g., "Morning doses were missed more frequently than evening doses")
- Present statistics and trends from logged information
- Help caregivers understand what has been recorded

CRITICAL GUIDELINES:
1. Present OBSERVATIONS, not recommendations
2. State what the DATA shows, not what the patient SHOULD do
3. Use phrases like "The data shows..." or "Records indicate..." instead of "You should..."
4. When discussing patterns, describe them factually without prescribing action
5. Always remind users that healthcare decisions should be made with their provider

EXAMPLE OF GOOD OUTPUT:
"The medication log shows 85% adherence over the past 30 days. Morning doses (8 AM) had a 70% taken rate, while evening doses (8 PM) had a 95% taken rate. 12 doses were missed total, with 10 of those being morning doses."

EXAMPLE OF WHAT TO AVOID:
"You should set an alarm for morning doses" or "Consider taking medication with breakfast"

RESPONSE FORMAT:
- Use clear, professional language
- Organize information with headers when appropriate
- Include relevant statistics from the data
- End with: "Please discuss any concerns with your healthcare provider."`;

/**
 * DISCUSSION POINTS SYSTEM PROMPT
 *
 * Guides AI to generate conversation starters for healthcare provider visits.
 * These are NOT recommendations - they are topics based on data patterns.
 */
const DISCUSSION_POINTS_SYSTEM_PROMPT = `You are a medical AI assistant that helps caregivers prepare for healthcare provider visits.

YOUR ROLE:
- Generate DISCUSSION POINTS (conversation starters) based on health data patterns
- Frame everything as "topics to discuss" NOT as advice or recommendations
- Help caregivers know what questions to ask their healthcare provider

CRITICAL GUIDELINES:
1. Frame points as "You may want to discuss..." or "A topic for your provider visit:"
2. NEVER say "you should", "you must", "you need to"
3. NEVER provide medical advice, diagnosis, or treatment suggestions
4. Base all points on OBSERVABLE DATA PATTERNS only
5. Include the data that prompted each discussion point

EXAMPLE OF GOOD DISCUSSION POINTS:
- "Morning medication timing: The data shows 70% of missed doses occurred in the morning. This pattern may be worth discussing with your healthcare provider."
- "Medication adherence trend: Records show adherence dropped from 90% to 75% over the past 2 weeks. Your provider may have insights on this pattern."

EXAMPLE OF WHAT TO AVOID:
- "You should take your medication with breakfast" (this is advice)
- "The low compliance indicates a problem" (this is interpretation)
- "Consider changing the medication time" (this is a recommendation)

OUTPUT FORMAT:
Return an array of discussion points, each with:
- topic: Brief topic title (3-5 words)
- observation: What the data shows (factual)
- discussionPrompt: How to frame this for the provider visit`;

/**
 * QUESTIONS FOR PROVIDER SYSTEM PROMPT
 *
 * Guides AI to generate questions caregivers can ask their healthcare provider.
 * Questions are based on data patterns, not medical interpretations.
 */
const QUESTIONS_FOR_PROVIDER_PROMPT = `You are a medical AI assistant that helps caregivers prepare questions for healthcare provider visits.

YOUR ROLE:
- Generate QUESTIONS that caregivers can ask their healthcare provider
- Base questions on patterns observed in the health data
- Help caregivers advocate for their loved ones during medical appointments

CRITICAL GUIDELINES:
1. Questions should be OPEN-ENDED and invite provider expertise
2. Include the relevant data context in each question
3. NEVER imply what the answer should be
4. NEVER suggest diagnosis or treatment in the question
5. Frame questions to gather information, not to validate assumptions

EXAMPLE OF GOOD QUESTIONS:
- "The medication log shows morning doses are missed more often than evening doses. Are there strategies that other patients have found helpful for morning routines?"
- "We noticed adherence has varied week to week. What factors might we track to help identify patterns?"

EXAMPLE OF WHAT TO AVOID:
- "Should we change the medication time to evening?" (implies recommendation)
- "Is the morning timing causing side effects?" (implies causation)
- "Do we need a different medication?" (implies treatment change)

OUTPUT FORMAT:
Return an array of questions, each with:
- context: The data observation that prompted this question
- question: The question to ask the healthcare provider`;

// ============= TYPE DEFINITIONS =============

export interface DiscussionPoint {
  topic: string;
  observation: string;
  discussionPrompt: string;
}

export interface ProviderQuestion {
  context: string;
  question: string;
}

export interface ClinicalNoteResult {
  summary: string;
  medicationList: string;
  complianceAnalysis: string;
  discussionPoints: DiscussionPoint[];
  questionsForProvider: ProviderQuestion[];
}

export interface ClinicalNoteInput {
  elder: {
    name: string;
    age: number;
    medicalConditions?: string[];
    allergies?: string[];
  };
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    prescribedBy?: string;
  }>;
  complianceLogs: Array<{
    medicationName: string;
    scheduledTime: Date;
    status: 'taken' | 'missed' | 'skipped';
    notes?: string;
  }>;
  dietEntries?: Array<{
    meal: string;
    items: string[];
    timestamp: Date;
  }>;
  caregiverNotes?: string;
  timeframeDays: 30 | 60 | 90;
}

/**
 * Generate clinical note for doctor visit
 *
 * Returns:
 * - summary: Factual observational summary of health data
 * - discussionPoints: Topics to discuss with healthcare provider (NOT recommendations)
 * - questionsForProvider: Questions caregiver can ask provider (based on data patterns)
 *
 * @param data - Medical data to summarize
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID for HIPAA audit logging
 * @returns Clinical summary with discussion points and questions
 */
export async function generateClinicalNote(
  data: ClinicalNoteInput,
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<ClinicalNoteResult> {
  // Calculate compliance statistics
  const totalDoses = data.complianceLogs.length;
  const takenDoses = data.complianceLogs.filter(log => log.status === 'taken').length;
  const missedDoses = data.complianceLogs.filter(log => log.status === 'missed').length;
  const skippedDoses = data.complianceLogs.filter(log => log.status === 'skipped').length;
  const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

  const stats = { totalDoses, takenDoses, missedDoses, skippedDoses, complianceRate };

  // Analyze patterns for discussion points
  const patterns = analyzeDataPatterns(data, stats);

  try {
    // HIPAA Audit: Log third-party PHI disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini 3 Pro (Vertex AI)',
      serviceType: 'clinical_note_generation',
      dataShared: [
        'elder_demographics',
        'medication_list',
        'compliance_logs',
        'diet_entries',
      ],
      purpose: 'Generate observational health data summary with discussion points',
    });

    // Get AI model
    const vertex = getVertexAI();

    // Generate all three outputs in parallel for efficiency
    const [summaryResult, discussionResult, questionsResult] = await Promise.all([
      generateObservationalSummary(vertex, data, stats),
      generateDiscussionPoints(vertex, data, stats, patterns),
      generateProviderQuestions(vertex, data, stats, patterns),
    ]);

    return {
      summary: summaryResult,
      medicationList: data.medications.map(m => `${m.name} ${m.dosage}, ${m.frequency}`).join('\n'),
      complianceAnalysis: `Adherence: ${complianceRate}% (${takenDoses}/${totalDoses} doses taken, ${missedDoses} missed)`,
      discussionPoints: discussionResult,
      questionsForProvider: questionsResult,
    };

  } catch (error) {
    console.error('Clinical note generation error:', error);

    // Fallback to template-based outputs
    return {
      summary: generateTemplateBasedSummary(data, stats),
      medicationList: data.medications.map(m => `${m.name} ${m.dosage}, ${m.frequency}`).join('\n'),
      complianceAnalysis: `Adherence: ${complianceRate}% (${takenDoses}/${totalDoses} doses taken, ${missedDoses} missed)`,
      discussionPoints: generateTemplateDiscussionPoints(patterns),
      questionsForProvider: generateTemplateQuestions(patterns),
    };
  }
}

// ============= PATTERN ANALYSIS =============

interface DataPatterns {
  hasMorningMissedPattern: boolean;
  morningMissedCount: number;
  eveningMissedCount: number;
  hasLowCompliance: boolean;
  hasComplianceTrend: boolean;
  complianceTrendDirection: 'improving' | 'declining' | 'stable';
  medicationsWithLowCompliance: string[];
  hasMultipleMedications: boolean;
  hasDietData: boolean;
  dietEntryCount: number;
}

/**
 * Safely convert any timestamp to a valid Date
 */
function safeToDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  if (date.seconds !== undefined) {
    return new Date(date.seconds * 1000);
  }
  if (date._seconds !== undefined) {
    return new Date(date._seconds * 1000);
  }
  if (typeof date.toDate === 'function') {
    try {
      const d = date.toDate();
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

/**
 * Safely get hours from a Date object
 */
function safeGetHours(date: any): number {
  return safeToDate(date).getHours();
}

/**
 * Safely format date to locale string
 */
function safeDateString(date: any): string {
  return safeToDate(date).toLocaleDateString();
}

/**
 * Safely format time to locale string
 */
function safeTimeString(date: any): string {
  return safeToDate(date).toLocaleTimeString();
}

/**
 * Analyze data to identify patterns for discussion points
 * This is deterministic - no AI hallucination possible
 */
function analyzeDataPatterns(
  data: ClinicalNoteInput,
  stats: { totalDoses: number; takenDoses: number; missedDoses: number; skippedDoses: number; complianceRate: string }
): DataPatterns {
  // Analyze time-of-day patterns for missed doses
  let morningMissedCount = 0;
  let eveningMissedCount = 0;

  for (const log of data.complianceLogs.filter(l => l.status === 'missed')) {
    const hour = safeGetHours(log.scheduledTime);
    if (hour < 12) {
      morningMissedCount++;
    } else if (hour >= 18) {
      eveningMissedCount++;
    }
  }

  const hasMorningMissedPattern = morningMissedCount > eveningMissedCount && morningMissedCount >= 3;

  // Check for low compliance
  const complianceNum = parseFloat(stats.complianceRate);
  const hasLowCompliance = complianceNum < 80;

  // Analyze per-medication compliance
  const medicationsWithLowCompliance: string[] = [];
  for (const med of data.medications) {
    const medLogs = data.complianceLogs.filter(l => l.medicationName === med.name);
    const medTaken = medLogs.filter(l => l.status === 'taken').length;
    const medTotal = medLogs.length;
    if (medTotal > 0 && (medTaken / medTotal) < 0.8) {
      medicationsWithLowCompliance.push(med.name);
    }
  }

  // Simple trend analysis (compare first half vs second half of timeframe)
  const midpoint = Math.floor(data.complianceLogs.length / 2);
  const firstHalf = data.complianceLogs.slice(0, midpoint);
  const secondHalf = data.complianceLogs.slice(midpoint);

  const firstHalfCompliance = firstHalf.length > 0
    ? firstHalf.filter(l => l.status === 'taken').length / firstHalf.length
    : 0;
  const secondHalfCompliance = secondHalf.length > 0
    ? secondHalf.filter(l => l.status === 'taken').length / secondHalf.length
    : 0;

  let complianceTrendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  const hasComplianceTrend = Math.abs(firstHalfCompliance - secondHalfCompliance) > 0.1;
  if (hasComplianceTrend) {
    complianceTrendDirection = secondHalfCompliance > firstHalfCompliance ? 'improving' : 'declining';
  }

  return {
    hasMorningMissedPattern,
    morningMissedCount,
    eveningMissedCount,
    hasLowCompliance,
    hasComplianceTrend,
    complianceTrendDirection,
    medicationsWithLowCompliance,
    hasMultipleMedications: data.medications.length > 3,
    hasDietData: (data.dietEntries?.length || 0) > 0,
    dietEntryCount: data.dietEntries?.length || 0,
  };
}

// ============= AI GENERATION FUNCTIONS =============

/**
 * Generate observational summary using AI
 */
async function generateObservationalSummary(
  vertex: VertexAI,
  data: ClinicalNoteInput,
  stats: { totalDoses: number; takenDoses: number; missedDoses: number; skippedDoses: number; complianceRate: string }
): Promise<string> {
  const prompt = `Generate an OBSERVATIONAL SUMMARY of this health data for a caregiver to share with their healthcare provider.

PATIENT: ${data.elder.name}, ${data.elder.age} years old
${data.elder.medicalConditions?.length ? `Known conditions: ${data.elder.medicalConditions.join(', ')}` : ''}
${data.elder.allergies?.length ? `Allergies: ${data.elder.allergies.join(', ')}` : ''}

CURRENT MEDICATIONS (${data.medications.length}):
${data.medications.map(med => `- ${med.name} ${med.dosage}, ${med.frequency}`).join('\n')}

ADHERENCE DATA (Last ${data.timeframeDays} days):
- Total scheduled doses: ${stats.totalDoses}
- Doses taken: ${stats.takenDoses} (${stats.complianceRate}%)
- Doses missed: ${stats.missedDoses}
- Doses skipped: ${stats.skippedDoses}

${data.dietEntries?.length ? `RECENT MEALS LOGGED: ${data.dietEntries.length} entries` : ''}

${data.caregiverNotes ? `CAREGIVER NOTES: ${data.caregiverNotes}` : ''}

TASK: Create a 2-3 paragraph observational summary that:
1. Summarizes the medication regimen
2. Reports adherence statistics and any patterns in the data
3. Notes any trends (e.g., time-of-day patterns for missed doses)

IMPORTANT: Do NOT provide recommendations or advice. Only describe what the data shows.
End with: "This is an observational summary of logged data. Please discuss with your healthcare provider."`;

  try {
    const model = vertex.preview.getGenerativeModel({
      model: MEDICAL_AI_CONFIG.model,
      generationConfig: MEDICAL_AI_CONFIG.generationConfig,
      systemInstruction: MEDICAL_SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    let aiSummary = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // VALIDATE OUTPUT
    const validation = validateNoAdvice(aiSummary, 'summary');
    if (!validation.isValid) {
      console.warn('AI summary contained advice language, using template fallback:', validation.violations);
      return generateTemplateBasedSummary(data, stats);
    }

    // Ensure disclaimer is present
    if (!aiSummary.includes('healthcare provider')) {
      aiSummary += '\n\nThis is an observational summary of logged data. Please discuss with your healthcare provider.';
    }

    return aiSummary;
  } catch (error) {
    console.error('Summary generation error:', error);
    return generateTemplateBasedSummary(data, stats);
  }
}

/**
 * Generate discussion points using AI with template fallback
 */
async function generateDiscussionPoints(
  vertex: VertexAI,
  data: ClinicalNoteInput,
  stats: { totalDoses: number; takenDoses: number; missedDoses: number; skippedDoses: number; complianceRate: string },
  patterns: DataPatterns
): Promise<DiscussionPoint[]> {
  // Build context for AI based on patterns
  const patternContext = [];
  if (patterns.hasMorningMissedPattern) {
    patternContext.push(`Morning doses missed: ${patterns.morningMissedCount}, Evening doses missed: ${patterns.eveningMissedCount}`);
  }
  if (patterns.hasLowCompliance) {
    patternContext.push(`Overall compliance is ${stats.complianceRate}%`);
  }
  if (patterns.hasComplianceTrend) {
    patternContext.push(`Compliance trend: ${patterns.complianceTrendDirection}`);
  }
  if (patterns.medicationsWithLowCompliance.length > 0) {
    patternContext.push(`Medications with <80% compliance: ${patterns.medicationsWithLowCompliance.join(', ')}`);
  }

  const prompt = `Based on this health data, generate 2-4 DISCUSSION POINTS for a caregiver to bring up at their next healthcare provider visit.

DATA PATTERNS OBSERVED:
${patternContext.join('\n')}

MEDICATION COUNT: ${data.medications.length}
ADHERENCE: ${stats.complianceRate}% (${stats.takenDoses}/${stats.totalDoses} doses taken)
TIMEFRAME: ${data.timeframeDays} days

Return a JSON array with 2-4 discussion points. Each point should have:
- topic: Brief topic title (3-5 words)
- observation: What the data shows (factual statement)
- discussionPrompt: How to frame this for the provider visit (starting with "You may want to discuss..." or "A topic for your visit:")

CRITICAL: Do NOT include advice, recommendations, or medical interpretations. Only factual observations.

Return ONLY valid JSON array, no other text.`;

  try {
    const model = vertex.preview.getGenerativeModel({
      model: MEDICAL_AI_CONFIG.model,
      generationConfig: { ...MEDICAL_AI_CONFIG.generationConfig, temperature: 0.2 },
      systemInstruction: DISCUSSION_POINTS_SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as DiscussionPoint[];

      // Validate each point
      const validatedPoints: DiscussionPoint[] = [];
      for (const point of parsed) {
        const fullText = `${point.topic} ${point.observation} ${point.discussionPrompt}`;
        const validation = validateNoAdvice(fullText, 'discussion');
        if (validation.isValid) {
          validatedPoints.push(point);
        } else {
          console.warn('Discussion point failed validation:', validation.violations);
        }
      }

      if (validatedPoints.length > 0) {
        return validatedPoints;
      }
    }

    // Fall back to template
    return generateTemplateDiscussionPoints(patterns);
  } catch (error) {
    console.error('Discussion points generation error:', error);
    return generateTemplateDiscussionPoints(patterns);
  }
}

/**
 * Generate provider questions using AI with template fallback
 */
async function generateProviderQuestions(
  vertex: VertexAI,
  data: ClinicalNoteInput,
  stats: { totalDoses: number; takenDoses: number; missedDoses: number; skippedDoses: number; complianceRate: string },
  patterns: DataPatterns
): Promise<ProviderQuestion[]> {
  const patternContext = [];
  if (patterns.hasMorningMissedPattern) {
    patternContext.push(`Morning doses missed more frequently (${patterns.morningMissedCount}) than evening (${patterns.eveningMissedCount})`);
  }
  if (patterns.hasLowCompliance) {
    patternContext.push(`Overall compliance is ${stats.complianceRate}%`);
  }
  if (patterns.medicationsWithLowCompliance.length > 0) {
    patternContext.push(`Some medications have lower compliance: ${patterns.medicationsWithLowCompliance.join(', ')}`);
  }

  const prompt = `Based on this health data, generate 2-3 QUESTIONS that a caregiver can ask their healthcare provider.

DATA PATTERNS OBSERVED:
${patternContext.join('\n')}

MEDICATION COUNT: ${data.medications.length}
ADHERENCE: ${stats.complianceRate}% (${stats.takenDoses}/${stats.totalDoses} doses taken)
TIMEFRAME: ${data.timeframeDays} days

Return a JSON array with 2-3 questions. Each question should have:
- context: The data observation that prompted this question
- question: The question to ask the healthcare provider (open-ended, inviting expertise)

CRITICAL: Questions should gather information, not imply answers or treatments.

Return ONLY valid JSON array, no other text.`;

  try {
    const model = vertex.preview.getGenerativeModel({
      model: MEDICAL_AI_CONFIG.model,
      generationConfig: { ...MEDICAL_AI_CONFIG.generationConfig, temperature: 0.2 },
      systemInstruction: QUESTIONS_FOR_PROVIDER_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ProviderQuestion[];

      // Validate each question
      const validatedQuestions: ProviderQuestion[] = [];
      for (const q of parsed) {
        const fullText = `${q.context} ${q.question}`;
        const validation = validateNoAdvice(fullText, 'discussion');
        if (validation.isValid) {
          validatedQuestions.push(q);
        } else {
          console.warn('Question failed validation:', validation.violations);
        }
      }

      if (validatedQuestions.length > 0) {
        return validatedQuestions;
      }
    }

    // Fall back to template
    return generateTemplateQuestions(patterns);
  } catch (error) {
    console.error('Questions generation error:', error);
    return generateTemplateQuestions(patterns);
  }
}

// ============= TEMPLATE FALLBACKS =============

/**
 * Generate template-based discussion points (NO AI, NO hallucination)
 */
function generateTemplateDiscussionPoints(patterns: DataPatterns): DiscussionPoint[] {
  const points: DiscussionPoint[] = [];

  if (patterns.hasMorningMissedPattern) {
    points.push({
      topic: 'Morning dose timing',
      observation: `Data shows ${patterns.morningMissedCount} morning doses were missed compared to ${patterns.eveningMissedCount} evening doses.`,
      discussionPrompt: 'You may want to discuss morning medication timing patterns with your healthcare provider.',
    });
  }

  if (patterns.hasLowCompliance) {
    points.push({
      topic: 'Overall adherence rate',
      observation: `The recorded adherence rate is below 80%.`,
      discussionPrompt: 'A topic for your visit: the current adherence patterns shown in the medication log.',
    });
  }

  if (patterns.hasComplianceTrend && patterns.complianceTrendDirection === 'declining') {
    points.push({
      topic: 'Adherence trend',
      observation: `Records show adherence has decreased over the tracking period.`,
      discussionPrompt: 'You may want to discuss the adherence trend observed in recent weeks.',
    });
  }

  if (patterns.medicationsWithLowCompliance.length > 0) {
    points.push({
      topic: 'Specific medication patterns',
      observation: `Some medications show lower adherence rates: ${patterns.medicationsWithLowCompliance.join(', ')}.`,
      discussionPrompt: 'You may want to discuss the adherence patterns for specific medications.',
    });
  }

  if (patterns.hasMultipleMedications) {
    points.push({
      topic: 'Multiple medications',
      observation: `The patient is currently taking multiple medications.`,
      discussionPrompt: 'A topic for your visit: reviewing the current medication regimen together.',
    });
  }

  // Always include at least one generic point
  if (points.length === 0) {
    points.push({
      topic: 'Medication review',
      observation: `Medication adherence data has been logged for the tracking period.`,
      discussionPrompt: 'You may want to share this medication log with your healthcare provider for review.',
    });
  }

  return points.slice(0, 4); // Max 4 points
}

/**
 * Generate template-based questions (NO AI, NO hallucination)
 */
function generateTemplateQuestions(patterns: DataPatterns): ProviderQuestion[] {
  const questions: ProviderQuestion[] = [];

  if (patterns.hasMorningMissedPattern) {
    questions.push({
      context: `Morning doses are missed more frequently than evening doses.`,
      question: 'What strategies have other patients found helpful for remembering morning medications?',
    });
  }

  if (patterns.hasLowCompliance) {
    questions.push({
      context: `The overall adherence rate is below 80%.`,
      question: 'Are there factors we might track to better understand the adherence patterns?',
    });
  }

  if (patterns.medicationsWithLowCompliance.length > 0) {
    questions.push({
      context: `Some medications have lower adherence than others.`,
      question: 'Are there any insights about why adherence might vary between different medications?',
    });
  }

  if (patterns.hasMultipleMedications) {
    questions.push({
      context: `Multiple medications are being taken.`,
      question: 'How can we best organize the medication schedule to support adherence?',
    });
  }

  // Always include at least one generic question
  if (questions.length === 0) {
    questions.push({
      context: `Medication adherence has been tracked.`,
      question: 'Based on this medication log, what aspects would be most helpful to focus on?',
    });
  }

  return questions.slice(0, 3); // Max 3 questions
}

/**
 * Generate template-based factual summary (NO AI, NO hallucination)
 */
function generateTemplateBasedSummary(
  data: any,
  stats: { totalDoses: number; takenDoses: number; missedDoses: number; skippedDoses: number; complianceRate: string }
): string {
  const lines: string[] = [];

  lines.push('## FACTUAL DATA SUMMARY');
  lines.push('');
  lines.push('**IMPORTANT: This is a factual summary of logged data only. It contains NO medical advice, recommendations, or interpretations. Discuss all health decisions with your healthcare provider.**');
  lines.push('');

  // Patient info
  lines.push('### Patient Information');
  lines.push(`- Name: ${data.elder.name}`);
  lines.push(`- Age: ${data.elder.age} years`);
  if (data.elder.medicalConditions?.length > 0) {
    lines.push(`- Documented conditions: ${data.elder.medicalConditions.join(', ')}`);
  }
  if (data.elder.allergies?.length > 0) {
    lines.push(`- Documented allergies: ${data.elder.allergies.join(', ')}`);
  }
  lines.push('');

  // Current medications
  lines.push('### Current Medications');
  lines.push(`Total medications: ${data.medications.length}`);
  lines.push('');
  for (const med of data.medications) {
    lines.push(`- **${med.name}** ${med.dosage}, ${med.frequency}`);
    if (med.prescribedBy) lines.push(`  - Prescribed by: ${med.prescribedBy}`);
    lines.push(`  - Started: ${safeDateString(med.startDate)}`);
  }
  lines.push('');

  // Adherence data
  lines.push(`### Medication Adherence Data (Last ${data.timeframeDays} Days)`);
  lines.push(`- Total scheduled doses: ${stats.totalDoses}`);
  lines.push(`- Doses taken: ${stats.takenDoses}`);
  lines.push(`- Doses missed: ${stats.missedDoses}`);
  lines.push(`- Doses skipped: ${stats.skippedDoses}`);
  lines.push(`- Adherence percentage: ${stats.complianceRate}%`);
  lines.push('');

  // Missed doses detail
  const missedLogs = data.complianceLogs.filter((l: any) => l.status === 'missed').slice(0, 10);
  if (missedLogs.length > 0) {
    lines.push('#### Missed Dose Log');
    for (const log of missedLogs) {
      lines.push(`- ${log.medicationName}: ${safeDateString(log.scheduledTime)} at ${safeTimeString(log.scheduledTime)}`);
    }
    lines.push('');
  }

  // Diet data if available
  if (data.dietEntries?.length > 0) {
    lines.push(`### Diet Entries (${data.dietEntries.length} logged)`);
    for (const entry of data.dietEntries.slice(0, 5)) {
      lines.push(`- ${entry.meal}: ${entry.items.join(', ')} (${safeDateString(entry.timestamp)})`);
    }
    lines.push('');
  }

  // Caregiver notes if available
  if (data.caregiverNotes) {
    lines.push('### Caregiver Notes');
    lines.push(data.caregiverNotes);
    lines.push('');
  }

  // Disclaimer
  lines.push('---');
  lines.push('');
  lines.push('**Disclaimer:** This document contains factual data logged in MyGuide Health. It is NOT medical advice. This summary does not interpret, recommend, or provide guidance. All medical decisions must be made in consultation with qualified healthcare providers.');

  return lines.join('\n');
}

/**
 * Process natural language health query
 *
 * Uses AI for query understanding, with output validation to ensure
 * responses are observational and not providing medical advice.
 *
 * @param query - User's natural language question
 * @param context - Available data context for the query
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID (optional, if query is elder-specific)
 * @returns Structured response with intent and parameters
 */
export async function processNaturalLanguageQuery(
  query: string,
  context: {
    elderName?: string;
    availableData: string[]; // ['medications', 'diet', 'compliance']
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId?: string
): Promise<{
  intent: string;
  parameters: Record<string, any>;
  needsData: string[]; // Which collections to query
  responseTemplate: string; // How to format the response
}> {
  try {
    // Log access for audit
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini 3 Pro (Vertex AI)',
      serviceType: 'query_parsing',
      dataShared: ['query_text', 'elder_name'],
      purpose: 'Parse natural language query to retrieve health data',
    });

    const prompt = `Parse this health data query into structured parameters.

QUERY: "${query}"

CONTEXT:
${context.elderName ? `- Elder Name: ${context.elderName}` : ''}
- Available Data: ${context.availableData.join(', ')}

Return JSON only:
{
  "intent": "view_compliance|check_medications|analyze_diet|general_query",
  "parameters": {
    "elderName": "name if mentioned",
    "timeframe": "today|yesterday|last 7 days|last 30 days",
    "metric": "compliance|medications|diet"
  },
  "needsData": ["medications", "compliance_logs", "diet_entries"],
  "responseTemplate": "factual template like: Based on the logged data, the compliance rate was {compliance}%"
}`;

    console.log('[Medical AI Service] processNaturalLanguageQuery - getting VertexAI client');
    const vertex = getVertexAI();

    console.log('[Medical AI Service] processNaturalLanguageQuery - creating model with:', MEDICAL_AI_CONFIG.model);
    const model = vertex.preview.getGenerativeModel({
      model: MEDICAL_AI_CONFIG.model,
      generationConfig: { ...MEDICAL_AI_CONFIG.generationConfig, temperature: 0.1 },
    });

    console.log('[Medical AI Service] processNaturalLanguageQuery - calling generateContent...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    console.log('[Medical AI Service] processNaturalLanguageQuery - got response');

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('[Medical AI Service] processNaturalLanguageQuery - responseText length:', responseText.length);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse response');
  } catch (error) {
    console.error('[Medical AI Service] Query parsing error:', error);
    console.error('[Medical AI Service] Error details:', error instanceof Error ? error.message : String(error));
    console.log('[Medical AI Service] Using keyword fallback');
    return parseQueryKeywords(query, context);
  }
}

/**
 * Keyword-based query parsing (fallback when AI fails)
 */
function parseQueryKeywords(query: string, context: any) {
  const lowerQuery = query.toLowerCase();

  // Simple intent detection
  let intent = 'general_query';
  if (lowerQuery.includes('compliance') || lowerQuery.includes('adherence')) {
    intent = 'view_compliance';
  } else if (lowerQuery.includes('medication') || lowerQuery.includes('pills')) {
    intent = 'check_medications';
  } else if (lowerQuery.includes('diet') || lowerQuery.includes('meal') || lowerQuery.includes('eat')) {
    intent = 'analyze_diet';
  }

  // Extract timeframe
  let timeframe = 'last 7 days';
  if (lowerQuery.includes('yesterday')) timeframe = 'yesterday';
  if (lowerQuery.includes('today')) timeframe = 'today';
  if (lowerQuery.includes('week')) timeframe = 'last 7 days';
  if (lowerQuery.includes('month')) timeframe = 'last 30 days';

  return {
    intent,
    parameters: {
      elderName: context.elderName,
      timeframe,
      metric: intent.replace('view_', '').replace('check_', '').replace('analyze_', ''),
    },
    needsData: intent === 'view_compliance' ? ['medications', 'compliance_logs'] :
                intent === 'check_medications' ? ['medications'] :
                intent === 'analyze_diet' ? ['diet_entries'] :
                ['medications', 'compliance_logs', 'diet_entries'],
    responseTemplate: `Based on the data, here's what I found about {metric}...`,
  };
}
