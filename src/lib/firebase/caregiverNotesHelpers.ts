/**
 * Shared Helpers for Caregiver Notes Services
 *
 * Contains document conversion functions used by both:
 * - caregiverNotes.ts (Client SDK)
 * - caregiverNotesAdmin.ts (Admin SDK)
 */

import { CaregiverNote, PublishedTip } from '@/types';
import { toSafeDate } from '@/lib/utils/dateConversion';

// Collection names
export const NOTES_COLLECTION = 'caregiver_notes';
export const TIPS_COLLECTION = 'published_tips';

/**
 * Convert Firestore document data to CaregiverNote type.
 * Works with both Client SDK and Admin SDK document snapshots.
 *
 * @param docId - Document ID
 * @param data - Document data (from docSnapshot.data())
 * @returns CaregiverNote object or null if data is missing
 */
export function mapDocToNote(docId: string, data: any): CaregiverNote | null {
  if (!data) return null;

  return {
    id: docId,
    userId: data.userId,
    groupId: data.groupId,
    title: data.title,
    content: data.content,
    userTags: data.userTags || [],
    source: data.source,
    inputMethod: data.inputMethod,
    voiceTranscript: data.voiceTranscript,
    aiMetadata: data.aiMetadata
      ? {
          ...data.aiMetadata,
          extractedAt: toSafeDate(data.aiMetadata.extractedAt),
        }
      : undefined,
    status: data.status,
    publishedTipId: data.publishedTipId,
    createdAt: toSafeDate(data.createdAt),
    updatedAt: toSafeDate(data.updatedAt),
  };
}

/**
 * Convert Firestore document data to PublishedTip type.
 * Works with both Client SDK and Admin SDK document snapshots.
 *
 * @param docId - Document ID
 * @param data - Document data (from docSnapshot.data())
 * @returns PublishedTip object or null if data is missing
 */
export function mapDocToTip(docId: string, data: any): PublishedTip | null {
  if (!data) return null;

  return {
    id: docId,
    sourceNoteId: data.sourceNoteId,
    sourceUserId: data.sourceUserId,
    title: data.title,
    content: data.content,
    summary: data.summary,
    category: data.category,
    keywords: data.keywords || [],
    userTags: data.userTags || [],
    authorFirstName: data.authorFirstName,
    isAnonymous: data.isAnonymous,
    source: data.source,
    viewCount: data.viewCount || 0,
    likeCount: data.likeCount || 0,
    safetyScore: data.safetyScore,
    publishedAt: toSafeDate(data.publishedAt),
    algoliaObjectId: data.algoliaObjectId,
  };
}

/**
 * Build document data for creating a new note.
 * Handles optional fields and timestamp conversion.
 *
 * @param note - Note data (without ID)
 * @param timestampFromDate - Function to convert Date to Firestore Timestamp
 *                            (different for Client vs Admin SDK)
 */
export function buildNoteDocData(
  note: Omit<CaregiverNote, 'id'>,
  timestampFromDate: (date: Date) => any
): Record<string, any> {
  const docData: Record<string, any> = {
    userId: note.userId,
    groupId: note.groupId,
    title: note.title,
    content: note.content,
    userTags: note.userTags || [],
    inputMethod: note.inputMethod,
    status: note.status || 'private',
    createdAt: timestampFromDate(note.createdAt),
    updatedAt: timestampFromDate(note.updatedAt),
  };

  // Add optional fields only if they have values
  if (note.source) docData.source = note.source;
  if (note.voiceTranscript) docData.voiceTranscript = note.voiceTranscript;
  if (note.aiMetadata) {
    docData.aiMetadata = {
      ...note.aiMetadata,
      extractedAt: timestampFromDate(note.aiMetadata.extractedAt),
    };
  }

  return docData;
}

/**
 * Build document data for creating a published tip.
 *
 * @param note - Source note
 * @param authorFirstName - Author's first name (null for anonymous)
 * @param safetyScore - Safety score from AI review
 * @param userId - User ID publishing the tip
 * @param timestampNow - Function to get current Firestore Timestamp
 */
export function buildTipDocData(
  note: CaregiverNote & { id: string },
  authorFirstName: string | null,
  safetyScore: number,
  userId: string,
  timestampNow: () => any
): Record<string, any> {
  const tipData: Record<string, any> = {
    sourceNoteId: note.id,
    sourceUserId: userId,
    title: note.title,
    content: note.content,
    summary: note.aiMetadata?.summary || note.content.substring(0, 200),
    category: note.aiMetadata?.category || 'daily_care',
    keywords: note.aiMetadata?.keywords || [],
    userTags: note.userTags || [],
    authorFirstName: authorFirstName,
    isAnonymous: !authorFirstName,
    source: note.source || null,
    viewCount: 0,
    likeCount: 0,
    safetyScore,
    publishedAt: timestampNow(),
  };

  return tipData;
}

/**
 * Build the result object for a newly published tip.
 */
export function buildPublishedTipResult(
  tipId: string,
  note: CaregiverNote & { id: string },
  authorFirstName: string | null,
  safetyScore: number,
  userId: string,
  tipData: Record<string, any>
): PublishedTip {
  return {
    id: tipId,
    sourceNoteId: note.id,
    sourceUserId: userId,
    title: note.title,
    content: note.content,
    summary: tipData.summary,
    category: tipData.category,
    keywords: tipData.keywords,
    userTags: tipData.userTags,
    authorFirstName: authorFirstName || undefined,
    isAnonymous: !authorFirstName,
    source: note.source,
    viewCount: 0,
    likeCount: 0,
    safetyScore,
    publishedAt: new Date(),
  };
}
