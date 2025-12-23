/**
 * AI-Driven Adaptive Branching for Dementia Assessment
 *
 * Uses Gemini 3 Pro Preview with thinking mode to generate contextual
 * follow-up questions when concerning answers are detected.
 *
 * Fallback: Claude API when Gemini is unavailable
 * Final fallback: Rule-based question generation
 */

import { logPHIThirdPartyDisclosure, UserRole } from '../phiAuditLog';
import type {
  AIBranchingRequest,
  AIBranchingResponse,
  AdaptiveQuestion,
  QuestionAnswer,
  AssessmentDomain,
  QuestionOption,
} from '@/types/dementiaAssessment';
import { BRANCHING_CONFIG, DOMAIN_LABELS } from '@/types/dementiaAssessment';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

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

// ============= AI API Calls =============

async function callClaudeAPI(
  prompt: string,
  temperature: number = 0.4,
  maxTokens: number = 1024
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
    console.error('[Adaptive Branching] Claude API error:', errorText);
    throw new Error(`Claude API request failed: ${response.status}`);
  }

  const result: ClaudeResponse = await response.json();
  const textContent = result.content.find(c => c.type === 'text');
  return textContent?.text || '';
}

async function callGeminiWithThinking(
  prompt: string,
  temperature: number = 0.4,
  maxTokens: number = 1024
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  // Try Gemini first
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
              include_thoughts: true,
            },
          },
        }),
      });

      if (response.ok) {
        const result: GeminiResponse = await response.json();
        const text = result.candidates[0]?.content?.parts[0]?.text;
        if (text) {
          console.log('[Adaptive Branching] Using Gemini API');
          return text;
        }
      } else {
        const errorText = await response.text();
        console.warn('[Adaptive Branching] Gemini error, trying Claude:', errorText);
      }
    } catch (error) {
      console.warn('[Adaptive Branching] Gemini failed, trying Claude:', error);
    }
  }

  // Fallback to Claude
  if (claudeKey) {
    console.log('[Adaptive Branching] Falling back to Claude API');
    return callClaudeAPI(prompt, temperature, maxTokens);
  }

  throw new Error('No AI API keys configured');
}

function parseJsonFromResponse(text: string): any {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/```\s*([\s\S]*?)\s*```/) ||
                    text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }

  throw new Error('No valid JSON found in response');
}

// ============= Adaptive Branching Logic =============

/**
 * Generate an adaptive follow-up question using AI
 */
export async function getAdaptiveFollowUp(
  request: AIBranchingRequest,
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<AIBranchingResponse> {
  const {
    sessionId,
    elderName,
    elderAge,
    knownConditions,
    currentDomain,
    previousAnswers,
    triggeringAnswer,
    currentDepth,
    maxDepth,
  } = request;

  // Check if we should continue branching
  if (currentDepth >= maxDepth) {
    return {
      shouldContinueBranching: false,
      branchingReason: 'Maximum follow-up depth reached',
      confidence: 1.0,
    };
  }

  // Check total adaptive questions limit
  const domainAdaptiveCount = previousAnswers.filter(
    a => a.domain === currentDomain && a.isAdaptive
  ).length;

  if (domainAdaptiveCount >= BRANCHING_CONFIG.maxDepthPerDomain) {
    return {
      shouldContinueBranching: false,
      branchingReason: 'Domain follow-up limit reached',
      confidence: 1.0,
    };
  }

  try {
    // Log PHI disclosure before AI call
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini AI',
      serviceType: 'dementia_assessment_branching',
      dataShared: ['assessment_responses', 'elder_demographics', 'behavioral_observations'],
      purpose: 'Generate contextual follow-up questions for cognitive assessment',
    });

    const prompt = buildBranchingPrompt(request);
    const aiResponse = await callGeminiWithThinking(prompt);
    const parsed = parseJsonFromResponse(aiResponse);

    // Validate and construct response
    if (parsed.shouldContinueBranching && parsed.nextQuestion) {
      const adaptiveQuestion: AdaptiveQuestion = {
        id: `adaptive_${sessionId}_${Date.now()}`,
        domain: currentDomain,
        questionText: parsed.nextQuestion.questionText,
        caregiverPrompt: parsed.nextQuestion.caregiverPrompt,
        type: parsed.nextQuestion.type || 'multiple_choice',
        options: validateAndNormalizeOptions(parsed.nextQuestion.options),
        generatedBy: 'ai',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: parsed.branchingReason || 'AI-generated follow-up',
      };

      return {
        shouldContinueBranching: true,
        nextQuestion: adaptiveQuestion,
        branchingReason: parsed.branchingReason || 'Exploring concerning response',
        suggestDomainSwitch: parsed.suggestDomainSwitch,
        confidence: parsed.confidence || 0.8,
      };
    }

    return {
      shouldContinueBranching: false,
      branchingReason: parsed.branchingReason || 'Concern adequately explored',
      confidence: parsed.confidence || 0.9,
    };
  } catch (error) {
    console.error('[Adaptive Branching] AI call failed, using fallback:', error);

    // Use rule-based fallback
    return generateFallbackQuestion(request);
  }
}

