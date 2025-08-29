import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Client Configuration for Beehive Platform
 * - Gemini: Question generation and bulk operations
 * - Claude: Psychometric analysis and safety-critical decisions
 */

// Initialize Gemini AI - use env var with fallback
const geminiApiKey = process.env.GOOGLE_AI_API_KEY || 'AIzaSyAhXbgub3i5hgmtB7yStBRCuVCRpZdXGaQ';
const genAI = new GoogleGenerativeAI(geminiApiKey);
// Using Gemini 2.5 Pro (latest as of Aug 2025)
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

// Initialize Claude AI (Anthropic) - create function to get fresh instance
export const getAnthropicClient = () => {
  // Use BEEHIVE_CLAUDE_KEY to avoid conflicts with existing ANTHROPIC_API_KEY
  const apiKey = process.env.BEEHIVE_CLAUDE_KEY;
  
  if (!apiKey) {
    throw new Error('BEEHIVE_CLAUDE_KEY environment variable is required');
  }
  
  return new Anthropic({
    apiKey: apiKey,
    defaultHeaders: {
      'anthropic-version': '2023-06-01',
    },
  });
};

// For backwards compatibility
export const anthropic = getAnthropicClient();

// Claude model configuration (using latest as of Aug 2025)
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Claude Sonnet 4

/**
 * Generate dynamic assessment questions using Gemini
 * Cost-effective for bulk generation
 */
