/**
 * SOAP Note Generator for Shift Handoffs
 *
 * Uses AI to generate structured SOAP format notes:
 * - Subjective: Elder's reported symptoms, mood, complaints
 * - Objective: Medications, supplements, meals, vitals
 * - Assessment: AI-generated summary of shift observations
 * - Plan: Action items for next shift + family alerts
 */

import type {
  SOAPNote,
  ActionPriority,
  MedicationLog,
  DietEntry,
  SupplementLog
} from '@/types';

interface ShiftDataForSOAP {
  elderName: string;
  shiftStart: Date;
  shiftEnd: Date;
  caregiverName: string;
  medicationLogs: MedicationLog[];
  supplementLogs: SupplementLog[];
  dietEntries: DietEntry[];
  notableEvents: Array<{
    type: string;
    description: string;
    time: Date;
    severity?: string;
  }>;
  mood: {
    overall: string;
    notes?: string;
  };
}

/**
 * Generate SOAP note using AI
 */
export async function generateSOAPNote(data: ShiftDataForSOAP): Promise<SOAPNote> {
  try {
    // First, try AI generation
    const aiNote = await generateWithAI(data);
    if (aiNote) {
      return aiNote;
    }
  } catch (error) {
    console.error('AI SOAP generation failed, falling back to rule-based:', error);
  }

  // Fallback to rule-based generation
  return generateRuleBased(data);
}

/**
 * AI-powered SOAP note generation using Gemini
 */
async function generateWithAI(data: ShiftDataForSOAP): Promise<SOAPNote | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('GEMINI_API_KEY not configured, using rule-based generation');
    return null;
  }

  // Build context for AI
  const context = buildAIContext(data);

  const prompt = `You are a healthcare documentation assistant generating a SOAP note for a caregiver shift handoff.

SHIFT INFORMATION:
${context}

Generate a structured SOAP note in JSON format. Be concise and focus on what the next caregiver needs to know.

Requirements:
- Subjective: Extract any reported symptoms, mood observations, and complaints from the notes
- Objective: Summarize medications given (with status), supplements, meals eaten (with percentages), and any vitals
- Assessment: Write a 1-2 sentence summary of the shift. Note any concerns or positives.
- Plan: List 2-4 action items for next shift with priority (critical/follow_up/routine)

If there are critical concerns (missed medications, poor appetite, mood issues, symptoms), set familyAlertNeeded to true and provide a brief alert message.

Respond ONLY with valid JSON in this exact format:
{
  "subjective": {
    "reports": ["string array of observations"],
    "moodObservation": "mood description",
    "complaints": ["any complaints noted"]
  },
  "objective": {
    "medicationsSummary": "X of Y medications given on time",
    "supplementsSummary": "X of Y supplements taken",
    "nutritionSummary": "Brief meal summary",
    "activities": ["activities noted"]
  },
  "assessment": {
    "summary": "1-2 sentence shift summary",
    "concerns": ["concerns array"],
    "positives": ["positives array"]
  },
  "plan": {
    "actions": [
      {"priority": "critical|follow_up|routine", "action": "action text", "reason": "optional reason"}
    ],
    "familyAlertNeeded": boolean,
    "familyAlertMessage": "message if alert needed"
  }
}`;

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
            thinkingConfig: {
              thinkingLevel: 'medium'
            }
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);

    // Convert AI response to SOAPNote format
    return convertAIResponseToSOAPNote(aiResponse, data);
  } catch (error) {
    console.error('AI generation error:', error);
    return null;
  }
}

/**
 * Build context string for AI prompt
 */
