/**
 * Note Processing AI Service
 *
 * Uses Gemini 3 Pro Preview for:
 * - Title generation
 * - Keyword extraction
 * - Content summarization
 * - Category classification
 * - Safety moderation for publishing
 */

import { NoteAIMetadata, CaregiverNoteCategory } from '@/types';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';

interface ModerationResult {
  safetyScore: number;
  flags: string[];
  canAutoApprove: boolean;
  reason?: string;
}

/**
 * Process note content to extract metadata (title, keywords, summary, category)
 */
export async function processNoteContent(
  content: string,
  userId: string,
  userRole: UserRole,
  groupId: string
): Promise<NoteAIMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return basic metadata without AI (development fallback)
    return {
      generatedTitle: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      keywords: extractBasicKeywords(content),
      summary: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
      category: 'daily_care',
      extractedAt: new Date()
    };
  }

  const prompt = `You are analyzing a caregiver's note about caregiving insights or experiences.

NOTE CONTENT:
"""
${content}
"""

CATEGORIES (choose exactly ONE that best fits):
- self_care: Caregiver wellness, stress management, respite, burnout prevention, self-help
- communication: Talking with elders, family coordination, doctor communication, difficult conversations
- medical_knowledge: Understanding conditions, medications, symptoms, treatments, medical terminology
- daily_care: Bathing, dressing, mobility, feeding, toileting, transfers, daily routines

Generate a JSON response with:
1. "title": A concise, descriptive title (5-10 words max, make it actionable like "How to..." or "Tips for..." when appropriate)
2. "keywords": Array of 5-8 relevant keywords for search (lowercase, no special characters)
3. "summary": A 1-2 sentence summary (max 150 characters)
4. "category": One of the categories above (self_care, communication, medical_knowledge, daily_care)

Return ONLY valid JSON, no markdown code blocks or extra text.`;

  try {
    // Log third-party disclosure
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      serviceName: 'Google Gemini AI',
      serviceType: 'note_content_processing',
      dataShared: ['note_content'],
      purpose: 'Extract keywords, generate title and summary for caregiver note',
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
          thinking_config: { include_thoughts: false }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error('Gemini API request failed');
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    // Parse JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        generatedTitle: parsed.title || content.substring(0, 50),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        summary: parsed.summary || content.substring(0, 150),
        category: validateCategory(parsed.category),
        extractedAt: new Date()
      };
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Note processing error:', error);
    // Return fallback metadata
    return {
      generatedTitle: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      keywords: extractBasicKeywords(content),
      summary: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
      category: 'daily_care',
      extractedAt: new Date()
    };
  }
}

/**
 * Moderate note content before publishing
 * Returns safety score 0-100 and flags
 * Auto-approve threshold: 90+
 */
export async function moderateNoteForPublishing(
  title: string,
  content: string,
  userId: string,
  userRole: UserRole,
  groupId: string
): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Auto-approve in development
    return {
      safetyScore: 95,
      flags: [],
      canAutoApprove: true
    };
  }

  const prompt = `You are a content safety reviewer for a caregiving tips platform. Review this caregiver tip for public publishing.

TITLE: "${title}"

CONTENT:
"""
${content}
"""

CHECK FOR THESE ISSUES:
1. Specific medical advice (dosages, diagnoses, treatment recommendations)
2. Personal identifiable information (names, addresses, phone numbers, emails)
3. Unsafe care techniques that could cause injury
4. Inappropriate, discriminatory, or offensive content
5. Copyright concerns (large quoted sections without attribution)
6. Suicide, self-harm, or abuse content

SCORING GUIDE:
- 90-100: Safe, can auto-approve. General caregiving tips, emotional support, practical advice.
- 70-89: Mostly safe but has minor concerns. May need quick review.
- 50-69: Has concerns that need careful review before publishing.
- 0-49: Significant issues, should not be published.

Be LENIENT for:
- General caregiving experiences and emotions
- Practical daily care tips (bathing, dressing, feeding techniques)
- Communication strategies
- Self-care advice for caregivers
- Book recommendations or learnings from caregiving resources

Return a JSON response:
{
  "safetyScore": <number 0-100>,
  "flags": ["flag1", "flag2"],
  "canAutoApprove": <boolean>,
  "reason": "<reason if rejected or concerns>"
}

Return ONLY valid JSON, no markdown.`;

  try {
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      serviceName: 'Google Gemini AI',
      serviceType: 'content_moderation',
      dataShared: ['note_title', 'note_content'],
      purpose: 'Safety check for public publishing of caregiver tip',
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for consistent safety evaluation
          maxOutputTokens: 256,
          thinking_config: { include_thoughts: true }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty moderation response');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        safetyScore: typeof parsed.safetyScore === 'number' ? parsed.safetyScore : 50,
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        canAutoApprove: parsed.canAutoApprove === true && parsed.safetyScore >= 90,
        reason: parsed.reason
      };
    }

    throw new Error('Failed to parse moderation response');
  } catch (error) {
    console.error('Moderation error:', error);
    // Default to requiring manual review on error
    return {
      safetyScore: 50,
      flags: ['moderation_error'],
      canAutoApprove: false,
      reason: 'Automated moderation failed - content requires manual review'
    };
  }
}

/**
 * Clean up voice transcript (fix grammar, remove filler words)
 */
export async function cleanupVoiceTranscript(
  rawTranscript: string,
  userId: string,
  userRole: UserRole,
  groupId: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return raw transcript in development
    return rawTranscript;
  }

  const prompt = `You are a text cleanup assistant. Clean up this voice transcription while preserving the original meaning.

VOICE TRANSCRIPT:
"""
${rawTranscript}
"""

RULES:
1. Fix grammar, spelling, and punctuation
2. Remove filler words (um, uh, like, you know, so, basically)
3. Break into logical paragraphs if the content is long
4. Preserve the author's voice, tone, and meaning exactly
5. Do NOT add new information or change the meaning
6. Keep medical terms exactly as spoken

Return ONLY the cleaned up text, no JSON or explanations.`;

  try {
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      serviceName: 'Google Gemini AI',
      serviceType: 'voice_transcript_cleanup',
      dataShared: ['voice_transcript'],
      purpose: 'Clean up voice transcript for caregiver note',
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          thinking_config: { include_thoughts: false }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const result = await response.json();
    const cleanedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (cleanedText) {
      return cleanedText.trim();
    }

    return rawTranscript;
  } catch (error) {
    console.error('Voice cleanup error:', error);
    return rawTranscript;
  }
}

// ============= Helper Functions =============

/**
 * Basic keyword extraction fallback (no AI)
 */
function extractBasicKeywords(content: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
    'about', 'after', 'before', 'between', 'into', 'through', 'during', 'above',
    'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'then',
    'once', 'here', 'there', 'any', 'because', 'if', 'while', 'as', 'until'
  ]);

  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Return top keywords by frequency
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

/**
 * Validate category is one of the allowed values
 */
function validateCategory(category: string): CaregiverNoteCategory {
  const validCategories: CaregiverNoteCategory[] = [
    'self_care', 'communication', 'medical_knowledge', 'daily_care'
  ];

  if (validCategories.includes(category as CaregiverNoteCategory)) {
    return category as CaregiverNoteCategory;
  }

  return 'daily_care'; // Default category
}
