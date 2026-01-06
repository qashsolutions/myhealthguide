/**
 * API Route: Symptom Checker
 *
 * POST /api/symptom-checker
 *
 * AI-powered symptom assessment for guests and registered users.
 * Uses Gemini as primary AI, Claude as fallback.
 *
 * Rate limits:
 * - Guests: 2 queries per day (tracked by IP)
 * - Registered users: 5 queries per day (tracked by user ID)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { logPHIThirdPartyDisclosure, UserRole } from '@/lib/medical/phiAuditLog';
import {
  SymptomCheckerRequest,
  SymptomCheckerResponse,
  SymptomCheckerErrorResponse,
  SymptomCheckerAIResponse,
  SymptomCheckerQuery,
  SymptomCheckerRateLimit,
  RATE_LIMITS,
  GUEST_RETENTION_DAYS,
  AIModel,
  Gender,
  DietType,
  AlcoholUse,
  ActivityLevel,
  UrgencyLevel,
} from '@/types/symptomChecker';
import { getPersonalizedPromptAdditions } from '@/lib/ai/personalizedPrompting';

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return '127.0.0.1';
}

/**
 * Get today's date as YYYY-MM-DD string for rate limiting
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check and update rate limit
 * Returns { allowed: boolean, used: number, remaining: number }
 */
async function checkRateLimit(
  identifier: string,
  userType: 'guest' | 'registered',
  isRefinement: boolean
): Promise<{ allowed: boolean; used: number; remaining: number; limit: number }> {
  const adminDb = getAdminDb();
  const limit = RATE_LIMITS[userType];
  const today = getTodayString();

  const rateLimitRef = adminDb.collection('symptomCheckerRateLimits').doc(identifier);
  const rateLimitDoc = await rateLimitRef.get();

  if (!rateLimitDoc.exists) {
    // First query of the day - refinements don't count
    if (!isRefinement) {
      await rateLimitRef.set({
        type: userType,
        queriesUsedToday: 1,
        date: today,
        lastQueryTimestamp: new Date(),
      });
    }
    return { allowed: true, used: isRefinement ? 0 : 1, remaining: isRefinement ? limit : limit - 1, limit };
  }

  const data = rateLimitDoc.data() as SymptomCheckerRateLimit;

  // Reset if it's a new day
  if (data.date !== today) {
    if (!isRefinement) {
      await rateLimitRef.update({
        queriesUsedToday: 1,
        date: today,
        lastQueryTimestamp: new Date(),
      });
    }
    return { allowed: true, used: isRefinement ? 0 : 1, remaining: isRefinement ? limit : limit - 1, limit };
  }

  // Refinements don't count against limit
  if (isRefinement) {
    return { allowed: true, used: data.queriesUsedToday, remaining: limit - data.queriesUsedToday, limit };
  }

  // Check if limit exceeded
  if (data.queriesUsedToday >= limit) {
    return { allowed: false, used: data.queriesUsedToday, remaining: 0, limit };
  }

  // Increment counter
  await rateLimitRef.update({
    queriesUsedToday: data.queriesUsedToday + 1,
    lastQueryTimestamp: new Date(),
  });

  return {
    allowed: true,
    used: data.queriesUsedToday + 1,
    remaining: limit - data.queriesUsedToday - 1,
    limit,
  };
}

/**
 * Validate request body
 */
function validateRequest(
  body: SymptomCheckerRequest,
  isRegistered: boolean
): { valid: boolean; error?: string } {
  // Age validation
  if (typeof body.age !== 'number' || body.age < 0 || body.age > 120) {
    return { valid: false, error: 'Age must be between 0 and 120' };
  }

  // Gender validation
  const validGenders: Gender[] = ['male', 'female', 'other', 'prefer_not_to_say'];
  if (!validGenders.includes(body.gender)) {
    return { valid: false, error: 'Invalid gender value' };
  }

  // Symptoms validation
  if (!body.symptomsDescription || typeof body.symptomsDescription !== 'string') {
    return { valid: false, error: 'Symptoms description is required' };
  }
  if (body.symptomsDescription.length < 10) {
    return { valid: false, error: 'Symptoms description must be at least 10 characters' };
  }
  if (body.symptomsDescription.length > 2000) {
    return { valid: false, error: 'Symptoms description must be less than 2000 characters' };
  }

  // Elder ID required for registered users (unless it's guest mode)
  if (isRegistered && !body.elderId) {
    return { valid: false, error: 'Please select an elder before checking symptoms' };
  }

  return { valid: true };
}

