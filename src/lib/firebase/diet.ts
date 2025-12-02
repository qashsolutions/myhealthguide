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
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { DietEntry } from '@/types';
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';

export class DietService {
  private static COLLECTION = 'diet_entries';

  /**
   * Create diet entry
   */
  static async createEntry(
    entry: Omit<DietEntry, 'id'>,
    userId: string,
    userRole: UserRole
  ): Promise<DietEntry> {
    // Build document data, excluding undefined fields (Firestore doesn't accept undefined)
    const docData: Record<string, any> = {
      elderId: entry.elderId,
      groupId: entry.groupId,
      meal: entry.meal,
      items: entry.items,
      loggedBy: entry.loggedBy,
      method: entry.method,
      timestamp: Timestamp.fromDate(entry.timestamp),
      createdAt: Timestamp.fromDate(entry.createdAt)
    };

    // Only add optional fields if they have values
    if (entry.notes) docData.notes = entry.notes;
    if (entry.aiAnalysis) docData.aiAnalysis = entry.aiAnalysis;

    const docRef = await addDoc(collection(db, this.COLLECTION), docData);

    const result = { ...entry, id: docRef.id };

    // HIPAA Audit Log: Record PHI creation
    await logPHIAccess({
      userId,
      userRole,
      groupId: entry.groupId,
      phiType: 'diet',
      phiId: docRef.id,
      elderId: entry.elderId,
      action: 'create',
      actionDetails: `Created diet entry: ${entry.meal} (${entry.method})`,
      purpose: 'treatment',
      method: entry.method === 'voice' ? 'web_app' : 'web_app',
    });

    return result;
  }

  /**
   * Get entries by date range
   */
  static async getEntriesByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date,
    userId: string,
    userRole: UserRole
  ): Promise<DietEntry[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('groupId', '==', groupId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as DietEntry[];

    // HIPAA Audit Log: Record diet entries access by date range
    if (entries.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'diet',
        action: 'read',
        actionDetails: `Retrieved ${entries.length} diet entries for date range ${startDate.toISOString()} to ${endDate.toISOString()}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return entries;
  }

  /**
   * Get entries by elder
   */
  static async getEntriesByElder(
    elderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<DietEntry[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('elderId', '==', elderId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as DietEntry[];

    // HIPAA Audit Log: Record diet entries access for specific elder
    if (entries.length > 0) {
      const groupId = entries[0].groupId;
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'diet',
        elderId,
        action: 'read',
        actionDetails: `Retrieved ${entries.length} diet entries for elder ${elderId}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return entries;
  }

  /**
   * Get entry by ID
   */
  static async getEntry(
    entryId: string,
    userId: string,
    userRole: UserRole
  ): Promise<DietEntry | null> {
    const docRef = doc(db, this.COLLECTION, entryId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const entry = {
      id: snapshot.id,
      ...snapshot.data(),
      timestamp: snapshot.data().timestamp.toDate(),
      createdAt: snapshot.data().createdAt.toDate()
    } as DietEntry;

    // HIPAA Audit Log: Record individual diet entry access
    await logPHIAccess({
      userId,
      userRole,
      groupId: entry.groupId,
      phiType: 'diet',
      phiId: entryId,
      elderId: entry.elderId,
      action: 'read',
      actionDetails: `Viewed diet entry: ${entry.meal}`,
      purpose: 'treatment',
      method: 'web_app',
    });

    return entry;
  }

  /**
   * Update entry
   */
  static async updateEntry(
    entryId: string,
    data: Partial<DietEntry>,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, entryId);
    const updateData: any = { ...data };

    if (data.timestamp) {
      updateData.timestamp = Timestamp.fromDate(data.timestamp);
    }

    await updateDoc(docRef, updateData);

    // Get entry details for audit log
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const entry = snapshot.data() as DietEntry;

      // HIPAA Audit Log: Record PHI modification
      await logPHIAccess({
        userId,
        userRole,
        groupId: entry.groupId,
        phiType: 'diet',
        phiId: entryId,
        elderId: entry.elderId,
        action: 'update',
        actionDetails: `Updated diet entry: ${entry.meal} (fields: ${Object.keys(data).join(', ')})`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }
  }

  /**
   * Delete entry
   */
  static async deleteEntry(
    entryId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    // Get entry details BEFORE deleting for audit log
    const docRef = doc(db, this.COLLECTION, entryId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const entry = snapshot.data() as DietEntry;

      // Delete the entry
      await deleteDoc(docRef);

      // HIPAA Audit Log: Record PHI deletion
      await logPHIAccess({
        userId,
        userRole,
        groupId: entry.groupId,
        phiType: 'diet',
        phiId: entryId,
        elderId: entry.elderId,
        action: 'delete',
        actionDetails: `Deleted diet entry: ${entry.meal}`,
        purpose: 'operations',
        method: 'web_app',
      });
    } else {
      await deleteDoc(docRef); // Delete anyway if exists
    }
  }
}
