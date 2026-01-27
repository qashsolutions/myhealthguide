/**
 * AI Service - Google Gemini Integration
 * Phase 4: AI Insights
 */

import { DailySummary, DietAnalysis, AIAnalysis } from '@/types';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';
import { cleanForFirestore } from '@/lib/utils/firestoreHelpers';

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
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
            thinking_config: {
              include_thoughts: true // Enable thinking mode for complex analysis
            }
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
 * Uses enhanced nutrition scoring with age/weight/condition awareness
 *
 * @param entry - Diet entry data
 * @param userId - User ID for HIPAA audit logging
 * @param userRole - User role for HIPAA audit logging
 * @param groupId - Group ID for HIPAA audit logging
 * @param elderId - Elder ID for HIPAA audit logging
 * @param elderProfile - Optional elder profile for enhanced analysis
 */
export async function analyzeDietEntry(
  entry: {
    meal: string;
    items: string[];
    elderAge: number;
    existingConditions?: string[];
    notes?: string;
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string,
  elderProfile?: {
    weight?: { value: number; unit: 'lb' | 'kg' };
    biologicalSex?: 'male' | 'female';
    dietaryRestrictions?: string[];
  }
): Promise<DietAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Build enhanced profile for analysis
  const profile = {
    age: entry.elderAge,
    weight: elderProfile?.weight,
    conditions: entry.existingConditions || [],
    dietaryRestrictions: elderProfile?.dietaryRestrictions || [],
    biologicalSex: elderProfile?.biologicalSex
  };

  // Calculate personalized targets
  const targets = calculatePersonalizedTargets(profile);

  // Build condition context for AI
  const conditionContext = buildConditionContext(profile.conditions);

  const prompt = `
You are a nutrition analyst specializing in elderly care. Analyze this meal for a ${entry.elderAge}-year-old senior.

ELDER PROFILE:
- Age: ${entry.elderAge} years
- Weight: ${profile.weight ? `${profile.weight.value} ${profile.weight.unit}` : 'Unknown'}
- Sex: ${profile.biologicalSex || 'Unknown'}
- Known Conditions: ${profile.conditions.length > 0 ? profile.conditions.join(', ') : 'None specified'}
- Dietary Restrictions: ${profile.dietaryRestrictions.length > 0 ? profile.dietaryRestrictions.join(', ') : 'None'}

CONDITION-SPECIFIC GUIDELINES:
${conditionContext || 'No specific condition guidelines applicable.'}

DAILY TARGETS FOR THIS ELDER:
- Calories: ${targets.calorieRange}
- Protein: ${targets.proteinRange}g/day (seniors need 1.0-1.2g per kg body weight)
- Fiber: 25g/day minimum
- Sodium: <${targets.sodiumMax}mg/day

MEAL TO ANALYZE:
- Meal Type: ${entry.meal}
- Food Items: ${Array.isArray(entry.items) ? entry.items.join(', ') : (entry.items || 'No items')}
${entry.notes ? `- Notes: ${entry.notes}` : ''}

ANALYSIS REQUIREMENTS:
1. Estimate macros (carbs, protein, fat in grams) for this meal
2. Estimate total calories
3. Estimate fiber, sodium, sugar content
4. Score the meal (0-100) based on:
   - Meal Balance (40 points): protein source + vegetables/fruits + complex carbs
   - Macro Fit (30 points): appropriate portions for an elderly person
   - Condition Awareness (30 points): avoids problematic foods for their conditions
5. Flag any condition-specific concerns
6. Note positives about the meal
7. Provide 1-2 actionable recommendations

IMPORTANT:
- This is informational analysis, NOT medical advice
- Be practical - real meals aren't perfect
- Consider senior-specific needs (easier to chew, digest)
- A simple but balanced meal scores well

Return ONLY valid JSON matching this structure:
{
  "nutritionScore": <number 0-100>,
  "scoreBreakdown": {
    "mealBalance": <number 0-40>,
    "macroFit": <number 0-30>,
    "conditionAwareness": <number 0-30>
  },
  "macros": {
    "carbs": { "grams": <number>, "percentage": <number> },
    "protein": { "grams": <number>, "percentage": <number> },
    "fat": { "grams": <number>, "percentage": <number> },
    "fiber": <number>,
    "sodium": <number or null>,
    "sugar": <number or null>
  },
  "estimatedCalories": <number>,
  "conditionFlags": [
    {
      "condition": "<condition name>",
      "concern": "<specific concern>",
      "recommendation": "<what to do>",
      "severity": "<info|warning|alert>"
    }
  ],
  "concerns": ["<concern 1>"],
  "positives": ["<positive 1>"],
  "recommendations": ["<recommendation 1>"],
  "doctorNotes": "<optional note for healthcare provider>"
}
`;

  try {
    // HIPAA Audit: Log third-party PHI disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'AI Nutrition Analysis (Gemini/Claude)',
      serviceType: 'enhanced_diet_analysis',
      dataShared: ['meal_type', 'food_items', 'elder_age', 'weight', 'medical_conditions', 'dietary_restrictions'],
      purpose: 'Analyze diet entry with age and condition-aware nutrition scoring',
    });

    // Try Gemini first
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
                thinking_config: { include_thoughts: false }
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const generatedText = result.candidates[0].content.parts[0].text;
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return cleanForFirestore(parsed, { removeNull: true }) as DietAnalysis;
          }
        }
      } catch (geminiError) {
        console.warn('Gemini API failed, trying Claude:', geminiError);
      }
    }

    // Fallback to Claude
    if (anthropicKey) {
      try {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (claudeResponse.ok) {
          const claudeResult = await claudeResponse.json();
          const claudeText = claudeResult.content[0].text;
          const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return cleanForFirestore(parsed, { removeNull: true }) as DietAnalysis;
          }
        }
      } catch (claudeError) {
        console.warn('Claude API also failed:', claudeError);
      }
    }

    // Rule-based fallback
    return generateFallbackDietAnalysis(entry, profile);

  } catch (error) {
    console.error('Diet analysis error:', error);
    return generateFallbackDietAnalysis(entry, profile);
  }
}

