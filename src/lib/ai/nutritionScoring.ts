/**
 * Enhanced Nutrition Scoring System
 *
 * Provides age-appropriate, condition-aware nutrition analysis for elderly care.
 * Uses Gemini as primary AI with Claude as fallback.
 *
 * Scoring factors:
 * - Age-based nutritional requirements (seniors need more protein, calcium, B12)
 * - Condition-specific adjustments (diabetes→carbs, heart→sodium, kidney→protein)
 * - Macronutrient balance (carb/protein/fat distribution)
 * - Daily aggregate tracking
 *
 * IMPORTANT: This is informational analysis, NOT medical/nutritional advice.
 * Always recommend consulting with doctor or registered dietitian.
 */

import { logPHIThirdPartyDisclosure, UserRole } from '@/lib/medical/phiAuditLog';
import type { Elder, DietEntry } from '@/types';

// ============= Types =============

export interface ElderNutritionProfile {
  age: number;
  weight?: { value: number; unit: 'lb' | 'kg' };
  conditions: string[];
  dietaryRestrictions: string[];
  biologicalSex?: 'male' | 'female';
}

export interface MacroEstimate {
  carbs: { grams: number; percentage: number };
  protein: { grams: number; percentage: number };
  fat: { grams: number; percentage: number };
  fiber: number;
  sodium?: number; // mg estimate
  sugar?: number; // grams estimate
}

export interface NutritionTarget {
  dailyCalories: { min: number; max: number };
  protein: { min: number; max: number; unit: 'g' };
  carbs: { min: number; max: number; percentage: string };
  fat: { min: number; max: number; percentage: string };
  fiber: { min: number; unit: 'g' };
  sodium: { max: number; unit: 'mg' };
  water: { min: number; unit: 'glasses' };
}

export interface ConditionFlag {
  condition: string;
  concern: string;
  recommendation: string;
  severity: 'info' | 'warning' | 'alert';
}

export interface EnhancedDietAnalysis {
  // Overall score (0-100)
  nutritionScore: number;
  scoreBreakdown: {
    mealBalance: number; // 0-40 points
    macroFit: number; // 0-30 points
    conditionAwareness: number; // 0-30 points
  };

  // Macro estimates for this meal
  macros: MacroEstimate;
  estimatedCalories: number;

  // Condition-specific flags
  conditionFlags: ConditionFlag[];

  // General feedback
  concerns: string[];
  positives: string[];
  recommendations: string[];

  // For doctor reference
  doctorNotes?: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalMacros: MacroEstimate;
  mealsLogged: number;
  targets: NutritionTarget;
  targetsMet: {
    calories: boolean;
    protein: boolean;
    fiber: boolean;
    hydration: boolean;
  };
  overallScore: number;
  alerts: ConditionFlag[];
}

// ============= Age-Based Guidelines for Seniors =============

const SENIOR_NUTRITION_GUIDELINES = {
  // Protein: 1.0-1.2g per kg body weight for seniors (vs 0.8g younger adults)
  proteinPerKg: { min: 1.0, max: 1.2 },

  // Calories vary by activity level, generally 1600-2200 for seniors
  calorieRanges: {
    sedentary: { male: { min: 1800, max: 2000 }, female: { min: 1600, max: 1800 } },
    moderate: { male: { min: 2000, max: 2400 }, female: { min: 1800, max: 2000 } },
    active: { male: { min: 2200, max: 2600 }, female: { min: 2000, max: 2200 } }
  },

  // Macronutrient distribution (% of daily calories)
  macroDistribution: {
    carbs: { min: 45, max: 55 }, // %
    protein: { min: 15, max: 20 }, // %
    fat: { min: 25, max: 35 } // %
  },

  // Fiber: 25-30g/day for seniors
  fiber: { min: 25, max: 30 },

  // Sodium: <2300mg/day, <1500mg for heart conditions
  sodium: { general: 2300, heartCondition: 1500 },

  // Water: 6-8 glasses/day
  water: { min: 6, max: 8 },

  // Key nutrients for seniors
  keyNutrients: ['protein', 'calcium', 'vitamin D', 'vitamin B12', 'fiber', 'potassium']
};

