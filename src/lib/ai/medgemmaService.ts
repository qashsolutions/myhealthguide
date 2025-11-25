/**
 * MedGemma 27B Service - Medical AI via Vertex AI
 *
 * MedGemma is a family of medical large language models (LLMs) built on Gemma
 * and fine-tuned for medical applications using medical data from:
 * - PubMed articles and abstracts
 * - Medical textbooks
 * - Clinical notes
 * - USMLE medical exam questions
 *
 * Performance: Achieves expert-level accuracy on medical benchmarks
 */

import { VertexAI } from '@google-cloud/vertexai';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';

// Initialize Vertex AI client
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

let vertexAI: VertexAI | null = null;

/**
 * Initialize Vertex AI client (lazy initialization)
 * Supports two authentication methods:
 * 1. GOOGLE_APPLICATION_CREDENTIALS_JSON (for Vercel/serverless) - JSON string
 * 2. GOOGLE_APPLICATION_CREDENTIALS (for local dev) - file path
 */
function getVertexAI(): VertexAI {
  if (!vertexAI && projectId) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (credentialsJson) {
      // Production (Vercel): Use JSON credentials from environment variable
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
        throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format');
      }
    } else {
      // Local Dev: Use GOOGLE_APPLICATION_CREDENTIALS file path (auto-detected by SDK)
      vertexAI = new VertexAI({
        project: projectId,
        location: location,
      });
    }
  }

  if (!vertexAI) {
    throw new Error('Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
  }

  return vertexAI;
}

/**
 * MedGemma model configuration
 */
const MEDGEMMA_CONFIG = {
  model: 'medlm-large', // Will be medgemma-27b when available in Vertex AI
  // Alternative: Use gemini-3-pro-preview with medical system prompt for now
  fallbackModel: 'gemini-3-pro-preview',

  generationConfig: {
    temperature: 0.3, // Lower temperature for medical accuracy
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    thinking_config: {
      include_thoughts: true // Enable thinking mode for complex medical reasoning
    }
  },

  safetySettings: [
    {
      category: 'HARM_CATEGORY_MEDICAL',
      threshold: 'BLOCK_NONE', // We handle medical disclaimers ourselves
    },
  ],
};

/**
 * Medical system prompt for accurate clinical analysis
 */
const MEDICAL_SYSTEM_PROMPT = `You are MedGemma, a specialized medical AI assistant trained on medical literature, clinical notes, and medical exams.

CAPABILITIES:
- Analyze medication regimens and adherence patterns
- Generate clinical summaries for healthcare providers
- Identify potential drug interactions and contraindications
- Provide evidence-based nutritional guidance
- Answer medical questions with clinical accuracy

IMPORTANT LIMITATIONS (ALWAYS FOLLOW):
1. You are an AI assistant, NOT a licensed healthcare provider
2. NEVER diagnose medical conditions
3. NEVER prescribe or adjust medication dosages
4. ALWAYS recommend consulting healthcare providers for medical decisions
5. Provide observational summaries and general wellness information only
6. When unsure, state uncertainty clearly

RESPONSE FORMAT:
- Use clear, professional medical terminology
- Include relevant medical context
- Cite reasoning when applicable
- Always include appropriate disclaimers`;

/**
 * Generate clinical note for doctor visit
 *
 * @param data - Medical data to summarize
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID for HIPAA audit logging
 * @returns Clinical summary in structured markdown format
 */
