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
import { Supplement, SupplementLog } from '@/types';

export class SupplementService {
  private static SUPPLEMENTS = 'supplements';
  private static LOGS = 'supplement_logs';

  /**
   * Create supplement
   */
  static async createSupplement(supplement: Omit<Supplement, 'id'>): Promise<Supplement> {
    const docRef = await addDoc(collection(db, this.SUPPLEMENTS), {
      ...supplement,
      createdAt: Timestamp.fromDate(supplement.createdAt),
      updatedAt: Timestamp.fromDate(supplement.updatedAt)
    });

    return { ...supplement, id: docRef.id };
  }

  /**
   * Get supplements by group
   */
  static async getSupplementsByGroup(groupId: string): Promise<Supplement[]> {
    const q = query(
      collection(db, this.SUPPLEMENTS),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Supplement[];
  }

  /**
   * Get supplements by elder
   */
  static async getSupplementsByElder(elderId: string): Promise<Supplement[]> {
    const q = query(
      collection(db, this.SUPPLEMENTS),
      where('elderId', '==', elderId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Supplement[];
  }

  /**
   * Get supplement by ID
   */
  static async getSupplement(supplementId: string): Promise<Supplement | null> {
    const docRef = doc(db, this.SUPPLEMENTS, supplementId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt.toDate(),
      updatedAt: snapshot.data().updatedAt.toDate()
    } as Supplement;
  }

  /**
   * Update supplement
   */
  static async updateSupplement(supplementId: string, data: Partial<Supplement>): Promise<void> {
    const docRef = doc(db, this.SUPPLEMENTS, supplementId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  }

  /**
   * Delete supplement
   */
  static async deleteSupplement(supplementId: string): Promise<void> {
    const docRef = doc(db, this.SUPPLEMENTS, supplementId);
    await deleteDoc(docRef);
  }

  /**
   * Log supplement intake
   */
  static async logIntake(log: Omit<SupplementLog, 'id'>): Promise<SupplementLog> {
    const docRef = await addDoc(collection(db, this.LOGS), {
      ...log,
      scheduledTime: Timestamp.fromDate(log.scheduledTime),
      actualTime: log.actualTime ? Timestamp.fromDate(log.actualTime) : null,
      createdAt: Timestamp.fromDate(log.createdAt)
    });

    return { ...log, id: docRef.id };
  }

  /**
   * Get logs for supplement
   */
  static async getLogsBySupplement(supplementId: string): Promise<SupplementLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('supplementId', '==', supplementId),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as SupplementLog[];
  }
}