/**
 * Analyze diet entry with smart parsing of free-form text
 * Parses natural language like "boiled chicken with rice" into structured items
 * Then performs enhanced nutrition analysis
 */
export async function analyzeDietEntryWithParsing(
  entry: {
    meal: string;
    freeformText: string;
    elderAge: number;
    existingConditions?: string[];
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string,
  elderProfile?: {
    weight?: { value: number; unit: 'lb' | 'kg' };
    biologicalSex?: 'male' | 'female';
    dietaryRestrictions?: string[];
  }
): Promise<DietAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Build enhanced profile for analysis
  const profile = {
    age: entry.elderAge,
    weight: elderProfile?.weight,
    conditions: entry.existingConditions || [],
    dietaryRestrictions: elderProfile?.dietaryRestrictions || [],
    biologicalSex: elderProfile?.biologicalSex
  };

  // Calculate personalized targets
  const targets = calculatePersonalizedTargets(profile);

  // Build condition context for AI
  const conditionContext = buildConditionContext(profile.conditions);

  const prompt = `
You are a nutrition analyst specializing in elderly care. First parse the food description, then analyze it for a ${entry.elderAge}-year-old senior.

ELDER PROFILE:
- Age: ${entry.elderAge} years
- Weight: ${profile.weight ? `${profile.weight.value} ${profile.weight.unit}` : 'Unknown'}
- Sex: ${profile.biologicalSex || 'Unknown'}
- Known Conditions: ${profile.conditions.length > 0 ? profile.conditions.join(', ') : 'None specified'}
- Dietary Restrictions: ${profile.dietaryRestrictions.length > 0 ? profile.dietaryRestrictions.join(', ') : 'None'}

CONDITION-SPECIFIC GUIDELINES:
${conditionContext || 'No specific condition guidelines applicable.'}

DAILY TARGETS FOR THIS ELDER:
- Calories: ${targets.calorieRange}
- Protein: ${targets.proteinRange}g/day
- Fiber: 25g/day minimum
- Sodium: <${targets.sodiumMax}mg/day

MEAL TO PARSE AND ANALYZE:
- Meal Type: ${entry.meal}
- Description: "${entry.freeformText}"

TASK:
1. PARSE: Extract individual food items from the description (e.g., "boiled chicken with rice and salad" → ["boiled chicken", "rice", "salad"])
2. ESTIMATE: Macros, calories, fiber, sodium for each item and total
3. SCORE: Rate the meal (0-100) based on:
   - Meal Balance (40 points): protein + vegetables/fruits + complex carbs
   - Macro Fit (30 points): appropriate for elderly person
   - Condition Awareness (30 points): avoids problematic foods
4. FLAG: Any condition-specific concerns
5. POSITIVE: Note good aspects of the meal
6. RECOMMEND: 1-2 actionable suggestions

IMPORTANT:
- Parse food items intelligently (understand variations like "boiled chicken", "grilled fish", etc.)
- This is informational analysis, NOT medical advice
- A simple but balanced meal scores well

Return ONLY valid JSON:
{
  "parsedItems": ["item1", "item2"],
  "nutritionScore": <number 0-100>,
  "scoreBreakdown": {
    "mealBalance": <0-40>,
    "macroFit": <0-30>,
    "conditionAwareness": <0-30>
  },
  "macros": {
    "carbs": { "grams": <number>, "percentage": <number> },
    "protein": { "grams": <number>, "percentage": <number> },
    "fat": { "grams": <number>, "percentage": <number> },
    "fiber": <number>,
    "sodium": <number or null>,
    "sugar": <number or null>
  },
  "estimatedCalories": <number>,
  "conditionFlags": [],
  "concerns": [],
  "positives": [],
  "recommendations": []
}
`;

  try {
    // HIPAA Audit: Log third-party PHI disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'AI Nutrition Analysis (Gemini/Claude)',
      serviceType: 'diet_parsing_and_analysis',
      dataShared: ['meal_description', 'elder_age', 'weight', 'medical_conditions', 'dietary_restrictions'],
      purpose: 'Parse free-form meal description and analyze nutrition',
    });

    // Try Gemini first
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
                thinking_config: { include_thoughts: false }
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const generatedText = result.candidates[0].content.parts[0].text;
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return cleanForFirestore(parsed, { removeNull: true }) as DietAnalysis;
          }
        }
      } catch (geminiError) {
        console.warn('Gemini API failed, trying Claude:', geminiError);
      }
    }

    // Fallback to Claude
    if (anthropicKey) {
      try {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (claudeResponse.ok) {
          const claudeResult = await claudeResponse.json();
          const claudeText = claudeResult.content[0].text;
          const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return cleanForFirestore(parsed, { removeNull: true }) as DietAnalysis;
          }
        }
      } catch (claudeError) {
        console.warn('Claude API also failed:', claudeError);
      }
    }

    // Rule-based fallback with simple parsing
    return generateFallbackWithParsing(entry, profile);

  } catch (error) {
    console.error('Diet analysis with parsing error:', error);
    return generateFallbackWithParsing(entry, profile);
  }
}

