/**
 * Caregiver Notes Admin Service
 *
 * SERVER-SIDE ONLY - Uses Firebase Admin SDK to bypass security rules.
 * For use in API routes only.
 */

import { getAdminDb } from './admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CaregiverNote, PublishedTip, CaregiverNoteCategory } from '@/types';
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';
import { toSafeDate } from '@/lib/utils/dateConversion';

const NOTES_COLLECTION = 'caregiver_notes';
const TIPS_COLLECTION = 'published_tips';

// ============= Helper Methods =============

function docToNote(docSnapshot: FirebaseFirestore.DocumentSnapshot): CaregiverNote | null {
  if (!docSnapshot.exists) return null;
  const data = docSnapshot.data()!;
  return {
    id: docSnapshot.id,
    userId: data.userId,
    groupId: data.groupId,
    title: data.title,
    content: data.content,
    userTags: data.userTags || [],
    source: data.source,
    inputMethod: data.inputMethod,
    voiceTranscript: data.voiceTranscript,
    aiMetadata: data.aiMetadata ? {
      ...data.aiMetadata,
      extractedAt: toSafeDate(data.aiMetadata.extractedAt)
    } : undefined,
    status: data.status,
    publishedTipId: data.publishedTipId,
    createdAt: toSafeDate(data.createdAt),
    updatedAt: toSafeDate(data.updatedAt)
  };
}

function docToTip(docSnapshot: FirebaseFirestore.DocumentSnapshot): PublishedTip | null {
  if (!docSnapshot.exists) return null;
  const data = docSnapshot.data()!;
  return {
    id: docSnapshot.id,
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
    algoliaObjectId: data.algoliaObjectId
  };
}

// ============= Private Notes CRUD =============

/**
 * Create a new caregiver note
 */
export async function createNote(
  note: Omit<CaregiverNote, 'id'>,
  userId: string,
  userRole: UserRole
): Promise<CaregiverNote> {
  const db = getAdminDb();

  const docData: Record<string, any> = {
    userId: note.userId,
    groupId: note.groupId,
    title: note.title,
    content: note.content,
    userTags: note.userTags || [],
    inputMethod: note.inputMethod,
    status: note.status || 'private',
    createdAt: Timestamp.fromDate(note.createdAt),
    updatedAt: Timestamp.fromDate(note.updatedAt)
  };

  if (note.source) docData.source = note.source;
  if (note.voiceTranscript) docData.voiceTranscript = note.voiceTranscript;
  if (note.aiMetadata) {
    docData.aiMetadata = {
      ...note.aiMetadata,
      extractedAt: Timestamp.fromDate(note.aiMetadata.extractedAt)
    };
  }

  const docRef = await db.collection(NOTES_COLLECTION).add(docData);
  const result = { ...note, id: docRef.id };

  // Audit log
  await logPHIAccess({
    userId,
    userRole,
    groupId: note.groupId,
    phiType: 'elder',
    phiId: docRef.id,
    action: 'create',
    actionDetails: `Created caregiver note: ${note.title} (${note.inputMethod})`,
    purpose: 'operations',
    method: 'web_app',
  });

  return result;
}

/**
 * Get all notes for a user
 */
export async function getNotesByUser(
  userId: string,
  userRole: UserRole,
  groupId: string,
  limitCount?: number
): Promise<CaregiverNote[]> {
  const db = getAdminDb();

  let query = db.collection(NOTES_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc');

  if (limitCount) {
    query = query.limit(limitCount);
  }

  const snapshot = await query.get();
  const notes = snapshot.docs.map(doc => docToNote(doc)).filter(Boolean) as CaregiverNote[];

  // Audit log
  if (notes.length > 0) {
    await logPHIAccess({
      userId,
      userRole,
      groupId,
      phiType: 'elder',
      action: 'read',
      actionDetails: `Retrieved ${notes.length} caregiver notes`,
      purpose: 'operations',
      method: 'web_app',
    });
  }

  return notes;
}

/**
 * Get a single note by ID
 */
export async function getNote(
  noteId: string,
  userId: string,
  userRole: UserRole
): Promise<CaregiverNote | null> {
  const db = getAdminDb();
  const docRef = db.collection(NOTES_COLLECTION).doc(noteId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) return null;

  const note = docToNote(snapshot);
  if (!note) return null;

  // Verify ownership
  if (note.userId !== userId) {
    throw new Error('Access denied: You can only view your own notes');
  }

  // Audit log
  await logPHIAccess({
    userId,
    userRole,
    groupId: note.groupId,
    phiType: 'elder',
    phiId: noteId,
    action: 'read',
    actionDetails: `Viewed caregiver note: ${note.title}`,
    purpose: 'operations',
    method: 'web_app',
  });

  return note;
}

/**
 * Update a note
 */
export async function updateNote(
  noteId: string,
  updates: Partial<CaregiverNote>,
  userId: string,
  userRole: UserRole
): Promise<CaregiverNote> {
  const db = getAdminDb();
  const docRef = db.collection(NOTES_COLLECTION).doc(noteId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error('Note not found');
  }

  const existingNote = docToNote(snapshot)!;

  // Verify ownership
  if (existingNote.userId !== userId) {
    throw new Error('Access denied: You can only update your own notes');
  }

  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now()
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.userTags !== undefined) updateData.userTags = updates.userTags;
  if (updates.source !== undefined) updateData.source = updates.source;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.publishedTipId !== undefined) updateData.publishedTipId = updates.publishedTipId;
  if (updates.aiMetadata !== undefined) {
    updateData.aiMetadata = {
      ...updates.aiMetadata,
      extractedAt: updates.aiMetadata.extractedAt
        ? Timestamp.fromDate(updates.aiMetadata.extractedAt)
        : Timestamp.now()
    };
  }

  await docRef.update(updateData);

  // Audit log
  await logPHIAccess({
    userId,
    userRole,
    groupId: existingNote.groupId,
    phiType: 'elder',
    phiId: noteId,
    action: 'update',
    actionDetails: `Updated caregiver note: ${existingNote.title}`,
    purpose: 'operations',
    method: 'web_app',
  });

  const updatedSnapshot = await docRef.get();
  return docToNote(updatedSnapshot)!;
}