function buildAIContext(data: ShiftDataForSOAP): string {
  const lines: string[] = [];

  lines.push(`Elder: ${data.elderName}`);
  lines.push(`Shift: ${formatTime(data.shiftStart)} - ${formatTime(data.shiftEnd)}`);
  lines.push(`Caregiver: ${data.caregiverName}`);
  lines.push('');

  // Medications
  lines.push('MEDICATIONS:');
  if (data.medicationLogs.length === 0) {
    lines.push('- No medication logs during this shift');
  } else {
    data.medicationLogs.forEach(log => {
      const status = log.status === 'taken' ? 'Given' : log.status === 'missed' ? 'MISSED' : log.status;
      const time = log.actualTime ? formatTime(new Date(log.actualTime)) : formatTime(new Date(log.scheduledTime));
      lines.push(`- ${log.medicationId}: ${status} at ${time}${log.notes ? ` (Notes: ${log.notes})` : ''}`);
    });
  }
  lines.push('');

  // Supplements
  lines.push('SUPPLEMENTS:');
  if (data.supplementLogs.length === 0) {
    lines.push('- No supplement logs during this shift');
  } else {
    data.supplementLogs.forEach(log => {
      const status = log.status === 'taken' ? 'Taken' : log.status === 'missed' ? 'MISSED' : log.status;
      const time = log.actualTime ? formatTime(new Date(log.actualTime)) : formatTime(new Date(log.scheduledTime));
      lines.push(`- ${log.supplementId}: ${status} at ${time}${log.notes ? ` (Notes: ${log.notes})` : ''}`);
    });
  }
  lines.push('');

  // Meals
  lines.push('MEALS:');
  if (data.dietEntries.length === 0) {
    lines.push('- No meal logs during this shift');
  } else {
    data.dietEntries.forEach(entry => {
      lines.push(`- ${entry.meal} at ${formatTime(new Date(entry.timestamp))}${entry.notes ? `: ${entry.notes}` : ''}`);
    });
  }
  lines.push('');

  // Notable events
  if (data.notableEvents.length > 0) {
    lines.push('NOTABLE EVENTS:');
    data.notableEvents.forEach(event => {
      const severity = event.severity ? `[${event.severity.toUpperCase()}]` : '';
      lines.push(`- ${severity} ${event.type}: ${event.description}`);
    });
    lines.push('');
  }

  // Mood
  lines.push(`MOOD: ${data.mood.overall}${data.mood.notes ? ` - ${data.mood.notes}` : ''}`);

  return lines.join('\n');
}

/**
 * Convert AI response to SOAPNote format
 */
function convertAIResponseToSOAPNote(aiResponse: any, data: ShiftDataForSOAP): SOAPNote {
  return {
    subjective: {
      reports: aiResponse.subjective?.reports || [],
      moodObservation: aiResponse.subjective?.moodObservation || data.mood.overall,
      complaints: aiResponse.subjective?.complaints || [],
    },
    objective: {
      medications: data.medicationLogs.map(log => ({
        name: log.medicationId,
        dose: '',
        time: log.actualTime ? new Date(log.actualTime) : new Date(log.scheduledTime),
        status: log.status === 'missed' ? 'missed' : log.status === 'taken' ? 'on-time' : 'on-time',
      })),
      supplements: data.supplementLogs.map(log => ({
        name: log.supplementId,
        time: log.actualTime ? new Date(log.actualTime) : new Date(log.scheduledTime),
        taken: log.status === 'taken',
      })),
      nutrition: data.dietEntries.map(entry => ({
        meal: entry.meal,
        time: new Date(entry.timestamp),
        percentageEaten: extractPercentage(entry.notes) ?? 100,
        notes: entry.notes,
      })),
      activities: aiResponse.objective?.activities || [],
    },
    assessment: {
      summary: aiResponse.assessment?.summary || 'Shift completed.',
      concerns: aiResponse.assessment?.concerns || [],
      positives: aiResponse.assessment?.positives || [],
    },
    plan: {
      actions: (aiResponse.plan?.actions || []).map((a: any) => ({
        priority: validatePriority(a.priority),
        action: a.action,
        ...(a.reason && { reason: a.reason }),
      })),
      familyAlertSent: false,
      ...(aiResponse.plan?.familyAlertNeeded && aiResponse.plan.familyAlertMessage && {
        familyAlertMessage: aiResponse.plan.familyAlertMessage
      }),
    },
    generatedBy: 'ai',
    generatedAt: new Date(),
  };
}

/**
 * Rule-based SOAP note generation (fallback)
 */