// ============= Condition-Specific Guidelines =============

const CONDITION_GUIDELINES: Record<string, {
  watch: string[];
  avoid: string[];
  recommend: string[];
  notes: string;
}> = {
  diabetes: {
    watch: ['carbohydrates', 'sugar', 'refined grains', 'fruit juice'],
    avoid: ['sugary drinks', 'candy', 'pastries', 'white bread'],
    recommend: ['whole grains', 'leafy greens', 'lean protein', 'nuts'],
    notes: 'Monitor carbohydrate intake. Prefer low glycemic index foods.'
  },
  'type 2 diabetes': {
    watch: ['carbohydrates', 'sugar', 'refined grains', 'fruit juice'],
    avoid: ['sugary drinks', 'candy', 'pastries', 'white bread'],
    recommend: ['whole grains', 'leafy greens', 'lean protein', 'nuts'],
    notes: 'Monitor carbohydrate intake. Prefer low glycemic index foods.'
  },
  hypertension: {
    watch: ['sodium', 'salt', 'processed foods', 'canned foods'],
    avoid: ['high sodium foods', 'pickles', 'soy sauce', 'processed meats'],
    recommend: ['fresh vegetables', 'fruits', 'potassium-rich foods', 'DASH diet foods'],
    notes: 'Keep sodium under 1500mg/day. Potassium helps lower blood pressure.'
  },
  'heart disease': {
    watch: ['saturated fat', 'trans fat', 'cholesterol', 'sodium'],
    avoid: ['fried foods', 'fatty meats', 'full-fat dairy', 'processed foods'],
    recommend: ['fish', 'olive oil', 'nuts', 'whole grains', 'vegetables'],
    notes: 'Focus on heart-healthy fats. Limit saturated fat to <7% of calories.'
  },
  'kidney disease': {
    watch: ['protein', 'potassium', 'phosphorus', 'sodium'],
    avoid: ['high protein meals', 'bananas', 'oranges', 'tomatoes', 'dairy'],
    recommend: ['limited lean protein', 'low-potassium vegetables', 'rice', 'pasta'],
    notes: 'Protein needs vary by stage. Consult nephrologist for specific limits.'
  },
  'chronic kidney disease': {
    watch: ['protein', 'potassium', 'phosphorus', 'sodium'],
    avoid: ['high protein meals', 'bananas', 'oranges', 'tomatoes', 'dairy'],
    recommend: ['limited lean protein', 'low-potassium vegetables', 'rice', 'pasta'],
    notes: 'Protein needs vary by stage. Consult nephrologist for specific limits.'
  },
  dementia: {
    watch: ['hydration', 'meal regularity', 'choking hazards'],
    avoid: ['hard foods if swallowing issues', 'alcohol'],
    recommend: ['easy-to-eat foods', 'finger foods', 'colorful plates', 'frequent small meals'],
    notes: 'Focus on adequate nutrition. May need texture modifications.'
  },
  "alzheimer's": {
    watch: ['hydration', 'meal regularity', 'choking hazards'],
    avoid: ['hard foods if swallowing issues', 'alcohol'],
    recommend: ['easy-to-eat foods', 'finger foods', 'colorful plates', 'frequent small meals'],
    notes: 'Focus on adequate nutrition. May need texture modifications.'
  },
  osteoporosis: {
    watch: ['calcium intake', 'vitamin D'],
    avoid: ['excessive caffeine', 'excessive alcohol', 'high sodium'],
    recommend: ['dairy', 'fortified foods', 'leafy greens', 'calcium supplements'],
    notes: 'Aim for 1200mg calcium and 800-1000 IU vitamin D daily.'
  },
  gerd: {
    watch: ['acidic foods', 'fatty foods', 'meal timing'],
    avoid: ['citrus', 'tomatoes', 'spicy foods', 'chocolate', 'coffee'],
    recommend: ['lean proteins', 'non-citrus fruits', 'vegetables', 'whole grains'],
    notes: 'Avoid eating 2-3 hours before bedtime. Smaller, frequent meals help.'
  },
  'acid reflux': {
    watch: ['acidic foods', 'fatty foods', 'meal timing'],
    avoid: ['citrus', 'tomatoes', 'spicy foods', 'chocolate', 'coffee'],
    recommend: ['lean proteins', 'non-citrus fruits', 'vegetables', 'whole grains'],
    notes: 'Avoid eating 2-3 hours before bedtime. Smaller, frequent meals help.'
  }
};