/**
 * Fallback analysis with simple text parsing
 */
function generateFallbackWithParsing(
  entry: { meal: string; freeformText: string },
  profile: { age: number; conditions: string[] }
): DietAnalysis {
  // Simple parsing: split by common delimiters
  const text = entry.freeformText.toLowerCase();
  const parsedItems = text
    .split(/,|and|with|\+|&/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  // Use existing fallback logic
  const baseAnalysis = generateFallbackDietAnalysis(
    { meal: entry.meal, items: parsedItems },
    profile
  );

  return {
    ...baseAnalysis,
    parsedItems: parsedItems.length > 0 ? parsedItems : [entry.freeformText]
  };
}

/**
 * Calculate personalized nutrition targets
 */
function calculatePersonalizedTargets(profile: {
  age: number;
  weight?: { value: number; unit: 'lb' | 'kg' };
  conditions: string[];
  biologicalSex?: 'male' | 'female';
}) {
  const sex = profile.biologicalSex || 'female';

  // Base calories for sedentary seniors
  const calorieBase = sex === 'male' ? { min: 1800, max: 2000 } : { min: 1600, max: 1800 };

  // Protein based on weight (1.0-1.2g per kg for seniors)
  let proteinMin = 50, proteinMax = 70;
  if (profile.weight) {
    const weightKg = profile.weight.unit === 'kg' ? profile.weight.value : profile.weight.value * 0.453592;
    proteinMin = Math.round(weightKg * 1.0);
    proteinMax = Math.round(weightKg * 1.2);
  }

  // Sodium based on conditions
  const hasHeartOrBP = profile.conditions.some(c =>
    c.toLowerCase().includes('heart') ||
    c.toLowerCase().includes('hypertension') ||
    c.toLowerCase().includes('blood pressure')
  );
  const sodiumMax = hasHeartOrBP ? 1500 : 2300;

  return {
    calorieRange: `${calorieBase.min}-${calorieBase.max}`,
    proteinRange: `${proteinMin}-${proteinMax}`,
    sodiumMax
  };
}

/**
 * Build condition-specific context for AI prompt
 */
function buildConditionContext(conditions: string[]): string {
  const CONDITION_GUIDELINES: Record<string, string> = {
    'diabetes': 'Watch carbs/sugar. Prefer whole grains, lean protein, leafy greens.',
    'type 2 diabetes': 'Watch carbs/sugar. Prefer whole grains, lean protein, leafy greens.',
    'hypertension': 'Limit sodium to <1500mg. Avoid processed foods, add potassium-rich foods.',
    'heart disease': 'Limit saturated fat, sodium. Focus on fish, olive oil, vegetables.',
    'kidney disease': 'May need to limit protein, potassium, phosphorus. Consult nephrologist.',
    'dementia': 'Focus on easy-to-eat foods, adequate hydration, regular meal times.',
    'osteoporosis': 'Ensure calcium (1200mg) and vitamin D. Limit caffeine and sodium.',
    'gerd': 'Avoid acidic, spicy, fatty foods. Smaller meals. No eating before bed.'
  };

  return conditions.map(condition => {
    const guideline = CONDITION_GUIDELINES[condition.toLowerCase()];
    return guideline ? `- ${condition}: ${guideline}` : `- ${condition}: Consider general dietary implications`;
  }).join('\n');
}

/**
 * Generate fallback analysis without AI
 */
function generateFallbackDietAnalysis(
  entry: { meal: string; items: string[]; notes?: string },
  profile: { age: number; conditions: string[] }
): DietAnalysis {
  const items = entry.items.map(i => i.toLowerCase());
  const itemsText = items.join(' ');

  let mealBalance = 20;
  let macroFit = 15;
  let conditionAwareness = 25;
  const concerns: string[] = [];
  const positives: string[] = [];
  const conditionFlags: Array<{ condition: string; concern: string; recommendation: string; severity: 'info' | 'warning' | 'alert' }> = [];

  // Check for protein
  const proteinKeywords = ['chicken', 'beef', 'fish', 'salmon', 'tuna', 'egg', 'beans', 'tofu', 'pork', 'turkey', 'meat'];
  if (proteinKeywords.some(k => itemsText.includes(k))) {
    mealBalance += 10;
    positives.push('Good protein source');
  }

  // Check for vegetables
  const vegKeywords = ['vegetable', 'salad', 'broccoli', 'spinach', 'carrot', 'greens', 'lettuce', 'tomato'];
  if (vegKeywords.some(k => itemsText.includes(k))) {
    mealBalance += 10;
    positives.push('Includes vegetables');
  }

  // Check for fruits
  const fruitKeywords = ['apple', 'banana', 'orange', 'berry', 'fruit', 'melon'];
  if (fruitKeywords.some(k => itemsText.includes(k))) {
    macroFit += 5;
    positives.push('Includes fruit');
  }

  // Condition-specific checks
  const CONDITION_AVOID: Record<string, string[]> = {
    'diabetes': ['sugar', 'candy', 'soda', 'pastry', 'cake', 'cookie'],
    'hypertension': ['salt', 'salty', 'chips', 'pickle', 'bacon', 'processed'],
    'heart disease': ['fried', 'fatty', 'bacon', 'sausage', 'butter']
  };

  profile.conditions.forEach(condition => {
    const avoidList = CONDITION_AVOID[condition.toLowerCase()];
    if (avoidList) {
      avoidList.forEach(avoid => {
        if (itemsText.includes(avoid)) {
          conditionFlags.push({
            condition,
            concern: `Contains ${avoid}`,
            recommendation: `Consider alternatives for ${condition}`,
            severity: 'warning'
          });
          conditionAwareness -= 10;
          concerns.push(`${avoid} may not be ideal for ${condition}`);
        }
      });
    }
  });

  const nutritionScore = Math.max(0, Math.min(100, mealBalance + macroFit + conditionAwareness));

  // Build result object - only include fields that have values (Firestore rejects undefined)
  const result: DietAnalysis = {
    nutritionScore,
    concerns: concerns.length > 0 ? concerns : [],
    recommendations: ['Consider adding variety to meals', 'Discuss nutrition goals with a dietitian'],
    scoreBreakdown: {
      mealBalance: Math.max(0, mealBalance),
      macroFit: Math.max(0, macroFit),
      conditionAwareness: Math.max(0, conditionAwareness)
    },
    macros: {
      carbs: { grams: 30, percentage: 45 },
      protein: { grams: 15, percentage: 25 },
      fat: { grams: 12, percentage: 30 },
      fiber: 5
    },
    estimatedCalories: 300,
    positives: positives.length > 0 ? positives : ['Meal logged - tracking is valuable!']
  };

  // Only add conditionFlags if there are any (avoid undefined in Firestore)
  if (conditionFlags.length > 0) {
    result.conditionFlags = conditionFlags;
  }

  return result;
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
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
            thinking_config: {
              include_thoughts: true // Pattern detection benefits from reasoning
            }
          },
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