// ============= Prompt Building =============

function buildBranchingPrompt(request: AIBranchingRequest): string {
  const {
    elderName,
    elderAge,
    knownConditions,
    currentDomain,
    previousAnswers,
    triggeringAnswer,
    currentDepth,
    maxDepth,
  } = request;

  const domainAnswers = previousAnswers.filter(a => a.domain === currentDomain);
  const answersContext = domainAnswers
    .map(a => `- Q: ${a.questionText}\n  A: ${a.answerLabel} (${a.concernLevel})`)
    .join('\n');

  return `You are an AI assistant helping with a caregiver-administered cognitive screening assessment. Your role is to generate appropriate follow-up questions when concerning answers are detected.

CONTEXT:
- Elder Name: ${elderName}
${elderAge ? `- Elder Age: ${elderAge}` : ''}
${knownConditions?.length ? `- Known Conditions: ${knownConditions.join(', ')}` : ''}
- Current Assessment Domain: ${DOMAIN_LABELS[currentDomain]}
- Current Branching Depth: ${currentDepth} of ${maxDepth}

PREVIOUS ANSWERS IN THIS DOMAIN:
${answersContext || 'No previous answers yet'}

CONCERNING ANSWER THAT TRIGGERED THIS FOLLOW-UP:
Question: ${triggeringAnswer.questionText}
Answer: ${triggeringAnswer.answerLabel}
Concern Level: ${triggeringAnswer.concernLevel}

YOUR TASK:
Generate ONE focused follow-up question to probe deeper into this concern. The question should:
1. Be answerable by a CAREGIVER observing the elder (NOT asked directly to the elder)
2. Clarify the severity, frequency, or specific nature of the observed issue
3. Help distinguish between normal aging and potential cognitive decline
4. Use simple, non-clinical language that any caregiver can understand
5. Be specific and focused on observable behaviors

IMPORTANT CONSTRAINTS:
- If depth is at ${maxDepth}, or if the concern seems adequately explored, set shouldContinueBranching to false
- Do NOT diagnose - only gather observational information
- Questions must be about what the caregiver has OBSERVED, not clinical tests
- Provide 3-4 answer options with clear concern levels

REQUIRED JSON RESPONSE FORMAT:
{
  "shouldContinueBranching": true or false,
  "branchingReason": "Brief explanation of why follow-up is or isn't needed",
  "confidence": 0.0 to 1.0,
  "nextQuestion": {
    "questionText": "The follow-up question text with {elderName} placeholder",
    "caregiverPrompt": "Guidance for the caregiver on how to observe/answer",
    "type": "multiple_choice",
    "options": [
      {"value": "option1", "label": "Label 1", "concernLevel": "none", "points": 0},
      {"value": "option2", "label": "Label 2", "concernLevel": "mild", "points": 1},
      {"value": "option3", "label": "Label 3", "concernLevel": "moderate", "points": 2},
      {"value": "option4", "label": "Label 4", "concernLevel": "concerning", "points": 3}
    ]
  },
  "suggestDomainSwitch": null or "domain_name"
}

If shouldContinueBranching is false, nextQuestion can be null.

Respond with ONLY the JSON object, no additional text.`;
}

