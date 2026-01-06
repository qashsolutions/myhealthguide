/**
 * Personalized Smart Prompting
 *
 * Generates personalized system prompts based on learned user preferences.
 * Injects verbosity, terminology, and focus area preferences into prompts.
 */

import { getUserPreferences, maybeLearnPreferences } from '@/lib/engagement/preferenceLearner';
import { getEffectivePreferences } from '@/types/engagement';
import type { UserSmartPreferences, VerbosityLevel, TerminologyLevel } from '@/types/engagement';

/**
 * Personalization instructions for different verbosity levels
 */
const VERBOSITY_INSTRUCTIONS: Record<VerbosityLevel, string> = {
  concise: `Response Style: Be concise and direct.
- Use 1-3 short sentences per point
- Get straight to the answer
- Avoid unnecessary explanations
- Use bullet points for lists
- Skip preambles and conclusions`,

  balanced: `Response Style: Provide balanced, clear responses.
- Give enough context without over-explaining
- Use a natural conversational tone
- Include relevant details when helpful
- Structure longer answers with clear sections`,

  detailed: `Response Style: Provide comprehensive, detailed responses.
- Include relevant background information
- Explain the reasoning behind suggestions
- Provide examples when helpful
- Cover related considerations
- Offer follow-up suggestions when appropriate`,
};

/**
 * Personalization instructions for different terminology levels
 */
const TERMINOLOGY_INSTRUCTIONS: Record<TerminologyLevel, string> = {
  simple: `Language Level: Use simple, everyday language.
- Avoid medical jargon and technical terms
- Explain concepts in plain words
- Use analogies when helpful
- If you must use a technical term, define it immediately
- Assume no medical background`,

  moderate: `Language Level: Use accessible language with some medical context.
- Use common medical terms that caregivers typically know
- Briefly explain less common terms
- Balance precision with accessibility
- Assume basic familiarity with medications and care terms`,

  clinical: `Language Level: Use precise clinical terminology.
- Use proper medical terminology
- Include relevant clinical details
- Reference medications by generic and brand names
- Assume familiarity with healthcare concepts
- Be precise with dosing and scheduling terms`,
};

/**
 * Focus area prompts to emphasize certain topics
 */
const FOCUS_AREA_INSTRUCTIONS: Record<string, string> = {
  medications: 'Pay special attention to medication-related queries, dosing schedules, and drug interactions.',
  nutrition: 'Emphasize dietary considerations, meal timing, and nutritional needs.',
  activity: 'Focus on activity levels, mobility concerns, and exercise recommendations.',
  safety: 'Prioritize safety alerts, fall prevention, and risk factors.',
  adherence: 'Emphasize medication adherence, schedule compliance, and reminder strategies.',
  cognitive: 'Be attentive to cognitive health indicators and memory-related concerns.',
  care: 'Focus on daily care routines, comfort, and quality of life.',
  scheduling: 'Help with scheduling, reminders, and care coordination.',
  symptoms: 'Pay close attention to symptom descriptions, provide thorough possible causes, and emphasize when to seek medical care.',
};

/**
 * Generate personalized prompt additions based on user preferences
 */
export async function getPersonalizedPromptAdditions(userId: string): Promise<string> {
  // Trigger learning if needed
  const preferences = await maybeLearnPreferences(userId);
  const effective = getEffectivePreferences(preferences);

  const sections: string[] = [];

  // Add verbosity instruction if confidence is sufficient
  if (preferences.verbosityConfidence > 0.6 || preferences.manualOverride) {
    sections.push(VERBOSITY_INSTRUCTIONS[effective.verbosity]);
  }

  // Add terminology instruction if confidence is sufficient
  if (preferences.terminologyConfidence > 0.6 || preferences.manualOverride) {
    sections.push(TERMINOLOGY_INSTRUCTIONS[effective.terminology]);
  }

  // Add focus area instructions
  if (effective.focusAreas.length > 0 && (preferences.focusAreasConfidence > 0.6 || preferences.manualOverride)) {
    const focusInstructions = effective.focusAreas
      .map(area => FOCUS_AREA_INSTRUCTIONS[area])
      .filter(Boolean)
      .join('\n');

    if (focusInstructions) {
      sections.push(`User Focus Areas:\n${focusInstructions}`);
    }
  }

  if (sections.length === 0) {
    return ''; // No personalization yet
  }

  return `\n--- User Personalization ---\n${sections.join('\n\n')}\n--- End Personalization ---\n`;
}

