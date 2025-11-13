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
import { Medication, MedicationLog } from '@/types';

export class MedicationService {
  private static MEDICATIONS = 'medications';
  private static LOGS = 'medication_logs';

  /**
   * Create medication
   */
  static async createMedication(medication: Omit<Medication, 'id'>): Promise<Medication> {
    const docRef = await addDoc(collection(db, this.MEDICATIONS), {
      ...medication,
      startDate: Timestamp.fromDate(medication.startDate),
      endDate: medication.endDate ? Timestamp.fromDate(medication.endDate) : null,
      createdAt: Timestamp.fromDate(medication.createdAt),
      updatedAt: Timestamp.fromDate(medication.updatedAt)
    });

    return { ...medication, id: docRef.id };
  }

  /**
   * Get medications by group
   */
  static async getMedicationsByGroup(groupId: string): Promise<Medication[]> {
    const q = query(
      collection(db, this.MEDICATIONS),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Medication[];
  }

  /**
   * Get medications by elder
   */
  static async getMedicationsByElder(elderId: string): Promise<Medication[]> {
    const q = query(
      collection(db, this.MEDICATIONS),
      where('elderId', '==', elderId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Medication[];
  }

  /**
   * Get medication by ID
   */
  static async getMedication(medicationId: string): Promise<Medication | null> {
    const docRef = doc(db, this.MEDICATIONS, medicationId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
      startDate: snapshot.data().startDate.toDate(),
      endDate: snapshot.data().endDate?.toDate(),
      createdAt: snapshot.data().createdAt.toDate(),
      updatedAt: snapshot.data().updatedAt.toDate()
    } as Medication;
  }

  /**
   * Update medication
   */
  static async updateMedication(medicationId: string, data: Partial<Medication>): Promise<void> {
    const docRef = doc(db, this.MEDICATIONS, medicationId);
    const updateData: any = { ...data, updatedAt: Timestamp.now() };

    if (data.startDate) {
      updateData.startDate = Timestamp.fromDate(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = Timestamp.fromDate(data.endDate);
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Delete medication
   */
  static async deleteMedication(medicationId: string): Promise<void> {
    const docRef = doc(db, this.MEDICATIONS, medicationId);
    await deleteDoc(docRef);
  }

  /**
   * Log medication dose
   */
  static async logDose(log: Omit<MedicationLog, 'id'>): Promise<MedicationLog> {
    const docRef = await addDoc(collection(db, this.LOGS), {
      ...log,
      scheduledTime: Timestamp.fromDate(log.scheduledTime),
      actualTime: log.actualTime ? Timestamp.fromDate(log.actualTime) : null,
      createdAt: Timestamp.fromDate(log.createdAt)
    });

    return { ...log, id: docRef.id };
  }

  /**
   * Get logs for medication
   */
  static async getLogsByMedication(medicationId: string): Promise<MedicationLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('medicationId', '==', medicationId),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as MedicationLog[];
  }

  /**
   * Get logs by date range
   */
  static async getLogsByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MedicationLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('groupId', '==', groupId),
      where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
      where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as MedicationLog[];
  }
}