/**
 * Build the AI prompt for symptom assessment
 */
function buildSymptomPrompt(body: SymptomCheckerRequest, isRegistered: boolean): string {
  const patientContext = `
PATIENT INFORMATION:
- Age: ${body.age} years
- Gender: ${body.gender}
${body.medications ? `- Current Medications: ${body.medications}` : ''}
${body.knownConditions ? `- Known Health Conditions: ${body.knownConditions}` : ''}
${body.dietType ? `- Diet Type: ${body.dietType}` : ''}
${body.smoker !== undefined ? `- Smoking: ${body.smoker ? 'Yes' : 'No'}` : ''}
${body.alcoholUse ? `- Alcohol Use: ${body.alcoholUse}` : ''}
${body.activityLevel ? `- Activity Level: ${body.activityLevel}` : ''}
`;

  const elderlyNote = body.age >= 65 ? `
IMPORTANT - ELDERLY PATIENT CONSIDERATIONS:
- This patient is a senior (${body.age} years old)
- Consider age-related factors in your assessment
- Be aware of atypical presentations common in elderly
- Note potential medication interactions
- Consider mobility and cognitive factors
` : '';

  return `You are a compassionate healthcare information assistant helping a ${isRegistered ? 'caregiver' : 'user'} understand health symptoms. This is for INFORMATIONAL PURPOSES ONLY - this is NOT a medical diagnosis.

${patientContext}
${elderlyNote}
SYMPTOMS DESCRIBED:
${body.symptomsDescription}

IMPORTANT GUIDELINES:
1. This is NOT a medical diagnosis - you are providing general health information only
2. NEVER claim to diagnose any condition - always use language like "could be", "may suggest", "a doctor might consider"
3. NEVER prescribe treatments - always say "consult your physician for treatment options"
4. Be professional, polite, and show multiple possibilities
5. For emergency symptoms (chest pain, difficulty breathing, stroke signs, severe bleeding, loss of consciousness), set isEmergency to true
6. Be compassionate and supportive in tone

URGENCY LEVEL ASSESSMENT:
- "emergency": Symptoms suggest immediate life-threatening situation (chest pain, stroke signs, severe bleeding, difficulty breathing, loss of consciousness, severe allergic reaction)
- "urgent": Symptoms need medical attention within 24 hours (high fever, moderate pain with concerning features, worsening symptoms)
- "moderate": Symptoms should be evaluated soon but not emergently (persistent symptoms, mild-moderate discomfort)
- "low": Symptoms can be monitored at home with self-care (common cold symptoms, minor aches)

Please provide a helpful response covering:

1. URGENCY ASSESSMENT: Determine the urgency level (emergency/urgent/moderate/low) and if it's an emergency, explain why

2. ASSESSMENT HEADLINE: A short, clear headline (max 10 words) summarizing the key takeaway for quick reading. Examples: "Persistent stomach pain warrants medical evaluation soon" or "Symptoms suggest possible viral infection, monitor closely"

3. ASSESSMENT: A brief, caring overview of the described symptoms and general observations about what might be worth discussing with a doctor

4. POSSIBLE CAUSES: List 2-3 possible explanations (from common to less common) that a doctor might consider. Be clear these are possibilities, not diagnoses.

5. RECOMMENDED NEXT STEPS: Practical suggestions for what to do next. Always include "consult your physician" as a recommendation.

6. RED FLAGS TO WATCH: Specific warning signs that would warrant immediate medical attention

7. QUESTIONS FOR DOCTOR: 3-4 helpful questions to ask when they see their healthcare provider

Format your response as JSON:
{
  "urgencyLevel": "emergency" | "urgent" | "moderate" | "low",
  "isEmergency": true/false,
  "emergencyReason": "Only if isEmergency is true - brief explanation of why this is an emergency",
  "assessmentHeadline": "Short 10-word max headline for quick reading",
  "assessment": "Detailed compassionate overview...",
  "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
  "recommendedNextSteps": ["Step 1", "Step 2", "Consult your physician for proper evaluation"],
  "redFlagsToWatch": ["Warning 1", "Warning 2"],
  "questionsForDoctor": ["Question 1", "Question 2", "Question 3"],
  "disclaimer": "This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.",
  "aiNotice": "This response was generated by AI and may contain errors or inaccuracies. AI cannot replace professional medical judgment. Please consult a qualified healthcare provider for medical advice."
}`;
}

