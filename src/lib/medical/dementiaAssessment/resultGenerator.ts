/**
 * Dementia Assessment Result Generator
 *
 * Generates final assessment results including:
 * - AI-powered summary and observations
 * - Professional recommendations
 * - Comparison with previous assessments
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { logPHIThirdPartyDisclosure, UserRole } from '../phiAuditLog';
import type {
  DementiaAssessmentSession,
  DementiaAssessmentResult,
  DomainScore,
  OverallRiskLevel,
  AssessmentRecommendation,
} from '@/types/dementiaAssessment';
import { DOMAIN_LABELS } from '@/types/dementiaAssessment';
import {
  calculateDomainScores,
  calculateOverallRisk,
  identifyKeyObservations,
  compareWithPrevious,
  getRiskLevelDescription,
} from './scoringEngine';
import { getSessionDurationMinutes } from './sessionManager';

const RESULTS_COLLECTION = 'dementiaAssessmentResults';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// ============= AI API Calls (same pattern as adaptiveBranching) =============

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

async function callClaudeAPI(
  prompt: string,
  temperature: number = 0.5,
  maxTokens: number = 2048
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5-20250514',
      max_tokens: maxTokens,
      temperature,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Result Generator] Claude API error:', errorText);
    throw new Error(`Claude API request failed: ${response.status}`);
  }

  const result: ClaudeResponse = await response.json();
  const textContent = result.content.find(c => c.type === 'text');
  return textContent?.text || '';
}

async function callGeminiWithThinking(
  prompt: string,
  temperature: number = 0.5,
  maxTokens: number = 2048
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            thinking_config: {
              include_thoughts: false, // Faster response for summary
            },
          },
        }),
      });

      if (response.ok) {
        const result: GeminiResponse = await response.json();
        const text = result.candidates[0]?.content?.parts[0]?.text;
        if (text) {
          console.log('[Result Generator] Using Gemini API');
          return text;
        }
      }
    } catch (error) {
      console.warn('[Result Generator] Gemini failed, trying Claude:', error);
    }
  }

  if (claudeKey) {
    console.log('[Result Generator] Falling back to Claude API');
    return callClaudeAPI(prompt, temperature, maxTokens);
  }

  throw new Error('No AI API keys configured');
}

function parseJsonFromResponse(text: string): any {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/```\s*([\s\S]*?)\s*```/) ||
                    text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }

  throw new Error('No valid JSON found in response');
}

// ============= Result Generation =============

/**
 * Generate complete assessment result from a completed session
 */
export async function generateAssessmentResult(
  session: DementiaAssessmentSession,
  userId: string,
  userRole: UserRole
): Promise<DementiaAssessmentResult> {
  const now = new Date();

  // Calculate scores
  const domainScores = calculateDomainScores(session);
  const { score: overallRiskScore, level: overallRiskLevel } = calculateOverallRisk(domainScores);

  // Get key observations
  const { keyObservations, areasOfConcern, strengthsNoted } = identifyKeyObservations(
    session,
    domainScores
  );

  // Get previous assessment for comparison
  const previousResult = await getPreviousResult(session.groupId, session.elderId);
  let changeFromPrevious = undefined;

  if (previousResult) {
    changeFromPrevious = compareWithPrevious(domainScores, previousResult.domainScores);
  }

  // Generate AI summary and recommendations
  let aiSummary: string;
  let recommendations: AssessmentRecommendation[];

  try {
    // Log PHI disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId: session.groupId,
      elderId: session.elderId,
      serviceName: 'Google Gemini AI',
      serviceType: 'dementia_assessment_summary',
      dataShared: ['assessment_scores', 'domain_findings', 'behavioral_observations'],
      purpose: 'Generate assessment summary and recommendations',
    });

    const aiResult = await generateAISummary(
      session,
      domainScores,
      overallRiskLevel,
      keyObservations,
      areasOfConcern
    );

    aiSummary = aiResult.summary;
    recommendations = aiResult.recommendations;
  } catch (error) {
    console.error('[Result Generator] AI summary failed, using fallback:', error);

    // Fallback summary
    aiSummary = generateFallbackSummary(
      session.elderName,
      domainScores,
      overallRiskLevel,
      areasOfConcern
    );
    recommendations = generateFallbackRecommendations(overallRiskLevel, areasOfConcern);
  }

  // Build result
  const resultId = `result_${session.id}`;
  const result: DementiaAssessmentResult = {
    id: resultId,
    sessionId: session.id,
    groupId: session.groupId,
    elderId: session.elderId,
    elderName: session.elderName,
    caregiverId: session.caregiverId,
    caregiverName: session.caregiverName,
    assessmentDate: session.startedAt,
    completedAt: now,
    durationMinutes: getSessionDurationMinutes(session),
    totalQuestionsAsked: session.answers.length,
    baselineQuestionsAsked: session.baselineQuestionsAnswered,
    adaptiveQuestionsAsked: session.adaptiveQuestionsAsked,
    domainScores,
    overallRiskScore,
    overallRiskLevel,
    aiSummary,
    keyObservations,
    areasOfConcern,
    strengthsNoted,
    recommendations,
    previousAssessmentId: previousResult?.id,
    changeFromPrevious,
    status: 'pending_review',
    createdAt: now,
    updatedAt: now,
  };

  // Save to Firestore
  await saveResult(result);

  return result;
}