export async function generateClinicalNote(
  data: {
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
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<{
  summary: string;
  medicationList: string;
  complianceAnalysis: string;
  recommendations: string[];
  questionsForDoctor: string[];
}> {
  try {
    // HIPAA Audit: Log third-party PHI disclosure to MedGemma
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google MedGemma 27B (Vertex AI)',
      serviceType: 'clinical_note_generation',
      dataShared: [
        'elder_demographics',
        'medical_conditions',
        'medication_list',
        'compliance_logs',
        'diet_entries',
        'caregiver_observations',
      ],
      purpose: 'Generate clinical summary for healthcare provider consultation',
    });

    // Calculate compliance statistics
    const totalDoses = data.complianceLogs.length;
    const takenDoses = data.complianceLogs.filter(log => log.status === 'taken').length;
    const missedDoses = data.complianceLogs.filter(log => log.status === 'missed').length;
    const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

    // Build comprehensive prompt
    const prompt = `Generate a professional clinical summary for a doctor visit.

PATIENT INFORMATION:
- Name: ${data.elder.name}
- Age: ${data.elder.age} years
${data.elder.medicalConditions ? `- Known Conditions: ${data.elder.medicalConditions.join(', ')}` : ''}
${data.elder.allergies ? `- Allergies: ${data.elder.allergies.join(', ')}` : ''}

CURRENT MEDICATIONS (${data.medications.length} total):
${data.medications.map(med => `- ${med.name} ${med.dosage}, ${med.frequency}${med.prescribedBy ? ` (Prescribed by: ${med.prescribedBy})` : ''}, Started: ${med.startDate.toLocaleDateString()}`).join('\n')}

MEDICATION ADHERENCE (Last ${data.timeframeDays} days):
- Total scheduled doses: ${totalDoses}
- Doses taken: ${takenDoses} (${complianceRate}%)
- Doses missed: ${missedDoses}
${data.complianceLogs.filter(log => log.status === 'missed').slice(0, 5).map(log =>
  `  • ${log.medicationName} - ${log.scheduledTime.toLocaleDateString()} ${log.scheduledTime.toLocaleTimeString()}`
).join('\n')}

${data.dietEntries && data.dietEntries.length > 0 ? `NUTRITION (Recent ${data.dietEntries.length} meals):
${data.dietEntries.slice(0, 10).map(entry =>
  `- ${entry.meal}: ${entry.items.join(', ')} (${entry.timestamp.toLocaleDateString()})`
).join('\n')}` : ''}

${data.caregiverNotes ? `CAREGIVER OBSERVATIONS:\n${data.caregiverNotes}` : ''}

TASK:
Create a structured clinical summary suitable for a healthcare provider. Include:

1. **CLINICAL SUMMARY**: Brief overview of patient status and key findings
2. **CURRENT MEDICATION REGIMEN**: Complete list with dosages and schedules
3. **MEDICATION ADHERENCE ANALYSIS**:
   - Overall compliance rate
   - Patterns in missed doses (time of day, specific medications)
   - Potential barriers to adherence
4. **NUTRITIONAL STATUS**: Brief assessment if diet data available
5. **CLINICAL RECOMMENDATIONS**: Evidence-based suggestions for healthcare provider to consider
6. **SUGGESTED QUESTIONS FOR PROVIDER**: Important questions the caregiver should ask

FORMAT: Use clear markdown with headers. Be concise but thorough. Include medical reasoning where appropriate.

IMPORTANT: Include disclaimer that this is an AI-generated summary to assist clinical discussion, not replace clinical judgment.`;

    // Get MedGemma model
    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: MEDGEMMA_CONFIG.fallbackModel, // Using Gemini Pro with medical prompt for now
      generationConfig: MEDGEMMA_CONFIG.generationConfig,
      systemInstruction: MEDICAL_SYSTEM_PROMPT,
    });

    // Generate clinical note
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
    });

    const response = result.response;
    const fullText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse structured response
    // For now, return the full text and let the UI format it
    // In production, you might want more sophisticated parsing

    return {
      summary: fullText,
      medicationList: data.medications.map(m =>
        `${m.name} ${m.dosage}, ${m.frequency}`
      ).join('\n'),
      complianceAnalysis: `Overall adherence: ${complianceRate}% (${takenDoses}/${totalDoses} doses taken)`,
      recommendations: extractRecommendations(fullText),
      questionsForDoctor: extractQuestions(fullText),
    };

  } catch (error) {
    console.error('MedGemma clinical note generation error:', error);

    // Fallback: Generate basic summary without AI
    return generateBasicClinicalNote(data);
  }
}

