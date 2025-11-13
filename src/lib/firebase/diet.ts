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

export class DietService {
  private static COLLECTION = 'diet_entries';

  /**
   * Create diet entry
   */
  static async createEntry(entry: Omit<DietEntry, 'id'>): Promise<DietEntry> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp),
      createdAt: Timestamp.fromDate(entry.createdAt)
    });

    return { ...entry, id: docRef.id };
  }

  /**
   * Get entries by date range
   */
  static async getEntriesByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DietEntry[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('groupId', '==', groupId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as DietEntry[];
  }

  /**
   * Get entries by elder
   */
  static async getEntriesByElder(elderId: string): Promise<DietEntry[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('elderId', '==', elderId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as DietEntry[];
  }

  /**
   * Get entry by ID
   */
  static async getEntry(entryId: string): Promise<DietEntry | null> {
    const docRef = doc(db, this.COLLECTION, entryId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
      timestamp: snapshot.data().timestamp.toDate(),
      createdAt: snapshot.data().createdAt.toDate()
    } as DietEntry;
  }

  /**
   * Update entry
   */
  static async updateEntry(entryId: string, data: Partial<DietEntry>): Promise<void> {
    const docRef = doc(db, this.COLLECTION, entryId);
    const updateData: any = { ...data };

    if (data.timestamp) {
      updateData.timestamp = Timestamp.fromDate(data.timestamp);
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Delete entry
   */
  static async deleteEntry(entryId: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION, entryId);
    await deleteDoc(docRef);
  }
}