// ============= AI Summary Generation =============

async function generateAISummary(
  session: DementiaAssessmentSession,
  domainScores: DomainScore[],
  overallRiskLevel: OverallRiskLevel,
  keyObservations: string[],
  areasOfConcern: string[]
): Promise<{ summary: string; recommendations: AssessmentRecommendation[] }> {
  const prompt = buildSummaryPrompt(
    session,
    domainScores,
    overallRiskLevel,
    keyObservations,
    areasOfConcern
  );

  const aiResponse = await callGeminiWithThinking(prompt);
  const parsed = parseJsonFromResponse(aiResponse);

  return {
    summary: parsed.summary || generateFallbackSummary(
      session.elderName,
      domainScores,
      overallRiskLevel,
      areasOfConcern
    ),
    recommendations: validateRecommendations(parsed.recommendations) ||
      generateFallbackRecommendations(overallRiskLevel, areasOfConcern),
  };
}

function buildSummaryPrompt(
  session: DementiaAssessmentSession,
  domainScores: DomainScore[],
  overallRiskLevel: OverallRiskLevel,
  keyObservations: string[],
  areasOfConcern: string[]
): string {
  const domainSummary = domainScores
    .map(d => `- ${d.domainLabel}: ${d.concernLevel} (${d.normalizedScore}/100)${d.keyFindings.length ? '\n  Key findings: ' + d.keyFindings.join('; ') : ''}`)
    .join('\n');

  return `You are a clinical psychology AI assistant generating a summary for a caregiver-administered cognitive screening assessment. This is NOT a diagnosis.

ASSESSMENT CONTEXT:
- Elder: ${session.elderName}${session.elderAge ? `, Age ${session.elderAge}` : ''}
- Caregiver: ${session.caregiverName}
- Questions Answered: ${session.answers.length} (${session.baselineQuestionsAnswered} baseline, ${session.adaptiveQuestionsAsked} follow-up)
- Overall Risk Level: ${overallRiskLevel.toUpperCase()}

DOMAIN SCORES:
${domainSummary}

KEY OBSERVATIONS:
${keyObservations.length ? keyObservations.map(o => `- ${o}`).join('\n') : '- No significant observations'}

AREAS OF CONCERN:
${areasOfConcern.length ? areasOfConcern.map(c => `- ${c}`).join('\n') : '- No significant concerns identified'}

YOUR TASK:
Generate a compassionate, clear summary for the caregiver and actionable recommendations.

CRITICAL REQUIREMENTS:
1. NEVER diagnose dementia or any condition
2. NEVER use definitive language like "has dementia" or "is developing"
3. Always emphasize this is a screening tool, not a diagnosis
4. Focus on observations and patterns, not conclusions
5. Recommend professional consultation for any concerning areas
6. Be empathetic but factual

REQUIRED JSON RESPONSE:
{
  "summary": "A 2-3 paragraph summary written for the caregiver. Start with what the assessment covers, highlight key patterns observed, and end with next steps. Use warm but professional language.",
  "recommendations": [
    {
      "type": "professional_consult" | "monitoring" | "lifestyle" | "support_resources",
      "priority": "high" | "medium" | "low",
      "title": "Short action title",
      "description": "Clear description of the recommendation",
      "actionItems": ["Specific action 1", "Specific action 2"]
    }
  ]
}

Provide 2-4 recommendations based on the risk level and concerns.

Respond with ONLY the JSON object.`;
}

// ============= Fallback Generation =============

function generateFallbackSummary(
  elderName: string,
  domainScores: DomainScore[],
  overallRiskLevel: OverallRiskLevel,
  areasOfConcern: string[]
): string {
  const riskDescription = getRiskLevelDescription(overallRiskLevel);

  let summary = `This cognitive screening assessment for ${elderName} evaluated six key domains: memory, orientation, attention, language, executive function, and mood/behavior. `;

  if (areasOfConcern.length > 0) {
    summary += `The assessment identified areas that may benefit from professional evaluation, including: ${areasOfConcern.slice(0, 3).join('; ')}. `;
  } else {
    summary += `No significant areas of concern were identified during this assessment. `;
  }

  summary += `\n\n${riskDescription}\n\n`;

  summary += `IMPORTANT: This screening is NOT a medical diagnosis. It is designed to help identify patterns that may warrant discussion with a healthcare professional. Only a qualified healthcare provider can diagnose cognitive conditions. Please share these results with ${elderName}'s doctor for proper evaluation.`;

  return summary;
}

