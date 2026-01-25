/**
 * Voice Medication Parsing API
 *
 * Uses Gemini 3 Pro to parse natural language medication input
 * and match it to the elder's medication list.
 *
 * Example inputs:
 * - "metformin"
 * - "blood pressure pill"
 * - "morning medication"
 * - "gave his lisinopril at 8am"
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest } from '@/lib/ai/aiRouter';

interface ParseMedicationRequest {
  transcript: string;
  medications: Array<{
    id: string;
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  elderName?: string;
}

interface ParsedMedication {
  medicationId: string | null;
  medicationName: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  parsedTime?: string;
  rawMatch?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseMedicationRequest = await request.json();
    const { transcript, medications, elderName } = body;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    if (!medications || medications.length === 0) {
      return NextResponse.json(
        { error: 'No medications provided to match against' },
        { status: 400 }
      );
    }

    // Build medication list for the prompt
    const medicationList = medications.map((m, i) =>
      `${i + 1}. "${m.name}"${m.dosage ? ` (${m.dosage})` : ''}`
    ).join('\n');

    const prompt = `You are a medication matching assistant. Parse the following voice input and match it to one of the available medications.

VOICE INPUT: "${transcript}"

AVAILABLE MEDICATIONS FOR ${elderName || 'this patient'}:
${medicationList}

TASK:
1. Identify which medication the speaker is referring to
2. Handle common variations:
   - Generic vs brand names (e.g., "blood pressure pill" could be Lisinopril or Amlodipine)
   - Partial names (e.g., "metfor" → Metformin)
   - Common descriptions (e.g., "heart medication", "diabetes pill", "cholesterol medicine")
3. Extract any time mentioned (e.g., "8am", "morning", "after breakfast")

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "matchedIndex": <1-based index from list above, or null if no match>,
  "confidence": "<high|medium|low|none>",
  "parsedTime": "<extracted time or null>",
  "reasoning": "<brief explanation>"
}

CONFIDENCE LEVELS:
- high: Exact or very close match (e.g., "metformin" → "Metformin 500mg")
- medium: Likely match based on description (e.g., "blood pressure pill" when only one BP med exists)
- low: Possible match but uncertain (e.g., "morning pill" when multiple morning meds exist)
- none: Cannot determine which medication`;

    const aiResponse = await routeAIRequest({
      query: prompt,
      requestType: 'search',
      forceComplexity: 'simple',
      systemPrompt: 'You are a precise medication matching assistant. Always respond with valid JSON only.',
    });

    if (!aiResponse.success) {
      // Fallback to simple fuzzy matching
      const result = simpleFuzzyMatch(transcript, medications);
      return NextResponse.json(result);
    }

    // Parse AI response
    try {
      const jsonMatch = aiResponse.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const result: ParsedMedication = {
        medicationId: null,
        medicationName: null,
        confidence: parsed.confidence || 'none',
        parsedTime: parsed.parsedTime || undefined,
        rawMatch: parsed.reasoning,
      };

      // Map matched index to medication
      if (parsed.matchedIndex && parsed.matchedIndex >= 1 && parsed.matchedIndex <= medications.length) {
        const matched = medications[parsed.matchedIndex - 1];
        result.medicationId = matched.id;
        result.medicationName = matched.name;
      }

      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to simple fuzzy matching
      const result = simpleFuzzyMatch(transcript, medications);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Voice parse medication error:', error);
    return NextResponse.json(
      { error: 'Failed to parse medication' },
      { status: 500 }
    );
  }
}

/**
 * Simple fuzzy matching fallback when AI is unavailable
 */
function simpleFuzzyMatch(
  transcript: string,
  medications: Array<{ id: string; name: string; dosage?: string }>
): ParsedMedication {
  const lower = transcript.toLowerCase().trim();

  // Try exact substring match first
  for (const med of medications) {
    const medLower = med.name.toLowerCase();
    if (lower.includes(medLower) || medLower.includes(lower)) {
      return {
        medicationId: med.id,
        medicationName: med.name,
        confidence: 'high',
      };
    }
  }

  // Try partial match (first 4 characters)
  for (const med of medications) {
    const medLower = med.name.toLowerCase();
    const words = lower.split(/\s+/);
    for (const word of words) {
      if (word.length >= 4 && medLower.startsWith(word.substring(0, 4))) {
        return {
          medicationId: med.id,
          medicationName: med.name,
          confidence: 'medium',
        };
      }
    }
  }

  // If only one medication, return it with low confidence
  if (medications.length === 1) {
    return {
      medicationId: medications[0].id,
      medicationName: medications[0].name,
      confidence: 'low',
    };
  }

  return {
    medicationId: null,
    medicationName: null,
    confidence: 'none',
  };
}
