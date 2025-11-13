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
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Elder } from '@/types';

export class ElderService {
  private static COLLECTION = 'elders';

  /**
   * Create a new elder
   */
  static async createElder(groupId: string, elder: Omit<Elder, 'id'>): Promise<Elder> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...elder,
      groupId,
      dateOfBirth: Timestamp.fromDate(elder.dateOfBirth),
      createdAt: Timestamp.fromDate(elder.createdAt)
    });

    return {
      ...elder,
      id: docRef.id
    };
  }

  /**
   * Get elders by group ID
   */
  static async getEldersByGroup(groupId: string): Promise<Elder[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateOfBirth: doc.data().dateOfBirth.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as Elder[];
  }

  /**
   * Get elder by ID
   */
  static async getElder(elderId: string): Promise<Elder | null> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
      dateOfBirth: snapshot.data().dateOfBirth.toDate(),
      createdAt: snapshot.data().createdAt.toDate()
    } as Elder;
  }

  /**
   * Update elder
   */
  static async updateElder(elderId: string, data: Partial<Elder>): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const updateData: any = { ...data };

    if (data.dateOfBirth) {
      updateData.dateOfBirth = Timestamp.fromDate(data.dateOfBirth);
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Delete elder
   */
  static async deleteElder(elderId: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    await deleteDoc(docRef);
  }
}
