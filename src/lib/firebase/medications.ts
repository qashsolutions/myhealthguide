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
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';

export class MedicationService {
  private static MEDICATIONS = 'medications';
  private static LOGS = 'medication_logs';

  /**
   * Create medication
   */
  static async createMedication(
    medication: Omit<Medication, 'id'>,
    userId: string,
    userRole: UserRole
  ): Promise<Medication> {
    const docRef = await addDoc(collection(db, this.MEDICATIONS), {
      ...medication,
      startDate: Timestamp.fromDate(medication.startDate),
      endDate: medication.endDate ? Timestamp.fromDate(medication.endDate) : null,
      createdAt: Timestamp.fromDate(medication.createdAt),
      updatedAt: Timestamp.fromDate(medication.updatedAt)
    });

    const result = { ...medication, id: docRef.id };

    // HIPAA Audit Log: Record PHI creation
    await logPHIAccess({
      userId,
      userRole,
      groupId: medication.groupId,
      phiType: 'medication',
      phiId: docRef.id,
      elderId: medication.elderId,
      action: 'create',
      actionDetails: `Created medication: ${medication.name}`,
      purpose: 'treatment',
      method: 'web_app',
    });

    return result;
  }

  /**
   * Get medications by group
   */
  static async getMedicationsByGroup(
    groupId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Medication[]> {
    const q = query(
      collection(db, this.MEDICATIONS),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    const medications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Medication[];

    // HIPAA Audit Log: Record PHI access (batch read)
    if (medications.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'medication',
        action: 'read',
        actionDetails: `Retrieved ${medications.length} medications for group`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return medications;
  }

  /**
   * Get medications by elder
   * Note: groupId is required for Firestore security rules to evaluate properly
   */
  static async getMedicationsByElder(
    elderId: string,
    groupId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Medication[]> {
    const q = query(
      collection(db, this.MEDICATIONS),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId)
    );

    const snapshot = await getDocs(q);
    const medications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Medication[];

    // HIPAA Audit Log: Record PHI access for specific elder
    if (medications.length > 0) {
      const groupId = medications[0].groupId; // All meds for an elder share same groupId
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'medication',
        elderId,
        action: 'read',
        actionDetails: `Retrieved ${medications.length} medications for elder ${elderId}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return medications;
  }

  /**
   * Get medication by ID
   */
  static async getMedication(
    medicationId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Medication | null> {
    const docRef = doc(db, this.MEDICATIONS, medicationId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const medication = {
      id: snapshot.id,
      ...snapshot.data(),
      startDate: snapshot.data().startDate.toDate(),
      endDate: snapshot.data().endDate?.toDate(),
      createdAt: snapshot.data().createdAt.toDate(),
      updatedAt: snapshot.data().updatedAt.toDate()
    } as Medication;

    // HIPAA Audit Log: Record individual medication access
    await logPHIAccess({
      userId,
      userRole,
      groupId: medication.groupId,
      phiType: 'medication',
      phiId: medicationId,
      elderId: medication.elderId,
      action: 'read',
      actionDetails: `Viewed medication: ${medication.name}`,
      purpose: 'treatment',
      method: 'web_app',
    });

    return medication;
  }

  /**
   * Update medication
   */
  static async updateMedication(
    medicationId: string,
    data: Partial<Medication>,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.MEDICATIONS, medicationId);
    const updateData: any = { ...data, updatedAt: Timestamp.now() };

    if (data.startDate) {
      updateData.startDate = Timestamp.fromDate(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = Timestamp.fromDate(data.endDate);
    }

    await updateDoc(docRef, updateData);

    // Get medication details for audit log
    const medication = await this.getMedication(medicationId, userId, userRole);
    if (medication) {
      // HIPAA Audit Log: Record PHI modification
      await logPHIAccess({
        userId,
        userRole,
        groupId: medication.groupId,
        phiType: 'medication',
        phiId: medicationId,
        elderId: medication.elderId,
        action: 'update',
        actionDetails: `Updated medication: ${medication.name} (fields: ${Object.keys(data).join(', ')})`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }
  }

  /**
   * Delete medication
   */
  static async deleteMedication(
    medicationId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    // Get medication details BEFORE deleting for audit log
    const docRef = doc(db, this.MEDICATIONS, medicationId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const medication = snapshot.data() as Medication;

      // Delete the medication
      await deleteDoc(docRef);

      // HIPAA Audit Log: Record PHI deletion
      await logPHIAccess({
        userId,
        userRole,
        groupId: medication.groupId,
        phiType: 'medication',
        phiId: medicationId,
        elderId: medication.elderId,
        action: 'delete',
        actionDetails: `Deleted medication: ${medication.name}`,
        purpose: 'operations',
        method: 'web_app',
      });
    } else {
      await deleteDoc(docRef); // Delete anyway if exists
    }
  }

  /**
   * Log medication dose
   */
  static async logDose(
    log: Omit<MedicationLog, 'id'>,
    userId: string,
    userRole: UserRole
  ): Promise<MedicationLog> {
    const docRef = await addDoc(collection(db, this.LOGS), {
      ...log,
      loggedBy: userId, // Include userId for notifications to other group members
      scheduledTime: Timestamp.fromDate(log.scheduledTime),
      actualTime: log.actualTime ? Timestamp.fromDate(log.actualTime) : null,
      createdAt: Timestamp.fromDate(log.createdAt)
    });

    const result = { ...log, id: docRef.id };

    // HIPAA Audit Log: Record medication log entry (PHI)
    await logPHIAccess({
      userId,
      userRole,
      groupId: log.groupId,
      phiType: 'medication',
      phiId: log.medicationId,
      elderId: log.elderId,
      action: 'create',
      actionDetails: `Logged medication dose: ${log.status} (${log.method})`,
      purpose: 'treatment',
      method: log.method === 'voice' ? 'web_app' : 'web_app',
    });

    return result;
  }

  /**
   * Get logs for medication
   */
  static async getLogsByMedication(
    medicationId: string,
    userId: string,
    userRole: UserRole
  ): Promise<MedicationLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('medicationId', '==', medicationId),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as MedicationLog[];

    // HIPAA Audit Log: Record medication logs access (PHI)
    if (logs.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId: logs[0].groupId,
        phiType: 'medication',
        phiId: medicationId,
        elderId: logs[0].elderId,
        action: 'read',
        actionDetails: `Retrieved ${logs.length} medication logs for medication ${medicationId}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return logs;
  }

  /**
   * Get logs by date range
   */
  static async getLogsByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date,
    userId: string,
    userRole: UserRole
  ): Promise<MedicationLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('groupId', '==', groupId),
      where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
      where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as MedicationLog[];

    // HIPAA Audit Log: Record medication logs access by date range (PHI)
    if (logs.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'medication',
        action: 'read',
        actionDetails: `Retrieved ${logs.length} medication logs for date range ${startDate.toISOString()} to ${endDate.toISOString()}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return logs;
  }
}