/**
 * Call Gemini API for symptom assessment
 */
async function callGeminiAPI(prompt: string): Promise<{ success: boolean; response?: SymptomCheckerAIResponse; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'Gemini API key not configured' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            thinking_config: { include_thoughts: true },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Symptom Checker] Gemini API error:', errorText);
      return { success: false, error: 'Gemini API request failed' };
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return { success: false, error: 'No response from Gemini' };
    }

    // Parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse Gemini response' };
    }

    const parsed = JSON.parse(jsonMatch[0]) as SymptomCheckerAIResponse;
    return { success: true, response: parsed };
  } catch (error) {
    console.error('[Symptom Checker] Gemini error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown Gemini error' };
  }
}

/**
 * Call Claude API as fallback
 */
async function callClaudeAPI(prompt: string): Promise<{ success: boolean; response?: SymptomCheckerAIResponse; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'Claude API key not configured' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Symptom Checker] Claude API error:', errorText);
      return { success: false, error: 'Claude API request failed' };
    }

    const result = await response.json();
    const generatedText = result.content?.[0]?.text;

    if (!generatedText) {
      return { success: false, error: 'No response from Claude' };
    }

    // Parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse Claude response' };
    }

    const parsed = JSON.parse(jsonMatch[0]) as SymptomCheckerAIResponse;
    return { success: true, response: parsed };
  } catch (error) {
    console.error('[Symptom Checker] Claude error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown Claude error' };
  }
}

/**
 * Generate rule-based fallback response
 */
function generateFallbackResponse(body: SymptomCheckerRequest): SymptomCheckerAIResponse {
  const isElderly = body.age >= 65;

  // Basic emergency keyword detection for fallback
  const symptomsLower = body.symptomsDescription.toLowerCase();
  const emergencyKeywords = ['chest pain', 'can\'t breathe', 'difficulty breathing', 'stroke', 'unconscious', 'severe bleeding', 'heart attack'];
  const isEmergency = emergencyKeywords.some(keyword => symptomsLower.includes(keyword));

  return {
    assessmentHeadline: isEmergency
      ? 'Seek immediate medical attention for these symptoms'
      : 'These symptoms warrant professional medical evaluation',
    assessment: `Based on the symptoms you've described, it would be helpful to discuss these concerns with a healthcare provider who can properly evaluate your situation. ${isElderly ? 'Given the patient\'s age, it\'s especially important to seek professional evaluation.' : ''} While I can provide general information, only a qualified healthcare professional can properly assess these symptoms.`,
    possibleCauses: [
      'Various conditions can cause similar symptoms',
      'A healthcare provider can help determine the specific cause',
      'Some symptoms may be related to medications or lifestyle factors',
    ],
    recommendedNextSteps: [
      'Consult your physician for a proper evaluation',
      'Keep track of when symptoms occur and any patterns you notice',
      'Note any changes in symptoms over the next few days',
      'Bring a list of current medications to your appointment',
    ],
    redFlagsToWatch: [
      'Sudden severe symptoms or rapid worsening',
      'Difficulty breathing or chest pain',
      'High fever, confusion, or loss of consciousness',
      'Symptoms that significantly impact daily activities',
    ],
    questionsForDoctor: [
      'What could be causing these symptoms?',
      'Are there any tests that would help diagnose the issue?',
      'Could any of my current medications be contributing?',
      'What symptoms should prompt an immediate return visit?',
    ],
    disclaimer: 'This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. If you think you may have a medical emergency, call 911 or your local emergency number immediately.',
    urgencyLevel: isEmergency ? 'emergency' : 'moderate',
    isEmergency,
    emergencyReason: isEmergency ? 'Based on the symptoms described, this may require immediate medical attention.' : undefined,
    aiNotice: 'This response was generated by AI and may contain errors or inaccuracies. AI cannot replace professional medical judgment. Please consult a qualified healthcare provider for medical advice.',
  };
}