function generateRuleBased(data: ShiftDataForSOAP): SOAPNote {
  // Subjective
  const reports: string[] = [];
  const complaints: string[] = [];

  data.notableEvents.forEach(event => {
    if (event.type === 'symptom') {
      complaints.push(event.description);
    } else if (event.type === 'mood' || event.type === 'activity') {
      reports.push(event.description);
    }
  });

  // Build assessment
  const concerns: string[] = [];
  const positives: string[] = [];

  const missedMeds = data.medicationLogs.filter(m => m.status === 'missed');
  if (missedMeds.length > 0) {
    concerns.push(`${missedMeds.length} medication(s) missed`);
  }

  const poorMeals = data.dietEntries.filter(e => {
    const pct = extractPercentage(e.notes);
    return pct !== null && pct < 50;
  });
  if (poorMeals.length > 0) {
    concerns.push('Poor appetite noted');
  }

  if (data.mood.overall === 'withdrawn' || data.mood.overall === 'upset') {
    concerns.push(`Mood: ${data.mood.overall}`);
  }

  const activities = data.notableEvents.filter(e => e.type === 'activity');
  if (activities.length > 0) {
    positives.push('Active and engaged');
  }

  if (data.medicationLogs.length > 0 && missedMeds.length === 0) {
    positives.push('All medications given on time');
  }

  // Build actions
  const actions: Array<{ priority: ActionPriority; action: string; reason?: string }> = [];

  if (missedMeds.length > 0) {
    actions.push({
      priority: 'critical',
      action: 'Follow up on missed medications',
      reason: `${missedMeds.length} dose(s) missed during shift`,
    });
  }

  if (poorMeals.length > 0) {
    actions.push({
      priority: 'follow_up',
      action: 'Monitor appetite closely',
      reason: 'Poor intake at ' + poorMeals.map(m => m.meal).join(', '),
    });
  }

  if (data.mood.overall === 'withdrawn' || data.mood.overall === 'upset') {
    actions.push({
      priority: 'follow_up',
      action: 'Check in on mood and provide extra attention',
      reason: `Mood was ${data.mood.overall} during shift`,
    });
  }

  const criticalEvents = data.notableEvents.filter(e => e.severity === 'critical');
  criticalEvents.forEach(event => {
    actions.push({
      priority: 'critical',
      action: `Follow up: ${event.description.substring(0, 50)}`,
      reason: 'Critical event during shift',
    });
  });

  // Default routine action if nothing else
  if (actions.length === 0) {
    actions.push({
      priority: 'routine',
      action: 'Continue standard care routine',
    });
  }

  // Determine if family alert needed
  const needsFamilyAlert = concerns.length > 0 || criticalEvents.length > 0;
  let familyAlertMessage: string | undefined;
  if (needsFamilyAlert) {
    familyAlertMessage = `Shift update for ${data.elderName}: ${concerns.join('. ')}`;
  }

  // Build summary
  let summary = '';
  if (concerns.length === 0) {
    summary = 'Routine shift completed without concerns.';
  } else {
    summary = `Shift completed with ${concerns.length} concern(s) noted. ` +
      concerns.slice(0, 2).join('. ') + '.';
  }

  return {
    subjective: {
      reports,
      moodObservation: data.mood.notes || `Mood: ${data.mood.overall}`,
      complaints,
    },
    objective: {
      medications: data.medicationLogs.map(log => ({
        name: log.medicationId,
        dose: '',
        time: log.actualTime ? new Date(log.actualTime) : new Date(log.scheduledTime),
        status: log.status === 'missed' ? 'missed' : 'on-time',
      })),
      supplements: data.supplementLogs.map(log => ({
        name: log.supplementId,
        time: log.actualTime ? new Date(log.actualTime) : new Date(log.scheduledTime),
        taken: log.status === 'taken',
      })),
      nutrition: data.dietEntries.map(entry => ({
        meal: entry.meal,
        time: new Date(entry.timestamp),
        percentageEaten: extractPercentage(entry.notes) || 100,
        notes: entry.notes,
      })),
      activities: activities.map(a => a.description),
    },
    assessment: {
      summary,
      concerns,
      positives,
    },
    plan: {
      actions,
      familyAlertSent: false,
      ...(familyAlertMessage && { familyAlertMessage }),
    },
    generatedBy: 'rule_based',
    generatedAt: new Date(),
  };
}

/**
 * Helper: Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper: Extract percentage from notes
 */
function extractPercentage(notes?: string): number | null {
  if (!notes) return null;
  const match = notes.match(/(\d+)%/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Helper: Validate priority value
 */
function validatePriority(priority: string): ActionPriority {
  if (priority === 'critical' || priority === 'follow_up' || priority === 'routine') {
    return priority;
  }
  return 'routine';
}

/**
 * Determine if family notification should be sent
 */
export function shouldSendFamilyNotification(soapNote: SOAPNote): boolean {
  // Send if there's a family alert message
  if (soapNote.plan.familyAlertMessage) {
    return true;
  }

  // Send if there are critical actions
  if (soapNote.plan.actions.some(a => a.priority === 'critical')) {
    return true;
  }

  // Send if there are concerns
  if (soapNote.assessment.concerns.length > 0) {
    return true;
  }

  return false;
}

/**
 * Format SOAP note for family notification
 */
export function formatFamilyNotification(soapNote: SOAPNote, elderName: string): string {
  if (soapNote.plan.familyAlertMessage) {
    return soapNote.plan.familyAlertMessage;
  }

  const concerns = soapNote.assessment.concerns;
  if (concerns.length > 0) {
    return `Care update for ${elderName}: ${concerns.slice(0, 2).join('. ')}. Check the app for details.`;
  }

  return `Shift completed for ${elderName}. ${soapNote.assessment.summary}`;
}