function generateFallbackRecommendations(
  overallRiskLevel: OverallRiskLevel,
  areasOfConcern: string[]
): AssessmentRecommendation[] {
  const recommendations: AssessmentRecommendation[] = [];

  // Always recommend professional consultation for concerning/urgent
  if (overallRiskLevel === 'urgent' || overallRiskLevel === 'concerning') {
    recommendations.push({
      type: 'professional_consult',
      priority: 'high',
      title: 'Schedule Professional Cognitive Assessment',
      description: 'Based on the screening results, we recommend scheduling an appointment with a healthcare provider who can conduct a comprehensive cognitive evaluation.',
      actionItems: [
        'Contact primary care physician to discuss screening results',
        'Request referral to a neurologist or geriatrician if needed',
        'Bring this screening report to the appointment',
      ],
    });
  }

  if (overallRiskLevel === 'moderate') {
    recommendations.push({
      type: 'professional_consult',
      priority: 'medium',
      title: 'Discuss with Healthcare Provider',
      description: 'Consider discussing these screening results at the next scheduled medical appointment.',
      actionItems: [
        'Note any specific concerns to discuss with the doctor',
        'Keep a log of any cognitive changes observed',
      ],
    });
  }

  // Recommend ongoing monitoring for all
  recommendations.push({
    type: 'monitoring',
    priority: overallRiskLevel === 'low' ? 'low' : 'medium',
    title: 'Continue Regular Monitoring',
    description: 'Repeat this screening assessment periodically to track any changes over time.',
    actionItems: [
      'Schedule next screening in 3-6 months',
      'Note any new or worsening symptoms between assessments',
    ],
  });

  // Lifestyle recommendation for mood/behavior concerns
  if (areasOfConcern.some(c => c.toLowerCase().includes('mood') || c.toLowerCase().includes('withdrawal'))) {
    recommendations.push({
      type: 'lifestyle',
      priority: 'medium',
      title: 'Support Social Engagement',
      description: 'Social isolation can impact cognitive health. Consider ways to increase social interaction.',
      actionItems: [
        'Plan regular family visits or phone calls',
        'Consider senior center activities or groups',
        'Engage in shared hobbies or reminiscence activities',
      ],
    });
  }

  return recommendations;
}

function validateRecommendations(recommendations: any[]): AssessmentRecommendation[] | null {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return null;
  }

  return recommendations.map(rec => ({
    type: rec.type || 'monitoring',
    priority: rec.priority || 'medium',
    title: rec.title || 'Recommendation',
    description: rec.description || '',
    actionItems: Array.isArray(rec.actionItems) ? rec.actionItems : [],
  }));
}

// ============= Database Operations =============

async function saveResult(result: DementiaAssessmentResult): Promise<void> {
  const resultRef = doc(db, RESULTS_COLLECTION, result.id);

  await setDoc(resultRef, {
    ...result,
    assessmentDate: Timestamp.fromDate(result.assessmentDate),
    completedAt: Timestamp.fromDate(result.completedAt),
    createdAt: Timestamp.fromDate(result.createdAt),
    updatedAt: Timestamp.fromDate(result.updatedAt),
    domainScores: result.domainScores,
    changeFromPrevious: result.changeFromPrevious ? {
      ...result.changeFromPrevious,
      domainChanges: result.changeFromPrevious.domainChanges,
    } : null,
  });
}

async function getPreviousResult(
  groupId: string,
  elderId: string
): Promise<DementiaAssessmentResult | null> {
  const resultsRef = collection(db, RESULTS_COLLECTION);
  const q = query(
    resultsRef,
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    orderBy('completedAt', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  return convertResultFromFirestore(data);
}

function convertResultFromFirestore(data: any): DementiaAssessmentResult {
  return {
    ...data,
    assessmentDate: data.assessmentDate?.toDate?.() || new Date(data.assessmentDate),
    completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    reviewedAt: data.reviewedAt?.toDate?.() || (data.reviewedAt ? new Date(data.reviewedAt) : undefined),
  };
}

/**
 * Get all results for an elder
 */
export async function getElderResults(
  groupId: string,
  elderId: string
): Promise<DementiaAssessmentResult[]> {
  const resultsRef = collection(db, RESULTS_COLLECTION);
  const q = query(
    resultsRef,
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    orderBy('completedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertResultFromFirestore(doc.data()));
}