/**
 * Save query to Firestore
 */
async function saveQuery(
  queryData: Omit<SymptomCheckerQuery, 'id'>
): Promise<string> {
  const adminDb = getAdminDb();
  const docRef = await adminDb.collection('symptomCheckerQueries').add(queryData);
  return docRef.id;
}

/**
 * Update existing query with refined response
 */
async function updateQueryWithRefinement(
  queryId: string,
  refinedResponse: string,
  additionalData: Partial<SymptomCheckerRequest>
): Promise<void> {
  const adminDb = getAdminDb();
  await adminDb.collection('symptomCheckerQueries').doc(queryId).update({
    refinedResponse,
    ...additionalData,
    updatedAt: new Date(),
  });
}

export async function POST(request: NextRequest) {
  console.log('[Symptom Checker API] Request received');
  const startTime = Date.now();

  try {
    // Parse request body
    const body: SymptomCheckerRequest = await request.json();
    console.log('[Symptom Checker API] Body:', { ...body, symptomsDescription: body.symptomsDescription?.substring(0, 50) + '...' });

    // Check authentication (optional - guests allowed)
    let userId: string | null = null;
    let userType: 'guest' | 'registered' = 'guest';
    let userRole: UserRole = 'member';

    const authResult = await verifyAuthToken(request);
    if (authResult.success && authResult.userId) {
      userId = authResult.userId;
      userType = 'registered';
      console.log('[Symptom Checker API] Authenticated user:', userId);
    } else {
      console.log('[Symptom Checker API] Guest user');
    }

    // Validate request
    const validation = validateRequest(body, userType === 'registered');
    if (!validation.valid) {
      const errorResponse: SymptomCheckerErrorResponse = {
        success: false,
        error: validation.error!,
        code: 'VALIDATION_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get rate limit identifier
    const rateLimitId = userId || getClientIP(request);
    const isRefinement = body.isRefinement && body.previousQueryId;

    // Check rate limit
    const rateLimit = await checkRateLimit(rateLimitId, userType, !!isRefinement);
    if (!rateLimit.allowed) {
      const errorResponse: SymptomCheckerErrorResponse = {
        success: false,
        error: userType === 'guest'
          ? `You've reached your daily limit of ${RATE_LIMITS.guest} symptom checks. Sign up for ${RATE_LIMITS.registered} checks per day!`
          : `You've reached your daily limit of ${RATE_LIMITS.registered} symptom checks. Your limit resets at midnight.`,
        code: 'RATE_LIMIT_EXCEEDED',
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    // Build AI prompt with personalization for registered users
    let prompt = buildSymptomPrompt(body, userType === 'registered');

    // Apply learned personalization for registered users (verbosity, terminology, focus areas)
    if (userId) {
      try {
        const personalization = await getPersonalizedPromptAdditions(userId);
        if (personalization) {
          prompt = `${prompt}\n${personalization}`;
          console.log('[Symptom Checker API] Applied user personalization');
        }
      } catch (personalizationError) {
        console.warn('[Symptom Checker API] Failed to get personalization:', personalizationError);
        // Continue without personalization
      }
    }

    // Call AI - try Gemini first, then Claude, then fallback
    let aiResponse: SymptomCheckerAIResponse;
    let modelUsed: AIModel = 'gemini';

    console.log('[Symptom Checker API] Calling Gemini...');
    const geminiResult = await callGeminiAPI(prompt);

    if (geminiResult.success && geminiResult.response) {
      aiResponse = geminiResult.response;
      console.log('[Symptom Checker API] Gemini succeeded');
    } else {
      console.log('[Symptom Checker API] Gemini failed, trying Claude...');
      const claudeResult = await callClaudeAPI(prompt);

      if (claudeResult.success && claudeResult.response) {
        aiResponse = claudeResult.response;
        modelUsed = 'claude';
        console.log('[Symptom Checker API] Claude succeeded');
      } else {
        console.log('[Symptom Checker API] Both AI providers failed, using fallback');
        aiResponse = generateFallbackResponse(body);
        modelUsed = 'gemini'; // Fallback doesn't really use either
      }
    }

    const responseTimeMs = Date.now() - startTime;

    // HIPAA Audit logging for registered users
    if (userId && body.elderId) {
      await logPHIThirdPartyDisclosure({
        userId,
        userRole,
        groupId: '', // Not applicable for symptom checker
        elderId: body.elderId,
        serviceName: modelUsed === 'gemini' ? 'Google Gemini AI' : 'Anthropic Claude AI',
        serviceType: 'symptom_assessment',
        dataShared: ['age', 'gender', 'symptoms', 'medications', 'conditions', 'lifestyle_info'],
        purpose: 'AI-powered symptom assessment for caregiving support',
      });
    }

    // Save or update query
    let queryId: string;

    if (isRefinement && body.previousQueryId) {
      // Update existing query with refined response
      queryId = body.previousQueryId;
      await updateQueryWithRefinement(queryId, JSON.stringify(aiResponse), {
        medications: body.medications,
        knownConditions: body.knownConditions,
        dietType: body.dietType,
        smoker: body.smoker,
        alcoholUse: body.alcoholUse,
        activityLevel: body.activityLevel,
      });
    } else {
      // Calculate expiry date for guest queries (7 days)
      const expiresAt = userType === 'guest'
        ? new Date(Date.now() + GUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000)
        : null;

      // Save new query
      queryId = await saveQuery({
        userId,
        userType,
        ipAddress: getClientIP(request),
        elderId: body.elderId || null,
        elderName: body.elderName || null,
        age: body.age,
        gender: body.gender,
        symptomsDescription: body.symptomsDescription,
        medications: body.medications || null,
        knownConditions: body.knownConditions || null,
        dietType: (body.dietType as DietType) || null,
        smoker: body.smoker ?? null,
        alcoholUse: (body.alcoholUse as AlcoholUse) || null,
        activityLevel: (body.activityLevel as ActivityLevel) || null,
        initialResponse: JSON.stringify(aiResponse),
        refinedResponse: null,
        urgencyLevel: aiResponse.urgencyLevel || 'moderate',
        isEmergency: aiResponse.isEmergency || false,
        feedbackRating: null,
        feedbackComment: null,
        feedbackTimestamp: null,
        includeInReport: userType === 'registered',
        createdAt: new Date(),
        updatedAt: new Date(),
        aiModelUsed: modelUsed,
        responseTimeMs,
        expiresAt,
      });
    }

    // Return success response
    const successResponse: SymptomCheckerResponse = {
      success: true,
      queryId,
      response: aiResponse,
      rateLimit: {
        used: rateLimit.used,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
      },
      aiModelUsed: modelUsed,
    };

    console.log('[Symptom Checker API] Success, queryId:', queryId, 'responseTime:', responseTimeMs, 'ms');
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('[Symptom Checker API] Error:', error);
    const errorResponse: SymptomCheckerErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process symptom check',
      code: 'AI_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
