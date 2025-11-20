/**
 * AI Service - Google Gemini Integration
 * Phase 4: AI Insights
 */

import { DailySummary, DietAnalysis, AIAnalysis } from '@/types';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';

/**
 * Generate daily summary using Gemini AI
 * @param data - Medical data to analyze
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID for HIPAA audit logging
 */
export async function generateDailySummary(
  data: {
    medicationLogs: any[];
    supplementLogs: any[];
    dietEntries: any[];
    elderName: string;
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<DailySummary> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return mock data for development
    return {
      medicationCompliance: {
        taken: data.medicationLogs.filter(l => l.status === 'taken').length,
        missed: data.medicationLogs.filter(l => l.status === 'missed').length,
        percentage: 85
      },
      supplementCompliance: {
        taken: data.supplementLogs.filter(l => l.status === 'taken').length,
        missed: data.supplementLogs.filter(l => l.status === 'missed').length,
        percentage: 90
      },
      dietSummary: {
        mealsLogged: data.dietEntries.length,
        concernsDetected: [],
        recommendations: ['Ensure adequate hydration', 'Include more vegetables']
      },
      overallInsights: [
        'Medication compliance is good',
        'All meals logged today',
        'Consider tracking water intake'
      ],
      missedDoses: []
    };
  }

  // Prepare prompt for Gemini
  const prompt = `
You are a healthcare data analyst. Analyze the following caregiving data for ${data.elderName} and provide a concise daily summary.

IMPORTANT LIMITATIONS:
- Do NOT provide medical advice
- Do NOT suggest dosage changes
- Do NOT diagnose conditions
- ONLY provide observational summaries and general wellness recommendations

Medication Logs:
${JSON.stringify(data.medicationLogs, null, 2)}

Supplement Logs:
${JSON.stringify(data.supplementLogs, null, 2)}

Diet Entries:
${JSON.stringify(data.dietEntries, null, 2)}

Provide a JSON response with:
1. Medication compliance percentage
2. Supplement compliance percentage
3. Diet summary (meals logged, general observations)
4. Overall insights (3-5 bullet points)
5. List of missed doses (if any)

Format: Return valid JSON matching the DailySummary TypeScript interface.
`;

  try {
    // HIPAA Audit: Log third-party PHI disclosure to Google Gemini AI
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini AI',
      serviceType: 'health_summary_generation',
      dataShared: ['medication_logs', 'supplement_logs', 'diet_entries', 'elder_name'],
      purpose: 'Generate daily health summary for caregiving insights',
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const result = await response.json();
    const generatedText = result.candidates[0].content.parts[0].text;

    // Parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse Gemini response');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Analyze diet entry for nutritional concerns
 * @param entry - Diet entry data
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID for HIPAA audit logging
 */
export async function analyzeDietEntry(
  entry: {
    meal: string;
    items: string[];
    elderAge: number;
    existingConditions?: string[];
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<DietAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return mock data for development
    return {
      nutritionScore: 75,
      concerns: [],
      recommendations: [
        'Consider adding more protein',
        'Include leafy greens for vitamins'
      ]
    };
  }

  const prompt = `
You are a nutrition analyst. Analyze this meal for an elderly person (age ${entry.elderAge}).

IMPORTANT LIMITATIONS:
- Do NOT provide medical advice
- Do NOT suggest specific diets for medical conditions
- ONLY provide general nutritional observations
- Flag obvious concerns (e.g., too much sugar, lack of variety)

Meal: ${entry.meal}
Items: ${entry.items.join(', ')}
${entry.existingConditions ? `Existing conditions: ${entry.existingConditions.join(', ')}` : ''}

Provide a JSON response with:
1. Nutrition score (0-100)
2. Concerns array (if any obvious nutritional issues)
3. Recommendations array (general wellness suggestions)

Format: Return valid JSON matching the DietAnalysis TypeScript interface.
`;

  try {
    // HIPAA Audit: Log third-party PHI disclosure to Google Gemini AI
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini AI',
      serviceType: 'diet_analysis',
      dataShared: ['meal_type', 'food_items', 'elder_age', 'medical_conditions'],
      purpose: 'Analyze diet entry for nutritional concerns',
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 1,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const result = await response.json();
    const generatedText = result.candidates[0].content.parts[0].text;

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse Gemini response');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Detect patterns in medication compliance
 * @param logs - Medication logs to analyze
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID for HIPAA audit logging
 */
export async function detectCompliancePatterns(
  logs: any[],
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<{
  patterns: string[];
  recommendations: string[];
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      patterns: ['Consistent morning compliance', 'Evening doses sometimes missed'],
      recommendations: ['Consider setting evening reminders', 'Review medication schedule']
    };
  }

  const prompt = `
You are a healthcare data analyst. Analyze medication compliance patterns.

IMPORTANT LIMITATIONS:
- Do NOT provide medical advice
- Do NOT suggest medication changes
- ONLY identify observable patterns in timing and compliance

Medication Logs (last 30 days):
${JSON.stringify(logs, null, 2)}

Identify:
1. Patterns in when doses are taken vs missed
2. Time-of-day trends
3. Day-of-week trends
4. General recommendations for improving compliance (non-medical)

Format: Return JSON with patterns and recommendations arrays.
`;

  try {
    // HIPAA Audit: Log third-party PHI disclosure to Google Gemini AI
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini AI',
      serviceType: 'compliance_pattern_detection',
      dataShared: ['medication_logs', 'compliance_status', 'timestamps'],
      purpose: 'Detect medication compliance patterns and provide recommendations',
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
        }),
      }
    );

    const result = await response.json();
    const generatedText = result.candidates[0].content.parts[0].text;

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      patterns: [],
      recommendations: []
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      patterns: [],
      recommendations: []
    };
  }
}

/**
 * Check if a medication log entry should be flagged
 */
export function flagMedicationEntry(log: any): AIAnalysis | null {
  // Simple rule-based flagging
  if (log.status === 'missed') {
    return {
      flag: true,
      reason: 'Medication dose was missed',
      severity: 'medium'
    };
  }

  // Check for consecutive misses (requires historical data)
  // This would be enhanced with AI in production

  return null;
}

/**
 * Generate insights from voice transcript
 */
export async function analyzeVoiceTranscript(transcript: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'concerned';
  keywords: string[];
  suggestedTags: string[];
}> {
  // Simple keyword extraction for now
  // In production, use Gemini for sentiment analysis

  const concernKeywords = ['pain', 'hurt', 'difficult', 'forgot', 'missed'];
  const positiveKeywords = ['good', 'better', 'fine', 'well'];

  const lowerTranscript = transcript.toLowerCase();
  const hasConcern = concernKeywords.some(kw => lowerTranscript.includes(kw));
  const hasPositive = positiveKeywords.some(kw => lowerTranscript.includes(kw));

  return {
    sentiment: hasConcern ? 'concerned' : (hasPositive ? 'positive' : 'neutral'),
    keywords: [...concernKeywords, ...positiveKeywords].filter(kw => lowerTranscript.includes(kw)),
    suggestedTags: []
  };
}