/**
 * Process natural language health query
 *
 * @param query - User's natural language question
 * @param context - Available data context for the query
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID (optional, if query is elder-specific)
 * @returns Structured response with answer and relevant data
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
    // HIPAA Audit: Log third-party PHI disclosure to MedGemma
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google MedGemma 27B (Vertex AI)',
      serviceType: 'natural_language_query_parsing',
      dataShared: ['query_text', 'elder_name'],
      purpose: 'Parse natural language query to retrieve health data',
    });

    const prompt = `Parse this health-related query into structured parameters.

QUERY: "${query}"

CONTEXT:
${context.elderName ? `- Elder Name: ${context.elderName}` : ''}
- Available Data Types: ${context.availableData.join(', ')}

TASK:
Extract the following in JSON format:
{
  "intent": "what is the user trying to do? (view_compliance, check_medications, analyze_diet, etc.)",
  "parameters": {
    "elderName": "if mentioned",
    "timeframe": "last week/month/30 days/etc",
    "metric": "compliance/medications/diet/etc",
    "specificMedication": "if asking about specific drug",
    "startDate": "YYYY-MM-DD if mentioned",
    "endDate": "YYYY-MM-DD if mentioned"
  },
  "needsData": ["medications", "compliance_logs", "diet_entries"],
  "responseTemplate": "friendly template for answering, e.g., 'Based on {data}, grandma's medication compliance was {compliance}%'"
}

Return ONLY valid JSON, no markdown formatting.`;

    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: MEDGEMMA_CONFIG.fallbackModel,
      generationConfig: {
        ...MEDGEMMA_CONFIG.generationConfig,
        temperature: 0.1, // Very low for structured extraction
      },
      systemInstruction: MEDICAL_SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
    });

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    throw new Error('Failed to parse MedGemma response');

  } catch (error) {
    console.error('MedGemma NL query parsing error:', error);

    // Fallback: Simple keyword-based parsing
    return parseQueryBasic(query, context);
  }
}

/**
 * Helper: Extract recommendations from clinical note
 */
function extractRecommendations(text: string): string[] {
  const lines = text.split('\n');
  const recommendations: string[] = [];

  let inRecommendations = false;
  for (const line of lines) {
    if (line.toLowerCase().includes('recommendation') || line.toLowerCase().includes('suggest')) {
      inRecommendations = true;
      continue;
    }
    if (inRecommendations && line.trim().startsWith('-')) {
      recommendations.push(line.trim().substring(1).trim());
    }
    if (inRecommendations && line.includes('##')) {
      break; // Next section
    }
  }

  return recommendations.length > 0 ? recommendations : ['Consult with healthcare provider to review medication regimen'];
}

/**
 * Helper: Extract questions from clinical note
 */
function extractQuestions(text: string): string[] {
  const lines = text.split('\n');
  const questions: string[] = [];

  let inQuestions = false;
  for (const line of lines) {
    if (line.toLowerCase().includes('question') || line.toLowerCase().includes('ask')) {
      inQuestions = true;
      continue;
    }
    if (inQuestions && line.trim().startsWith('-')) {
      questions.push(line.trim().substring(1).trim());
    }
    if (inQuestions && line.includes('##')) {
      break; // Next section
    }
  }

  return questions.length > 0 ? questions : ['Are there any concerns with the current medication regimen?'];
}

/**
 * Fallback: Generate basic clinical note without AI
 */
function generateBasicClinicalNote(data: any) {
  const totalDoses = data.complianceLogs.length;
  const takenDoses = data.complianceLogs.filter((l: any) => l.status === 'taken').length;
  const complianceRate = totalDoses > 0 ? ((takenDoses / totalDoses) * 100).toFixed(1) : '0';

  return {
    summary: `Clinical summary for ${data.elder.name} (${data.elder.age} years old) covering the last ${data.timeframeDays} days.`,
    medicationList: data.medications.map((m: any) =>
      `${m.name} ${m.dosage}, ${m.frequency}`
    ).join('\n'),
    complianceAnalysis: `Overall medication adherence: ${complianceRate}% (${takenDoses} of ${totalDoses} scheduled doses taken)`,
    recommendations: [
      'Review medication schedule with healthcare provider',
      'Discuss any missed doses or adherence challenges',
    ],
    questionsForDoctor: [
      'Are there any concerns with the current medication regimen?',
      'Should any medications be adjusted based on recent adherence patterns?',
    ],
  };
}

/**
 * Fallback: Basic query parsing
 */
function parseQueryBasic(query: string, context: any) {
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