export async function generateAssessmentQuestions(
  scenarioCode: string,
  scenarioPrompt: string,
  count: number = 5
): Promise<string[]> {
  try {
    const prompt = `
      You are creating variations of a psychometric assessment question for caregiver screening.
      This is for protecting vulnerable elderly patients, so questions must be clear and unambiguous.
      
      Original Scenario: ${scenarioCode}
      Base Prompt: ${scenarioPrompt}
      
      Generate ${count} variations of this scenario that:
      1. Test the same core ethical principle
      2. Use different settings or contexts
      3. Maintain the same difficulty level
      4. Are culturally sensitive
      5. Are clear for non-native English speakers
      
      Format: Return only the question variations, one per line.
      Do not include numbering or explanations.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Split by newlines and filter empty lines
    const questions = text
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    return questions;
  } catch (error) {
    console.error('Gemini question generation error:', error);
    throw new Error('Failed to generate assessment questions');
  }
}

/**
 * Analyze psychometric assessment responses using Claude
 * Critical for safety evaluation
 */
export async function analyzePsychometricResponses(
  responses: Record<string, any>,
  caregiverInfo: {
    age?: number;
    education?: string;
    experience?: string;
  }
): Promise<{
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'unacceptable';
  scores: {
    integrity: number;
    empathy: number;
    impulseControl: number;
    stressTolerance: number;
    boundaryAwareness: number;
    judgment: number;
  };
  redFlags: string[];
  recommendation: string;
  confidence: number;
}> {
  try {
    const systemPrompt = `You are an expert psychologist specializing in caregiver assessment for vulnerable elderly patients. 
    Your analysis could prevent abuse, neglect, or exploitation. Be thorough and conservative in your risk assessment.
    
    Analyze the responses for:
    1. Dark triad traits (narcissism, Machiavellianism, psychopathy)
    2. Boundary violations
    3. Impulse control issues
    4. Exploitation risks
    5. Empathy deficits
    6. Poor judgment patterns`;

    const userPrompt = `
      Caregiver Assessment Analysis
      
      Background:
      - Age: ${caregiverInfo.age || 'Not provided'}
      - Education: ${caregiverInfo.education || 'Not provided'}
      - Experience: ${caregiverInfo.experience || 'Not provided'}
      
      Assessment Responses:
      ${JSON.stringify(responses, null, 2)}
      
      Provide a detailed risk assessment with:
      1. Overall risk level (very_low/low/moderate/high/unacceptable)
      2. Individual scores (0-5 scale) for: integrity, empathy, impulse control, stress tolerance, boundary awareness, judgment
      3. Specific red flags identified
      4. Clear recommendation (accept/conditional/reject)
      5. Confidence level in your assessment (0-100%)
      
      Format your response as JSON.
    `;

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent safety assessments
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Parse Claude's response
    const content = message.content[0];
    if (content.type === 'text') {
      try {
        // Extract JSON from Claude's response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          return {
            riskLevel: analysis.risk_level || analysis.riskLevel || 'high',
            scores: {
              integrity: analysis.scores?.integrity || 0,
              empathy: analysis.scores?.empathy || 0,
              impulseControl: analysis.scores?.impulse_control || analysis.scores?.impulseControl || 0,
              stressTolerance: analysis.scores?.stress_tolerance || analysis.scores?.stressTolerance || 0,
              boundaryAwareness: analysis.scores?.boundary_awareness || analysis.scores?.boundaryAwareness || 0,
              judgment: analysis.scores?.judgment || 0,
            },
            redFlags: analysis.red_flags || analysis.redFlags || [],
            recommendation: analysis.recommendation || 'reject',
            confidence: analysis.confidence || 0,
          };
        }
      } catch (parseError) {
        console.error('Failed to parse Claude response:', parseError);
      }
    }
    
    // Default conservative response if parsing fails
    return {
      riskLevel: 'high',
      scores: {
        integrity: 0,
        empathy: 0,
        impulseControl: 0,
        stressTolerance: 0,
        boundaryAwareness: 0,
        judgment: 0,
      },
      redFlags: ['Unable to properly analyze responses'],
      recommendation: 'Manual review required',
      confidence: 0,
    };
  } catch (error) {
    console.error('Claude analysis error:', error);
    throw new Error('Failed to analyze assessment responses');
  }
}

/**
 * Use Gemini for basic caregiver-patient matching
 */
export async function generateMatchScore(
  caregiver: any,
  patient: any
): Promise<{
  score: number;
  factors: Record<string, number>;
  explanation: string;
}> {
  try {
    const prompt = `
      Calculate a match score between a caregiver and patient.
      
      Caregiver Profile:
      ${JSON.stringify(caregiver, null, 2)}
      
      Patient Requirements:
      ${JSON.stringify(patient, null, 2)}
      
      Consider these factors with weights:
      1. Language match (40%) - Critical for communication
      2. Distance/location (20%) - Practical accessibility
      3. Skills match (15%) - Required care abilities
      4. Availability match (15%) - Schedule compatibility
      5. Experience level (10%) - Past performance
      
      Return a JSON object with:
      - score: Overall match score (0-100)
      - factors: Individual factor scores
      - explanation: Brief explanation of the match
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      score: 0,
      factors: {},
      explanation: 'Unable to calculate match score',
    };
  } catch (error) {
    console.error('Gemini matching error:', error);
    throw new Error('Failed to calculate match score');
  }
}

/**
 * Generate safety guardrails for assessment questions using Claude
 * Ensures questions remain appropriate and effective
 */
export async function validateAssessmentQuestions(
  questions: string[]
): Promise<{
  approved: string[];
  rejected: Array<{ question: string; reason: string }>;
}> {
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      temperature: 0.2,
      system: 'You are reviewing psychometric assessment questions for caregiver screening. Ensure questions are ethical, clear, and effective at identifying safety risks.',
      messages: [
        {
          role: 'user',
          content: `Review these assessment questions for appropriateness:
          
          ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
          
          For each question, determine if it should be:
          - Approved: Clear, ethical, and effective
          - Rejected: Provide specific reason
          
          Return as JSON with 'approved' array and 'rejected' array.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    // Default to rejecting all if parsing fails (conservative approach)
    return {
      approved: [],
      rejected: questions.map(q => ({ question: q, reason: 'Validation failed' })),
    };
  } catch (error) {
    console.error('Claude validation error:', error);
    throw new Error('Failed to validate questions');
  }
}