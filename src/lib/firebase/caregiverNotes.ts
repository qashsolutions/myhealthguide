import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './config';
import { CaregiverNote, PublishedTip, CaregiverNoteCategory } from '@/types';
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';
import { toSafeDate } from '@/lib/utils/dateConversion';

/**
 * Caregiver Notes Service
 *
 * CRUD operations for private caregiver notes and public published tips.
 * Follows the DietService pattern for consistency.
 */
export class CaregiverNotesService {
  private static NOTES_COLLECTION = 'caregiver_notes';
  private static TIPS_COLLECTION = 'published_tips';

  // ============= Helper Methods =============

  private static docToNote(docSnapshot: any): CaregiverNote {
    const data = docSnapshot.data();
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

  private static docToTip(docSnapshot: any): PublishedTip {
    const data = docSnapshot.data();
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
  static async createNote(
    note: Omit<CaregiverNote, 'id'>,
    userId: string,
    userRole: UserRole
  ): Promise<CaregiverNote> {
    // Build document data, excluding undefined fields
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

    // Add optional fields only if they have values
    if (note.source) docData.source = note.source;
    if (note.voiceTranscript) docData.voiceTranscript = note.voiceTranscript;
    if (note.aiMetadata) {
      docData.aiMetadata = {
        ...note.aiMetadata,
        extractedAt: Timestamp.fromDate(note.aiMetadata.extractedAt)
      };
    }

    const docRef = await addDoc(collection(db, this.NOTES_COLLECTION), docData);
    const result = { ...note, id: docRef.id };

    // Audit log (notes may contain PHI references)
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
  static async getNotesByUser(
    userId: string,
    userRole: UserRole,
    groupId: string,
    limitCount?: number
  ): Promise<CaregiverNote[]> {
    let q = query(
      collection(db, this.NOTES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (limitCount) {
      q = query(q, firestoreLimit(limitCount));
    }

    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map(doc => this.docToNote(doc));

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
  static async getNote(
    noteId: string,
    userId: string,
    userRole: UserRole
  ): Promise<CaregiverNote | null> {
    const docRef = doc(db, this.NOTES_COLLECTION, noteId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const note = this.docToNote(snapshot);

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
  static async updateNote(
    noteId: string,
    updates: Partial<CaregiverNote>,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.NOTES_COLLECTION, noteId);

    // Verify ownership first
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      throw new Error('Note not found');
    }

    const existingNote = this.docToNote(snapshot);
    if (existingNote.userId !== userId) {
      throw new Error('Access denied: You can only update your own notes');
    }

    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    };

    // Handle date conversions
    if (updates.aiMetadata?.extractedAt) {
      updateData.aiMetadata = {
        ...updates.aiMetadata,
        extractedAt: Timestamp.fromDate(updates.aiMetadata.extractedAt)
      };
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await updateDoc(docRef, updateData);

    // Audit log
    await logPHIAccess({
      userId,
      userRole,
      groupId: existingNote.groupId,
      phiType: 'elder',
      phiId: noteId,
      action: 'update',
      actionDetails: `Updated caregiver note: ${existingNote.title} (fields: ${Object.keys(updates).join(', ')})`,
      purpose: 'operations',
      method: 'web_app',
    });
  }

  /**
   * Delete a note (and associated tip if published)
   */
  static async deleteNote(
    noteId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.NOTES_COLLECTION, noteId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Note not found');
    }

    const note = this.docToNote(snapshot);

    // Verify ownership
    if (note.userId !== userId) {
      throw new Error('Access denied: You can only delete your own notes');
    }

    // If published, also delete the tip
    if (note.publishedTipId) {
      const tipRef = doc(db, this.TIPS_COLLECTION, note.publishedTipId);
      await deleteDoc(tipRef);
    }

    await deleteDoc(docRef);

    // Audit log
    await logPHIAccess({
      userId,
      userRole,
      groupId: note.groupId,
      phiType: 'elder',
      phiId: noteId,
      action: 'delete',
      actionDetails: `Deleted caregiver note: ${note.title}${note.publishedTipId ? ' (and associated public tip)' : ''}`,
      purpose: 'operations',
      method: 'web_app',
    });
  }

  // ============= Published Tips =============

  /**
   * Publish a note as a public tip
   */
  static async publishNote(
    noteId: string,
    authorFirstName: string | null,
    safetyScore: number,
    userId: string,
    userRole: UserRole
  ): Promise<PublishedTip> {
    // Get the source note
    const note = await this.getNote(noteId, userId, userRole);
    if (!note) throw new Error('Note not found');

    if (note.status === 'published') {
      throw new Error('Note is already published');
    }

    // Create public tip
    const tipData: Record<string, any> = {
      sourceNoteId: noteId,
      sourceUserId: userId,
      title: note.title,
      content: note.content,
      summary: note.aiMetadata?.summary || note.content.substring(0, 150),
      category: note.aiMetadata?.category || 'daily_care',
      keywords: note.aiMetadata?.keywords || [],
      userTags: note.userTags,
      authorFirstName: authorFirstName || null,
      isAnonymous: !authorFirstName,
      viewCount: 0,
      likeCount: 0,
      safetyScore,
      publishedAt: Timestamp.fromDate(new Date())
    };

    if (note.source) {
      tipData.source = note.source;
    }

    const tipRef = await addDoc(collection(db, this.TIPS_COLLECTION), tipData);

    // Update the source note
    await this.updateNote(noteId, {
      status: 'published',
      publishedTipId: tipRef.id
    }, userId, userRole);

    return {
      id: tipRef.id,
      sourceNoteId: noteId,
      sourceUserId: userId,
      title: note.title,
      content: note.content,
      summary: tipData.summary,
      category: tipData.category as CaregiverNoteCategory,
      keywords: tipData.keywords,
      userTags: note.userTags,
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
   * Unpublish a tip (reverts note to private)
   */
  static async unpublishNote(
    noteId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const note = await this.getNote(noteId, userId, userRole);
    if (!note) throw new Error('Note not found');

    if (!note.publishedTipId) {
      throw new Error('Note is not published');
    }

    // Delete the tip
    const tipRef = doc(db, this.TIPS_COLLECTION, note.publishedTipId);
    await deleteDoc(tipRef);

    // Update the note
    await updateDoc(doc(db, this.NOTES_COLLECTION, noteId), {
      status: 'private',
      publishedTipId: null,
      updatedAt: Timestamp.fromDate(new Date())
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

  /**
   * Get all published tips (public - no auth required for reading)
   */
  static async getPublishedTips(
    limitCount: number = 100,
    sortBy: 'date' | 'author' = 'date'
  ): Promise<PublishedTip[]> {
    const orderField = sortBy === 'date' ? 'publishedAt' : 'authorFirstName';
    const orderDir = sortBy === 'date' ? 'desc' : 'asc';

    const q = query(
      collection(db, this.TIPS_COLLECTION),
      orderBy(orderField, orderDir),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.docToTip(doc));
  }

  /**
   * Get a single published tip by ID
   */
  static async getTip(tipId: string): Promise<PublishedTip | null> {
    const docRef = doc(db, this.TIPS_COLLECTION, tipId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return this.docToTip(snapshot);
  }

  /**
   * Increment view count for a tip
   */
  static async incrementTipViewCount(tipId: string): Promise<void> {
    const docRef = doc(db, this.TIPS_COLLECTION, tipId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const currentCount = snapshot.data().viewCount || 0;
      await updateDoc(docRef, {
        viewCount: currentCount + 1
      });
    }
  }

  /**
   * Update tip with Algolia object ID after sync
   */
  static async updateTipAlgoliaId(
    tipId: string,
    algoliaObjectId: string
  ): Promise<void> {
    const docRef = doc(db, this.TIPS_COLLECTION, tipId);
    await updateDoc(docRef, { algoliaObjectId });
  }
}