// ============= Helper Functions =============

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Convert weight to kg
 */
function toKg(weight: { value: number; unit: 'lb' | 'kg' }): number {
  return weight.unit === 'kg' ? weight.value : weight.value * 0.453592;
}

/**
 * Build elder nutrition profile from Elder data
 */
export function buildElderNutritionProfile(elder: Elder): ElderNutritionProfile {
  const age = elder.dateOfBirth
    ? calculateAge(new Date(elder.dateOfBirth))
    : elder.approximateAge || 75; // Default to 75 if unknown

  return {
    age,
    weight: elder.weight,
    conditions: elder.knownConditions || [],
    dietaryRestrictions: elder.dietaryRestrictions || [],
    biologicalSex: elder.biologicalSex
  };
}

/**
 * Calculate personalized nutrition targets based on elder profile
 */
export function calculateNutritionTargets(profile: ElderNutritionProfile): NutritionTarget {
  const { age, weight, conditions, biologicalSex } = profile;

  // Base calorie calculation (sedentary default for seniors)
  const sex = biologicalSex || 'female';
  const calorieRange = SENIOR_NUTRITION_GUIDELINES.calorieRanges.sedentary[sex];

  // Adjust for age (reduce by ~100 calories per decade over 70)
  const ageAdjustment = age > 70 ? Math.floor((age - 70) / 10) * 100 : 0;
  const dailyCalories = {
    min: Math.max(1400, calorieRange.min - ageAdjustment),
    max: calorieRange.max - ageAdjustment
  };

  // Protein calculation based on weight
  let proteinMin = 50; // Default minimum
  let proteinMax = 70; // Default maximum

  if (weight) {
    const weightKg = toKg(weight);
    proteinMin = Math.round(weightKg * SENIOR_NUTRITION_GUIDELINES.proteinPerKg.min);
    proteinMax = Math.round(weightKg * SENIOR_NUTRITION_GUIDELINES.proteinPerKg.max);
  }

  // Adjust protein for kidney disease (may need to reduce)
  const hasKidneyDisease = conditions.some(c =>
    c.toLowerCase().includes('kidney') || c.toLowerCase().includes('renal')
  );
  if (hasKidneyDisease) {
    proteinMin = Math.round(proteinMin * 0.7);
    proteinMax = Math.round(proteinMax * 0.8);
  }

  // Sodium limit based on conditions
  const hasHeartOrBP = conditions.some(c =>
    c.toLowerCase().includes('heart') ||
    c.toLowerCase().includes('hypertension') ||
    c.toLowerCase().includes('blood pressure')
  );
  const sodiumMax = hasHeartOrBP
    ? SENIOR_NUTRITION_GUIDELINES.sodium.heartCondition
    : SENIOR_NUTRITION_GUIDELINES.sodium.general;

  return {
    dailyCalories,
    protein: { min: proteinMin, max: proteinMax, unit: 'g' },
    carbs: {
      min: SENIOR_NUTRITION_GUIDELINES.macroDistribution.carbs.min,
      max: SENIOR_NUTRITION_GUIDELINES.macroDistribution.carbs.max,
      percentage: '45-55%'
    },
    fat: {
      min: SENIOR_NUTRITION_GUIDELINES.macroDistribution.fat.min,
      max: SENIOR_NUTRITION_GUIDELINES.macroDistribution.fat.max,
      percentage: '25-35%'
    },
    fiber: { min: SENIOR_NUTRITION_GUIDELINES.fiber.min, unit: 'g' },
    sodium: { max: sodiumMax, unit: 'mg' },
    water: { min: SENIOR_NUTRITION_GUIDELINES.water.min, unit: 'glasses' }
  };
}

// ============= AI API Calls =============

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Call Gemini API for nutrition analysis
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
        temperature: 0.3,
        maxOutputTokens: 1024,
        thinking_config: { include_thoughts: false }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
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
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