/**
 * Generate a complete personalized system prompt
 */
export async function generatePersonalizedSystemPrompt(
  userId: string,
  basePrompt: string
): Promise<string> {
  const personalization = await getPersonalizedPromptAdditions(userId);

  if (!personalization) {
    return basePrompt;
  }

  // Insert personalization before the guidelines section
  // This ensures it's processed but doesn't override core instructions
  return `${basePrompt}\n${personalization}`;
}

/**
 * Get a summary of current personalization for display
 */
export async function getPersonalizationSummary(userId: string): Promise<{
  verbosity: { value: VerbosityLevel; source: 'learned' | 'manual' | 'default'; confidence: number };
  terminology: { value: TerminologyLevel; source: 'learned' | 'manual' | 'default'; confidence: number };
  focusAreas: { value: string[]; source: 'learned' | 'manual' | 'default'; confidence: number };
  isLearning: boolean;
  dataPoints: number;
}> {
  const preferences = await getUserPreferences(userId);
  const effective = getEffectivePreferences(preferences);

  const getSource = (manualValue: any, confidence: number): 'learned' | 'manual' | 'default' => {
    if (preferences.manualOverride && manualValue !== undefined) {
      return 'manual';
    }
    if (confidence > 0.6) {
      return 'learned';
    }
    return 'default';
  };

  return {
    verbosity: {
      value: effective.verbosity,
      source: getSource(preferences.manualVerbosity, preferences.verbosityConfidence),
      confidence: preferences.manualOverride ? 1 : preferences.verbosityConfidence,
    },
    terminology: {
      value: effective.terminology,
      source: getSource(preferences.manualTerminology, preferences.terminologyConfidence),
      confidence: preferences.manualOverride ? 1 : preferences.terminologyConfidence,
    },
    focusAreas: {
      value: effective.focusAreas,
      source: getSource(preferences.manualFocusAreas, preferences.focusAreasConfidence),
      confidence: preferences.manualOverride ? 1 : preferences.focusAreasConfidence,
    },
    isLearning: preferences.feedbackAnalyzed < 5 || preferences.engagementEventsAnalyzed < 10,
    dataPoints: preferences.feedbackAnalyzed + preferences.engagementEventsAnalyzed,
  };
}

/**
 * Format personalization for display in UI
 */
export function formatPersonalizationForDisplay(summary: Awaited<ReturnType<typeof getPersonalizationSummary>>): {
  verbosityLabel: string;
  terminologyLabel: string;
  focusAreasLabel: string;
  statusLabel: string;
} {
  const verbosityLabels: Record<VerbosityLevel, string> = {
    concise: 'Concise responses',
    balanced: 'Balanced responses',
    detailed: 'Detailed responses',
  };

  const terminologyLabels: Record<TerminologyLevel, string> = {
    simple: 'Simple language',
    moderate: 'Moderate terminology',
    clinical: 'Clinical terminology',
  };

  const sourceIcons = {
    learned: '(learned)',
    manual: '(set by you)',
    default: '(default)',
  };

  return {
    verbosityLabel: `${verbosityLabels[summary.verbosity.value]} ${sourceIcons[summary.verbosity.source]}`,
    terminologyLabel: `${terminologyLabels[summary.terminology.value]} ${sourceIcons[summary.terminology.source]}`,
    focusAreasLabel: summary.focusAreas.value.length > 0
      ? `Focused on: ${summary.focusAreas.value.join(', ')} ${sourceIcons[summary.focusAreas.source]}`
      : 'No focus areas yet',
    statusLabel: summary.isLearning
      ? `Still learning (${summary.dataPoints} data points collected)`
      : `Personalized (${summary.dataPoints} data points analyzed)`,
  };
}
