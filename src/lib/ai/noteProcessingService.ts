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
 * Auto-approve threshold: 60+ (lenient - only block harmful content)
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

  const prompt = `You are a content safety reviewer for a caregiving community tips platform. Your job is to ONLY block genuinely harmful content while being VERY PERMISSIVE for helpful caregiving content.

TITLE: "${title}"

CONTENT:
"""
${content}
"""

ONLY FLAG AND REJECT (score below 60) IF:
1. Contains profanity, slurs, or offensive language
2. Contains hate speech, discrimination, or harassment
3. Contains personally identifiable information (real full names with context, addresses, phone numbers, SSN, emails)
4. Contains dangerous medical misinformation that could cause harm
5. Contains content promoting self-harm, suicide, or abuse
6. Contains explicit sexual content

ALWAYS APPROVE (score 80-100) IF:
- Book references, author names, or page numbers (these are citations, not PII)
- General caregiving experiences, tips, or advice
- Communication strategies with elders or family
- Self-care advice for caregivers
- Practical daily care tips
- Emotional support content
- Learnings from caregiving books/resources
- Short notes or brief insights
- Educational content about caregiving conditions

SCORING:
- 80-100: Safe, auto-approve (most content should be here)
- 60-79: Minor concerns but still publishable
- Below 60: Contains harmful content listed above, REJECT

Be GENEROUS with scores. When in doubt, approve. The caregiving community benefits from shared wisdom.

Return JSON only:
{"safetyScore": <number>, "flags": [], "canAutoApprove": <boolean>, "reason": "<only if rejected>"}`;

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
          temperature: 0.1, // Very low temperature for consistent evaluation
          maxOutputTokens: 256,
          thinking_config: { include_thoughts: false }
        }
      })
    });

    if (!response.ok) {
      // On API error, auto-approve (fail open for better UX)
      console.error('Gemini moderation API error, auto-approving');
      return {
        safetyScore: 80,
        flags: [],
        canAutoApprove: true
      };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      // On empty response, auto-approve
      return {
        safetyScore: 80,
        flags: [],
        canAutoApprove: true
      };
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const score = typeof parsed.safetyScore === 'number' ? parsed.safetyScore : 80;
      return {
        safetyScore: score,
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        canAutoApprove: score >= 60, // Lowered threshold from 90 to 60
        reason: parsed.reason
      };
    }

    // On parse error, auto-approve
    return {
      safetyScore: 80,
      flags: [],
      canAutoApprove: true
    };
  } catch (error) {
    console.error('Moderation error:', error);
    // On any error, auto-approve (fail open - better UX, most content is safe)
    return {
      safetyScore: 80,
      flags: [],
      canAutoApprove: true
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