/**
 * Call AI with Gemini primary, Claude fallback
 */
async function callAI(prompt: string): Promise<string> {
  try {
    return await callGeminiAPI(prompt);
  } catch (geminiError) {
    console.warn('Gemini API failed, falling back to Claude:', geminiError);
    try {
      return await callClaudeAPI(prompt);
    } catch (claudeError) {
      console.error('Both AI APIs failed:', claudeError);
      throw new Error('AI analysis unavailable');
    }
  }
}

// ============= Main Analysis Function =============

/**
 * Analyze a diet entry with enhanced scoring
 */
export async function analyzeNutritionEnhanced(
  entry: {
    meal: string;
    items: string[];
    notes?: string;
  },
  elderProfile: ElderNutritionProfile,
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<EnhancedDietAnalysis> {

  const targets = calculateNutritionTargets(elderProfile);

  // Build condition context for AI
  const conditionContext = elderProfile.conditions.map(condition => {
    const guidelines = CONDITION_GUIDELINES[condition.toLowerCase()];
    if (guidelines) {
      return `- ${condition}: Watch ${guidelines.watch.join(', ')}. ${guidelines.notes}`;
    }
    return `- ${condition}: Consider general dietary implications`;
  }).join('\n');

  const prompt = `
You are a nutrition analyst specializing in elderly care. Analyze this meal for a ${elderProfile.age}-year-old senior.

ELDER PROFILE:
- Age: ${elderProfile.age} years
- Weight: ${elderProfile.weight ? `${elderProfile.weight.value} ${elderProfile.weight.unit}` : 'Unknown'}
- Sex: ${elderProfile.biologicalSex || 'Unknown'}
- Known Conditions: ${elderProfile.conditions.length > 0 ? elderProfile.conditions.join(', ') : 'None specified'}
- Dietary Restrictions: ${elderProfile.dietaryRestrictions.length > 0 ? elderProfile.dietaryRestrictions.join(', ') : 'None'}

CONDITION-SPECIFIC GUIDELINES:
${conditionContext || 'No specific condition guidelines applicable.'}

DAILY TARGETS FOR THIS ELDER:
- Calories: ${targets.dailyCalories.min}-${targets.dailyCalories.max}
- Protein: ${targets.protein.min}-${targets.protein.max}g/day
- Fiber: ${targets.fiber.min}g/day minimum
- Sodium: <${targets.sodium.max}mg/day

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

Return ONLY valid JSON matching this exact structure:
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
  "concerns": ["<concern 1>", "<concern 2>"],
  "positives": ["<positive 1>", "<positive 2>"],
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
      serviceType: 'enhanced_nutrition_scoring',
      dataShared: ['meal_type', 'food_items', 'elder_age', 'weight', 'medical_conditions', 'dietary_restrictions'],
      purpose: 'Analyze diet entry with age and condition-aware nutrition scoring',
    });

    const aiResponse = await callAI(prompt);

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]) as EnhancedDietAnalysis;
      return analysis;
    }

    throw new Error('Failed to parse AI response');

  } catch (error) {
    console.error('Enhanced nutrition analysis failed:', error);

    // Return rule-based fallback
    return generateFallbackAnalysis(entry, elderProfile, targets);
  }
}

/**
 * Generate fallback analysis without AI
 */
function generateFallbackAnalysis(
  entry: { meal: string; items: string[]; notes?: string },
  profile: ElderNutritionProfile,
  targets: NutritionTarget
): EnhancedDietAnalysis {
  const items = entry.items.map(i => i.toLowerCase());
  const itemsText = items.join(' ');

  // Simple scoring based on food keywords
  let mealBalance = 20; // Base score
  let macroFit = 15;
  let conditionAwareness = 25;

  // Check for protein sources
  const proteinKeywords = ['chicken', 'beef', 'fish', 'salmon', 'tuna', 'egg', 'beans', 'tofu', 'pork', 'turkey', 'meat'];
  if (proteinKeywords.some(k => itemsText.includes(k))) {
    mealBalance += 10;
  }

  // Check for vegetables
  const vegKeywords = ['vegetable', 'salad', 'broccoli', 'spinach', 'carrot', 'greens', 'lettuce', 'tomato'];
  if (vegKeywords.some(k => itemsText.includes(k))) {
    mealBalance += 10;
  }

  // Check for fruits
  const fruitKeywords = ['apple', 'banana', 'orange', 'berry', 'fruit', 'melon'];
  if (fruitKeywords.some(k => itemsText.includes(k))) {
    macroFit += 5;
  }

  // Condition-specific checks
  const conditionFlags: ConditionFlag[] = [];

  profile.conditions.forEach(condition => {
    const guidelines = CONDITION_GUIDELINES[condition.toLowerCase()];
    if (guidelines) {
      guidelines.avoid.forEach(avoid => {
        if (itemsText.includes(avoid.toLowerCase())) {
          conditionFlags.push({
            condition,
            concern: `Contains ${avoid}`,
            recommendation: `Consider alternatives for ${condition}`,
            severity: 'warning'
          });
          conditionAwareness -= 10;
        }
      });
    }
  });

  const nutritionScore = Math.max(0, Math.min(100, mealBalance + macroFit + conditionAwareness));

  return {
    nutritionScore,
    scoreBreakdown: {
      mealBalance: Math.max(0, mealBalance),
      macroFit: Math.max(0, macroFit),
      conditionAwareness: Math.max(0, conditionAwareness)
    },
    macros: {
      carbs: { grams: 30, percentage: 45 },
      protein: { grams: 15, percentage: 20 },
      fat: { grams: 10, percentage: 35 },
      fiber: 5
    },
    estimatedCalories: 300,
    conditionFlags,
    concerns: conditionFlags.length > 0 ? ['Some foods may not align with health conditions'] : [],
    positives: nutritionScore >= 60 ? ['Meal logged - tracking is important!'] : [],
    recommendations: ['Consult with dietitian for personalized nutrition advice'],
    doctorNotes: undefined
  };
}

/**
 * Calculate daily nutrition summary from multiple meals
 */
export async function calculateDailyNutritionSummary(
  entries: DietEntry[],
  elderProfile: ElderNutritionProfile,
  date: string
): Promise<DailyNutritionSummary> {
  const targets = calculateNutritionTargets(elderProfile);

  let totalCalories = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSodium = 0;
  const allAlerts: ConditionFlag[] = [];
  const scores: number[] = [];

  for (const entry of entries) {
    if (entry.aiAnalysis) {
      // Use existing analysis if available
      const analysis = entry.aiAnalysis as unknown as EnhancedDietAnalysis;
      if (analysis.estimatedCalories) {
        totalCalories += analysis.estimatedCalories;
        totalCarbs += analysis.macros?.carbs?.grams || 0;
        totalProtein += analysis.macros?.protein?.grams || 0;
        totalFat += analysis.macros?.fat?.grams || 0;
        totalFiber += analysis.macros?.fiber || 0;
        totalSodium += analysis.macros?.sodium || 0;
        scores.push(analysis.nutritionScore);
        if (analysis.conditionFlags) {
          allAlerts.push(...analysis.conditionFlags);
        }
      }
    }
  }

  const totalMacroGrams = totalCarbs + totalProtein + totalFat;

  return {
    date,
    totalCalories,
    totalMacros: {
      carbs: {
        grams: totalCarbs,
        percentage: totalMacroGrams > 0 ? Math.round((totalCarbs / totalMacroGrams) * 100) : 0
      },
      protein: {
        grams: totalProtein,
        percentage: totalMacroGrams > 0 ? Math.round((totalProtein / totalMacroGrams) * 100) : 0
      },
      fat: {
        grams: totalFat,
        percentage: totalMacroGrams > 0 ? Math.round((totalFat / totalMacroGrams) * 100) : 0
      },
      fiber: totalFiber,
      sodium: totalSodium
    },
    mealsLogged: entries.length,
    targets,
    targetsMet: {
      calories: totalCalories >= targets.dailyCalories.min && totalCalories <= targets.dailyCalories.max,
      protein: totalProtein >= targets.protein.min,
      fiber: totalFiber >= targets.fiber.min,
      hydration: false // Would need separate hydration tracking
    },
    overallScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    alerts: allAlerts
  };
}