/**
 * Delete a note
 */
export async function deleteNote(
  noteId: string,
  userId: string,
  userRole: UserRole
): Promise<void> {
  const db = getAdminDb();
  const docRef = db.collection(NOTES_COLLECTION).doc(noteId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error('Note not found');
  }

  const note = docToNote(snapshot)!;

  // Verify ownership
  if (note.userId !== userId) {
    throw new Error('Access denied: You can only delete your own notes');
  }

  // If published, also delete the tip
  if (note.publishedTipId) {
    await db.collection(TIPS_COLLECTION).doc(note.publishedTipId).delete();
  }

  await docRef.delete();

  // Audit log
  await logPHIAccess({
    userId,
    userRole,
    groupId: note.groupId,
    phiType: 'elder',
    phiId: noteId,
    action: 'delete',
    actionDetails: `Deleted caregiver note: ${note.title}`,
    purpose: 'operations',
    method: 'web_app',
  });
}

// ============= Publishing =============

/**
 * Publish a note as a public tip
 */
export async function publishNote(
  noteId: string,
  authorFirstName: string | null,
  safetyScore: number,
  userId: string,
  userRole: UserRole
): Promise<PublishedTip> {
  const db = getAdminDb();

  // Get the note
  const note = await getNote(noteId, userId, userRole);
  if (!note) {
    throw new Error('Note not found');
  }

  if (note.status === 'published') {
    throw new Error('Note is already published');
  }

  // Create the published tip
  const tipData: Record<string, any> = {
    sourceNoteId: noteId,
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
    publishedAt: Timestamp.now()
  };

  const tipRef = await db.collection(TIPS_COLLECTION).add(tipData);

  // Update the original note
  await db.collection(NOTES_COLLECTION).doc(noteId).update({
    status: 'published',
    publishedTipId: tipRef.id,
    updatedAt: Timestamp.now()
  });

  // Audit log
  await logPHIAccess({
    userId,
    userRole,
    groupId: note.groupId,
    phiType: 'elder',
    phiId: noteId,
    action: 'update',
    actionDetails: `Published caregiver note as tip: ${note.title} (safety score: ${safetyScore})`,
    purpose: 'operations',
    method: 'web_app',
  });

  return {
    id: tipRef.id,
    sourceNoteId: noteId,
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
    publishedAt: new Date()
  };
}

/**
 * Unpublish a tip (revert to private note)
 */
export async function unpublishNote(
  noteId: string,
  userId: string,
  userRole: UserRole
): Promise<void> {
  const db = getAdminDb();

  const note = await getNote(noteId, userId, userRole);
  if (!note) {
    throw new Error('Note not found');
  }

  if (note.status !== 'published' || !note.publishedTipId) {
    throw new Error('Note is not published');
  }

  // Delete the published tip
  await db.collection(TIPS_COLLECTION).doc(note.publishedTipId).delete();

  // Update the note
  await db.collection(NOTES_COLLECTION).doc(noteId).update({
    status: 'private',
    publishedTipId: FieldValue.delete(),
    updatedAt: Timestamp.now()
  });

  // Audit log
  await logPHIAccess({
    userId,
    userRole,
    groupId: note.groupId,
    phiType: 'elder',
    phiId: noteId,
    action: 'update',
    actionDetails: `Unpublished caregiver note: ${note.title}`,
    purpose: 'operations',
    method: 'web_app',
  });
}

// ============= Public Tips =============

/**
 * Get published tips (public)
 */
export async function getPublishedTips(
  limitCount: number = 100,
  sortBy: 'date' | 'author' = 'date'
): Promise<PublishedTip[]> {
  const db = getAdminDb();

  let query = db.collection(TIPS_COLLECTION);

  if (sortBy === 'date') {
    query = query.orderBy('publishedAt', 'desc') as FirebaseFirestore.CollectionReference;
  } else {
    query = query.orderBy('authorFirstName', 'asc') as FirebaseFirestore.CollectionReference;
  }

  const snapshot = await query.limit(limitCount).get();
  return snapshot.docs.map(doc => docToTip(doc)).filter(Boolean) as PublishedTip[];
}

/**
 * Update Algolia ID on a tip
 */
export async function updateTipAlgoliaId(
  tipId: string,
  algoliaObjectId: string
): Promise<void> {
  const db = getAdminDb();
  await db.collection(TIPS_COLLECTION).doc(tipId).update({
    algoliaObjectId
  });
}
