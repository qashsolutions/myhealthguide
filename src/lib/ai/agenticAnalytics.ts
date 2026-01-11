/**
 * Agentic AI Analytics Service
 *
 * Uses Gemini 3 Pro Preview with thinking mode to provide intelligent,
 * context-aware analytics replacing all hardcoded thresholds and rules.
 *
 * Fallback: Claude API (Anthropic) when Gemini is unavailable
 *
 * Features:
 * 1. Medication Adherence Prediction - AI-driven risk assessment
 * 2. Caregiver Burnout Detection - Predictive burnout trajectory
 * 3. Medication Refill Prediction - Smart supply forecasting
 * 4. Trend Change Detection - Adaptive threshold detection
 * 5. Alert System Intelligence - Context-aware alert prioritization
 *
 * All analyses use deep reasoning via thinking mode for complex pattern recognition.
 */

import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';

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

/**
 * Call Claude API as fallback
 */
async function callClaudeAPI(
  prompt: string,
  temperature: number = 0.7,
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
      model: 'claude-opus-4-5-20251101',
      max_tokens: maxTokens,
      temperature,
      messages: [{
        role: 'user',
        content: prompt
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API request failed: ${response.status}`);
  }

  const result: ClaudeResponse = await response.json();
  const textContent = result.content.find(c => c.type === 'text');
  return textContent?.text || '';
}

/**
 * Call Gemini API with thinking mode enabled for deep reasoning
 * Falls back to Claude API if Gemini fails
 */
async function callGeminiWithThinking(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 2048
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
              text: prompt
            }]
          }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            thinking_config: {
              include_thoughts: true // Enable deep reasoning for complex analytics
            }
          },
        }),
      });

      if (response.ok) {
        const result: GeminiResponse = await response.json();
        const text = result.candidates[0]?.content?.parts[0]?.text;
        if (text) {
          console.log('[AI Analytics] Using Gemini API');
          return text;
        }
      } else {
        const errorText = await response.text();
        console.warn('Gemini API error, will try Claude fallback:', errorText);
      }
    } catch (error) {
      console.warn('Gemini API failed, will try Claude fallback:', error);
    }
  }

  // Fallback to Claude
  if (claudeKey) {
    console.log('[AI Analytics] Falling back to Claude API');
    return callClaudeAPI(prompt, temperature, maxTokens);
  }

  throw new Error('No AI API keys configured (GEMINI_API_KEY or ANTHROPIC_API_KEY)');
}

/**
 * Parse JSON from Gemini response (handles markdown code blocks)
 */
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

// ============================================================================
// 1. AI-DRIVEN MEDICATION ADHERENCE PREDICTION
// ============================================================================

export interface AIAdherencePrediction {
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;
  confidence: number;
  predictedMissedDoses7Days: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  patterns: {
    timeOfDay: { problematicTimes: string[]; insight: string };
    dayOfWeek: { problematicDays: string[]; insight: string };
    medicationSpecific: { medications: string[]; insight: string };
  };
  personalizedThresholds: {
    excellentRate: number;
    goodRate: number;
    concernRate: number;
    criticalRate: number;
    reasoning: string;
  };
  interventions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }>;
  reasoning: string;
}

export async function analyzeAdherenceWithAI(
  data: {
    elderName: string;
    elderAge: number;
    medicalConditions?: string[];
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      isCritical: boolean;
    }>;
    logs: Array<{
      medicationName: string;
      scheduledTime: Date;
      status: 'taken' | 'missed' | 'skipped';
      dayOfWeek: string;
      hour: number;
    }>;
    historicalAdherence: number;
    daysSinceStart: number;
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<AIAdherencePrediction> {
  // HIPAA Audit
  await logPHIThirdPartyDisclosure({
    userId,
    userRole,
    groupId,
    elderId,
    serviceName: 'Google Gemini AI',
    serviceType: 'adherence_prediction',
    dataShared: ['medication_logs', 'medication_list', 'elder_age', 'medical_conditions'],
    purpose: 'AI-driven medication adherence prediction and personalized threshold calculation',
  });

  const prompt = `You are an expert healthcare analytics AI. Analyze this medication adherence data and provide intelligent, personalized predictions.

PATIENT CONTEXT:
- Name: ${data.elderName}
- Age: ${data.elderAge}
- Medical Conditions: ${data.medicalConditions?.join(', ') || 'Not specified'}
- Days of tracking data: ${data.daysSinceStart}

MEDICATIONS:
${data.medications.map(m => `- ${m.name} (${m.dosage}, ${m.frequency})${m.isCritical ? ' [CRITICAL]' : ''}`).join('\n')}

COMPLIANCE LOGS (Last 30 days):
${JSON.stringify(data.logs.slice(0, 100), null, 2)}

Historical Adherence Rate: ${data.historicalAdherence}%

ANALYSIS REQUIREMENTS:
1. Calculate a PERSONALIZED risk score (0-100) based on this specific patient's patterns, NOT generic thresholds
2. Identify time-of-day patterns (when are doses most often missed?)
3. Identify day-of-week patterns (which days have lower compliance?)
4. Determine personalized compliance thresholds for THIS patient based on their baseline and trajectory
5. Predict missed doses in the next 7 days based on patterns
6. Suggest targeted interventions ranked by expected impact

IMPORTANT: Do NOT use generic 90/75/50 thresholds. Calculate thresholds based on:
- Patient's baseline adherence
- Variance in their compliance
- Medical criticality of their medications
- Age-related factors
- Trend trajectory

Return a JSON object with this exact structure:
{
  "riskLevel": "low|moderate|high|critical",
  "riskScore": <0-100>,
  "confidence": <0-100>,
  "predictedMissedDoses7Days": <number>,
  "trendDirection": "improving|stable|declining",
  "patterns": {
    "timeOfDay": {
      "problematicTimes": ["HH:MM", ...],
      "insight": "explanation of time patterns"
    },
    "dayOfWeek": {
      "problematicDays": ["Monday", ...],
      "insight": "explanation of day patterns"
    },
    "medicationSpecific": {
      "medications": ["med names with issues"],
      "insight": "medication-specific patterns"
    }
  },
  "personalizedThresholds": {
    "excellentRate": <percentage>,
    "goodRate": <percentage>,
    "concernRate": <percentage>,
    "criticalRate": <percentage>,
    "reasoning": "why these thresholds for this patient"
  },
  "interventions": [
    {
      "type": "reminder|schedule_change|caregiver_support|medication_review",
      "description": "specific action",
      "priority": "high|medium|low",
      "expectedImpact": "expected improvement"
    }
  ],
  "reasoning": "detailed explanation of analysis"
}`;

  try {
    const response = await callGeminiWithThinking(prompt, 0.4, 2048);
    return parseJsonFromResponse(response);
  } catch (error) {
    console.error('AI adherence analysis failed:', error);
    // Return intelligent fallback based on data
    const missedCount = data.logs.filter(l => l.status === 'missed').length;
    const totalCount = data.logs.length;
    const missRate = totalCount > 0 ? (missedCount / totalCount) * 100 : 0;

    return {
      riskLevel: missRate > 40 ? 'critical' : missRate > 25 ? 'high' : missRate > 15 ? 'moderate' : 'low',
      riskScore: Math.min(100, Math.round(missRate * 2)),
      confidence: 60,
      predictedMissedDoses7Days: Math.round((missRate / 100) * 14),
      trendDirection: 'stable',
      patterns: {
        timeOfDay: { problematicTimes: [], insight: 'Analysis pending' },
        dayOfWeek: { problematicDays: [], insight: 'Analysis pending' },
        medicationSpecific: { medications: [], insight: 'Analysis pending' },
      },
      personalizedThresholds: {
        excellentRate: 95,
        goodRate: 85,
        concernRate: 70,
        criticalRate: 50,
        reasoning: 'Default thresholds - AI analysis unavailable',
      },
      interventions: [],
      reasoning: 'Fallback analysis due to AI service unavailability',
    };
  }
}

// ============================================================================
// 2. AI-DRIVEN CAREGIVER BURNOUT DETECTION
// ============================================================================

export interface AIBurnoutPrediction {
  burnoutRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;
  trajectory: 'improving' | 'stable' | 'worsening';
  predictedDaysToHighRisk: number | null;
  factors: Array<{
    type: string;
    severity: 'low' | 'moderate' | 'high';
    description: string;
    contribution: number;
    trend: 'improving' | 'stable' | 'worsening';
  }>;
  personalizedThresholds: {
    lowRisk: number;
    moderateRisk: number;
    highRisk: number;
    criticalRisk: number;
    reasoning: string;
  };
  interventions: Array<{
    type: string;
    description: string;
    urgency: 'immediate' | 'soon' | 'scheduled';
    expectedBenefit: string;
  }>;
  workloadAnalysis: {
    sustainabilityScore: number;
    optimalHoursPerWeek: number;
    currentHoursPerWeek: number;
    insight: string;
  };
  reasoning: string;
}

export async function analyzeBurnoutWithAI(
  data: {
    caregiverId: string;
    caregiverName?: string;
    periodDays: number;
    shifts: Array<{
      date: Date;
      startTime: Date;
      endTime: Date;
      elderId: string;
      elderName: string;
      hoursWorked: number;
    }>;
    totalHoursWorked: number;
    overtimeHours: number;
    consecutiveDaysWorked: number;
    uniqueEldersCount: number;
    averageShiftLength: number;
    previousPeriodData?: {
      totalHours: number;
      overtimeHours: number;
      burnoutScore: number;
    };
  },
  userId: string,
  userRole: UserRole,
  groupId: string
): Promise<AIBurnoutPrediction> {
  // HIPAA Audit
  await logPHIThirdPartyDisclosure({
    userId,
    userRole,
    groupId,
    elderId: 'agency-level',
    serviceName: 'Google Gemini AI',
    serviceType: 'burnout_prediction',
    dataShared: ['shift_data', 'work_hours', 'elder_assignments'],
    purpose: 'AI-driven caregiver burnout prediction and intervention recommendations',
  });

  const prompt = `You are an expert occupational health AI specializing in caregiver wellness. Analyze this caregiver's workload data and predict burnout risk.

CAREGIVER WORKLOAD DATA (Last ${data.periodDays} days):
- Total Hours Worked: ${data.totalHoursWorked}
- Overtime Hours: ${data.overtimeHours}
- Consecutive Days Worked: ${data.consecutiveDaysWorked}
- Number of Elders Cared For: ${data.uniqueEldersCount}
- Average Shift Length: ${data.averageShiftLength.toFixed(1)} hours

SHIFT BREAKDOWN:
${data.shifts.slice(0, 20).map(s => `- ${new Date(s.date).toLocaleDateString()}: ${s.hoursWorked}h caring for ${s.elderName}`).join('\n')}

${data.previousPeriodData ? `
PREVIOUS PERIOD COMPARISON:
- Previous Total Hours: ${data.previousPeriodData.totalHours}
- Previous Overtime: ${data.previousPeriodData.overtimeHours}
- Previous Burnout Score: ${data.previousPeriodData.burnoutScore}
` : ''}

ANALYSIS REQUIREMENTS:
1. Calculate a PERSONALIZED burnout risk score (0-100) based on this caregiver's specific workload patterns
2. Do NOT use generic 30/50/70 thresholds - calculate based on workload sustainability
3. Predict trajectory - is burnout risk increasing or decreasing?
4. Identify specific contributing factors with individual severity
5. Calculate optimal vs actual workload hours
6. Suggest interventions prioritized by urgency

IMPORTANT CONSIDERATIONS:
- Industry standard sustainable hours: 35-40/week for caregivers
- Overtime beyond 10h/week significantly increases burnout risk
- 6+ consecutive days without rest is a major red flag
- Managing 3+ elders simultaneously increases cognitive load
- Long shifts (10+ hours) compound fatigue

Return a JSON object with this exact structure:
{
  "burnoutRisk": "low|moderate|high|critical",
  "riskScore": <0-100>,
  "trajectory": "improving|stable|worsening",
  "predictedDaysToHighRisk": <number or null if not at risk>,
  "factors": [
    {
      "type": "overtime|consecutive_days|elder_count|shift_length|workload_increase",
      "severity": "low|moderate|high",
      "description": "specific description",
      "contribution": <0-40 points>,
      "trend": "improving|stable|worsening"
    }
  ],
  "personalizedThresholds": {
    "lowRisk": <max score for low>,
    "moderateRisk": <max score for moderate>,
    "highRisk": <max score for high>,
    "criticalRisk": <min score for critical>,
    "reasoning": "why these thresholds"
  },
  "interventions": [
    {
      "type": "schedule_adjustment|mandatory_rest|workload_redistribution|wellness_check",
      "description": "specific action",
      "urgency": "immediate|soon|scheduled",
      "expectedBenefit": "expected improvement"
    }
  ],
  "workloadAnalysis": {
    "sustainabilityScore": <0-100>,
    "optimalHoursPerWeek": <number>,
    "currentHoursPerWeek": <number>,
    "insight": "workload sustainability analysis"
  },
  "reasoning": "detailed explanation"
}`;

  try {
    const response = await callGeminiWithThinking(prompt, 0.3, 2048);
    return parseJsonFromResponse(response);
  } catch (error) {
    console.error('AI burnout analysis failed:', error);
    // Intelligent fallback
    const weeklyHours = (data.totalHoursWorked / data.periodDays) * 7;
    const overtimeRatio = data.overtimeHours / Math.max(data.totalHoursWorked, 1);

    let riskScore = 0;
    riskScore += Math.min(30, overtimeRatio * 60);
    riskScore += Math.min(25, (data.consecutiveDaysWorked - 5) * 8);
    riskScore += Math.min(20, (data.uniqueEldersCount - 2) * 10);
    riskScore += Math.min(25, Math.max(0, data.averageShiftLength - 8) * 8);

    return {
      burnoutRisk: riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'moderate' : 'low',
      riskScore: Math.round(riskScore),
      trajectory: 'stable',
      predictedDaysToHighRisk: riskScore < 50 ? null : 14,
      factors: [],
      personalizedThresholds: {
        lowRisk: 29,
        moderateRisk: 49,
        highRisk: 69,
        criticalRisk: 70,
        reasoning: 'Default thresholds - AI analysis unavailable',
      },
      interventions: [],
      workloadAnalysis: {
        sustainabilityScore: Math.max(0, 100 - riskScore),
        optimalHoursPerWeek: 40,
        currentHoursPerWeek: weeklyHours,
        insight: 'Fallback analysis',
      },
      reasoning: 'Fallback analysis due to AI service unavailability',
    };
  }
}

// ============================================================================
// 3. AI-DRIVEN MEDICATION REFILL PREDICTION
// ============================================================================

export interface AIRefillPrediction {
  medicationId: string;
  medicationName: string;
  predictedRunOutDate: Date;
  daysRemaining: number;
  confidence: number;
  shouldAlert: boolean;
  alertPriority: 'low' | 'medium' | 'high' | 'urgent';
  usagePattern: {
    dailyUsageRate: number;
    usageVariability: 'consistent' | 'moderate' | 'highly_variable';
    trend: 'increasing' | 'stable' | 'decreasing';
    insight: string;
  };
  personalizedAlertTiming: {
    daysBeforeRunOut: number;
    reasoning: string;
  };
  refillRecommendation: {
    suggestedQuantity: number;
    reasoning: string;
  };
}

export async function analyzeRefillNeedsWithAI(
  data: {
    medication: {
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      currentQuantity: number;
      isCritical: boolean;
      lastRefillDate?: Date;
      lastRefillQuantity?: number;
    };
    logs: Array<{
      date: Date;
      status: 'taken' | 'missed' | 'skipped';
    }>;
    elderName: string;
    elderAge: number;
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<AIRefillPrediction> {
  // HIPAA Audit
  await logPHIThirdPartyDisclosure({
    userId,
    userRole,
    groupId,
    elderId,
    serviceName: 'Google Gemini AI',
    serviceType: 'refill_prediction',
    dataShared: ['medication_info', 'usage_logs', 'supply_data'],
    purpose: 'AI-driven medication refill prediction and supply management',
  });

  const prompt = `You are a pharmacy analytics AI. Predict medication refill needs based on usage patterns.

MEDICATION:
- Name: ${data.medication.name}
- Dosage: ${data.medication.dosage}
- Frequency: ${data.medication.frequency}
- Current Quantity: ${data.medication.currentQuantity} units
- Critical Medication: ${data.medication.isCritical ? 'YES' : 'No'}
${data.medication.lastRefillDate ? `- Last Refill: ${new Date(data.medication.lastRefillDate).toLocaleDateString()} (${data.medication.lastRefillQuantity} units)` : ''}

PATIENT:
- Name: ${data.elderName}
- Age: ${data.elderAge}

USAGE LOGS (Last 60 days):
${JSON.stringify(data.logs.slice(0, 60), null, 2)}

ANALYSIS REQUIREMENTS:
1. Calculate actual daily usage rate (accounting for missed/skipped doses)
2. Predict exact run-out date based on patterns, NOT just simple division
3. Determine usage variability (some patients are consistent, others vary)
4. Calculate personalized alert timing (critical meds need more lead time)
5. Suggest optimal refill quantity based on usage patterns

IMPORTANT:
- Do NOT assume all doses are taken - use actual usage data
- Critical medications need 7-14 day buffer; non-critical need 3-7 days
- Account for weekends/holidays when pharmacies may be closed
- Consider if patient tends to skip doses (affects quantity needed)

Return a JSON object with this structure:
{
  "medicationId": "${data.medication.id}",
  "medicationName": "${data.medication.name}",
  "predictedRunOutDate": "YYYY-MM-DD",
  "daysRemaining": <number>,
  "confidence": <0-100>,
  "shouldAlert": true|false,
  "alertPriority": "low|medium|high|urgent",
  "usagePattern": {
    "dailyUsageRate": <number>,
    "usageVariability": "consistent|moderate|highly_variable",
    "trend": "increasing|stable|decreasing",
    "insight": "explanation of usage patterns"
  },
  "personalizedAlertTiming": {
    "daysBeforeRunOut": <number>,
    "reasoning": "why this timing"
  },
  "refillRecommendation": {
    "suggestedQuantity": <number>,
    "reasoning": "why this quantity"
  }
}`;

  try {
    const response = await callGeminiWithThinking(prompt, 0.3, 1536);
    const result = parseJsonFromResponse(response);
    result.predictedRunOutDate = new Date(result.predictedRunOutDate);
    return result;
  } catch (error) {
    console.error('AI refill analysis failed:', error);
    // Intelligent fallback
    const takenCount = data.logs.filter(l => l.status === 'taken').length;
    const daysCovered = data.logs.length > 0 ?
      Math.ceil((new Date().getTime() - new Date(data.logs[data.logs.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)) : 30;
    const dailyUsage = daysCovered > 0 ? takenCount / daysCovered : 1;
    const daysRemaining = dailyUsage > 0 ? Math.floor(data.medication.currentQuantity / dailyUsage) : 30;
    const runOutDate = new Date();
    runOutDate.setDate(runOutDate.getDate() + daysRemaining);

    return {
      medicationId: data.medication.id,
      medicationName: data.medication.name,
      predictedRunOutDate: runOutDate,
      daysRemaining,
      confidence: 60,
      shouldAlert: daysRemaining <= (data.medication.isCritical ? 10 : 5),
      alertPriority: daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'high' : 'medium',
      usagePattern: {
        dailyUsageRate: dailyUsage,
        usageVariability: 'moderate',
        trend: 'stable',
        insight: 'Fallback calculation',
      },
      personalizedAlertTiming: {
        daysBeforeRunOut: data.medication.isCritical ? 10 : 5,
        reasoning: 'Default timing based on medication criticality',
      },
      refillRecommendation: {
        suggestedQuantity: Math.ceil(dailyUsage * 30),
        reasoning: '30-day supply based on average usage',
      },
    };
  }
}

// ============================================================================
// 4. AI-DRIVEN TREND CHANGE DETECTION
// ============================================================================

export interface AITrendAnalysis {
  significantChanges: Array<{
    metric: 'compliance' | 'diet' | 'missed_doses' | 'activity';
    weekLabel: string;
    changePercent: number;
    direction: 'up' | 'down';
    significance: 'minor' | 'notable' | 'significant' | 'critical';
    context: string;
    actionRequired: boolean;
  }>;
  personalizedThresholds: {
    complianceChangeThreshold: number;
    dietChangeThreshold: number;
    missedDoseThreshold: number;
    reasoning: string;
  };
  overallTrend: {
    direction: 'improving' | 'stable' | 'declining';
    confidence: number;
    summary: string;
  };
  predictions: {
    nextWeekCompliance: number;
    riskFactors: string[];
  };
  recommendations: string[];
}

export async function analyzeTrendsWithAI(
  data: {
    elderName: string;
    weeks: Array<{
      weekLabel: string;
      weekStart: Date;
      complianceRate: number;
      missedDoses: number;
      totalDoses: number;
      dietEntries: number;
    }>;
    medicalConditions?: string[];
    medications: Array<{ name: string; isCritical: boolean }>;
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<AITrendAnalysis> {
  // HIPAA Audit
  await logPHIThirdPartyDisclosure({
    userId,
    userRole,
    groupId,
    elderId,
    serviceName: 'Google Gemini AI',
    serviceType: 'trend_analysis',
    dataShared: ['weekly_compliance_data', 'diet_data', 'medication_list'],
    purpose: 'AI-driven health trend analysis and change detection',
  });

  const prompt = `You are a healthcare analytics AI specializing in trend detection. Analyze this patient's weekly health data.

PATIENT:
- Name: ${data.elderName}
- Medical Conditions: ${data.medicalConditions?.join(', ') || 'Not specified'}
- Critical Medications: ${data.medications.filter(m => m.isCritical).map(m => m.name).join(', ') || 'None'}

WEEKLY DATA (oldest to newest):
${data.weeks.map(w => `${w.weekLabel}: Compliance ${w.complianceRate.toFixed(1)}%, Missed ${w.missedDoses}/${w.totalDoses} doses, Diet entries: ${w.dietEntries}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Identify SIGNIFICANT changes - do NOT flag minor fluctuations
2. Calculate PERSONALIZED thresholds based on this patient's normal variance
3. A patient with normally 95% compliance dropping to 85% is MORE significant than 75% to 65%
4. Consider the context of medical conditions when evaluating changes
5. Predict next week's compliance based on patterns
6. Provide actionable recommendations

IMPORTANT:
- Do NOT use a generic 15% threshold for everyone
- Calculate what's "significant" for THIS patient based on their baseline variance
- A stable patient with sudden change needs different attention than a variable patient
- Critical medications make compliance drops more urgent

Return a JSON object with this structure:
{
  "significantChanges": [
    {
      "metric": "compliance|diet|missed_doses|activity",
      "weekLabel": "Week X",
      "changePercent": <number>,
      "direction": "up|down",
      "significance": "minor|notable|significant|critical",
      "context": "explanation of why this matters",
      "actionRequired": true|false
    }
  ],
  "personalizedThresholds": {
    "complianceChangeThreshold": <percentage that's significant for THIS patient>,
    "dietChangeThreshold": <percentage>,
    "missedDoseThreshold": <absolute number>,
    "reasoning": "why these thresholds for this patient"
  },
  "overallTrend": {
    "direction": "improving|stable|declining",
    "confidence": <0-100>,
    "summary": "1-2 sentence summary"
  },
  "predictions": {
    "nextWeekCompliance": <predicted percentage>,
    "riskFactors": ["factors that might affect compliance"]
  },
  "recommendations": ["specific actionable recommendations"]
}`;

  try {
    const response = await callGeminiWithThinking(prompt, 0.4, 2048);
    return parseJsonFromResponse(response);
  } catch (error) {
    console.error('AI trend analysis failed:', error);
    // Fallback analysis
    const changes: AITrendAnalysis['significantChanges'] = [];

    for (let i = 1; i < data.weeks.length; i++) {
      const prev = data.weeks[i - 1];
      const curr = data.weeks[i];
      const complianceChange = curr.complianceRate - prev.complianceRate;

      if (Math.abs(complianceChange) >= 15) {
        changes.push({
          metric: 'compliance',
          weekLabel: curr.weekLabel,
          changePercent: Math.abs(complianceChange),
          direction: complianceChange > 0 ? 'up' : 'down',
          significance: Math.abs(complianceChange) >= 25 ? 'significant' : 'notable',
          context: 'Compliance change detected',
          actionRequired: complianceChange < -20,
        });
      }
    }

    const avgCompliance = data.weeks.reduce((sum, w) => sum + w.complianceRate, 0) / data.weeks.length;
    const lastWeek = data.weeks[data.weeks.length - 1];

    return {
      significantChanges: changes,
      personalizedThresholds: {
        complianceChangeThreshold: 15,
        dietChangeThreshold: 20,
        missedDoseThreshold: 3,
        reasoning: 'Default thresholds - AI analysis unavailable',
      },
      overallTrend: {
        direction: lastWeek.complianceRate > avgCompliance ? 'improving' : lastWeek.complianceRate < avgCompliance ? 'declining' : 'stable',
        confidence: 60,
        summary: 'Fallback trend analysis',
      },
      predictions: {
        nextWeekCompliance: lastWeek.complianceRate,
        riskFactors: [],
      },
      recommendations: [],
    };
  }
}

// ============================================================================
// 5. AI-DRIVEN ALERT SYSTEM INTELLIGENCE
// ============================================================================

export interface AIAlertPrioritization {
  alerts: Array<{
    alertId: string;
    originalSeverity: string;
    aiAdjustedSeverity: 'low' | 'medium' | 'high' | 'critical';
    priorityScore: number;
    reasoning: string;
    suggestedAction: string;
    shouldGroup: boolean;
    groupKey?: string;
  }>;
  groupedAlerts: Array<{
    groupKey: string;
    title: string;
    alertIds: string[];
    combinedSeverity: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
  }>;
  suppressedAlerts: Array<{
    alertId: string;
    reason: string;
  }>;
  overallRiskAssessment: {
    level: 'normal' | 'elevated' | 'high' | 'critical';
    summary: string;
    topConcerns: string[];
  };
}

export async function prioritizeAlertsWithAI(
  data: {
    elderName: string;
    elderAge: number;
    medicalConditions?: string[];
    alerts: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      message: string;
      createdAt: Date;
      data?: any;
    }>;
    recentAlertHistory: Array<{
      type: string;
      createdAt: Date;
      wasActioned: boolean;
      wasDismissed: boolean;
    }>;
    userPreferences?: {
      alertFrequency: 'all' | 'important' | 'critical_only';
      quietHours?: { start: string; end: string };
    };
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<AIAlertPrioritization> {
  // HIPAA Audit
  await logPHIThirdPartyDisclosure({
    userId,
    userRole,
    groupId,
    elderId,
    serviceName: 'Google Gemini AI',
    serviceType: 'alert_prioritization',
    dataShared: ['alert_data', 'alert_history', 'medical_conditions'],
    purpose: 'AI-driven alert prioritization and fatigue reduction',
  });

  const prompt = `You are an intelligent alert management AI for healthcare. Prioritize and optimize alerts to reduce alert fatigue while ensuring critical issues are highlighted.

PATIENT CONTEXT:
- Name: ${data.elderName}
- Age: ${data.elderAge}
- Medical Conditions: ${data.medicalConditions?.join(', ') || 'Not specified'}

CURRENT ALERTS TO PRIORITIZE:
${data.alerts.map(a => `- [${a.id}] ${a.type} (${a.severity}): ${a.title} - ${a.message}`).join('\n')}

RECENT ALERT HISTORY (Last 7 days):
${data.recentAlertHistory.slice(0, 20).map(a => `- ${a.type}: ${a.wasActioned ? 'Actioned' : a.wasDismissed ? 'Dismissed' : 'Ignored'}`).join('\n')}

USER PREFERENCES:
- Alert Frequency: ${data.userPreferences?.alertFrequency || 'all'}
${data.userPreferences?.quietHours ? `- Quiet Hours: ${data.userPreferences.quietHours.start} - ${data.userPreferences.quietHours.end}` : ''}

ANALYSIS REQUIREMENTS:
1. Re-prioritize alerts based on actual clinical significance, not just original severity
2. Group related alerts (e.g., multiple missed doses for same medication)
3. Identify alerts that can be suppressed (duplicates, already resolved, low value)
4. Consider alert history - if user consistently dismisses a type, lower its priority
5. Provide overall risk assessment

IMPORTANT:
- Medical conditions affect alert priority (diabetic + missed meal is more critical)
- Repeated same alerts indicate alert fatigue - consider grouping
- User who dismisses alerts may need different alert strategy
- Some "warning" alerts may be more critical than they appear

Return a JSON object with this structure:
{
  "alerts": [
    {
      "alertId": "id",
      "originalSeverity": "original",
      "aiAdjustedSeverity": "low|medium|high|critical",
      "priorityScore": <1-100>,
      "reasoning": "why this priority",
      "suggestedAction": "recommended action",
      "shouldGroup": true|false,
      "groupKey": "group identifier if should group"
    }
  ],
  "groupedAlerts": [
    {
      "groupKey": "key",
      "title": "grouped alert title",
      "alertIds": ["id1", "id2"],
      "combinedSeverity": "severity",
      "summary": "combined summary"
    }
  ],
  "suppressedAlerts": [
    {
      "alertId": "id",
      "reason": "why suppressed"
    }
  ],
  "overallRiskAssessment": {
    "level": "normal|elevated|high|critical",
    "summary": "overall risk summary",
    "topConcerns": ["top concern 1", "top concern 2"]
  }
}`;

  try {
    const response = await callGeminiWithThinking(prompt, 0.3, 2048);
    return parseJsonFromResponse(response);
  } catch (error) {
    console.error('AI alert prioritization failed:', error);
    // Fallback - return alerts with basic prioritization
    return {
      alerts: data.alerts.map((a, i) => ({
        alertId: a.id,
        originalSeverity: a.severity,
        aiAdjustedSeverity: a.severity as 'low' | 'medium' | 'high' | 'critical',
        priorityScore: a.severity === 'critical' ? 90 : a.severity === 'high' ? 70 : a.severity === 'medium' ? 50 : 30,
        reasoning: 'Original severity maintained',
        suggestedAction: 'Review alert',
        shouldGroup: false,
      })),
      groupedAlerts: [],
      suppressedAlerts: [],
      overallRiskAssessment: {
        level: data.alerts.some(a => a.severity === 'critical') ? 'critical' :
               data.alerts.some(a => a.severity === 'high') ? 'high' : 'normal',
        summary: 'Fallback assessment - AI unavailable',
        topConcerns: data.alerts.filter(a => a.severity === 'critical' || a.severity === 'high').map(a => a.title),
      },
    };
  }
}

// ============================================================================
// 6. AI-DRIVEN COMPLIANCE STATUS (Replaces hardcoded getComplianceStatus)
// ============================================================================

export interface AIComplianceStatus {
  label: string;
  variant: 'default' | 'destructive' | 'secondary';
  color: string;
  insight: string;
  personalizedMessage: string;
}

export async function getAIComplianceStatus(
  data: {
    percentage: number;
    elderName: string;
    elderAge: number;
    medicalConditions?: string[];
    hasCriticalMedications: boolean;
    historicalAverage: number;
    recentTrend: 'improving' | 'stable' | 'declining';
  },
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<AIComplianceStatus> {
  // For quick status checks, use a lighter prompt without full audit
  const prompt = `Evaluate medication compliance status for ${data.elderName} (age ${data.elderAge}).

Current Compliance: ${data.percentage}%
Historical Average: ${data.historicalAverage}%
Trend: ${data.recentTrend}
Has Critical Medications: ${data.hasCriticalMedications}
Medical Conditions: ${data.medicalConditions?.join(', ') || 'None specified'}

Provide a PERSONALIZED status assessment. Do NOT use generic 90/75/50 thresholds.

Consider:
- If patient has critical medications, higher compliance is more important
- Compare to their historical average, not generic benchmarks
- Declining trend is concerning even at good absolute numbers

Return JSON:
{
  "label": "Excellent|Good|Fair|Needs Attention|Critical",
  "variant": "default|secondary|destructive",
  "color": "green|blue|yellow|orange|red",
  "insight": "brief clinical insight",
  "personalizedMessage": "personalized message for caregiver"
}`;

  try {
    // Use the unified call function which handles Gemini -> Claude fallback
    const response = await callGeminiWithThinking(prompt, 0.3, 512);
    return parseJsonFromResponse(response);
  } catch (error) {
    // Intelligent fallback based on context when both AI services fail
    console.warn('AI compliance status failed, using intelligent fallback:', error);
    const isUnderPerforming = data.percentage < data.historicalAverage - 10;
    const isCritical = data.hasCriticalMedications && data.percentage < 80;

    if (isCritical || data.percentage < 50) {
      return {
        label: 'Critical',
        variant: 'destructive',
        color: 'red',
        insight: 'Immediate attention required',
        personalizedMessage: `${data.elderName}'s compliance needs immediate attention.`,
      };
    } else if (isUnderPerforming || data.percentage < 70) {
      return {
        label: 'Needs Attention',
        variant: 'secondary',
        color: 'yellow',
        insight: 'Below historical average',
        personalizedMessage: `${data.elderName}'s compliance is below their usual level.`,
      };
    } else if (data.percentage >= 90) {
      return {
        label: 'Excellent',
        variant: 'default',
        color: 'green',
        insight: 'Strong compliance',
        personalizedMessage: `${data.elderName} is doing great with medications!`,
      };
    } else {
      return {
        label: 'Good',
        variant: 'default',
        color: 'blue',
        insight: 'Acceptable compliance',
        personalizedMessage: `${data.elderName}'s compliance is on track.`,
      };
    }
  }
}
