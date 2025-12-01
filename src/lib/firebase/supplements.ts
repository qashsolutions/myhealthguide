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
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';

export class SupplementService {
  private static SUPPLEMENTS = 'supplements';
  private static LOGS = 'supplement_logs';

  /**
   * Create supplement
   */
  static async createSupplement(
    supplement: Omit<Supplement, 'id'>,
    userId: string,
    userRole: UserRole
  ): Promise<Supplement> {
    const docRef = await addDoc(collection(db, this.SUPPLEMENTS), {
      ...supplement,
      createdAt: Timestamp.fromDate(supplement.createdAt),
      updatedAt: Timestamp.fromDate(supplement.updatedAt)
    });

    const result = { ...supplement, id: docRef.id };

    // HIPAA Audit Log: Record PHI creation
    await logPHIAccess({
      userId,
      userRole,
      groupId: supplement.groupId,
      phiType: 'medication', // Supplements are treated as medication PHI
      phiId: docRef.id,
      elderId: supplement.elderId,
      action: 'create',
      actionDetails: `Created supplement: ${supplement.name}`,
      purpose: 'treatment',
      method: 'web_app',
    });

    return result;
  }

  /**
   * Get supplements by group
   */
  static async getSupplementsByGroup(
    groupId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Supplement[]> {
    const q = query(
      collection(db, this.SUPPLEMENTS),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    const supplements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Supplement[];

    // HIPAA Audit Log: Record PHI access (batch read)
    if (supplements.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'medication',
        action: 'read',
        actionDetails: `Retrieved ${supplements.length} supplements for group`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return supplements;
  }

  /**
   * Get supplements by elder
   * Note: groupId is required for Firestore security rules to evaluate properly
   */
  static async getSupplementsByElder(
    elderId: string,
    groupId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Supplement[]> {
    const q = query(
      collection(db, this.SUPPLEMENTS),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId)
    );

    const snapshot = await getDocs(q);
    const supplements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Supplement[];

    // HIPAA Audit Log: Record PHI access for specific elder
    if (supplements.length > 0) {
      const groupId = supplements[0].groupId;
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'medication',
        elderId,
        action: 'read',
        actionDetails: `Retrieved ${supplements.length} supplements for elder ${elderId}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return supplements;
  }

  /**
   * Get supplement by ID
   */
  static async getSupplement(
    supplementId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Supplement | null> {
    const docRef = doc(db, this.SUPPLEMENTS, supplementId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const supplement = {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt.toDate(),
      updatedAt: snapshot.data().updatedAt.toDate()
    } as Supplement;

    // HIPAA Audit Log: Record individual supplement access
    await logPHIAccess({
      userId,
      userRole,
      groupId: supplement.groupId,
      phiType: 'medication',
      phiId: supplementId,
      elderId: supplement.elderId,
      action: 'read',
      actionDetails: `Viewed supplement: ${supplement.name}`,
      purpose: 'treatment',
      method: 'web_app',
    });

    return supplement;
  }

  /**
   * Update supplement
   */
  static async updateSupplement(
    supplementId: string,
    data: Partial<Supplement>,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.SUPPLEMENTS, supplementId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });

    // Get supplement details for audit log
    const supplement = await this.getSupplement(supplementId, userId, userRole);
    if (supplement) {
      // HIPAA Audit Log: Record PHI modification
      await logPHIAccess({
        userId,
        userRole,
        groupId: supplement.groupId,
        phiType: 'medication',
        phiId: supplementId,
        elderId: supplement.elderId,
        action: 'update',
        actionDetails: `Updated supplement: ${supplement.name} (fields: ${Object.keys(data).join(', ')})`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }
  }

  /**
   * Delete supplement
   */
  static async deleteSupplement(
    supplementId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    // Get supplement details BEFORE deleting for audit log
    const docRef = doc(db, this.SUPPLEMENTS, supplementId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const supplement = snapshot.data() as Supplement;

      // Delete the supplement
      await deleteDoc(docRef);

      // HIPAA Audit Log: Record PHI deletion
      await logPHIAccess({
        userId,
        userRole,
        groupId: supplement.groupId,
        phiType: 'medication',
        phiId: supplementId,
        elderId: supplement.elderId,
        action: 'delete',
        actionDetails: `Deleted supplement: ${supplement.name}`,
        purpose: 'operations',
        method: 'web_app',
      });
    } else {
      await deleteDoc(docRef);
    }
  }

  /**
   * Log supplement intake
   */
  static async logIntake(
    log: Omit<SupplementLog, 'id'>,
    userId: string,
    userRole: UserRole
  ): Promise<SupplementLog> {
    const docRef = await addDoc(collection(db, this.LOGS), {
      ...log,
      scheduledTime: Timestamp.fromDate(log.scheduledTime),
      actualTime: log.actualTime ? Timestamp.fromDate(log.actualTime) : null,
      createdAt: Timestamp.fromDate(log.createdAt)
    });

    const result = { ...log, id: docRef.id };

    // HIPAA Audit Log: Record supplement log entry (PHI)
    await logPHIAccess({
      userId,
      userRole,
      groupId: log.groupId,
      phiType: 'medication',
      phiId: log.supplementId,
      elderId: log.elderId,
      action: 'create',
      actionDetails: `Logged supplement intake: ${log.status} (${log.method})`,
      purpose: 'treatment',
      method: 'web_app',
    });

    return result;
  }

  /**
   * Get logs for supplement
   */
  static async getLogsBySupplement(
    supplementId: string,
    userId: string,
    userRole: UserRole
  ): Promise<SupplementLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('supplementId', '==', supplementId),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as SupplementLog[];

    // HIPAA Audit Log: Record supplement logs access (PHI)
    if (logs.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId: logs[0].groupId,
        phiType: 'medication',
        phiId: supplementId,
        elderId: logs[0].elderId,
        action: 'read',
        actionDetails: `Retrieved ${logs.length} supplement logs for supplement ${supplementId}`,
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
  ): Promise<SupplementLog[]> {
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
    })) as SupplementLog[];

    // HIPAA Audit Log: Record supplement logs access by date range (PHI)
    if (logs.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'medication',
        action: 'read',
        actionDetails: `Retrieved ${logs.length} supplement logs for date range ${startDate.toISOString()} to ${endDate.toISOString()}`,
        purpose: 'treatment',
        method: 'web_app',
      });
    }

    return logs;
  }
}