// ============= Fallback Question Generation =============

function generateFallbackQuestion(request: AIBranchingRequest): AIBranchingResponse {
  const { currentDomain, triggeringAnswer, currentDepth, maxDepth } = request;

  // Don't branch if at max depth
  if (currentDepth >= maxDepth) {
    return {
      shouldContinueBranching: false,
      branchingReason: 'Maximum follow-up depth reached',
      confidence: 1.0,
    };
  }

  // Get fallback question based on domain and concern
  const fallbackQuestion = getFallbackQuestionForDomain(
    currentDomain,
    triggeringAnswer,
    currentDepth
  );

  if (fallbackQuestion) {
    return {
      shouldContinueBranching: true,
      nextQuestion: fallbackQuestion,
      branchingReason: 'Rule-based follow-up for concerning response',
      confidence: 0.7,
    };
  }

  return {
    shouldContinueBranching: false,
    branchingReason: 'No applicable follow-up question available',
    confidence: 0.8,
  };
}

function getFallbackQuestionForDomain(
  domain: AssessmentDomain,
  triggeringAnswer: QuestionAnswer,
  currentDepth: number
): AdaptiveQuestion | null {
  const baseId = `fallback_${domain}_${Date.now()}`;

  // Domain-specific fallback questions
  const fallbackQuestions: Record<AssessmentDomain, AdaptiveQuestion[]> = {
    memory: [
      {
        id: baseId,
        domain: 'memory',
        questionText: 'When {elderName} forgets something, do they become aware of the gap in memory when reminded?',
        caregiverPrompt: 'Notice if they recognize they forgot when you remind them.',
        type: 'multiple_choice',
        options: [
          { value: 'recognizes', label: 'Yes, recognizes and remembers when reminded', concernLevel: 'mild', points: 1 },
          { value: 'sometimes', label: 'Sometimes recognizes but not always', concernLevel: 'moderate', points: 2 },
          { value: 'no_awareness', label: 'Often does not recognize they forgot', concernLevel: 'concerning', points: 3 },
        ],
        generatedBy: 'rule',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: 'Exploring memory awareness',
      },
    ],
    orientation: [
      {
        id: baseId,
        domain: 'orientation',
        questionText: 'Does the confusion about time or place occur at specific times (like evening) or throughout the day?',
        caregiverPrompt: 'Think about when confusion is most noticeable.',
        type: 'multiple_choice',
        options: [
          { value: 'evening_only', label: 'Mostly in the evening (sundowning)', concernLevel: 'moderate', points: 2 },
          { value: 'morning', label: 'Mostly in the morning or after waking', concernLevel: 'mild', points: 1 },
          { value: 'throughout', label: 'Throughout the day', concernLevel: 'concerning', points: 3 },
          { value: 'unpredictable', label: 'Unpredictable times', concernLevel: 'moderate', points: 2 },
        ],
        generatedBy: 'rule',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: 'Exploring timing patterns of disorientation',
      },
    ],
    attention: [
      {
        id: baseId,
        domain: 'attention',
        questionText: 'Is the difficulty concentrating worse in certain environments (noisy, busy) or consistent?',
        caregiverPrompt: 'Consider if background noise or activity affects their focus.',
        type: 'multiple_choice',
        options: [
          { value: 'noisy_worse', label: 'Worse in noisy or busy environments', concernLevel: 'mild', points: 1 },
          { value: 'quiet_too', label: 'Difficulty even in quiet settings', concernLevel: 'moderate', points: 2 },
          { value: 'always', label: 'Consistent difficulty regardless of environment', concernLevel: 'concerning', points: 3 },
        ],
        generatedBy: 'rule',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: 'Exploring environmental factors',
      },
    ],
    language: [
      {
        id: baseId,
        domain: 'language',
        questionText: 'When {elderName} has trouble finding words, do they use gestures or descriptions to compensate?',
        caregiverPrompt: 'Notice if they point or describe what they mean when they cannot find the word.',
        type: 'multiple_choice',
        options: [
          { value: 'compensates_well', label: 'Yes, effectively uses gestures or descriptions', concernLevel: 'mild', points: 1 },
          { value: 'tries', label: 'Tries to compensate but struggles', concernLevel: 'moderate', points: 2 },
          { value: 'gives_up', label: 'Often gives up or becomes frustrated', concernLevel: 'concerning', points: 3 },
        ],
        generatedBy: 'rule',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: 'Exploring communication strategies',
      },
    ],
    executive: [
      {
        id: baseId,
        domain: 'executive',
        questionText: 'Has {elderName} made any decisions recently that put their safety or finances at risk?',
        caregiverPrompt: 'Think about any concerning decisions involving money, driving, or personal safety.',
        type: 'multiple_choice',
        options: [
          { value: 'no', label: 'No risky decisions observed', concernLevel: 'none', points: 0 },
          { value: 'minor', label: 'Minor lapses with no serious consequences', concernLevel: 'mild', points: 1 },
          { value: 'some_risk', label: 'Some concerning decisions affecting safety/finances', concernLevel: 'moderate', points: 2 },
          { value: 'serious', label: 'Serious lapses requiring intervention', concernLevel: 'concerning', points: 3 },
        ],
        generatedBy: 'rule',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: 'Exploring judgment and safety',
      },
    ],
    mood_behavior: [
      {
        id: baseId,
        domain: 'mood_behavior',
        questionText: 'Does {elderName} express feeling lonely or isolated, even when family or friends visit?',
        caregiverPrompt: 'Notice if they mention feeling alone or disconnected.',
        type: 'frequency',
        options: [
          { value: 'never', label: 'No, seems content with social contact', concernLevel: 'none', points: 0 },
          { value: 'occasionally', label: 'Occasionally mentions loneliness', concernLevel: 'mild', points: 1 },
          { value: 'often', label: 'Often expresses feeling lonely', concernLevel: 'moderate', points: 2 },
          { value: 'persistently', label: 'Persistently feels isolated despite visits', concernLevel: 'concerning', points: 3 },
        ],
        generatedBy: 'rule',
        parentQuestionId: triggeringAnswer.questionId,
        parentAnswer: triggeringAnswer.answer,
        depth: currentDepth + 1,
        branchingReason: 'Exploring social and emotional wellbeing',
      },
    ],
  };

  const questions = fallbackQuestions[domain];
  return questions?.[0] || null;
}

// ============= Helpers =============

function validateAndNormalizeOptions(options: any[]): QuestionOption[] {
  if (!Array.isArray(options) || options.length < 2) {
    // Return default options if invalid
    return [
      { value: 'yes', label: 'Yes', concernLevel: 'concerning', points: 3 },
      { value: 'sometimes', label: 'Sometimes', concernLevel: 'moderate', points: 2 },
      { value: 'rarely', label: 'Rarely', concernLevel: 'mild', points: 1 },
      { value: 'no', label: 'No', concernLevel: 'none', points: 0 },
    ];
  }

  return options.map((opt, index) => ({
    value: opt.value || `option_${index}`,
    label: opt.label || `Option ${index + 1}`,
    concernLevel: opt.concernLevel || 'none',
    points: typeof opt.points === 'number' ? opt.points : index,
  }));
}
